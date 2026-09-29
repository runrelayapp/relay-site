import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';

const SCAN_BATCH_SIZE = 400;

export async function scanFirestoreCollection(
  firebaseCtx: FirebaseContext,
  collectionPath: string
): Promise<Array<{ id: string; data: DocumentData }>> {
  const results: Array<{ id: string; data: DocumentData }> = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null;

  for (;;) {
    const pageQuery: Query<DocumentData> = cursor
      ? query(
          collection(firebaseCtx.db, collectionPath),
          orderBy(documentId()),
          startAfter(cursor),
          limit(SCAN_BATCH_SIZE)
        )
      : query(
          collection(firebaseCtx.db, collectionPath),
          orderBy(documentId()),
          limit(SCAN_BATCH_SIZE)
        );

    const snap = await getDocs(pageQuery);
    if (snap.empty) {
      break;
    }

    for (const item of snap.docs) {
      results.push({ id: item.id, data: item.data() });
    }

    if (snap.docs.length < SCAN_BATCH_SIZE) {
      break;
    }

    cursor = snap.docs[snap.docs.length - 1] ?? null;
  }

  return results;
}
