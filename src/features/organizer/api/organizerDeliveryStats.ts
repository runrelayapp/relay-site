import type { FirebaseContext } from '@/shared/firebase';
import {
  fetchEventCodeDeliveryStats,
  type EventCodeDeliveryStats
} from '@/shared/firestore/eventCodeDeliveryStats';
import { normalizeEventCode } from '../lib/normalizeEventCode';
import {
  ORGANIZER_CACHE_KEYS,
  readOrganizerCache,
  type OrganizerCacheReadOptions
} from '../lib/organizerCache';

export type { EventCodeDeliveryStats };

export async function fetchOrganizerEventDeliveryStats(
  firebaseCtx: FirebaseContext,
  eventCode: string,
  options?: OrganizerCacheReadOptions
): Promise<EventCodeDeliveryStats> {
  const code = normalizeEventCode(eventCode);
  if (!code) {
    return {
      runnerCount: 0,
      messageCount: 0,
      supporterCount: 0,
      runnersWithSupporters: 0
    };
  }

  return readOrganizerCache(
    ORGANIZER_CACHE_KEYS.eventDeliveryStats(code),
    () => fetchEventCodeDeliveryStats(firebaseCtx, code, { force: options?.force }),
    options
  );
}
