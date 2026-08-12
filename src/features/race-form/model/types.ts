export type MessageFormat = 'voice' | 'text' | 'song';

export type DeliverMode = 'mile' | 'time';

export type MessageTriggerType = 'gps_mile' | 'timer_time';

export interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  albumArtUrl: string;
  previewUrl: string | null;
  appleMusicUrl: string | null;
  durationMs: number;
}

export interface PageContext {
  raceId: string;
  name: string;
  race: string;
  distance: number;
  deliverMode: DeliverMode;
  maxTimeSeconds: number;
  messageTriggerType: MessageTriggerType;
  nameOverride: string;
  runnerUserId?: string;
}

export interface TimeSnap {
  seconds: number;
  title: string;
  detail: string;
}

export interface MilestoneSnap {
  mile: number;
  title: string;
  detail: string;
}

export type RaceGateOk = { ok: true; context: PageContext };
export type RaceGateFail = { ok: false; title: string; body: string };
export type RaceGateResult = RaceGateOk | RaceGateFail;

export interface SubmitPayload {
  format: MessageFormat;
  mileTrigger?: number;
  timeTrigger?: number;
  context: PageContext;
  textContent?: string;
  track?: MusicTrack;
  voiceBlob?: Blob;
}

export interface SubmitResult {
  eventId: string;
  format: MessageFormat;
}
