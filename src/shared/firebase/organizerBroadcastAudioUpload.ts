import type { FirebaseContext } from '@/shared/firebase';
import {
  buildOrganizerBroadcastAudioPath,
  uploadAudioBlobToStorage
} from '@/shared/firebase/uploadAudioBlob';
import { ensureVoiceBlobPlayableOnMobile } from '@/shared/lib/audio/voiceBlob';

export async function uploadOrganizerBroadcastAudio(
  firebaseCtx: FirebaseContext,
  eventId: string,
  messageId: string,
  source: Blob
): Promise<string> {
  const playable = await ensureVoiceBlobPlayableOnMobile(source);
  const path = buildOrganizerBroadcastAudioPath(eventId, messageId, playable);
  return uploadAudioBlobToStorage(firebaseCtx, path, playable);
}
