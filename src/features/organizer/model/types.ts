export interface OrganizerProfile {
  organizerId: string;
  name: string;
  email: string | null;
}

export interface OrganizerEvent {
  id: string;
  organizerId: string;
  name: string;
  eventDate: string;
  eventCode: string;
  distanceMiles: number | null;
  createdAtMs: number | null;
  updatedAtMs: number | null;
}

export interface OrganizerEventParticipant {
  id: string;
  displayName: string;
  username: string | null;
  raceName: string;
  raceDate: string;
  status: string;
  distanceMiles: number | null;
  supporterCount: number;
  messageCount: number;
}
