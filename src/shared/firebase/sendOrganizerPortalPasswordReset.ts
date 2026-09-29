import { FirebaseError } from 'firebase/app';
import { sendPasswordResetEmail } from 'firebase/auth';
import type { FirebaseContext } from '@/shared/firebase';

const CONTINUE_URI_ERROR_CODES = new Set([
  'auth/invalid-continue-uri',
  'auth/unauthorized-continue-uri',
  'auth/missing-continue-uri'
]);

export async function sendOrganizerPortalPasswordReset(
  firebaseCtx: FirebaseContext,
  email: string
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) {
    throw new Error('invalid_organizer_email');
  }

  const continueUrl = `${window.location.origin}/organizer/login`;

  try {
    await sendPasswordResetEmail(firebaseCtx.auth, normalized, {
      handleCodeInApp: false,
      url: continueUrl
    });
  } catch (error) {
    if (
      error instanceof FirebaseError &&
      CONTINUE_URI_ERROR_CODES.has(error.code)
    ) {
      await sendPasswordResetEmail(firebaseCtx.auth, normalized);
      return;
    }

    throw error;
  }
}
