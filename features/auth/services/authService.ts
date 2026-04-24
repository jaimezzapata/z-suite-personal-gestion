import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { firebaseAuth } from "@/shared/firebase/auth";

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(firebaseAuth, provider);
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(firebaseAuth, email, password);
}

export async function signOutCurrentUser() {
  return signOut(firebaseAuth);
}

