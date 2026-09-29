import { useCallback, useState } from "react";
import { collection, doc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { getFirebaseContext } from "@/shared/firebase";
import { t } from "@/shared/lib/i18n";
import consoleStyles from "@/shared/styles/console.module.css";
import adminStyles from "@/features/admin/styles/admin.module.css";
import { useConsoleToast } from "@/shared/ui/console-toast";
import {
  deleteOrganizerBroadcastMessage,
  listOrganizerBroadcastMessages,
  upsertOrganizerBroadcastMessage,
} from "../api/organizerBroadcastMessagesRepository";
import { uploadOrganizerBroadcastAudio } from "@/shared/firebase/organizerBroadcastAudioUpload";
import { clampOrganizerBroadcastLimit } from "@/shared/firestore/eventCodeBroadcasts";
import {
  formatMileMarkerLabel,
  formatPreviewMileLabel,
  ORGANIZER_RACE_MILE_DEFAULT,
  parseMileMarkerLabel,
} from "../lib/raceMessageMile";
import type {
  OrganizerRaceMessage,
  OrganizerRaceMessageStatus,
} from "../model/raceMessages";
import { OrganizerRaceMilePicker } from "./OrganizerRaceMilePicker";
import { OrganizerBroadcastAudioField } from "./OrganizerBroadcastAudioField";
import organizerStyles from "../styles/organizer.module.css";

type OrganizerMessageContentMode = "text" | "audio";

interface OrganizerMessagesTabProps {
  embedded?: boolean;
  eventId: string;
  eventCode: string;
  eventName: string;
  runnerCount: number;
  messageLimit: number;
  messages: OrganizerRaceMessage[];
  onMessagesChange: (messages: OrganizerRaceMessage[]) => void;
  maxMileDistance?: number;
}

function statusLabel(status: OrganizerRaceMessageStatus): string {
  return status === "sent"
    ? t("organizer.portal.messages.statusSent")
    : t("organizer.portal.messages.statusScheduled");
}

function mergeSavedIntoMessageList(
  current: OrganizerRaceMessage[],
  saved: OrganizerRaceMessage
): OrganizerRaceMessage[] {
  return [saved, ...current.filter((item) => item.id !== saved.id)];
}

function mapOrganizerMessageSaveError(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return t("organizer.portal.messages.saveErrorPermission");
  }
  if (error instanceof Error) {
    if (error.message === "voice_file_too_large") {
      return t("organizer.portal.messages.audioTooLarge");
    }
    if (error.message === "invalid_broadcast_message") {
      return t("organizer.portal.messages.validation");
    }
  }
  return t("organizer.portal.messages.saveError");
}

export function OrganizerMessagesTab({
  embedded = false,
  eventId,
  eventCode,
  eventName,
  runnerCount,
  messages,
  messageLimit,
  onMessagesChange,
  maxMileDistance,
}: OrganizerMessagesTabProps): React.JSX.Element {
  const [mileMiles, setMileMiles] = useState(ORGANIZER_RACE_MILE_DEFAULT);
  const [contentMode, setContentMode] = useState<OrganizerMessageContentMode>("text");
  const [messageText, setMessageText] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(null);
  const [clearExistingMedia, setClearExistingMedia] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const { showToast, viewport: toastViewport } = useConsoleToast();

  const hasPreviewAudio =
    audioFile != null ||
    (existingMediaUrl != null &&
      existingMediaUrl.length > 0 &&
      !clearExistingMedia);
  const previewMile = formatPreviewMileLabel(mileMiles);
  const previewText =
    contentMode === "audio"
      ? t("organizer.portal.messages.previewAudioOnly")
      : messageText.trim()
        ? messageText.trim()
        : t("organizer.portal.messages.previewEmpty");
  const isEditing = editingId != null;
  const effectiveLimit = clampOrganizerBroadcastLimit(messageLimit);
  const isAtLimit = !isEditing && messages.length >= effectiveLimit;

  const reloadMessages = useCallback(async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      return;
    }
    setIsListLoading(true);
    try {
      const next = await listOrganizerBroadcastMessages(firebaseCtx, eventId, {
        force: true,
      });
      onMessagesChange(next);
    } finally {
      setIsListLoading(false);
    }
  }, [eventId, onMessagesChange]);

  const resetComposer = useCallback((): void => {
    setContentMode("text");
    setMessageText("");
    setAudioFile(null);
    setExistingMediaUrl(null);
    setClearExistingMedia(false);
    setEditingId(null);
    setFormError("");
    setMileMiles(ORGANIZER_RACE_MILE_DEFAULT);
  }, []);

  const handleContentModeChange = (next: OrganizerMessageContentMode): void => {
    if (next === contentMode) {
      return;
    }
    setContentMode(next);
    setFormError("");
    if (next === "audio") {
      setMessageText("");
      return;
    }
    setAudioFile(null);
    if (existingMediaUrl) {
      setClearExistingMedia(true);
    }
  };

  const handleClear = (): void => {
    resetComposer();
  };

  const handleSubmit = (): void => {
    if (embedded) {
      return;
    }
    const isAudioMode = contentMode === "audio";
    const text = isAudioMode ? "" : messageText.trim();
    const hasText = text.length > 0;
    const hasAudio =
      isAudioMode &&
      (audioFile != null ||
        (existingMediaUrl != null &&
          existingMediaUrl.length > 0 &&
          !clearExistingMedia));

    if (isAudioMode && !hasAudio) {
      setFormError(t("organizer.portal.messages.validationAudio"));
      return;
    }

    if (!isAudioMode && !hasText) {
      setFormError(t("organizer.portal.messages.validationText"));
      return;
    }

    if (isAtLimit) {
      setFormError(t("organizer.portal.messages.limitReached"));
      return;
    }

    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      setFormError(t("organizer.unavailable"));
      return;
    }

    setIsSaving(true);
    setFormError("");
    void (async () => {
      try {
        const messageRef = editingId
          ? doc(
              firebaseCtx.db,
              "organizerEvents",
              eventId,
              "broadcastMessages",
              editingId
            )
          : doc(
              collection(
                firebaseCtx.db,
                "organizerEvents",
                eventId,
                "broadcastMessages"
              )
            );

        let mediaUrl: string | undefined;
        if (isAudioMode && audioFile) {
          mediaUrl = await uploadOrganizerBroadcastAudio(
            firebaseCtx,
            eventId,
            messageRef.id,
            audioFile
          );
        }

        const result = await upsertOrganizerBroadcastMessage(
          firebaseCtx,
          eventId,
          {
            id: messageRef.id,
            mile: formatMileMarkerLabel(mileMiles),
            text,
            status: "scheduled",
            ...(mediaUrl ? { mediaUrl } : {}),
            ...(!isAudioMode || (clearExistingMedia && !mediaUrl)
              ? { clearMediaUrl: true }
              : {}),
            delivery: {
              eventCode,
              deliveryFromName: eventName,
            },
          }
        );

        onMessagesChange(mergeSavedIntoMessageList(messages, result.message));
        resetComposer();
        await reloadMessages();
        showToast(
          isEditing
            ? t("organizer.portal.messages.updateSuccess")
            : t("organizer.portal.messages.scheduleSuccess"),
          "success"
        );
        if (result.raceSyncFailed) {
          showToast(t("organizer.portal.messages.raceSyncWarning"), "warning");
        }
      } catch (error) {
        showToast(mapOrganizerMessageSaveError(error), "error");
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const handleEdit = (item: OrganizerRaceMessage): void => {
    if (embedded || item.status !== "scheduled") {
      return;
    }
    const hasAudio = Boolean(item.mediaUrl?.trim());
    setMileMiles(parseMileMarkerLabel(item.mile));
    setContentMode(hasAudio ? "audio" : "text");
    setMessageText(hasAudio ? "" : item.text);
    setExistingMediaUrl(item.mediaUrl);
    setAudioFile(null);
    setClearExistingMedia(false);
    setEditingId(item.id);
    setFormError("");
  };

  const handleDelete = (item: OrganizerRaceMessage): void => {
    if (embedded) {
      return;
    }
    if (!window.confirm(t("organizer.portal.messages.deleteConfirm"))) {
      return;
    }

    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      return;
    }

    setIsSaving(true);
    setFormError("");
    void (async () => {
      try {
        await deleteOrganizerBroadcastMessage(firebaseCtx, eventId, item.id, {
          eventCode,
          deliveryFromName: eventName,
        });
        if (editingId === item.id) {
          resetComposer();
        }
        onMessagesChange(messages.filter((entry) => entry.id !== item.id));
        await reloadMessages();
        showToast(t("organizer.portal.messages.deleteSuccess"), "success");
      } catch (error) {
        showToast(mapOrganizerMessageSaveError(error), "error");
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const submitLabel = isEditing
    ? t("organizer.portal.messages.update")
    : t("organizer.portal.messages.schedule");

  return (
    <>
      {toastViewport}
      {embedded ? null : (
        <div className={consoleStyles.pageHead}>
          <h2>{t("organizer.portal.tab.messages")}</h2>
          <p>{t("organizer.portal.messages.lede")}</p>
        </div>
      )}

      {embedded ? null : (
      <div className={consoleStyles.messageLayout}>
        <div
          aria-busy={isSaving}
          className={`${consoleStyles.messagePanel} ${consoleStyles.messageCreate}`}
        >
          <h2 className={consoleStyles.messageBlockTitle}>
            {isEditing
              ? t("organizer.portal.messages.editTitle")
              : t("organizer.portal.messages.createTitle")}
          </h2>
          <p className={consoleStyles.messageBlockSub}>
            {isAtLimit
              ? t("organizer.portal.messages.limitNotice")
              : t("organizer.portal.messages.createSub")}
          </p>

          <div className={consoleStyles.fieldGroup}>
            <span className={consoleStyles.fieldLabel}>
              {t("organizer.portal.messages.mileLabel")}
            </span>
            <OrganizerRaceMilePicker
              maxMiles={maxMileDistance}
              valueMiles={mileMiles}
              onChange={setMileMiles}
            />
            <p className={consoleStyles.messageHelper}>
              {t("organizer.portal.messages.helperBefore")}{" "}
              <strong>{eventName}</strong>
              {t("organizer.portal.messages.helperAfter")}
            </p>
          </div>

          <div className={consoleStyles.fieldGroup}>
            <span className={consoleStyles.fieldLabel} id="organizer-message-type">
              {t("organizer.portal.messages.contentTypeLabel")}
            </span>
            <div
              className={organizerStyles.contentMode}
              role="tablist"
              aria-labelledby="organizer-message-type"
            >
              <button
                aria-selected={contentMode === "text"}
                className={
                  contentMode === "text"
                    ? `${organizerStyles.contentModeBtn} ${organizerStyles.contentModeBtnActive}`
                    : organizerStyles.contentModeBtn
                }
                disabled={isSaving || isAtLimit}
                role="tab"
                type="button"
                onClick={() => handleContentModeChange("text")}
              >
                {t("organizer.portal.messages.contentTypeText")}
              </button>
              <button
                aria-selected={contentMode === "audio"}
                className={
                  contentMode === "audio"
                    ? `${organizerStyles.contentModeBtn} ${organizerStyles.contentModeBtnActive}`
                    : organizerStyles.contentModeBtn
                }
                disabled={isSaving || isAtLimit}
                role="tab"
                type="button"
                onClick={() => handleContentModeChange("audio")}
              >
                {t("organizer.portal.messages.contentTypeAudio")}
              </button>
            </div>
          </div>

          {contentMode === "text" ? (
            <div className={consoleStyles.fieldGroup}>
              <label
                className={consoleStyles.fieldLabel}
                htmlFor="organizer-race-message"
              >
                {t("organizer.portal.messages.messageLabel")}
              </label>
              <textarea
                id="organizer-race-message"
                className={consoleStyles.textarea}
                disabled={isSaving || isAtLimit}
                placeholder={t("organizer.portal.messages.placeholder")}
                value={messageText}
                onChange={(event) => {
                  setMessageText(event.target.value);
                  if (formError) {
                    setFormError("");
                  }
                }}
              />
            </div>
          ) : (
            <div className={consoleStyles.fieldGroup}>
              <span className={consoleStyles.fieldLabel}>
                {t("organizer.portal.messages.audioLabel")}
              </span>
              <OrganizerBroadcastAudioField
                audioFile={audioFile}
                existingMediaUrl={clearExistingMedia ? null : existingMediaUrl}
                isDisabled={isSaving || isAtLimit}
                onAudioFileChange={setAudioFile}
                onClearExisting={() => setClearExistingMedia(true)}
                onError={(message) => {
                  setFormError(message);
                  showToast(message, "error");
                }}
              />
              <p className={consoleStyles.helper}>
                {t("organizer.portal.messages.audioHelper")}
              </p>
            </div>
          )}

          {formError ? <p className={adminStyles.error}>{formError}</p> : null}

          <div className={consoleStyles.createActions}>
            <button
              className={consoleStyles.secondary}
              disabled={isSaving}
              type="button"
              onClick={handleClear}
            >
              {t("admin.cancel")}
            </button>
            <button
              className={consoleStyles.primary}
              disabled={isSaving || isAtLimit}
              type="button"
              onClick={handleSubmit}
            >
              {isSaving ? t("organizer.portal.messages.saving") : submitLabel}
            </button>
          </div>
        </div>

        <div
          className={`${consoleStyles.messagePanel} ${consoleStyles.previewPanel}`}
        >
          <h2 className={consoleStyles.messageBlockTitle}>
            {t("organizer.portal.messages.previewTitle")}
          </h2>
          <div className={consoleStyles.previewBox}>
            <div className={consoleStyles.previewLabel}>{previewMile}</div>
            <div className={consoleStyles.previewMessage}>{previewText}</div>
            {contentMode === "audio" && hasPreviewAudio ? (
              <div className={organizerStyles.messageAudioBadge}>
                {t("organizer.portal.messages.previewAudio")}
              </div>
            ) : null}
            <div className={consoleStyles.previewMeta}>
              {t("organizer.portal.messages.previewMeta", {
                count: runnerCount,
                eventName,
              })}
            </div>
          </div>
          <div className={consoleStyles.previewTips}>
            <strong className={consoleStyles.previewTipsStrong}>
              {t("organizer.portal.messages.tipsTitle")}
            </strong>
            <span className={consoleStyles.previewTipsLine}>
              {t("organizer.portal.messages.tipMile2")}
            </span>
            <span className={consoleStyles.previewTipsLine}>
              {t("organizer.portal.messages.tipMile13")}
            </span>
            <span className={consoleStyles.previewTipsLine}>
              {t("organizer.portal.messages.tipMile20")}
            </span>
            <span className={consoleStyles.previewTipsLine}>
              {t("organizer.portal.messages.tipMile25")}
            </span>
          </div>
        </div>
      </div>
      )}

      <div
        className={
          embedded
            ? consoleStyles.sectionRow
            : `${consoleStyles.sectionRow} ${consoleStyles.sectionRowSpaced}`
        }
      >
        <h2 className={consoleStyles.sectionTitle}>
          {t("organizer.portal.messages.listTitle")}
        </h2>
        <span className={consoleStyles.usageMuted}>
          {t("organizer.portal.messages.usage", {
            used: messages.length,
            limit: effectiveLimit,
          })}
        </span>
      </div>

      {isListLoading && messages.length === 0 ? (
        <div className={consoleStyles.messageEmpty}>
          {t("organizer.portal.messages.listLoading")}
        </div>
      ) : null}

      {!isListLoading && messages.length === 0 ? (
        <div className={consoleStyles.messageEmpty}>
          {t("organizer.portal.messages.empty")}
        </div>
      ) : null}

      {messages.length > 0 ? (
        <div
          aria-busy={isListLoading || isSaving}
          className={consoleStyles.messageList}
        >
          {messages.map((item) => (
            <div key={item.id} className={consoleStyles.messageCard}>
              <div className={consoleStyles.messageTop}>
                <span className={consoleStyles.mileLabel}>{item.mile}</span>
                <span className={consoleStyles.messageStatusPill}>
                  {statusLabel(item.status)}
                </span>
              </div>
              <p className={consoleStyles.messageText}>
                {item.text.trim() ||
                  t("organizer.portal.messages.listAudioOnly")}
              </p>
              {item.mediaUrl ? (
                <span className={organizerStyles.messageAudioBadge}>
                  {t("organizer.portal.messages.listAudio")}
                </span>
              ) : null}
              {embedded ? null : (
              <div className={consoleStyles.messageActions}>
                {item.status === "scheduled" ? (
                  <button
                    className={consoleStyles.smallBtn}
                    disabled={isSaving}
                    type="button"
                    onClick={() => handleEdit(item)}
                  >
                    {t("organizer.portal.messages.edit")}
                  </button>
                ) : null}
                <button
                  className={`${consoleStyles.smallBtn} ${consoleStyles.smallBtnDelete}`}
                  disabled={isSaving}
                  type="button"
                  onClick={() => handleDelete(item)}
                >
                  {t("admin.event.delete")}
                </button>
              </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
