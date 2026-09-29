import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LegalNav } from "@/shared/ui/legal-nav";
import { getAppConfig } from "@/shared/config/env";
import type { FirebaseContext } from "@/shared/firebase";
import { t } from "@/shared/lib/i18n";
import { formatMile, formatRaceClock } from "../lib/deliver";
import {
  isSameMileTrigger,
  isSameTimeTrigger,
  snapMile,
  snapTimeSeconds,
} from "../lib/deliver-percent";
import { mapSubmitErrorMessage } from "../lib/errors";
import {
  listRaceDeliveryMarks,
  type RaceDeliveryMark,
} from "../lib/list-race-delivery-marks";
import { shutdownFirestore, submitEvent } from "../lib/submit-event";
import type { MessageFormat, MusicTrack, PageContext } from "../model/types";
import { BrandHeader } from "./BrandHeader";
import { DeliverCard } from "./DeliverCard";
import { FormatTabs } from "./FormatTabs";
import { FromNameField } from "./FromNameField";
import { SongPanel } from "./SongPanel";
import { SubmitLock, type SubmitLockMode } from "./SubmitLock";
import { TextPanel } from "./TextPanel";
import { VoicePanel } from "./VoicePanel";

interface RaceFormScreenProps {
  context: PageContext;
  firebaseCtx: FirebaseContext | null;
  runnerName: string;
}

function pickFreeInitialTriggers(
  context: PageContext,
  occupiedMarks: RaceDeliveryMark[]
): { mileTrigger: number; timeTrigger: number } {
  if (context.deliverMode === "time") {
    const preferred = snapTimeSeconds(
      Math.round(context.maxTimeSeconds * 0.75),
      context.maxTimeSeconds
    );
    const isPreferredTaken = occupiedMarks.some(
      (mark) =>
        typeof mark.timeTrigger === "number" &&
        isSameTimeTrigger(mark.timeTrigger, preferred, context.maxTimeSeconds)
    );
    if (!isPreferredTaken) {
      return { mileTrigger: 0, timeTrigger: preferred };
    }
    const maxMinutes = Math.floor(context.maxTimeSeconds / 60);
    for (let minute = 0; minute <= maxMinutes; minute += 1) {
      const candidate = snapTimeSeconds(minute * 60, context.maxTimeSeconds);
      const isTaken = occupiedMarks.some(
        (mark) =>
          typeof mark.timeTrigger === "number" &&
          isSameTimeTrigger(mark.timeTrigger, candidate, context.maxTimeSeconds)
      );
      if (!isTaken) {
        return { mileTrigger: 0, timeTrigger: candidate };
      }
    }
    return { mileTrigger: 0, timeTrigger: preferred };
  }

  const maxTenths = Math.floor(context.distance * 10);
  for (let tenth = 0; tenth <= maxTenths; tenth += 1) {
    const candidate = snapMile(tenth / 10, context.distance);
    const isTaken = occupiedMarks.some(
      (mark) =>
        typeof mark.mileTrigger === "number" &&
        isSameMileTrigger(mark.mileTrigger, candidate, context.distance)
    );
    if (!isTaken) {
      return { mileTrigger: candidate, timeTrigger: 0 };
    }
  }
  return { mileTrigger: 0, timeTrigger: 0 };
}

function isTriggerOccupied(
  context: PageContext,
  occupiedMarks: RaceDeliveryMark[],
  mileTrigger: number,
  timeTrigger: number
): boolean {
  if (context.deliverMode === "time") {
    return occupiedMarks.some(
      (mark) =>
        typeof mark.timeTrigger === "number" &&
        isSameTimeTrigger(mark.timeTrigger, timeTrigger, context.maxTimeSeconds)
    );
  }

  return occupiedMarks.some(
    (mark) =>
      typeof mark.mileTrigger === "number" &&
      isSameMileTrigger(mark.mileTrigger, mileTrigger, context.distance)
  );
}

export function RaceFormScreen({
  context,
  firebaseCtx,
  runnerName,
}: RaceFormScreenProps): React.JSX.Element {
  const navigate = useNavigate();
  const config = useMemo(() => getAppConfig(), []);

  const [activeFormat, setActiveFormat] = useState<MessageFormat>("voice");
  const [fromName, setFromName] = useState("");
  const [fromNameError, setFromNameError] = useState("");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [textContent, setTextContent] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [errorBanner, setErrorBanner] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitLockMode, setSubmitLockMode] =
    useState<SubmitLockMode>("hidden");
  const [submitLockError, setSubmitLockError] = useState("");
  const [occupiedMarks, setOccupiedMarks] = useState<RaceDeliveryMark[]>([]);

  const [mileTrigger, setMileTrigger] = useState(0);
  const [timeTrigger, setTimeTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const marks = await listRaceDeliveryMarks(
          firebaseCtx,
          context.raceId,
          context.deliverMode
        );
        if (cancelled) {
          return;
        }
        setOccupiedMarks(marks);
        const free = pickFreeInitialTriggers(context, marks);
        setMileTrigger(free.mileTrigger);
        setTimeTrigger(free.timeTrigger);
      } catch (err) {
        console.error("[relay webform] delivery marks load failed", err);
        if (cancelled) {
          return;
        }
        const fallback = pickFreeInitialTriggers(context, []);
        setMileTrigger(fallback.mileTrigger);
        setTimeTrigger(fallback.timeTrigger);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [context, firebaseCtx]);

  useEffect(() => {
    document.body.style.overflow = submitLockMode !== "hidden" ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [submitLockMode]);

  const footerNote =
    context.deliverMode === "time"
      ? t("race.footer.time", { time: formatRaceClock(timeTrigger) })
      : t("race.footer.mile", { mile: formatMile(mileTrigger) });

  const handleFormatChange = (format: MessageFormat): void => {
    setActiveFormat(format);
    setErrorBanner("");
  };

  const handleDismissLock = (): void => {
    setSubmitLockMode("hidden");
    setSubmitLockError("");
    setIsSubmitting(false);
  };

  const handleFromNameChange = (value: string): void => {
    setFromName(value);
    if (fromNameError) {
      setFromNameError("");
    }
  };

  const handleMileChange = (mile: number): void => {
    setMileTrigger(mile);
    if (errorBanner) {
      setErrorBanner("");
    }
  };

  const handleTimeChange = (seconds: number): void => {
    setTimeTrigger(seconds);
    if (errorBanner) {
      setErrorBanner("");
    }
  };

  const handleSubmit = async (): Promise<void> => {
    setErrorBanner("");
    setFromNameError("");
    if (isSubmitting) {
      return;
    }

    if (!fromName.trim()) {
      setFromNameError(t("race.fromName.needName"));
      document.getElementById("from-name-input")?.focus();
      return;
    }
    if (isTriggerOccupied(context, occupiedMarks, mileTrigger, timeTrigger)) {
      setErrorBanner(
        context.deliverMode === "time"
          ? t("race.deliver.conflictBody.time")
          : t("race.deliver.conflictBody.mile")
      );
      return;
    }
    if (activeFormat === "voice" && !voiceBlob) {
      setErrorBanner(t("race.voice.needRecording"));
      return;
    }
    if (activeFormat === "text" && !textContent.trim()) {
      setErrorBanner(t("race.text.needMessage"));
      return;
    }
    if (activeFormat === "song" && !selectedTrack) {
      setErrorBanner(t("race.song.needTrack"));
      return;
    }
    if (activeFormat === "song" && selectedTrack && !selectedTrack.previewUrl) {
      setErrorBanner(t("race.song.needPreview"));
      return;
    }

    setIsSubmitting(true);
    setSubmitLockMode("sending");
    setSubmitLockError("");

    try {
      const result = await submitEvent(firebaseCtx, {
        format: activeFormat,
        fromName: fromName.trim(),
        mileTrigger: context.deliverMode === "mile" ? mileTrigger : undefined,
        timeTrigger: context.deliverMode === "time" ? timeTrigger : undefined,
        context: { ...context, name: runnerName },
        textContent: activeFormat === "text" ? textContent.trim() : undefined,
        track: activeFormat === "song" ? selectedTrack ?? undefined : undefined,
        voiceBlob:
          activeFormat === "voice" ? voiceBlob ?? undefined : undefined,
      });
      await shutdownFirestore(firebaseCtx);
      navigate(
        `/sent?event=${encodeURIComponent(result.eventId)}&raceId=${encodeURIComponent(context.raceId)}`,
        {
          replace: true,
        }
      );
    } catch (err) {
      console.error("[relay webform] send failed", err);
      const message = mapSubmitErrorMessage(err);
      setErrorBanner(message);
      setSubmitLockError(message);
      setSubmitLockMode("error");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page" id="app">
      <BrandHeader />

      <div
        id="race-form"
        inert={submitLockMode !== "hidden" ? true : undefined}
        aria-busy={submitLockMode === "sending" ? "true" : "false"}
      >
        <p className="eyebrow">{t("race.greeting.eyebrow")}</p>
        <h1 className="headline">
          {runnerName}, running {context.race}.
        </h1>
        <p className="lede">
          {context.deliverMode === "time"
            ? t("race.greeting.lede.time")
            : t("race.greeting.lede.mile")}
        </p>

        <FromNameField
          value={fromName}
          error={fromNameError}
          onChange={handleFromNameChange}
        />

        <FormatTabs activeFormat={activeFormat} onChange={handleFormatChange} />

        <VoicePanel
          isActive={activeFormat === "voice"}
          maxVoiceSeconds={config.maxVoiceSeconds}
          voiceBlob={voiceBlob}
          onVoiceBlobChange={setVoiceBlob}
          onError={setErrorBanner}
        />
        <TextPanel
          isActive={activeFormat === "text"}
          value={textContent}
          maxLength={config.maxTextLength}
          onChange={setTextContent}
        />
        <SongPanel
          isActive={activeFormat === "song"}
          config={config}
          selectedTrack={selectedTrack}
          onSelectTrack={setSelectedTrack}
          onError={setErrorBanner}
        />

        <DeliverCard
          context={context}
          mileTrigger={mileTrigger}
          timeTrigger={timeTrigger}
          occupiedMarks={occupiedMarks}
          onMileChange={handleMileChange}
          onTimeChange={handleTimeChange}
        />

        {errorBanner ? (
          <div className="error-banner" role="alert">
            {errorBanner}
          </div>
        ) : null}

        <button
          type="button"
          className="btn btn--primary"
          disabled={isSubmitting}
          onClick={() => void handleSubmit()}
        >
          <span>
            {isSubmitting ? (
              <>
                <span className="spinner" aria-hidden="true" />{" "}
                {t("race.submit.sending")}
              </>
            ) : (
              t("race.submit")
            )}
          </span>
        </button>
        <p className="footer-note">{footerNote}</p>
        <LegalNav showHome={false} tone="form" />
      </div>

      <SubmitLock
        mode={submitLockMode}
        errorMessage={submitLockError}
        onDismiss={handleDismissLock}
      />
    </main>
  );
}
