import type { FirebaseContext } from '@/shared/firebase';
import { scanFirestoreCollection } from '@/features/admin/lib/adminScanCollection';
import { countMessagesInRace } from '@/shared/firestore/userRaceMessageCounts';

const RACE_COUNT_BATCH_SIZE = 40;

export async function countAllPlatformRelayMessages(
  firebaseCtx: FirebaseContext
): Promise<number> {
  const races = await scanFirestoreCollection(firebaseCtx, 'races');
  if (races.length === 0) {
    return 0;
  }

  let total = 0;

  for (let offset = 0; offset < races.length; offset += RACE_COUNT_BATCH_SIZE) {
    const batch = races.slice(offset, offset + RACE_COUNT_BATCH_SIZE);
    const counts = await Promise.all(
      batch.map((race) => countMessagesInRace(firebaseCtx, race.id))
    );
    total += counts.reduce((sum, count) => sum + count, 0);
  }

  return total;
}
