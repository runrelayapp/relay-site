import type { FirebaseContext } from '@/shared/firebase';
import {
  fetchPlatformLifetimeStats,
  persistPlatformLifetimeHighWater,
  type PlatformLifetimeStats
} from '@/shared/firestore/platformLifetimeStats';
import { tryCountPlatformMessagesViaCollectionGroup } from '@/shared/firestore/platformMessageCount';
import {
  ADMIN_CACHE_KEYS,
  readAdminCache,
  type AdminCacheReadOptions
} from '../lib/adminCache';
import { fetchAdminPlatformCounts } from './adminPlatformCounts';
import { countAllPlatformRelayMessages } from './adminPlatformMessageCount';

export interface AdminPlatformMessageCount {
  total: number;
  isSample: boolean;
}

export interface AdminOverviewLifetimeStats {
  organizers: number;
  eventCodes: number;
  users: number;
  races: number;
  messagesSent: number;
}

export async function countAdminPlatformMessages(
  firebaseCtx: FirebaseContext,
  options?: AdminCacheReadOptions
): Promise<AdminPlatformMessageCount> {
  return readAdminCache(
    ADMIN_CACHE_KEYS.overviewMessagesTotal,
    async () => {
      const viaGroup = await tryCountPlatformMessagesViaCollectionGroup(firebaseCtx);
      if (viaGroup != null) {
        return { total: viaGroup, isSample: false };
      }

      const total = await countAllPlatformRelayMessages(firebaseCtx);
      return { total, isSample: false };
    },
    options
  );
}

function toOverviewStats(stats: PlatformLifetimeStats): AdminOverviewLifetimeStats {
  return {
    organizers: stats.organizersCreated,
    eventCodes: stats.eventCodesCreated,
    users: stats.usersCreated,
    races: stats.racesCreated,
    messagesSent: stats.messagesCreated
  };
}

export async function fetchAdminOverviewLifetimeStats(
  firebaseCtx: FirebaseContext,
  options?: AdminCacheReadOptions
): Promise<AdminOverviewLifetimeStats> {
  return readAdminCache(
    ADMIN_CACHE_KEYS.overviewStats,
    async () => {
      const [platformCounts, messages, stored] = await Promise.all([
        fetchAdminPlatformCounts(firebaseCtx, { force: true }),
        countAdminPlatformMessages(firebaseCtx, { force: true }),
        fetchPlatformLifetimeStats(firebaseCtx.db).catch(() => null)
      ]);

      const live: PlatformLifetimeStats = {
        organizersCreated: platformCounts.organizers,
        eventCodesCreated: platformCounts.eventCodes,
        usersCreated: platformCounts.users,
        racesCreated: platformCounts.races,
        messagesCreated: messages.total
      };

      try {
        return toOverviewStats(
          await persistPlatformLifetimeHighWater(firebaseCtx.db, live)
        );
      } catch {
        if (stored == null) {
          return toOverviewStats(live);
        }
        return toOverviewStats({
          organizersCreated: Math.max(stored.organizersCreated, live.organizersCreated),
          eventCodesCreated: Math.max(stored.eventCodesCreated, live.eventCodesCreated),
          usersCreated: Math.max(stored.usersCreated, live.usersCreated),
          racesCreated: Math.max(stored.racesCreated, live.racesCreated),
          messagesCreated: Math.max(stored.messagesCreated, live.messagesCreated)
        });
      }
    },
    options
  );
}
