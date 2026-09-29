import type { FirebaseContext } from '@/shared/firebase';
import { sendOrganizerPortalPasswordReset } from '@/shared/firebase/sendOrganizerPortalPasswordReset';

export async function sendOrganizerPasswordReset(
  firebaseCtx: FirebaseContext,
  email: string
): Promise<void> {
  await sendOrganizerPortalPasswordReset(firebaseCtx, email);
}
