import type { OrganizerBroadcastMessage } from '@/shared/firestore/organizerBroadcastMessages';
import { t } from '@/shared/lib/i18n';
import { AdminAudioPlayer } from './AdminAudioPlayer';
import styles from '../styles/admin.module.css';

export interface AdminRaceOrganizerBroadcastSectionProps {
  messages: OrganizerBroadcastMessage[];
}

function organizerStatusLabel(status: OrganizerBroadcastMessage['status']): string {
  return status === 'sent'
    ? t('admin.race.organizerMessages.statusSent')
    : t('admin.race.organizerMessages.statusScheduled');
}

export function AdminRaceOrganizerBroadcastSection({
  messages
}: AdminRaceOrganizerBroadcastSectionProps): React.JSX.Element {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          {t('admin.race.organizerMessages.title', { count: messages.length })}
        </h2>
      </div>

      {messages.length === 0 ? (
        <p className={styles.muted}>{t('admin.race.organizerMessages.empty')}</p>
      ) : (
        <ul className={styles.eventList}>
          {messages.map((message) => {
            const hasText = message.text.trim().length > 0;
            const hasAudio = Boolean(message.mediaUrl?.trim());

            return (
              <li className={`${styles.eventCard} ${styles.eventCardOrganizer}`} key={message.id}>
                <div className={styles.eventHeader}>
                  <span className={`${styles.typePill} ${styles.typePillOrganizer}`}>
                    {t('admin.race.organizerMessages.badge')}
                  </span>
                  <span className={styles.eventFrom}>
                    {organizerStatusLabel(message.status)}
                  </span>
                </div>
                <p className={styles.eventMeta}>
                  {message.mile.trim() || t('admin.event.triggerUnknown')}
                </p>

                {hasText ? <p className={styles.eventBody}>{message.text}</p> : null}

                {hasAudio ? (
                  <AdminAudioPlayer
                    emptyLabel={t('admin.player.noVoice')}
                    label={t('admin.player.playVoice')}
                    src={message.mediaUrl}
                  />
                ) : null}

                {!hasText && !hasAudio ? (
                  <p className={styles.mutedInline}>{t('admin.event.noText')}</p>
                ) : null}

                <div className={styles.eventActions}>
                  <code className={styles.codeSmall}>{message.id}</code>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
