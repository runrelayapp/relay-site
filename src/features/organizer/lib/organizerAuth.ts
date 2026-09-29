import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { FirebaseContext } from '@/shared/firebase';
import type { OrganizerProfile } from '../model/types';

export async function fetchOrganizerProfileForUser(
  firebaseCtx: FirebaseContext,
  user: User
): Promise<OrganizerProfile | null> {
  const accountSnap = await getDoc(doc(firebaseCtx.db, 'organizerAccounts', user.uid));
  if (!accountSnap.exists()) {
    return null;
  }

  const organizerId = accountSnap.data().organizerId;
  if (typeof organizerId !== 'string' || !organizerId.trim()) {
    return null;
  }

  const organizerSnap = await getDoc(doc(firebaseCtx.db, 'organizers', organizerId.trim()));
  if (!organizerSnap.exists()) {
    return null;
  }

  const data = organizerSnap.data();
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email =
    typeof data.email === 'string' && data.email.trim()
      ? data.email.trim().toLowerCase()
      : user.email?.trim().toLowerCase() ?? null;

  return {
    organizerId: organizerSnap.id,
    name,
    email
  };
}

export async function isOrganizerUser(
  firebaseCtx: FirebaseContext,
  user: User
): Promise<boolean> {
  const profile = await fetchOrganizerProfileForUser(firebaseCtx, user);
  return profile != null;
}
