import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData
} from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';

export interface EventCodeRegistryFields {
  messageLimit: number;
  eventDate: string | null;
  distanceMiles: number | null;
}

export const MAX_EVENT_CODE_MESSAGE_LIMIT = 100;

export function parseEventCodeMessageLimit(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
    return Math.min(MAX_EVENT_CODE_MESSAGE_LIMIT, Math.floor(value));
  }
  return 10;
}

/** Default limit when an organizer creates an event from the portal (not admin). */
export const DEFAULT_ORGANIZER_EVENT_MESSAGE_LIMIT = 1;

export function mapEventCodeRegistryFields(data: DocumentData): EventCodeRegistryFields {
  return {
    messageLimit: parseEventCodeMessageLimit(data.messageLimit),
    eventDate: typeof data.eventDate === 'string' ? data.eventDate : null,
    distanceMiles:
      typeof data.distanceMiles === 'number' && Number.isFinite(data.distanceMiles)
        ? data.distanceMiles
        : null
  };
}

export async function fetchEventCodeRegistryFields(
  firebaseCtx: FirebaseContext,
  eventCode: string
): Promise<EventCodeRegistryFields | null> {
  const code = eventCode.trim().toUpperCase();
  if (!code) {
    return null;
  }

  const snap = await getDoc(doc(firebaseCtx.db, 'eventCodes', code));
  if (!snap.exists()) {
    return null;
  }
  return mapEventCodeRegistryFields(snap.data());
}

export async function findOrganizerEventIdByCode(
  firebaseCtx: FirebaseContext,
  eventCode: string
): Promise<string | null> {
  const code = eventCode.trim().toUpperCase();
  if (!code) {
    return null;
  }

  try {
    const snap = await getDocs(
      query(
        collection(firebaseCtx.db, 'organizerEvents'),
        where('eventCode', '==', code),
        limit(1)
      )
    );
    return snap.docs[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function syncOrganizerEventMetadataForCode(
  firebaseCtx: FirebaseContext,
  eventCode: string,
  patch: {
    name?: string;
    eventDate?: string;
    distanceMiles?: number | null;
  }
): Promise<void> {
  const eventId = await findOrganizerEventIdByCode(firebaseCtx, eventCode);
  if (!eventId) {
    return;
  }

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp()
  };

  if (typeof patch.name === 'string' && patch.name.trim()) {
    payload.name = patch.name.trim();
  }
  if (typeof patch.eventDate === 'string' && patch.eventDate.trim()) {
    payload.eventDate = patch.eventDate.trim();
  }
  if (patch.distanceMiles != null && Number.isFinite(patch.distanceMiles)) {
    payload.distanceMiles = patch.distanceMiles;
  }

  await setDoc(doc(firebaseCtx.db, 'organizerEvents', eventId), payload, { merge: true });
}

export async function ensureOrganizerEventForAdminCode(
  firebaseCtx: FirebaseContext,
  input: {
    eventCode: string;
    organizerId: string;
    eventName: string;
    eventDate: string;
    distanceMiles: number;
  }
): Promise<string> {
  const existingId = await findOrganizerEventIdByCode(firebaseCtx, input.eventCode);
  if (existingId) {
    return existingId;
  }

  const ref = doc(collection(firebaseCtx.db, 'organizerEvents'));
  const batch = writeBatch(firebaseCtx.db);
  batch.set(ref, {
    organizerId: input.organizerId,
    name: input.eventName,
    eventDate: input.eventDate,
    eventCode: input.eventCode,
    distanceMiles: input.distanceMiles,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await batch.commit();

  return ref.id;
}
