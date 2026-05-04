import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseConfig } from './environment';

const firebaseConfig = getFirebaseConfig();

export const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
