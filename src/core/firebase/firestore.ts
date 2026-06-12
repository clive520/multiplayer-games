import { getFirestore, type Firestore } from 'firebase/firestore';
import { app } from './app';

export const db: Firestore = getFirestore(app);
