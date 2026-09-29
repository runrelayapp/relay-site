import { useEffect, useState } from "react";
import { getFirebaseContext } from "@/shared/firebase";
import { fetchEventCodeDeliveryStats } from "@/shared/firestore/eventCodeDeliveryStats";
import {
  findOrganizerEventIdByCode,
  parseEventCodeMessageLimit,
} from "@/shared/firestore/eventCodeRegistry";
import { clampOrganizerBroadcastLimit } from "@/shared/firestore/eventCodeBroadcasts";
import { listOrganizerBroadcastMessages } from "@/features/organizer/api/organizerBroadcastMessagesRepository";
import { OrganizerMessagesTab } from "@/features/organizer/ui/OrganizerMessagesTab";
import { t } from "@/shared/lib/i18n";
import consoleStyles from "@/shared/styles/console.module.css";
import styles from "../styles/admin.module.css";
import type { OrganizerRaceMessage } from "@/features/organizer/model/raceMessages";

export interface AdminEventCodeMessagesPanelProps {
  eventCode: string;
  eventName: string;
  messageLimit: number;
}

export function AdminEventCodeMessagesPanel({
  eventCode,
  eventName,
  messageLimit,
}: AdminEventCodeMessagesPanelProps): React.JSX.Element {
  const [organizerEventId, setOrganizerEventId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OrganizerRaceMessage[]>([]);
  const [runnerCount, setRunnerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const firebaseCtx = getFirebaseContext();
    const code = eventCode.trim();
    if (!firebaseCtx || !code) {
      setIsLoading(false);
      setLoadError(t("admin.unavailable"));
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError("");

    void (async () => {
      try {
        const eventId = await findOrganizerEventIdByCode(firebaseCtx, code);
        if (cancelled) {
          return;
        }
        if (!eventId) {
          setOrganizerEventId(null);
          setMessages([]);
          setRunnerCount(0);
          setLoadError(t("admin.eventCodes.messagesNoPortalEvent"));
          return;
        }

        setOrganizerEventId(eventId);
        const [stats, broadcasts] = await Promise.all([
          fetchEventCodeDeliveryStats(firebaseCtx, code, { force: true }),
          listOrganizerBroadcastMessages(firebaseCtx, eventId, { force: true }),
        ]);
        if (!cancelled) {
          setRunnerCount(stats.runnerCount);
          setMessages(broadcasts);
          setLoadError("");
        }
      } catch {
        if (!cancelled) {
          setLoadError(t("admin.eventCodes.messagesLoadError"));
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventCode, eventName, messageLimit]);

  if (isLoading) {
    return <p className={styles.muted}>{t("admin.loading")}</p>;
  }

  if (loadError || !organizerEventId) {
    return (
      <p className={styles.muted}>
        {loadError || t("admin.eventCodes.messagesNoPortalEvent")}
      </p>
    );
  }

  const resolvedLimit = clampOrganizerBroadcastLimit(
    parseEventCodeMessageLimit(messageLimit)
  );

  return (
    <div className={consoleStyles.modalMessagesSection}>
      <OrganizerMessagesTab
        embedded
        eventCode={eventCode}
        eventId={organizerEventId}
        eventName={eventName}
        maxMileDistance={undefined}
        messageLimit={resolvedLimit}
        messages={messages}
        runnerCount={runnerCount}
        onMessagesChange={setMessages}
      />
    </div>
  );
}
