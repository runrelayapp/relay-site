import { collection, getDocs } from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';
import type { DeliverMode } from '../model/types';

export interface RaceDeliveryMark {
  id: string;
  /** Miles when deliverMode is mile. */
  mileTrigger?: number;
  /** Seconds when deliverMode is time. */
  timeTrigger?: number;
}

/**
 * Loads existing delivery points for the timeline (invite link = capability).
 * Only mile/time triggers are used in the UI.
 */
export async function listRaceDeliveryMarks(
  firebaseCtx: FirebaseContext | null,
  raceId: string,
  deliverMode: DeliverMode
): Promise<RaceDeliveryMark[]> {
  if (!firebaseCtx || !raceId.trim()) {
    return [];
  }

  const snapshot = await getDocs(
    collection(firebaseCtx.db, 'races', raceId.trim(), 'events')
  );

  const marks: RaceDeliveryMark[] = [];

  for (const eventDoc of snapshot.docs) {
    const data = eventDoc.data() as Record<string, unknown>;
    if (deliverMode === 'time') {
      if (typeof data.timeTrigger === 'number' && Number.isFinite(data.timeTrigger)) {
        marks.push({ id: eventDoc.id, timeTrigger: data.timeTrigger });
      }
      continue;
    }

    if (typeof data.mileTrigger === 'number' && Number.isFinite(data.mileTrigger)) {
      marks.push({ id: eventDoc.id, mileTrigger: data.mileTrigger });
    }
  }

  return marks;
}
