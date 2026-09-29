import type { FirebaseContext } from '@/shared/firebase';
import {
  listOrganizerBroadcastMessagesUncached,
  type OrganizerBroadcastMessage,
  type OrganizerBroadcastMessageStatus,
  type UpsertOrganizerBroadcastMessageInput,
  type UpsertOrganizerBroadcastMessageResult,
  upsertOrganizerBroadcastMessage as upsertOrganizerBroadcastMessageCore,
  deleteOrganizerBroadcastMessage as deleteOrganizerBroadcastMessageCore
} from '@/shared/firestore/organizerBroadcastMessages';
import {
  invalidateOrganizerCache,
  ORGANIZER_CACHE_KEYS,
  readOrganizerCache,
  type OrganizerCacheReadOptions
} from '../lib/organizerCache';

export type {
  OrganizerBroadcastDeliveryContext,
  OrganizerBroadcastMessage,
  OrganizerBroadcastMessageStatus,
  UpsertOrganizerBroadcastMessageInput,
  UpsertOrganizerBroadcastMessageResult
} from '@/shared/firestore/organizerBroadcastMessages';

export type OrganizerRaceMessage = OrganizerBroadcastMessage;
export type OrganizerRaceMessageStatus = OrganizerBroadcastMessageStatus;

export async function listOrganizerBroadcastMessages(
  firebaseCtx: FirebaseContext,
  eventId: string,
  options?: OrganizerCacheReadOptions
): Promise<OrganizerBroadcastMessage[]> {
  const id = eventId.trim();
  if (!id) {
    return [];
  }

  return readOrganizerCache(
    ORGANIZER_CACHE_KEYS.broadcastMessages(id),
    () => listOrganizerBroadcastMessagesUncached(firebaseCtx, id),
    options
  );
}

export async function countOrganizerBroadcastMessages(
  firebaseCtx: FirebaseContext,
  eventId: string,
  options?: OrganizerCacheReadOptions
): Promise<number> {
  const messages = await listOrganizerBroadcastMessages(firebaseCtx, eventId, options);
  return messages.length;
}

export async function upsertOrganizerBroadcastMessage(
  firebaseCtx: FirebaseContext,
  eventId: string,
  input: UpsertOrganizerBroadcastMessageInput
): Promise<UpsertOrganizerBroadcastMessageResult> {
  const saved = await upsertOrganizerBroadcastMessageCore(firebaseCtx, eventId, input);
  invalidateOrganizerCache(ORGANIZER_CACHE_KEYS.broadcastMessages(eventId.trim()));
  return saved;
}

export async function deleteOrganizerBroadcastMessage(
  firebaseCtx: FirebaseContext,
  eventId: string,
  messageId: string,
  delivery?: UpsertOrganizerBroadcastMessageInput['delivery']
): Promise<void> {
  await deleteOrganizerBroadcastMessageCore(firebaseCtx, eventId, messageId, delivery);
  invalidateOrganizerCache(ORGANIZER_CACHE_KEYS.broadcastMessages(eventId.trim()));
}
