import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { firebaseConfig, validateConfig } from './config';

validateConfig();

export const app: FirebaseApp =
  getApps()[0] ?? initializeApp(firebaseConfig);
