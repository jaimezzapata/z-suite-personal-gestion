import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

function assertFirebaseConfig() {
  const missing: string[] = [];

  if (!firebaseConfig.apiKey) missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!firebaseConfig.authDomain) missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!firebaseConfig.projectId) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!firebaseConfig.storageBucket) missing.push("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  if (!firebaseConfig.messagingSenderId)
    missing.push("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  if (!firebaseConfig.appId) missing.push("NEXT_PUBLIC_FIREBASE_APP_ID");

  if (missing.length) {
    throw new Error(`Missing environment variable(s): ${missing.join(", ")}`);
  }
}

export function getFirebaseApp(): FirebaseApp {
  const existing = getApps()[0];
  if (existing) return existing;

  assertFirebaseConfig();
  return initializeApp(firebaseConfig);
}

