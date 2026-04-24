import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import type { ScheduleEntryInput } from "@/features/schedules/types";
import { firestore } from "@/shared/firebase/firestore";
import { normalizeUpper } from "@/shared/utils/text";

function userSchedulesCollectionPath(uid: string) {
  return `users/${uid}/schedules`;
}

export async function createScheduleEntry(uid: string, input: ScheduleEntryInput) {
  const col = collection(firestore, userSchedulesCollectionPath(uid));
  const ref = doc(col);

  await setDoc(ref, {
    dateKey: input.dateKey,
    institutionKind: input.institutionKind,
    institutionName:
      input.institutionName && input.institutionKind === "OTRA"
        ? normalizeUpper(input.institutionName)
        : null,
    name: normalizeUpper(input.name),
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    room: input.room ? normalizeUpper(input.room) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref;
}

export async function updateScheduleEntry(
  uid: string,
  entryId: string,
  input: ScheduleEntryInput,
) {
  const ref = doc(firestore, userSchedulesCollectionPath(uid), entryId);
  return updateDoc(ref, {
    dateKey: input.dateKey,
    institutionKind: input.institutionKind,
    institutionName:
      input.institutionName && input.institutionKind === "OTRA"
        ? normalizeUpper(input.institutionName)
        : null,
    name: normalizeUpper(input.name),
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    room: input.room ? normalizeUpper(input.room) : null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteScheduleEntry(uid: string, entryId: string) {
  const ref = doc(firestore, userSchedulesCollectionPath(uid), entryId);
  try {
    console.log("[schedules] deleteScheduleEntry:start", { uid, entryId });
    await deleteDoc(ref);
    console.log("[schedules] deleteScheduleEntry:ok", { uid, entryId });
  } catch (e) {
    console.error("[schedules] deleteScheduleEntry:error", { uid, entryId, e });
    throw e;
  }
}

function signatureOfInput(input: ScheduleEntryInput) {
  const institutionName =
    input.institutionKind === "OTRA" ? (input.institutionName ?? "").trim() : "";
  const room = (input.room ?? "").trim();
  return [
    input.dateKey,
    input.institutionKind,
    institutionName.toUpperCase(),
    input.name.trim().toUpperCase(),
    input.startMinutes,
    input.endMinutes,
    room.toUpperCase(),
  ].join("|");
}

export async function fetchScheduleEntrySignaturesInRange(
  uid: string,
  range: { startKey: string; endKey: string },
) {
  const col = collection(firestore, userSchedulesCollectionPath(uid));
  const q = query(
    col,
    where("dateKey", ">=", range.startKey),
    where("dateKey", "<=", range.endKey),
    orderBy("dateKey", "asc"),
  );
  const snap = await getDocs(q);
  const set = new Set<string>();
  for (const d of snap.docs) {
    const data = d.data() as any;
    const dateKey = typeof data.dateKey === "string" ? data.dateKey : "";
    const institutionKind =
      data.institutionKind === "CESDE" || data.institutionKind === "SENA" || data.institutionKind === "OTRA"
        ? data.institutionKind
        : "OTRA";
    const institutionName = typeof data.institutionName === "string" ? data.institutionName : "";
    const name = typeof data.name === "string" ? data.name : "";
    const startMinutes = typeof data.startMinutes === "number" ? data.startMinutes : 0;
    const endMinutes = typeof data.endMinutes === "number" ? data.endMinutes : 0;
    const room = typeof data.room === "string" ? data.room : "";

    const sig = [
      dateKey,
      institutionKind,
      institutionKind === "OTRA" ? institutionName.trim().toUpperCase() : "",
      name.trim().toUpperCase(),
      startMinutes,
      endMinutes,
      room.trim().toUpperCase(),
    ].join("|");
    set.add(sig);
  }
  return set;
}

export async function fetchScheduleEntriesInRange(
  uid: string,
  range: { startKey: string; endKey: string },
) {
  const col = collection(firestore, userSchedulesCollectionPath(uid));
  const q = query(
    col,
    where("dateKey", ">=", range.startKey),
    where("dateKey", "<=", range.endKey),
    orderBy("dateKey", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as any }));
}

export async function fetchScheduleEntriesFromDate(uid: string, startKey: string) {
  const col = collection(firestore, userSchedulesCollectionPath(uid));

  const PAGE_SIZE = 500;
  const out: Array<{ id: string; data: any }> = [];
  let last: any | null = null;

  while (true) {
    const q = last
      ? query(
          col,
          where("dateKey", ">=", startKey),
          orderBy("dateKey", "asc"),
          startAfter(last),
          limit(PAGE_SIZE),
        )
      : query(col, where("dateKey", ">=", startKey), orderBy("dateKey", "asc"), limit(PAGE_SIZE));

    const snap = await getDocs(q);
    for (const d of snap.docs) out.push({ id: d.id, data: d.data() as any });

    if (snap.docs.length < PAGE_SIZE) break;
    last = snap.docs[snap.docs.length - 1];
  }

  return out;
}

export async function fetchLastScheduleDateKeyFrom(uid: string, startKey: string) {
  const col = collection(firestore, userSchedulesCollectionPath(uid));
  const q = query(
    col,
    where("dateKey", ">=", startKey),
    orderBy("dateKey", "desc"),
    limit(1),
  );
  const snap = await getDocs(q);
  const docSnap = snap.docs[0];
  if (!docSnap) return null;
  const data = docSnap.data() as any;
  return typeof data.dateKey === "string" ? data.dateKey : null;
}

export async function createScheduleEntriesBulk(
  uid: string,
  inputs: ScheduleEntryInput[],
  options?: { existingSignatures?: Set<string> },
) {
  const col = collection(firestore, userSchedulesCollectionPath(uid));
  const existing = new Set<string>(options?.existingSignatures ?? []);

  let created = 0;
  let skipped = 0;

  const CHUNK_SIZE = 400;
  for (let i = 0; i < inputs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(firestore);
    const chunk = inputs.slice(i, i + CHUNK_SIZE);
    let hasWrites = false;

    for (const input of chunk) {
      const sig = signatureOfInput(input);
      if (existing.has(sig)) {
        skipped += 1;
        continue;
      }
      existing.add(sig);

      const ref = doc(col);
      batch.set(ref, {
        dateKey: input.dateKey,
        institutionKind: input.institutionKind,
        institutionName:
          input.institutionName && input.institutionKind === "OTRA"
            ? normalizeUpper(input.institutionName)
            : null,
        name: normalizeUpper(input.name),
        startMinutes: input.startMinutes,
        endMinutes: input.endMinutes,
        room: input.room ? normalizeUpper(input.room) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      created += 1;
      hasWrites = true;
    }

    if (hasWrites) await batch.commit();
  }

  return { created, skipped };
}

export async function deleteScheduleEntriesBulk(uid: string, entryIds: string[]) {
  const CHUNK_SIZE = 400;
  let deleted = 0;

  for (let i = 0; i < entryIds.length; i += CHUNK_SIZE) {
    const batch = writeBatch(firestore);
    const chunk = entryIds.slice(i, i + CHUNK_SIZE);
    for (const id of chunk) {
      batch.delete(doc(firestore, userSchedulesCollectionPath(uid), id));
    }
    try {
      console.log("[schedules] deleteScheduleEntriesBulk:commit", {
        uid,
        chunk: chunk.length,
        from: i,
      });
      await batch.commit();
      deleted += chunk.length;
    } catch (e) {
      console.error("[schedules] deleteScheduleEntriesBulk:error", {
        uid,
        from: i,
        chunk: chunk.length,
        e,
      });
      throw e;
    }
  }

  return { deleted };
}
