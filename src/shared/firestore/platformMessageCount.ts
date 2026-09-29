import {
  collectionGroup,
  getCountFromServer,
  query
} from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';

/** Full platform total when Firestore collection-group aggregate is allowed (index + rules). */
export async function tryCountPlatformMessagesViaCollectionGroup(
  firebaseCtx: FirebaseContext
): Promise<number | null> {
  try {
    const snap = await getCountFromServer(
      query(collectionGroup(firebaseCtx.db, 'events'))
    );
    return snap.data().count;
  } catch {
    return null;
  }
}
