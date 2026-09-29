import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData
} from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';
import {
  publishOrganizerBroadcastToEventCode,
  removeOrganizerBroadcastFromEventCode
} from '@/shared/firestore/eventCodeBroadcasts';

export type OrganizerBroadcastMessageStatus = 'scheduled' | 'sent';

export interface OrganizerBroadcastMessage {
  id: string;
  mile: string;
  text: string;
  status: OrganizerBroadcastMessageStatus;
  mediaUrl: string | null;
}

export interface OrganizerBroadcastDeliveryContext {
  eventCode: string;
  deliveryFromName: string;
}

function mapBroadcastMessage(id: string, data: DocumentData): OrganizerBroadcastMessage {
  const statusRaw = data.status;
  const status: OrganizerBroadcastMessageStatus =
    statusRaw === 'sent' ? 'sent' : 'scheduled';

  return {
    id,
    mile: typeof data.mile === 'string' ? data.mile : '',
    text: typeof data.text === 'string' ? data.text : '',
    status,
    mediaUrl: typeof data.mediaUrl === 'string' ? data.mediaUrl : null
  };
}

export async function listOrganizerBroadcastMessagesUncached(
  firebaseCtx: FirebaseContext,
  eventId: string
): Promise<OrganizerBroadcastMessage[]> {
  const id = eventId.trim();
  if (!id) {
    return [];
  }

  try {
    const snap = await getDocs(
      query(
        collection(firebaseCtx.db, 'organizerEvents', id, 'broadcastMessages'),
        orderBy('createdAt', 'desc')
      )
    );
    return snap.docs.map((item) => mapBroadcastMessage(item.id, item.data()));
  } catch {
    const snap = await getDocs(
      collection(firebaseCtx.db, 'organizerEvents', id, 'broadcastMessages')
    );
    const items = snap.docs.map((item) => mapBroadcastMessage(item.id, item.data()));
    items.sort((a, b) => b.mile.localeCompare(a.mile));
    return items;
  }
}

export interface UpsertOrganizerBroadcastMessageInput {
  id?: string;
  mile: string;
  text: string;
  status: OrganizerBroadcastMessageStatus;
  mediaUrl?: string;
  clearMediaUrl?: boolean;
  delivery?: OrganizerBroadcastDeliveryContext;
}

export interface UpsertOrganizerBroadcastMessageResult {
  message: OrganizerBroadcastMessage;
  raceSyncFailed: boolean;
}

export async function upsertOrganizerBroadcastMessage(
  firebaseCtx: FirebaseContext,
  eventId: string,
  input: UpsertOrganizerBroadcastMessageInput
): Promise<UpsertOrganizerBroadcastMessageResult> {
  const parentId = eventId.trim();
  const text = input.text.trim();
  const mile = input.mile.trim();
  if (!parentId || !mile) {
    throw new Error('invalid_broadcast_message');
  }

  const ref = input.id?.trim()
    ? doc(firebaseCtx.db, 'organizerEvents', parentId, 'broadcastMessages', input.id.trim())
    : doc(collection(firebaseCtx.db, 'organizerEvents', parentId, 'broadcastMessages'));

  const hasNewMedia = Boolean(input.mediaUrl?.trim());
  const hasText = text.length > 0;

  if (!hasText && !hasNewMedia) {
    if (input.clearMediaUrl) {
      throw new Error('invalid_broadcast_message');
    }
    if (!input.id?.trim()) {
      throw new Error('invalid_broadcast_message');
    }
    const prior = await getDoc(ref);
    const priorUrl = prior.data()?.mediaUrl;
    if (typeof priorUrl !== 'string' || priorUrl.trim().length === 0) {
      throw new Error('invalid_broadcast_message');
    }
  }

  const payload: Record<string, unknown> = {
    mile,
    text,
    status: input.status,
    updatedAt: serverTimestamp()
  };

  if (input.clearMediaUrl) {
    payload.mediaUrl = deleteField();
  } else if (input.mediaUrl?.trim()) {
    payload.mediaUrl = input.mediaUrl.trim();
  }

  const existingSnap = await getDoc(ref);
  if (!existingSnap.exists()) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(ref, payload, { merge: true });

  const saved = await getDoc(ref);
  const savedData = saved.data();
  const mediaUrl =
    typeof savedData?.mediaUrl === 'string' ? savedData.mediaUrl : null;

  const savedMessage: OrganizerBroadcastMessage = {
    id: ref.id,
    mile,
    text,
    status: input.status,
    mediaUrl
  };

  let raceSyncFailed = false;

  if (input.delivery) {
    try {
      await publishOrganizerBroadcastToEventCode(
        firebaseCtx,
        input.delivery.eventCode,
        input.delivery.deliveryFromName,
        savedMessage
      );
    } catch (error: unknown) {
      raceSyncFailed = true;
      // The message itself is saved, so the portal looks fine — without this the
      // reason a broadcast never reached runners would be invisible.
      console.error('[Organizer] Broadcast publish failed', {
        eventCode: input.delivery.eventCode,
        messageId: savedMessage.id,
        error
      });
    }
  }

  return { message: savedMessage, raceSyncFailed };
}

export async function deleteOrganizerBroadcastMessage(
  firebaseCtx: FirebaseContext,
  eventId: string,
  messageId: string,
  delivery?: OrganizerBroadcastDeliveryContext
): Promise<void> {
  const parentId = eventId.trim();
  const id = messageId.trim();
  if (!parentId || !id) {
    return;
  }

  await deleteDoc(
    doc(firebaseCtx.db, 'organizerEvents', parentId, 'broadcastMessages', id)
  );

  if (delivery) {
    try {
      await removeOrganizerBroadcastFromEventCode(
        firebaseCtx,
        delivery.eventCode,
        id
      );
    } catch (error: unknown) {
      console.error('[Organizer] Broadcast removal failed', {
        eventCode: delivery.eventCode,
        messageId: id,
        error
      });
    }
  }
}
