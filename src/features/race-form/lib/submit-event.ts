import { collection, doc, serverTimestamp, setDoc, terminate } from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';
import { ensureVoiceBlobPlayableOnMobile } from './voice';
import { uploadVoiceViaStorageRest } from './storage-upload';
import type { SubmitPayload, SubmitResult } from '../model/types';

function createEventId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

  const docData: Record<string, unknown> = {
    status: 'queued',
    type: payload.format,
    deliverMode: payload.context.deliverMode,
    messageTriggerType: payload.context.messageTriggerType,
    raceId,
    runnerName: payload.context.name,
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
    if (!firebaseCtx) {
      throw new Error('Firebase is not configured');
    }
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
      const err = new Error('Voice file URL missing after upload') as Error & { code?: string };
      err.code = 'storage/unknown';
      throw err;
    }
  }

  if (!firebaseCtx) {
    throw new Error('Firebase is not configured');
  }

  const eventRef = doc(collection(firebaseCtx.db, 'races', raceId, 'events'), eventId);
  await setDoc(eventRef, docData);
  return { eventId, format: payload.format };
}

export async function shutdownFirestore(firebaseCtx: FirebaseContext | null): Promise<void> {
  if (!firebaseCtx) {
    return;
  }
  try {
    await terminate(firebaseCtx.db);
  } catch {
    /* ignore shutdown errors */
  }
}
