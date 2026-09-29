import type { FirebaseContext } from '@/shared/firebase';
import {
  fetchEventCodeDeliveryStats,
  fetchOrganizerEventDateByCode,
  type EventCodeDeliveryStats
} from '@/shared/firestore/eventCodeDeliveryStats';
import { parseEventCodeMessageLimit } from '@/shared/firestore/eventCodeRegistry';
import { ADMIN_CACHE_KEYS, readAdminCache } from '../lib/adminCache';
import type { AdminEventCode, AdminOrganizer } from '../model/types';

export interface AdminOrganizerRowStats {
  eventCount: number;
  runnerCount: number;
  messageCount: number;
}

export interface AdminEventCodeRowStats {
  eventDate: string | null;
  runnerCount: number;
  messageLimit: number;
  isActive: boolean;
}

export const ADMIN_ORGANIZER_BROADCAST_MESSAGE_LIMIT = 10;

function groupCodesByOrganizerId(codes: AdminEventCode[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const item of codes) {
    const organizerId = item.organizerId?.trim();
    if (!organizerId) {
      continue;
    }
    const list = map.get(organizerId) ?? [];
    list.push(item.code);
    map.set(organizerId, list);
  }
  return map;
}

async function sumStatsForCodes(
  firebaseCtx: FirebaseContext,
  codes: string[]
): Promise<{ runnerCount: number; messageCount: number }> {
  if (codes.length === 0) {
    return { runnerCount: 0, messageCount: 0 };
  }

  const stats = await Promise.all(
    codes.map((code) =>
      readAdminCache(ADMIN_CACHE_KEYS.deliveryStatsByCode(code), () =>
        fetchEventCodeDeliveryStats(firebaseCtx, code, { force: true })
      )
    )
  );

  return stats.reduce(
    (acc, item) => ({
      runnerCount: acc.runnerCount + item.runnerCount,
      messageCount: acc.messageCount + item.messageCount
    }),
    { runnerCount: 0, messageCount: 0 }
  );
}

export async function fetchAdminOrganizerRowStatsMap(
  firebaseCtx: FirebaseContext,
  organizers: AdminOrganizer[],
  allEventCodes: AdminEventCode[]
): Promise<Map<string, AdminOrganizerRowStats>> {
  const codesByOrganizer = groupCodesByOrganizerId(allEventCodes);
  const entries = await Promise.all(
    organizers.map(async (organizer) => {
      const codes = codesByOrganizer.get(organizer.id) ?? [];
      const totals = await sumStatsForCodes(firebaseCtx, codes);
      return [
        organizer.id,
        {
          eventCount: codes.length,
          runnerCount: totals.runnerCount,
          messageCount: totals.messageCount
        }
      ] as const;
    })
  );

  return new Map(entries);
}

export async function fetchAdminEventCodeRowStats(
  firebaseCtx: FirebaseContext,
  code: AdminEventCode
): Promise<AdminEventCodeRowStats> {
  const delivery = await readAdminCache(
    ADMIN_CACHE_KEYS.deliveryStatsByCode(code.code),
    () => fetchEventCodeDeliveryStats(firebaseCtx, code.code, { force: true })
  );

  const eventDate =
    code.eventDate ?? (await fetchOrganizerEventDateByCode(firebaseCtx, code.code));

  return {
    eventDate,
    runnerCount: delivery.runnerCount,
    messageLimit: parseEventCodeMessageLimit(code.messageLimit),
    isActive: true
  };
}

export async function fetchAdminEventCodeRowStatsMap(
  firebaseCtx: FirebaseContext,
  codes: AdminEventCode[]
): Promise<Map<string, AdminEventCodeRowStats>> {
  const entries = await Promise.all(
    codes.map(async (code) => [code.code, await fetchAdminEventCodeRowStats(firebaseCtx, code)] as const)
  );
  return new Map(entries);
}

export type { EventCodeDeliveryStats };
