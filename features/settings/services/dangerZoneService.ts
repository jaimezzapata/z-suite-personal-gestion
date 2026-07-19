"use client";

import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  writeBatch,
} from "firebase/firestore";

import { firestore } from "@/shared/firebase/firestore";

const DELETE_CHUNK_SIZE = 400;
export type DangerZoneTarget =
  | "companies"
  | "payslips"
  | "expenses"
  | "schedules"
  | "settings";

function companiesCollectionPath(uid: string) {
  return `users/${uid}/companies`;
}

function companySalaryHistoryCollectionPath(uid: string, companyId: string) {
  return `users/${uid}/companies/${companyId}/salaryHistory`;
}

function payslipsCollectionPath(uid: string) {
  return `users/${uid}/payslips`;
}

function expensesCollectionPath(uid: string) {
  return `users/${uid}/expenses`;
}

function schedulesCollectionPath(uid: string) {
  return `users/${uid}/schedules`;
}

function userSettingsDocRef(uid: string) {
  return doc(firestore, `users/${uid}/settings`, "app");
}

async function listDocumentIds(path: string) {
  const col = collection(firestore, path);
  const snap = await getDocs(query(col, orderBy(documentId())));
  return snap.docs.map((item) => item.id);
}

async function deleteCollectionByPath(path: string) {
  const col = collection(firestore, path);
  let deleted = 0;

  while (true) {
    const snap = await getDocs(query(col, orderBy(documentId()), limit(DELETE_CHUNK_SIZE)));
    if (snap.empty) break;

    const batch = writeBatch(firestore);
    for (const item of snap.docs) {
      batch.delete(item.ref);
    }
    await batch.commit();
    deleted += snap.size;

    if (snap.size < DELETE_CHUNK_SIZE) break;
  }

  return deleted;
}

export type ResetFirestoreUserDataResult = {
  companies: number;
  companySalaryHistory: number;
  payslips: number;
  expenses: number;
  schedules: number;
  settings: number;
  total: number;
};

export async function deleteCompanySalaryHistoryUserData(uid: string) {
  const companyIds = await listDocumentIds(companiesCollectionPath(uid));

  let companySalaryHistory = 0;
  for (const companyId of companyIds) {
    companySalaryHistory += await deleteCollectionByPath(companySalaryHistoryCollectionPath(uid, companyId));
  }

  return companySalaryHistory;
}

export async function deleteCompaniesUserData(uid: string) {
  const companySalaryHistory = await deleteCompanySalaryHistoryUserData(uid);
  const companies = await deleteCollectionByPath(companiesCollectionPath(uid));
  return companies + companySalaryHistory;
}

export async function deletePayslipsUserData(uid: string) {
  return deleteCollectionByPath(payslipsCollectionPath(uid));
}

export async function deleteExpensesUserData(uid: string) {
  return deleteCollectionByPath(expensesCollectionPath(uid));
}

export async function deleteSchedulesUserData(uid: string) {
  return deleteCollectionByPath(schedulesCollectionPath(uid));
}

export async function deleteSettingsUserData(uid: string) {
  const settingsRef = userSettingsDocRef(uid);
  const settingsSnap = await getDoc(settingsRef);
  if (!settingsSnap.exists()) {
    return 0;
  }

  await deleteDoc(settingsRef);
  return 1;
}

export async function deleteFirestoreUserDataTarget(uid: string, target: DangerZoneTarget) {
  switch (target) {
    case "companies":
      return deleteCompaniesUserData(uid);
    case "payslips":
      return deletePayslipsUserData(uid);
    case "expenses":
      return deleteExpensesUserData(uid);
    case "schedules":
      return deleteSchedulesUserData(uid);
    case "settings":
      return deleteSettingsUserData(uid);
  }
}

export async function resetFirestoreUserData(uid: string): Promise<ResetFirestoreUserDataResult> {
  const companySalaryHistory = await deleteCompanySalaryHistoryUserData(uid);
  const companies = await deleteCollectionByPath(companiesCollectionPath(uid));
  const payslips = await deletePayslipsUserData(uid);
  const expenses = await deleteExpensesUserData(uid);
  const schedules = await deleteSchedulesUserData(uid);
  const settings = await deleteSettingsUserData(uid);

  const total = companies + companySalaryHistory + payslips + expenses + schedules + settings;

  return {
    companies,
    companySalaryHistory,
    payslips,
    expenses,
    schedules,
    settings,
    total,
  };
}
