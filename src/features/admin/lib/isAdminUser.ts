import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { FirebaseContext } from '@/shared/firebase';

export async function isAdminUser(
  firebaseCtx: FirebaseContext,
  user: User
): Promise<boolean> {
  const token = await user.getIdTokenResult(true);

  if (token.claims.admin === true) {
    return true;
  }

  try {
    const adminSnap = await getDoc(doc(firebaseCtx.db, 'admins', user.uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}
