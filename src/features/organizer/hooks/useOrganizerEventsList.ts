import { useCallback, useEffect, useState } from 'react';
import { getFirebaseContext } from '@/shared/firebase';
import { t } from '@/shared/lib/i18n';
import { listOrganizerEvents } from '../api/organizerEventsRepository';
import { ORGANIZER_CACHE_KEYS, peekOrganizerCache } from '../lib/organizerCache';
import type { OrganizerEvent } from '../model/types';

interface UseOrganizerEventsListResult {
  events: OrganizerEvent[];
  isLoading: boolean;
  error: string;
  reloadEvents: (force?: boolean) => Promise<void>;
}

export function useOrganizerEventsList(organizerId: string): UseOrganizerEventsListResult {
  const cachedEvents = organizerId
    ? peekOrganizerCache<OrganizerEvent[]>(ORGANIZER_CACHE_KEYS.eventsList(organizerId))
    : null;
  const [events, setEvents] = useState<OrganizerEvent[]>(cachedEvents ?? []);
  const [isLoading, setIsLoading] = useState(Boolean(organizerId) && cachedEvents == null);
  const [error, setError] = useState('');

  const reloadEvents = useCallback(
    async (force = false): Promise<void> => {
      const firebaseCtx = getFirebaseContext();
      if (!firebaseCtx || !organizerId) {
        setIsLoading(false);
        setEvents([]);
        return;
      }

      const cached = peekOrganizerCache<OrganizerEvent[]>(
        ORGANIZER_CACHE_KEYS.eventsList(organizerId)
      );
      if (cached && !force) {
        setEvents(cached);
        setIsLoading(false);
      } else if (!cached) {
        setIsLoading(true);
      }

      try {
        const items = await listOrganizerEvents(firebaseCtx, organizerId, { force: true });
        setEvents(items);
        setError('');
      } catch {
        if (!cached) {
          setError(t('organizer.events.listError'));
          setEvents([]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [organizerId]
  );

  useEffect(() => {
    void reloadEvents();
  }, [reloadEvents]);

  return { events, isLoading, error, reloadEvents };
}
