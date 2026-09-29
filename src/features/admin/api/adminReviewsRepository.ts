import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp
} from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';
import {
  ADMIN_CACHE_KEYS,
  readAdminCache,
  type AdminCacheReadOptions
} from '../lib/adminCache';
import { filterAdminReview } from '../lib/adminTableFilter';
import { scanFirestoreCollection } from '../lib/adminScanCollection';
import type { AdminReview } from '../model/types';
import { ADMIN_PAGE_SIZE, toPageResult, type AdminPageResult } from './adminRacesRepository';

const COLLECTION = 'raceFeedback';

function toMillis(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as Timestamp).toMillis === 'function'
  ) {
    return (value as Timestamp).toMillis();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function clampRating(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(5, Math.max(1, Math.round(value)));
  }
  return 0;
}

function mapReview(id: string, data: DocumentData): AdminReview {
  return {
    id,
    userId: typeof data.userId === 'string' ? data.userId : '',
    raceId: typeof data.raceId === 'string' ? data.raceId : '',
    rating: clampRating(data.rating),
    comment: typeof data.comment === 'string' ? data.comment.trim() : '',
    createdAtMs: toMillis(data.createdAt),
    runnerUsername: null,
    runnerFullName: null,
    runnerEmail: null,
    raceName: null,
    raceDate: null
  };
}

async function enrichReviews(
  firebaseCtx: FirebaseContext,
  reviews: AdminReview[]
): Promise<AdminReview[]> {
  if (reviews.length === 0) {
    return [];
  }

  const userIds = [...new Set(reviews.map((item) => item.userId).filter(Boolean))];
  const raceIds = [...new Set(reviews.map((item) => item.raceId).filter(Boolean))];

  const [users, races] = await Promise.all([
    Promise.all(
      userIds.map(async (userId) => {
        try {
          const snap = await getDoc(doc(firebaseCtx.db, 'users', userId));
          if (!snap.exists()) {
            return [userId, null] as const;
          }
          const data = snap.data();
          return [
            userId,
            {
              username: typeof data.username === 'string' ? data.username : '',
              fullName: typeof data.fullName === 'string' ? data.fullName : '',
              email: typeof data.email === 'string' ? data.email : null
            }
          ] as const;
        } catch {
          return [userId, null] as const;
        }
      })
    ),
    Promise.all(
      raceIds.map(async (raceId) => {
        try {
          const snap = await getDoc(doc(firebaseCtx.db, 'races', raceId));
          if (!snap.exists()) {
            return [raceId, null] as const;
          }
          const data = snap.data();
          return [
            raceId,
            {
              raceName:
                typeof data.raceName === 'string' && data.raceName.trim()
                  ? data.raceName.trim()
                  : '',
              raceDate: typeof data.raceDate === 'string' ? data.raceDate : ''
            }
          ] as const;
        } catch {
          return [raceId, null] as const;
        }
      })
    )
  ]);

  const usersById = new Map(users);
  const racesById = new Map(races);

  return reviews.map((review) => {
    const user = usersById.get(review.userId);
    const race = racesById.get(review.raceId);

    return {
      ...review,
      runnerUsername: user?.username || null,
      runnerFullName: user?.fullName || null,
      runnerEmail: user?.email ?? null,
      raceName: race?.raceName || null,
      raceDate: race?.raceDate || null
    };
  });
}

export async function fetchAdminReviewById(
  firebaseCtx: FirebaseContext,
  reviewId: string,
  options?: AdminCacheReadOptions
): Promise<AdminReview | null> {
  const id = reviewId.trim();
  if (!id) {
    return null;
  }

  return readAdminCache(
    ADMIN_CACHE_KEYS.review(id),
    async () => {
      const snap = await getDoc(doc(firebaseCtx.db, COLLECTION, id));
      if (!snap.exists()) {
        return null;
      }
      const [enriched] = await enrichReviews(firebaseCtx, [
        mapReview(snap.id, snap.data())
      ]);
      return enriched ?? null;
    },
    options
  );
}

export async function listRecentAdminReviewsPage(
  firebaseCtx: FirebaseContext,
  pageSize = ADMIN_PAGE_SIZE,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<AdminPageResult<AdminReview>> {
  const fetchLimit = pageSize + 1;

  try {
    const reviewsQuery = cursor
      ? query(
          collection(firebaseCtx.db, COLLECTION),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(fetchLimit)
        )
      : query(
          collection(firebaseCtx.db, COLLECTION),
          orderBy('createdAt', 'desc'),
          limit(fetchLimit)
        );
    const snap = await getDocs(reviewsQuery);
    const page = toPageResult(snap.docs, pageSize, (item) =>
      mapReview(item.id, item.data())
    );
    return {
      ...page,
      items: await enrichReviews(firebaseCtx, page.items)
    };
  } catch {
    const reviewsQuery = cursor
      ? query(
          collection(firebaseCtx.db, COLLECTION),
          startAfter(cursor),
          limit(fetchLimit)
        )
      : query(collection(firebaseCtx.db, COLLECTION), limit(fetchLimit));
    const snap = await getDocs(reviewsQuery);
    const page = toPageResult(snap.docs, pageSize, (item) =>
      mapReview(item.id, item.data())
    );
    return {
      ...page,
      items: await enrichReviews(firebaseCtx, page.items)
    };
  }
}

async function searchAdminReviewsUncached(
  firebaseCtx: FirebaseContext,
  rawQuery: string
): Promise<AdminReview[]> {
  const q = rawQuery.trim();
  if (!q) {
    return [];
  }

  const docs = await scanFirestoreCollection(firebaseCtx, COLLECTION);
  const mapped = docs.map((item) => mapReview(item.id, item.data));
  const matches = mapped.filter((item) => filterAdminReview(item, q));
  const enriched = await enrichReviews(firebaseCtx, matches);

  return enriched.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

export async function searchAdminReviews(
  firebaseCtx: FirebaseContext,
  rawQuery: string
): Promise<AdminReview[]> {
  const q = rawQuery.trim();
  if (!q) {
    return [];
  }

  return readAdminCache(ADMIN_CACHE_KEYS.reviewsSearch(q), () =>
    searchAdminReviewsUncached(firebaseCtx, q)
  );
}
