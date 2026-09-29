import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';
import { MAX_EVENT_CODE_MESSAGE_LIMIT } from '@/shared/firestore/eventCodeRegistry';
import { parseMileMarkerLabel } from '@/shared/lib/raceMileMarker';

/** Honors the admin/registry quota; only clamps to a valid 1–100 range. */
export function clampOrganizerBroadcastLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 1;
  }
  return Math.min(MAX_EVENT_CODE_MESSAGE_LIMIT, Math.max(1, Math.floor(limit)));
}

export interface OrganizerBroadcastSyncMessage {
  id: string;
  mile: string;
  text: string;
  mediaUrl: string | null;
}

function normalizeEventCode(eventCode: string): string {
  return eventCode.trim().toUpperCase();
}

function truncateFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Race';
  }
  return trimmed.length <= 40 ? trimmed : trimmed.slice(0, 40);
}

/**
 * Runners pull broadcasts by event code, so the payload is stored already
 * normalized into the delivery shape their app expects for a race event.
 */
function buildBroadcastPayload(
  message: OrganizerBroadcastSyncMessage,
  fromName: string
): Record<string, unknown> {
  const text = message.text.trim();
  const mediaUrl = message.mediaUrl?.trim() ?? '';
  const hasMedia = mediaUrl.length > 0;
  const deliveryFrom = truncateFromName(fromName);

  const payload: Record<string, unknown> = {
    broadcastMessageId: message.id,
    deliverMode: 'mile',
    fromName: deliveryFrom,
    messageTriggerType: 'gps_mile',
    mileTrigger: parseMileMarkerLabel(message.mile),
    runnerName: deliveryFrom,
    source: 'organizer_broadcast',
    status: 'queued',
    type: hasMedia ? 'voice' : 'text',
    updatedAt: serverTimestamp()
  };

  if (hasMedia) {
    payload.mediaUrl = mediaUrl;
  } else if (text.length > 0) {
    payload.textContent = text.length <= 250 ? text : text.slice(0, 250);
  }

  return payload;
}

export async function publishOrganizerBroadcastToEventCode(
  firebaseCtx: FirebaseContext,
  eventCode: string,
  deliveryFromName: string,
  message: OrganizerBroadcastSyncMessage
): Promise<void> {
  const code = normalizeEventCode(eventCode);
  if (!code) {
    return;
  }

  await setDoc(
    doc(firebaseCtx.db, 'eventCodes', code, 'broadcasts', message.id),
    buildBroadcastPayload(message, deliveryFromName),
    { merge: true }
  );
}

export async function removeOrganizerBroadcastFromEventCode(
  firebaseCtx: FirebaseContext,
  eventCode: string,
  broadcastMessageId: string
): Promise<void> {
  const code = normalizeEventCode(eventCode);
  const messageId = broadcastMessageId.trim();
  if (!code || !messageId) {
    return;
  }

  await deleteDoc(doc(firebaseCtx.db, 'eventCodes', code, 'broadcasts', messageId));
}
