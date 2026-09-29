import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { FirebaseContext } from '@/shared/firebase';
import { voiceBlobExtension } from '@/shared/lib/audio/voiceBlob';

export async function uploadAudioBlobToStorage(
  firebaseCtx: FirebaseContext,
  objectPath: string,
  blob: Blob
): Promise<string> {
  const contentType = blob.type || 'audio/wav';
  const storageRef = ref(firebaseCtx.storage, objectPath);
  await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(storageRef);
}

export function buildOrganizerBroadcastAudioPath(
  eventId: string,
  messageId: string,
  blob: Blob
): string {
  const contentType = blob.type || 'audio/wav';
  const ext = voiceBlobExtension(contentType);
  return `organizerEvents/${eventId.trim()}/broadcastMessages/${messageId.trim()}/voice.${ext}`;
}
