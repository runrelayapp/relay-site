import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { disposeFirebaseContext, type FirebaseContext } from '@/shared/firebase';
import {
  PLATFORM_LIFETIME_STAT_KEYS,
  incrementPlatformLifetimeStat
} from '@/shared/firestore/platformLifetimeStats';
import { ensureVoiceBlobPlayableOnMobile } from './voice';
import { uploadVoiceViaStorageRest } from './storage-upload';
import type { SubmitPayload, SubmitResult } from '../model/types';

function createEventId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function assertRaceAcceptsMessages(
  raceData: Record<string, unknown> | undefined
): void {
  const status = raceData?.status;
  if (status === 'active') {
    const err = new Error('Race is in progress') as Error & { code?: string };
    err.code = 'race/in-progress';
    throw err;
  }
  if (status === 'completed') {
    const err = new Error('Race is completed') as Error & { code?: string };
    err.code = 'race/completed';
    throw err;
  }
}

export async function submitEvent(
  firebaseCtx: FirebaseContext | null,
  payload: SubmitPayload
): Promise<SubmitResult> {
  const eventId = createEventId();
  const { raceId } = payload.context;

  if (!raceId) {
    throw new Error('Missing raceId in URL (?raceId=...)');
  }

  if (!firebaseCtx) {
    throw new Error('Firebase is not configured');
  }

  // Re-check right before write so a tab left open mid-run cannot still submit.
  const raceSnap = await getDoc(doc(firebaseCtx.db, 'races', raceId));
  if (!raceSnap.exists()) {
    const err = new Error('Race not found') as Error & { code?: string };
    err.code = 'race/missing';
    throw err;
  }
  assertRaceAcceptsMessages(raceSnap.data() as Record<string, unknown>);

  const docData: Record<string, unknown> = {
    status: 'queued',
    type: payload.format,
    deliverMode: payload.context.deliverMode,
    messageTriggerType: payload.context.messageTriggerType,
    raceId,
    runnerName: payload.context.name,
    fromName: payload.fromName,
    createdAt: serverTimestamp()
  };

  if (payload.context.deliverMode === 'time') {
    docData.timeTrigger = payload.timeTrigger;
  } else {
    docData.mileTrigger = payload.mileTrigger;
  }

  if (payload.format === 'text') {
    docData.textContent = payload.textContent;
  }

  if (payload.format === 'song' && payload.track) {
    docData.track = {
      id: payload.track.id,
      name: payload.track.name,
      artist: payload.track.artist,
      albumArtUrl: payload.track.albumArtUrl,
      previewUrl: payload.track.previewUrl,
      appleMusicUrl: payload.track.appleMusicUrl,
      durationMs: payload.track.durationMs
    };
  }

  if (payload.format === 'voice' && payload.voiceBlob) {
    let voiceUploadBlob = payload.voiceBlob;
    try {
      voiceUploadBlob = await ensureVoiceBlobPlayableOnMobile(payload.voiceBlob);
    } catch (convertError) {
      console.error('[relay webform] voice convert failed', convertError);
      throw convertError;
    }
    const contentType = voiceUploadBlob.type || 'audio/wav';
    const ext = contentType.includes('mp4')
      ? 'mp4'
      : contentType.includes('mpeg')
        ? 'mp3'
        : contentType.includes('aac')
          ? 'aac'
          : 'wav';
    const path = `races/${raceId}/relay-events/${eventId}/voice.${ext}`;
    try {
      docData.mediaUrl = await uploadVoiceViaStorageRest(
        firebaseCtx.storageBucket,
        path,
        voiceUploadBlob,
        contentType
      );
    } catch (uploadError) {
      console.error('[relay webform] voice upload failed', uploadError);
      throw uploadError;
    }
    if (typeof docData.mediaUrl !== 'string' || !docData.mediaUrl.trim()) {
      const err = new Error('Voice file URL missing after upload') as Error & {
        code?: string;
      };
      err.code = 'storage/unknown';
      throw err;
    }
  }

  const eventRef = doc(collection(firebaseCtx.db, 'races', raceId, 'events'), eventId);
  await setDoc(eventRef, docData);
  await incrementPlatformLifetimeStat(
    firebaseCtx.db,
    PLATFORM_LIFETIME_STAT_KEYS.messages
  );
  return { eventId, format: payload.format };
}

export async function shutdownFirestore(firebaseCtx: FirebaseContext | null): Promise<void> {
  // terminate() leaves the default app in place with a dead Firestore client.
  // Delete the app too so "Send another" can create a live client again.
  await disposeFirebaseContext(firebaseCtx);
}
