import { FirebaseError } from 'firebase/app';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { getFirebaseContext } from '@/shared/firebase';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import { ConsoleModal } from '@/shared/ui/console-modal';
import { ConsoleStatNumber } from '@/shared/ui/console-stat';
import { SkeletonStack } from '@/shared/ui/skeleton';
import adminStyles from '@/features/admin/styles/admin.module.css';
import {
  createOrganizerEvent,
  fetchOrganizerEvent
} from '../api/organizerEventsRepository';
import { listOrganizerBroadcastMessages } from '../api/organizerBroadcastMessagesRepository';
import { fetchOrganizerEventDeliveryStats } from '../api/organizerDeliveryStats';
import type { EventCodeDeliveryStats } from '../api/organizerDeliveryStats';
import { fetchEventCodeRegistryFields, parseEventCodeMessageLimit } from '@/shared/firestore/eventCodeRegistry';
import { clampOrganizerBroadcastLimit } from '@/shared/firestore/eventCodeBroadcasts';
import { invalidateEventCodeDeliveryStatsCache } from '@/shared/firestore/eventCodeDeliveryStats';
import { useOrganizerEventsList } from '../hooks/useOrganizerEventsList';
import type { OrganizerSession } from '../hooks/useOrganizerSession';
import {
  formatIsoDateForDisplay,
  initialsFromDisplayName,
  mapParticipantStatusKey
} from '../lib/organizerRunnerUtils';
import { ORGANIZER_EVENT_DISTANCE_DEFAULT, formatEventDistanceMiles } from '../lib/eventDistance';
import { ORGANIZER_CACHE_KEYS, peekOrganizerCache } from '../lib/organizerCache';
import { isOrganizerPortalTab } from '../model/portalTabs';
import type { OrganizerEvent, OrganizerEventParticipant } from '../model/types';
import type { OrganizerRaceMessage } from '../model/raceMessages';
import { ORGANIZER_RACE_MESSAGE_LIMIT } from '../model/raceMessages';
import { OrganizerCreateEventFields } from '../ui/OrganizerCreateEventFields';
import { OrganizerMessagesTab } from '../ui/OrganizerMessagesTab';
import { OrganizerPortalLayout } from '../ui/OrganizerPortalLayout';
import { OrganizerRunnersTable } from '../ui/OrganizerRunnersTable';

function mapCreateEventError(error: unknown): string {
  if (error instanceof FirebaseError && error.code === 'permission-denied') {
    return t('organizer.events.saveErrorPermission');
  }
  return t('organizer.events.saveError');
}

function participantStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return t('organizer.portal.status.finished');
    case 'active':
      return t('organizer.portal.status.running');
    case 'upcoming':
      return t('organizer.portal.status.notStarted');
    default:
      return t('organizer.participants.status.unknown');
  }
}

function participantStatusClass(status: string): string {
  const key = mapParticipantStatusKey(status);
  switch (key) {
    case 'finished':
      return `${consoleStyles.status} ${consoleStyles.statusFinished}`;
    case 'running':
      return `${consoleStyles.status} ${consoleStyles.statusRunning}`;
    default:
      return `${consoleStyles.status} ${consoleStyles.statusNotStarted}`;
  }
}

export function OrganizerPortalPage(): React.JSX.Element {
  const session = useOutletContext<OrganizerSession>();
  const navigate = useNavigate();
  const { eventId: routeEventId, tab: routeTab } = useParams<{
    eventId: string;
    tab?: string;
  }>();
  const eventId = routeEventId?.trim() ?? '';
  const organizerId = session.profile?.organizerId ?? '';

  const { events, isLoading: isEventsLoading, reloadEvents } = useOrganizerEventsList(organizerId);

  const tab = isOrganizerPortalTab(routeTab) ? routeTab : 'dashboard';
  if (routeTab && !isOrganizerPortalTab(routeTab)) {
    return <Navigate to={`/organizer/events/${eventId}/dashboard`} replace />;
  }

  const [event, setEvent] = useState<OrganizerEvent | null>(null);
  const [runnerCount, setRunnerCount] = useState(0);
  const [deliveryStats, setDeliveryStats] = useState<EventCodeDeliveryStats | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [detailError, setDetailError] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDate, setCreateDate] = useState('');
  const [createDistanceMiles, setCreateDistanceMiles] = useState(ORGANIZER_EVENT_DISTANCE_DEFAULT);
  const [createFormError, setCreateFormError] = useState('');
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const [selectedRunner, setSelectedRunner] = useState<OrganizerEventParticipant | null>(null);

  const [raceMessages, setRaceMessages] = useState<OrganizerRaceMessage[]>([]);
  const [messageLimit, setMessageLimit] = useState(ORGANIZER_RACE_MESSAGE_LIMIT);

  const layoutEvent = useMemo((): OrganizerEvent | null => {
    if (event) {
      return event;
    }
    const fromList = events.find((item) => item.id === eventId);
    if (fromList) {
      return fromList;
    }
    if (!eventId || !organizerId) {
      return null;
    }
    return {
      id: eventId,
      organizerId,
      name: t('organizer.portal.eventUnavailableTitle'),
      eventDate: '',
      eventCode: '—',
      distanceMiles: null,
      createdAtMs: null,
      updatedAtMs: null
    };
  }, [event, events, eventId, organizerId]);

  const hasEventData = event != null;

  useEffect(() => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !eventId || !organizerId) {
      setIsDetailLoading(false);
      setIsStatsLoading(false);
      setEvent(null);
      setRunnerCount(0);
      setDeliveryStats(null);
      setRaceMessages([]);
      setDetailError(t('organizer.events.notFound'));
      return;
    }

    let cancelled = false;
    setDetailError('');
    setIsStatsLoading(true);
    invalidateEventCodeDeliveryStatsCache();

    void (async () => {
      const warm = peekOrganizerCache<OrganizerEvent>(ORGANIZER_CACHE_KEYS.event(eventId));
      if (warm && !cancelled) {
        setEvent(warm);
      } else {
        setIsDetailLoading(true);
        setEvent(null);
        setRunnerCount(0);
        setDeliveryStats(null);
        setRaceMessages([]);
      }

      try {
        const loaded = await fetchOrganizerEvent(firebaseCtx, eventId, { force: true });
        if (cancelled) {
          return;
        }
        if (!loaded || loaded.organizerId !== organizerId) {
          setDetailError(t('organizer.events.notFound'));
          setEvent(null);
          setRunnerCount(0);
          setDeliveryStats(null);
          setRaceMessages([]);
          setIsStatsLoading(false);
          return;
        }
        setEvent(loaded);
        setDetailError('');
        setMessageLimit(ORGANIZER_RACE_MESSAGE_LIMIT);

        try {
          const registry = await fetchEventCodeRegistryFields(firebaseCtx, loaded.eventCode);
          if (!cancelled && registry) {
            setMessageLimit(
              clampOrganizerBroadcastLimit(
                parseEventCodeMessageLimit(registry.messageLimit)
              )
            );
          }
        } catch {
          // Keep the default portal limit if the registry cannot be read.
        }

        try {
          const [stats, broadcasts] = await Promise.all([
            fetchOrganizerEventDeliveryStats(firebaseCtx, loaded.eventCode, { force: true }),
            listOrganizerBroadcastMessages(firebaseCtx, eventId, { force: true })
          ]);
          if (!cancelled) {
            setRunnerCount(stats.runnerCount);
            setDeliveryStats(stats);
            setRaceMessages(broadcasts);
          }
        } catch {
          if (!cancelled) {
            setRunnerCount(0);
            setDeliveryStats(null);
            setRaceMessages([]);
          }
        } finally {
          if (!cancelled) {
            setIsStatsLoading(false);
          }
        }
      } catch {
        if (!cancelled) {
          setEvent(null);
          setDetailError(t('organizer.events.loadError'));
          setRunnerCount(0);
          setDeliveryStats(null);
          setRaceMessages([]);
          setIsStatsLoading(false);
        }
      } finally {
        if (!cancelled) {
          setIsDetailLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId, organizerId]);

  const openCreateEvent = (): void => {
    setCreateName('');
    setCreateDate('');
    setCreateDistanceMiles(ORGANIZER_EVENT_DISTANCE_DEFAULT);
    setCreateFormError('');
    setIsCreateOpen(true);
  };

  const handleCreateEvent = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    const profile = session.profile;
    const authUid = session.user?.uid;
    if (!firebaseCtx || !profile || !authUid) {
      return;
    }
    if (!createName.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(createDate.trim())) {
      setCreateFormError(t('organizer.events.validation'));
      return;
    }

    setIsSavingEvent(true);
    setCreateFormError('');
    try {
      const created = await createOrganizerEvent(firebaseCtx, {
        organizerId: profile.organizerId,
        authUid,
        organizerName: profile.name,
        organizerEmail: profile.email,
        name: createName,
        eventDate: createDate.trim(),
        distanceMiles: createDistanceMiles
      });
      setIsCreateOpen(false);
      await reloadEvents(true);
      void navigate(`/organizer/events/${created.id}/dashboard`);
    } catch (err) {
      setCreateFormError(mapCreateEventError(err));
    } finally {
      setIsSavingEvent(false);
    }
  };

  const eventsForSwitcher = useMemo(() => {
    if (!event) {
      return events;
    }
    if (events.some((item) => item.id === event.id)) {
      return events;
    }
    return [event, ...events];
  }, [event, events]);

  if (isEventsLoading && events.length === 0) {
    return (
      <div className={consoleStyles.container}>
        <SkeletonStack count={4} label={t('organizer.loading')} />
      </div>
    );
  }

  if (!layoutEvent) {
    return (
      <div className={consoleStyles.container}>
        <p className={adminStyles.error}>{detailError || t('organizer.events.notFound')}</p>
      </div>
    );
  }

  const eventBasePath = `/organizer/events/${layoutEvent.id}`;

  const eventUnavailableContent = (
    <div className={consoleStyles.panel}>
      <div className={consoleStyles.panelBody}>
        {isDetailLoading ? (
          <SkeletonStack count={3} label={t('organizer.loading')} />
        ) : (
          <>
            <p className={adminStyles.error}>{detailError || t('organizer.events.notFound')}</p>
            <p className={consoleStyles.helper}>{t('organizer.portal.eventLoadErrorHint')}</p>
            <p className={consoleStyles.helper}>{t('organizer.portal.eventLoadRetry')}</p>
          </>
        )}
      </div>
    </div>
  );

  let tabContent: React.JSX.Element;
  if (!hasEventData) {
    tabContent = eventUnavailableContent;
  } else if (tab === 'dashboard') {
    tabContent = (
      <>
        <h2 className={consoleStyles.sectionTitle}>{t('organizer.portal.dashboard.title')}</h2>
        <p className={consoleStyles.sectionSub}>{t('organizer.portal.dashboard.sub')}</p>
        <div className={`${consoleStyles.cards} ${consoleStyles.cardsFour}`}>
          <div className={consoleStyles.stat}>
            <div className={consoleStyles.statNum}>
              <ConsoleStatNumber isLoading={isStatsLoading} value={runnerCount} />
            </div>
            <div className={consoleStyles.statLabel}>{t('organizer.portal.stat.runners')}</div>
            <div className={consoleStyles.statSub}>{t('organizer.portal.stat.runnersSub')}</div>
          </div>
          <div className={consoleStyles.stat}>
            <div className={consoleStyles.statNum}>
              <ConsoleStatNumber
                isLoading={isStatsLoading}
                value={deliveryStats?.supporterCount}
              />
            </div>
            <div className={consoleStyles.statLabel}>{t('organizer.portal.stat.supporters')}</div>
            <div className={consoleStyles.statSub}>{t('organizer.portal.stat.supportersSub')}</div>
          </div>
          <div className={consoleStyles.stat}>
            <div className={consoleStyles.statNum}>
              <ConsoleStatNumber
                isLoading={isStatsLoading}
                value={deliveryStats?.messageCount}
              />
            </div>
            <div className={consoleStyles.statLabel}>{t('organizer.portal.stat.messages')}</div>
            <div className={consoleStyles.statSub}>{t('organizer.portal.stat.messagesSub')}</div>
          </div>
          <div className={consoleStyles.stat}>
            <div className={consoleStyles.statNum}>
              <ConsoleStatNumber
                isLoading={isStatsLoading}
                value={deliveryStats?.runnersWithSupporters}
              />
            </div>
            <div className={consoleStyles.statLabel}>{t('organizer.portal.stat.coverage')}</div>
            <div className={consoleStyles.statSub}>{t('organizer.portal.stat.coverageSub')}</div>
          </div>
        </div>
        <div className={consoleStyles.sectionRow}>
          <h2 className={consoleStyles.sectionTitle}>{t('organizer.portal.tab.runners')}</h2>
          <button
            className={consoleStyles.secondary}
            type="button"
            onClick={() => void navigate(`${eventBasePath}/runners`)}
          >
            {t('organizer.portal.viewAllRunners')}
          </button>
        </div>
        <OrganizerRunnersTable
          eventCode={event.eventCode}
          previewLimit={5}
          panelTitle={t('organizer.portal.latestRunners')}
          searchPlaceholder={t('organizer.portal.searchRunners')}
          onRowClick={setSelectedRunner}
        />
      </>
    );
  } else if (tab === 'runners') {
    tabContent = (
      <>
        <div className={consoleStyles.pageHead}>
          <h2>{t('organizer.portal.tab.runners')}</h2>
          <p>{t('organizer.portal.runners.lede')}</p>
        </div>
        <OrganizerRunnersTable
          countLabel={isStatsLoading ? undefined : String(runnerCount)}
          eventCode={event.eventCode}
          panelTitle={t('organizer.portal.allRunners')}
          searchPlaceholder={t('organizer.portal.searchRunners')}
          onRowClick={setSelectedRunner}
        />
      </>
    );
  } else if (tab === 'messages') {
    tabContent = (
      <OrganizerMessagesTab
        eventCode={event.eventCode}
        eventId={event.id}
        eventName={event.name}
        maxMileDistance={event.distanceMiles ?? undefined}
        messageLimit={messageLimit}
        messages={raceMessages}
        runnerCount={runnerCount}
        onMessagesChange={setRaceMessages}
      />
    );
  } else {
    tabContent = (
      <>
        <div className={consoleStyles.pageHead}>
          <h2>{t('organizer.portal.tab.event')}</h2>
          <p>{t('organizer.portal.event.lede')}</p>
        </div>
        <div className={consoleStyles.infoGrid}>
          <div className={consoleStyles.infoCard}>
            <h3>{t('organizer.portal.event.detailsTitle')}</h3>
            <div className={consoleStyles.infoRow}>
              <span>{t('organizer.events.field.name')}</span>
              <strong>{event.name}</strong>
            </div>
            <div className={consoleStyles.infoRow}>
              <span>{t('organizer.events.field.date')}</span>
              <strong>{formatIsoDateForDisplay(event.eventDate)}</strong>
            </div>
            <div className={consoleStyles.infoRow}>
              <span>{t('organizer.portal.event.code')}</span>
              <strong className={consoleStyles.eventCode}>{event.eventCode}</strong>
            </div>
            <div className={consoleStyles.infoRow}>
              <span>{t('organizer.portal.event.distance')}</span>
              <strong>
                {event.distanceMiles != null
                  ? t('organizer.events.distanceValue', {
                      miles: formatEventDistanceMiles(event.distanceMiles)
                    })
                  : '—'}
              </strong>
            </div>
          </div>
          <div className={consoleStyles.infoCard}>
            <h3>{t('organizer.portal.event.accountTitle')}</h3>
            <p className={`${consoleStyles.helper} ${consoleStyles.helperTight}`}>
              {t('organizer.portal.event.accountNote')}
            </p>
            <div className={consoleStyles.infoRow}>
              <span>{t('organizer.login.email')}</span>
              <strong>{session.profile?.email ?? session.user?.email ?? '—'}</strong>
            </div>
            <div className={consoleStyles.infoRow}>
              <span>{t('organizer.portal.event.access')}</span>
              <strong>{t('organizer.portal.event.accessOrganizer')}</strong>
            </div>
            <div className={consoleStyles.infoRow}>
              <span>{t('organizer.portal.stat.runners')}</span>
              <strong>
                <ConsoleStatNumber isLoading={isStatsLoading} value={runnerCount} />
              </strong>
            </div>
            <div className={consoleStyles.infoRow}>
              <span>{t('organizer.portal.event.messageLimit')}</span>
              <strong>{messageLimit}</strong>
            </div>
            <div className={consoleStyles.infoRow}>
              <span>{t('organizer.portal.event.messagesScheduled')}</span>
              <strong>
                <ConsoleStatNumber isLoading={isStatsLoading} value={raceMessages.length} />
              </strong>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <OrganizerPortalLayout
        activeTab={tab}
        currentEvent={layoutEvent}
        eventBasePath={eventBasePath}
        events={eventsForSwitcher}
        session={session}
        onAddEvent={openCreateEvent}
      >
        {tabContent}
      </OrganizerPortalLayout>

      <ConsoleModal
        hideFooter
        isOpen={hasEventData && selectedRunner != null}
        title={t('organizer.portal.runnerModal.title')}
        onClose={() => setSelectedRunner(null)}
      >
        {selectedRunner ? (
          <>
            <div className={consoleStyles.modalHero}>
              <div className={consoleStyles.avatarLg}>
                {initialsFromDisplayName(selectedRunner.displayName)}
              </div>
              <div>
                <div className={consoleStyles.modalHeroTitle}>{selectedRunner.displayName}</div>
                {selectedRunner.username ? (
                  <div className={consoleStyles.rowMuted}>@{selectedRunner.username}</div>
                ) : null}
              </div>
            </div>
            <div className={consoleStyles.detailGrid}>
              <div className={consoleStyles.detail}>
                <small>{t('organizer.portal.table.raceDate')}</small>
                <strong>{formatIsoDateForDisplay(selectedRunner.raceDate)}</strong>
              </div>
              <div className={consoleStyles.detail}>
                <small>{t('organizer.portal.table.status')}</small>
                <span className={participantStatusClass(selectedRunner.status)}>
                  {participantStatusLabel(selectedRunner.status)}
                </span>
              </div>
              <div className={consoleStyles.detail}>
                <small>{t('organizer.portal.table.supporters')}</small>
                <strong>{selectedRunner.supporterCount}</strong>
              </div>
              <div className={consoleStyles.detail}>
                <small>{t('organizer.portal.table.messages')}</small>
                <strong>{selectedRunner.messageCount}</strong>
              </div>
            </div>
            <div className={consoleStyles.modalFoot}>
              <button
                className={consoleStyles.secondary}
                type="button"
                onClick={() => setSelectedRunner(null)}
              >
                {t('organizer.portal.runnerModal.close')}
              </button>
            </div>
          </>
        ) : null}
      </ConsoleModal>

      <ConsoleModal
        isOpen={isCreateOpen}
        isSaving={isSavingEvent}
        saveLabel={t('organizer.events.create')}
        title={t('organizer.events.createTitle')}
        onClose={() => {
          if (!isSavingEvent) {
            setIsCreateOpen(false);
          }
        }}
        onSave={() => void handleCreateEvent()}
      >
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void handleCreateEvent();
          }}
        >
          <OrganizerCreateEventFields
            dateInputId="organizer-create-date"
            distanceMiles={createDistanceMiles}
            eventDate={createDate}
            formError={createFormError}
            name={createName}
            nameInputId="organizer-create-name"
            onDistanceChange={setCreateDistanceMiles}
            onEventDateChange={setCreateDate}
            onNameChange={setCreateName}
          />
        </form>
      </ConsoleModal>
    </>
  );
}
