import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './firebaseInstances';

const provider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, provider);
}

export async function signOut(): Promise<void> {
  return fbSignOut(auth);
}
