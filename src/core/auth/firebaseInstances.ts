import { getAuth, type Auth } from 'firebase/auth';
import { app } from '../firebase/app';

export const auth: Auth = getAuth(app);
