import { deleteApp, FirebaseError, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { getAppConfig } from '@/shared/config/env';

export interface CreateSecondaryAuthUserResult {
  uid: string;
}

const EMAIL_IN_USE_WRONG_PASSWORD = 'email_in_use_wrong_password';

function isEmailAlreadyInUse(error: unknown): boolean {
  return error instanceof FirebaseError && error.code === 'auth/email-already-in-use';
}

function isWrongPassword(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) {
    return false;
  }

  return (
    error.code === 'auth/wrong-password' ||
    error.code === 'auth/invalid-credential' ||
    error.code === 'auth/invalid-login-credentials'
  );
}

/**
 * Creates a Firebase Auth user without changing the primary app session (admin stays signed in).
 * If the email already exists (a deleted organizer still owns Auth), reuse that uid when the
 * password matches so the address can be assigned again.
 */
export async function createSecondaryAuthUser(
  email: string,
  password: string
): Promise<CreateSecondaryAuthUserResult> {
  const firebase = getAppConfig().firebase;
  if (!firebase.apiKey || !firebase.appId) {
    throw new Error('firebase_unavailable');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const secondaryApp = initializeApp(firebase, `relay-secondary-${Date.now()}`);
  try {
    const auth = getAuth(secondaryApp);

    try {
      const created = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );
      await signOut(auth);
      return { uid: created.user.uid };
    } catch (createError) {
      if (!isEmailAlreadyInUse(createError)) {
        throw createError;
      }

      try {
        const existing = await signInWithEmailAndPassword(
          auth,
          normalizedEmail,
          password
        );
        const uid = existing.user.uid;
        await signOut(auth);
        return { uid };
      } catch (signInError) {
        if (isWrongPassword(signInError)) {
          throw new Error(EMAIL_IN_USE_WRONG_PASSWORD);
        }

        throw signInError;
      }
    }
  } finally {
    await deleteApp(secondaryApp);
  }
}

export function isEmailInUseWrongPasswordError(error: unknown): boolean {
  return error instanceof Error && error.message === EMAIL_IN_USE_WRONG_PASSWORD;
}
