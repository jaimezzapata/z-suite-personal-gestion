import { doc, onSnapshot, setDoc, updateDoc, type Unsubscribe } from "firebase/firestore";

import type { UserSettings } from "@/features/settings/types";
import { firestore } from "@/shared/firebase/firestore";

function userSettingsDocRef(uid: string) {
  return doc(firestore, `users/${uid}/settings`, "app");
}

export function subscribeUserSettings(
  uid: string,
  onValue: (data: unknown) => void,
  onError: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    userSettingsDocRef(uid),
    (snap) => onValue(snap.exists() ? snap.data() : null),
    (e) => onError(e?.message ?? "Error al leer ajustes"),
  );
}

export async function upsertUserSettings(uid: string, settings: UserSettings) {
  const ref = userSettingsDocRef(uid);
  return setDoc(ref, settings, { merge: true });
}

export async function updateUserSettings(uid: string, patch: Partial<UserSettings>) {
  const ref = userSettingsDocRef(uid);
  try {
    return await updateDoc(ref, patch as any);
  } catch {
    return setDoc(ref, patch as any, { merge: true });
  }
}

