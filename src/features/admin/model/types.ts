export type AdminRaceStatus = 'upcoming' | 'active' | 'completed' | 'unknown';

export interface AdminRaceSummary {
  id: string;
  raceName: string;
  raceDate: string;
  status: AdminRaceStatus;
  userId: string;
  distanceMiles: number | null;
  messageTriggerType: string | null;
  eventCode: string | null;
  runnerUsername: string | null;
  runnerFullName: string | null;
  runnerEmail: string | null;
  runnerRelayPlus: boolean | null;
  /** True when race has userId but no `users/{uid}` document. */
  runnerUserMissing: boolean;
}

export type AdminEventType = 'voice' | 'text' | 'song' | 'unknown';

export interface AdminEventTrack {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
  albumArtUrl: string | null;
}

export interface AdminRaceEvent {
  id: string;
  type: AdminEventType;
  fromName: string;
  runnerName: string;
  deliverMode: string;
  mileTrigger: number | null;
  timeTrigger: number | null;
  textContent: string | null;
  mediaUrl: string | null;
  track: AdminEventTrack | null;
  createdAtMs: number | null;
  source: string | null;
  broadcastMessageId: string | null;
}

export type AdminRaceSearchMode =
  | 'raceId'
  | 'eventCode'
  | 'date'
  | 'username'
  | 'email'
  | 'name'
  | 'userId';

export interface AdminUserSummary {
  id: string;
  email: string | null;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  relayPlus: boolean;
  personalBest: string;
  profileRaces: number;
  profileVoices: number;
  socialLinks: Partial<
    Record<'instagram' | 'strava' | 'tiktok' | 'x' | 'website', string>
  >;
  updatedAtMs: number | null;
  createdAtMs: number | null;
  raceCountTotal: number;
  raceCountUpcoming: number;
  raceCountActive: number;
  raceCountCompleted: number;
  messageCountTotal: number;
  firstRaceAtMs: number | null;
  lastRaceAtMs: number | null;
}

export interface AdminEventCode {
  code: string;
  /** Display name of the race/event (not the organizer company). */
  eventName: string;
  /** Organizer company name from `organizers/{id}` at save time. */
  organizerDirectoryName: string;
  /** `organizers/{id}` document id */
  organizerId: string | null;
  organizerUserId: string | null;
  organizerEmail: string | null;
  eventDate: string | null;
  distanceMiles: number | null;
  messageLimit: number;
  notes: string;
  createdAtMs: number | null;
  updatedAtMs: number | null;
  /** @deprecated Legacy field; same as eventName when set from organizer portal. */
  organizerName: string;
}

export interface AdminReview {
  id: string;
  userId: string;
  raceId: string;
  rating: number;
  comment: string;
  createdAtMs: number | null;
  runnerUsername: string | null;
  runnerFullName: string | null;
  runnerEmail: string | null;
  raceName: string | null;
  raceDate: string | null;
}

export interface AdminOrganizer {
  id: string;
  name: string;
  email: string | null;
  /** Firebase Auth uid used for organizer portal login */
  authUid: string | null;
  userId: string | null;
  notes: string;
  createdAtMs: number | null;
  updatedAtMs: number | null;
}
