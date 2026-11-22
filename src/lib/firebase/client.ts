import type { CompletedActionRecord, FamilyProfile } from '@/types/smogshield';

export interface FirebaseAuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
}

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyBsJzC3H6LHJtsygG-e5HlbCRFCXNsv6bo',
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

async function getFirebaseClientAsync() {
  if (typeof window === 'undefined') {
    return null;
  }
  const [{ getApp, getApps, initializeApp }, authMod, firestoreMod] =
    await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  const db = firestoreMod.getFirestore(app);
  return { app, auth, db, authMod, firestoreMod };
}

export function subscribeToAuthState(
  callback: (user: FirebaseAuthUser | null) => void
): () => void {
  if (typeof window === 'undefined') {
    callback(null);
    return () => {};
  }

  let unsub: (() => void) | null = null;
  let cancelled = false;

  getFirebaseClientAsync()
    .then((client) => {
      if (cancelled || !client) {
        if (!cancelled) callback(null);
        return;
      }
      unsub = client.authMod.onAuthStateChanged(
        client.auth,
        (u) => {
          if (u) {
            callback({
              uid: u.uid,
              displayName: u.displayName,
              email: u.email,
            });
          } else {
            callback(null);
          }
        },
        () => callback(null)
      );
    })
    .catch(() => {
      if (!cancelled) callback(null);
    });

  return () => {
    cancelled = true;
    if (unsub) unsub();
  };
}

export async function signInWithGooglePopup(): Promise<FirebaseAuthUser> {
  const client = await getFirebaseClientAsync();
  if (!client) {
    throw new Error('Firebase Authentication is not available outside the browser.');
  }
  const provider = new client.authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await client.authMod.signInWithPopup(client.auth, provider);
  return {
    uid: cred.user.uid,
    displayName: cred.user.displayName,
    email: cred.user.email,
  };
}

export async function signOutFirebaseUser(): Promise<void> {
  const client = await getFirebaseClientAsync();
  if (!client) return;
  await client.authMod.signOut(client.auth);
}

export async function loadCloudHouseholdData(uid: string): Promise<{
  profile?: FamilyProfile;
  completedActions?: CompletedActionRecord[];
} | null> {
  try {
    const client = await getFirebaseClientAsync();
    if (!client) return null;
    const { doc, getDoc } = client.firestoreMod;
    const snap = await getDoc(doc(client.db, 'households', uid));
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
  try {
    const client = await getFirebaseClientAsync();
    if (!client) return false;
    const { doc, setDoc } = client.firestoreMod;
    await setDoc(
      doc(client.db, 'households', uid),
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
