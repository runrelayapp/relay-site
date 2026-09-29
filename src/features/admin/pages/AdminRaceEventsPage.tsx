import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { getFirebaseContext } from '@/shared/firebase';
import { Dialog, dialogStyles } from '@/shared/ui/dialog';
import { SkeletonStack } from '@/shared/ui/skeleton';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import {
  ADMIN_PAGE_SIZE,
  enrichAdminRacesWithRunners,
  fetchAdminRaceById,
  listAdminRaceEventsPage,
  type AdminPageResult
} from '../api/adminRacesRepository';
import { permanentlyDeleteAdminEvent } from '../api/adminDeleteEvent';
import type { AdminRaceEvent, AdminRaceSummary } from '../model/types';
import { ADMIN_CACHE_KEYS, peekAdminCache, writeAdminCache } from '../lib/adminCache';
import { AdminAudioPlayer } from '../ui/AdminAudioPlayer';
import { AdminRaceDetailPanel } from '../ui/AdminRaceDetailPanel';
import { AdminRaceOrganizerBroadcastSection } from '../ui/AdminRaceOrganizerBroadcastSection';
import { AdminShell } from '../ui/AdminShell';
import styles from '../styles/admin.module.css';
import { findOrganizerEventIdByCode } from '@/shared/firestore/eventCodeRegistry';
import { listOrganizerBroadcastMessages } from '@/features/organizer/api/organizerBroadcastMessagesRepository';
import type { OrganizerBroadcastMessage } from '@/shared/firestore/organizerBroadcastMessages';

function formatTrigger(event: AdminRaceEvent): string {
  if (event.deliverMode === 'time' && event.timeTrigger != null) {
    const minutes = Math.floor(event.timeTrigger / 60);
    const seconds = event.timeTrigger % 60;
    return t('admin.event.triggerTime', {
      time: `${minutes}:${String(seconds).padStart(2, '0')}`
    });
  }
  if (event.mileTrigger != null) {
    return t('admin.event.triggerMile', { mile: event.mileTrigger });
  }
  return t('admin.event.triggerUnknown');
}

function typeLabel(type: AdminRaceEvent['type']): string {
  switch (type) {
    case 'voice':
      return t('admin.event.type.voice');
    case 'text':
      return t('admin.event.type.text');
    case 'song':
      return t('admin.event.type.song');
    default:
      return t('admin.event.type.unknown');
  }
}

function filterRunnerRaceEvents(
  events: AdminRaceEvent[],
  organizerBroadcastIds: ReadonlySet<string>
): AdminRaceEvent[] {
  return events.filter((event) => {
    if (event.source === 'organizer_broadcast') {
      return false;
    }
    if (event.broadcastMessageId && organizerBroadcastIds.has(event.broadcastMessageId)) {
      return false;
    }
    if (organizerBroadcastIds.has(event.id)) {
      return false;
    }
    return true;
  });
}

async function loadOrganizerBroadcastsForRace(
  firebaseCtx: NonNullable<ReturnType<typeof getFirebaseContext>>,
  eventCode: string | null
): Promise<OrganizerBroadcastMessage[]> {
  const code = eventCode?.trim() ?? '';
  if (!code) {
    return [];
  }

  const organizerEventId = await findOrganizerEventIdByCode(firebaseCtx, code);
  if (!organizerEventId) {
    return [];
  }

  return listOrganizerBroadcastMessages(firebaseCtx, organizerEventId, { force: true });
}

export function AdminRaceEventsPage(): React.JSX.Element {
  const { raceId: raceIdParam } = useParams();
  const raceId = raceIdParam?.trim() ?? '';
  const cachedRace = peekAdminCache<AdminRaceSummary>(ADMIN_CACHE_KEYS.race(raceId));
  const cachedEvents = peekAdminCache<AdminPageResult<AdminRaceEvent>>(
    ADMIN_CACHE_KEYS.raceEvents(raceId)
  );
  const [race, setRace] = useState<AdminRaceSummary | null>(cachedRace);
  const [events, setEvents] = useState<AdminRaceEvent[]>(cachedEvents?.items ?? []);
  const [organizerBroadcasts, setOrganizerBroadcasts] = useState<OrganizerBroadcastMessage[]>(
    []
  );
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>(
    cachedRace && cachedEvents ? 'ready' : 'loading'
  );
  const [pendingDelete, setPendingDelete] = useState<AdminRaceEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(cachedEvents?.hasMore ?? false);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(
    cachedEvents?.cursor ?? null
  );

  const reload = useCallback(async (force = false): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !raceId) {
      setStatus('missing');
      return;
    }

    const cachedRace = peekAdminCache<AdminRaceSummary>(ADMIN_CACHE_KEYS.race(raceId));
    const cachedEvents = peekAdminCache<AdminPageResult<AdminRaceEvent>>(
      ADMIN_CACHE_KEYS.raceEvents(raceId)
    );
    if (cachedRace && cachedEvents && !force) {
      setRace(cachedRace);
      setEvents(cachedEvents.items);
      setHasMore(cachedEvents.hasMore);
      cursorRef.current = cachedEvents.cursor;
      setStatus('ready');
    } else {
      setStatus('loading');
    }
    setActionError('');
    cursorRef.current = null;

    try {
      const nextRace = await fetchAdminRaceById(firebaseCtx, raceId, { force: true });
      if (!nextRace) {
        setRace(null);
        setEvents([]);
        setHasMore(false);
        setStatus('missing');
        return;
      }

      const [enrichedRace] = await enrichAdminRacesWithRunners(firebaseCtx, [
        nextRace
      ]);

      const page = await listAdminRaceEventsPage(
        firebaseCtx,
        raceId,
        ADMIN_PAGE_SIZE,
        null,
        { force: true }
      );
      const resolvedRace = enrichedRace ?? nextRace;
      const broadcasts = await loadOrganizerBroadcastsForRace(
        firebaseCtx,
        resolvedRace.eventCode
      );
      setRace(resolvedRace);
      setEvents(page.items);
      setOrganizerBroadcasts(broadcasts);
      setHasMore(page.hasMore);
      cursorRef.current = page.cursor;
      writeAdminCache(ADMIN_CACHE_KEYS.race(raceId), resolvedRace);
      writeAdminCache(ADMIN_CACHE_KEYS.raceEvents(raceId), page);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [raceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleLoadMore = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !raceId || !hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const page = await listAdminRaceEventsPage(
        firebaseCtx,
        raceId,
        ADMIN_PAGE_SIZE,
        cursorRef.current
      );
      setEvents((current) => {
        const nextItems = [...current, ...page.items];
        writeAdminCache(ADMIN_CACHE_KEYS.raceEvents(raceId), {
          items: nextItems,
          hasMore: page.hasMore,
          cursor: page.cursor
        });
        return nextItems;
      });
      setHasMore(page.hasMore);
      cursorRef.current = page.cursor;
    } catch {
      setActionError(t('admin.race.loadError'));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !pendingDelete || !raceId) {
      return;
    }

    setIsDeleting(true);
    setActionError('');

    try {
      await permanentlyDeleteAdminEvent(
        firebaseCtx,
        raceId,
        pendingDelete.id,
        pendingDelete.type === 'voice' || Boolean(pendingDelete.mediaUrl)
      );
      setPendingDelete(null);
      setEvents((current) => current.filter((item) => item.id !== pendingDelete.id));
    } catch {
      setActionError(t('admin.event.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const organizerBroadcastIds = new Set(organizerBroadcasts.map((item) => item.id));
  const runnerEvents = filterRunnerRaceEvents(events, organizerBroadcastIds);

  return (
    <>
      <Link className={styles.backLink} to="/admin/races">
        {t('admin.backToRaces')}
      </Link>
      <AdminShell
        lede={t('admin.race.eventsLede')}
        title={race?.raceName ?? t('admin.race.fallbackTitle')}
      >
        {status === 'loading' ? (
          <SkeletonStack count={4} label={t('admin.loading')} />
        ) : null}
        {status === 'missing' ? <p className={styles.error}>{t('admin.race.missing')}</p> : null}
        {status === 'error' ? <p className={styles.error}>{t('admin.race.loadError')}</p> : null}
        {actionError ? <p className={styles.error}>{actionError}</p> : null}

        {status === 'ready' && race ? (
          <div className={styles.raceDetailSection}>
            <AdminRaceDetailPanel race={race} />
          </div>
        ) : null}

        {status === 'ready' && race?.eventCode ? (
          <AdminRaceOrganizerBroadcastSection messages={organizerBroadcasts} />
        ) : null}

        {status === 'ready' ? (
          <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              {hasMore
                ? t('admin.events.titlePaged', { count: runnerEvents.length })
                : t('admin.events.title', { count: runnerEvents.length })}
            </h2>
            <button
              className={styles.ghostButtonCompact}
              type="button"
              onClick={() => void reload(true)}
            >
              {t('admin.refresh')}
            </button>
          </div>

          {runnerEvents.length === 0 ? (
            <p className={`${styles.muted} ${consoleStyles.emptyPlaceholder}`}>
              {t('admin.events.empty')}
            </p>
          ) : (
            <ul className={styles.eventList}>
              {runnerEvents.map((event) => (
                <li className={styles.eventCard} key={event.id}>
                  <div className={styles.eventHeader}>
                    <span className={styles.typePill}>{typeLabel(event.type)}</span>
                    <span className={styles.eventFrom}>
                      {t('admin.event.from', { name: event.fromName || '—' })}
                    </span>
                  </div>
                  <p className={styles.eventMeta}>{formatTrigger(event)}</p>

                  {event.type === 'text' ? (
                    <p className={styles.eventBody}>
                      {event.textContent || t('admin.event.noText')}
                    </p>
                  ) : null}

                  {event.type === 'voice' ? (
                    <AdminAudioPlayer
                      emptyLabel={t('admin.player.noVoice')}
                      label={t('admin.player.playVoice')}
                      src={event.mediaUrl}
                    />
                  ) : null}

                  {event.type === 'song' ? (
                    <div className={styles.songBlock}>
                      {event.track?.albumArtUrl ? (
                        <img
                          alt=""
                          className={styles.albumArt}
                          height={56}
                          src={event.track.albumArtUrl}
                          width={56}
                        />
                      ) : null}
                      <div>
                        <p className={styles.songTitle}>
                          {event.track?.name ?? t('admin.event.unknownTrack')}
                        </p>
                        <p className={styles.mutedInline}>
                          {event.track?.artist ?? ''}
                        </p>
                        <AdminAudioPlayer
                          emptyLabel={t('admin.player.noPreview')}
                          label={t('admin.player.playSong')}
                          src={event.track?.previewUrl ?? null}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.eventActions}>
                    <code className={styles.codeSmall}>{event.id}</code>
                    <button
                      className={styles.dangerButtonCompact}
                      type="button"
                      onClick={() => setPendingDelete(event)}
                    >
                      {t('admin.event.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {hasMore ? (
            <div className={styles.pager}>
              <button
                className={styles.ghostButtonCompact}
                disabled={isLoadingMore}
                type="button"
                onClick={() => void handleLoadMore()}
              >
                {isLoadingMore ? t('admin.loadingMore') : t('admin.loadMore')}
              </button>
            </div>
          ) : null}
        </section>
        ) : null}
      </AdminShell>

      <Dialog
        closeLabel={t('admin.cancel')}
        description={t('admin.event.deleteBody', {
          name: pendingDelete?.fromName || '—'
        })}
        isOpen={pendingDelete != null}
        title={t('admin.event.deleteTitle')}
        tone="danger"
        onClose={() => {
          if (!isDeleting) {
            setPendingDelete(null);
          }
        }}
        actions={
          <>
            <button
              className={dialogStyles.dangerButton}
              disabled={isDeleting}
              type="button"
              onClick={() => void handleConfirmDelete()}
            >
              {isDeleting ? t('admin.event.deleting') : t('admin.event.deleteConfirm')}
            </button>
            <button
              className={dialogStyles.ghostButton}
              disabled={isDeleting}
              type="button"
              onClick={() => setPendingDelete(null)}
            >
              {t('admin.cancel')}
            </button>
          </>
        }
      />
    </>
  );
}
