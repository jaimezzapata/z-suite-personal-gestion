import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import type { ExpenseInput } from "@/features/expenses/types";
import { firestore } from "@/shared/firebase/firestore";

function userExpensesCollectionPath(uid: string) {
  return `users/${uid}/expenses`;
}

export async function createExpense(uid: string, input: ExpenseInput) {
  const col = collection(firestore, userExpensesCollectionPath(uid));
  const ref = doc(col);

  await setDoc(ref, {
    amount: input.amount,
    currency: "COP",
    category: input.category,
    date: Timestamp.fromDate(new Date()),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref;
}

export async function updateExpense(
  uid: string,
  expenseId: string,
  input: ExpenseInput,
) {
  const ref = doc(firestore, userExpensesCollectionPath(uid), expenseId);
  return updateDoc(ref, {
    amount: input.amount,
    currency: "COP",
    category: input.category,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteExpense(uid: string, expenseId: string) {
  const ref = doc(firestore, userExpensesCollectionPath(uid), expenseId);
  return deleteDoc(ref);
}
