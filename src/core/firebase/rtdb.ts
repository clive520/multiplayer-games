import { getDatabase, type Database } from 'firebase/database';
import { app } from './app';

export const rtdb: Database = getDatabase(app);
