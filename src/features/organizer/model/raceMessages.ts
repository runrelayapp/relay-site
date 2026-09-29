export type {
  OrganizerBroadcastMessage,
  OrganizerBroadcastMessageStatus
} from '@/shared/firestore/organizerBroadcastMessages';

import { DEFAULT_ORGANIZER_EVENT_MESSAGE_LIMIT } from '@/shared/firestore/eventCodeRegistry';

export { DEFAULT_ORGANIZER_EVENT_MESSAGE_LIMIT };

/** Fallback limit in portal UI before registry loads. */
export const ORGANIZER_RACE_MESSAGE_LIMIT = DEFAULT_ORGANIZER_EVENT_MESSAGE_LIMIT;

export type OrganizerRaceMessage = import('@/shared/firestore/organizerBroadcastMessages').OrganizerBroadcastMessage;
export type OrganizerRaceMessageStatus = import('@/shared/firestore/organizerBroadcastMessages').OrganizerBroadcastMessageStatus;
