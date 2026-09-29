import { GoogleAuthProvider, signInWithPopup, type Auth, type User } from 'firebase/auth';

export async function signInWithGoogle(auth: Auth): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}
