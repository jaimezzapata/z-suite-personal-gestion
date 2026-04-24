import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import type { PayslipInput } from "@/features/payslips/types";
import { firestore } from "@/shared/firebase/firestore";
import { normalizeUpper } from "@/shared/utils/text";

function userPayslipsCollectionPath(uid: string) {
  return `users/${uid}/payslips`;
}

export async function createPayslip(uid: string, input: PayslipInput) {
  const col = collection(firestore, userPayslipsCollectionPath(uid));
  const ref = doc(col);

  const batch = writeBatch(firestore);
  batch.set(ref, {
    companyId: input.companyId,
    companyName: normalizeUpper(input.companyName),
    payType: input.payType,
    payFrequency: input.payFrequency,
    currency: input.currency,
    amount: input.amount,
    periodType: input.periodType,
    periodKey: input.periodKey,
    periodStart: Timestamp.fromDate(input.periodStart),
    periodEnd: Timestamp.fromDate(input.periodEnd),
    payDate: input.payDate ? Timestamp.fromDate(input.payDate) : null,
    notes: input.notes ? normalizeUpper(input.notes) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return ref;
}

export async function updatePayslip(
  uid: string,
  payslipId: string,
  input: PayslipInput,
) {
  const ref = doc(firestore, userPayslipsCollectionPath(uid), payslipId);
  return updateDoc(ref, {
    companyId: input.companyId,
    companyName: normalizeUpper(input.companyName),
    payType: input.payType,
    payFrequency: input.payFrequency,
    currency: input.currency,
    amount: input.amount,
    periodType: input.periodType,
    periodKey: input.periodKey,
    periodStart: Timestamp.fromDate(input.periodStart),
    periodEnd: Timestamp.fromDate(input.periodEnd),
    payDate: input.payDate ? Timestamp.fromDate(input.payDate) : null,
    notes: input.notes ? normalizeUpper(input.notes) : null,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePayslip(uid: string, payslipId: string) {
  const ref = doc(firestore, userPayslipsCollectionPath(uid), payslipId);
  return deleteDoc(ref);
}

