import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { CompletedActionRecord, FamilyProfile } from '@/types/smogshield';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'smogshield-ai-kapil.firebaseapp.com',
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'smogshield-ai-kapil',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'smogshield-ai-kapil.firebasestorage.app',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '609090729839',
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    '1:609090729839:web:2b8cce908b660935a0da9a',
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function getFirebaseClient(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
} {
  if (typeof window === 'undefined') {
    return { app: null, auth: null, db: null };
  }
  if (!firebaseConfig.apiKey) {
    return { app: null, auth: null, db: null };
  }
  try {
    if (!appInstance) {
      appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    }
    if (!authInstance) {
      authInstance = getAuth(appInstance);
    }
    if (!dbInstance) {
      dbInstance = getFirestore(appInstance);
    }
    return { app: appInstance, auth: authInstance, db: dbInstance };
  } catch {
    return { app: null, auth: null, db: null };
  }
}

export function subscribeToAuthState(
  callback: (user: User | null) => void
): () => void {
  const { auth } = getFirebaseClient();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback, () => callback(null));
}

export async function signInWithGooglePopup(): Promise<User> {
  const { auth } = getFirebaseClient();
  if (!auth) {
    throw new Error('Firebase Authentication is not initialized in this browser.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutFirebaseUser(): Promise<void> {
  const { auth } = getFirebaseClient();
  if (!auth) return;
  await firebaseSignOut(auth);
}

export async function loadCloudHouseholdData(uid: string): Promise<{
  profile?: FamilyProfile;
  completedActions?: CompletedActionRecord[];
} | null> {
  const { db } = getFirebaseClient();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'households', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      profile: data?.profile as FamilyProfile | undefined,
      completedActions: data?.completedActions as
        | CompletedActionRecord[]
        | undefined,
    };
  } catch {
    return null;
  }
}

export async function syncCloudHouseholdData(
  uid: string,
  profile: FamilyProfile,
  completedActions: CompletedActionRecord[]
): Promise<boolean> {
  const { db } = getFirebaseClient();
  if (!db) return false;
  try {
    await setDoc(
      doc(db, 'households', uid),
      {
        profile,
        completedActions: completedActions.slice(0, 50),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch {
    return false;
  }
}
