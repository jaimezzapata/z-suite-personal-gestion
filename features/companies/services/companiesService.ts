import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import type { Company, CompanyInput } from "@/features/companies/types";
import { firestore } from "@/shared/firebase/firestore";
import { normalizeUpper } from "@/shared/utils/text";

function userCompaniesCollectionPath(uid: string) {
  return `users/${uid}/companies`;
}

function companySalaryHistoryCollectionPath(uid: string, companyId: string) {
  return `users/${uid}/companies/${companyId}/salaryHistory`;
}

type SalaryHistoryKind = "fixed" | "hourly";

function salaryHistoryKindFromCompany(input: CompanyInput): SalaryHistoryKind {
  return input.payType === "hourly" ? "hourly" : "fixed";
}

function salaryValueFromCompany(input: CompanyInput): number {
  return input.payType === "hourly"
    ? Number(input.hourlyRate ?? 0)
    : Number(input.fixedSalary ?? 0);
}

export async function createCompany(uid: string, input: CompanyInput) {
  const companyCol = collection(firestore, userCompaniesCollectionPath(uid));
  const companyRef = doc(companyCol);
  const historyCol = collection(
    firestore,
    companySalaryHistoryCollectionPath(uid, companyRef.id),
  );
  const historyRef = doc(historyCol);

  const batch = writeBatch(firestore);

  const startTs = input.contractStartDate
    ? Timestamp.fromDate(input.contractStartDate)
    : null;
  const endTs =
    input.contractEndDate === null
      ? null
      : input.contractEndDate
        ? Timestamp.fromDate(input.contractEndDate)
        : null;

  const notes = input.notes ? normalizeUpper(input.notes) : null;

  batch.set(companyRef, {
    name: normalizeUpper(input.name),
    payType: input.payType,
    payFrequency: input.payFrequency,
    currency: input.currency,
    active: input.active,
    contractStartDate: startTs,
    contractEndDate: endTs,
    notes,
    hourlyRate: input.payType === "hourly" ? input.hourlyRate ?? null : null,
    fixedSalary: input.payType === "fixed" ? input.fixedSalary ?? null : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(historyRef, {
    kind: salaryHistoryKindFromCompany(input),
    value: salaryValueFromCompany(input),
    currency: input.currency,
    effectiveFrom: startTs ?? serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return companyRef;
}

export async function updateCompany(
  uid: string,
  companyId: string,
  input: CompanyInput,
) {
  const ref = doc(firestore, userCompaniesCollectionPath(uid), companyId);

  const startTs = input.contractStartDate
    ? Timestamp.fromDate(input.contractStartDate)
    : null;
  const endTs =
    input.contractEndDate === null
      ? null
      : input.contractEndDate
        ? Timestamp.fromDate(input.contractEndDate)
        : null;

  const notes = input.notes ? normalizeUpper(input.notes) : null;

  return updateDoc(ref, {
    name: normalizeUpper(input.name),
    payType: input.payType,
    payFrequency: input.payFrequency,
    currency: input.currency,
    active: input.active,
    contractStartDate: startTs,
    contractEndDate: endTs,
    notes,
    hourlyRate: input.payType === "hourly" ? input.hourlyRate ?? null : null,
    fixedSalary: input.payType === "fixed" ? input.fixedSalary ?? null : null,
    updatedAt: serverTimestamp(),
  });
}

export async function updateCompanyWithSalaryHistory(
  uid: string,
  companyId: string,
  input: CompanyInput,
  previous: Pick<Company, "payType" | "hourlyRate" | "fixedSalary" | "currency">,
) {
  const batch = writeBatch(firestore);
  const ref = doc(firestore, userCompaniesCollectionPath(uid), companyId);

  const startTs = input.contractStartDate
    ? Timestamp.fromDate(input.contractStartDate)
    : null;
  const endTs =
    input.contractEndDate === null
      ? null
      : input.contractEndDate
        ? Timestamp.fromDate(input.contractEndDate)
        : null;

  const notes = input.notes ? normalizeUpper(input.notes) : null;

  batch.update(ref, {
    name: normalizeUpper(input.name),
    payType: input.payType,
    payFrequency: input.payFrequency,
    currency: input.currency,
    active: input.active,
    contractStartDate: startTs,
    contractEndDate: endTs,
    notes,
    hourlyRate: input.payType === "hourly" ? input.hourlyRate ?? null : null,
    fixedSalary: input.payType === "fixed" ? input.fixedSalary ?? null : null,
    updatedAt: serverTimestamp(),
  });

  const prevKind = previous.payType === "hourly" ? "hourly" : "fixed";
  const nextKind = salaryHistoryKindFromCompany(input);
  const prevValue =
    previous.payType === "hourly"
      ? Number(previous.hourlyRate ?? 0)
      : Number(previous.fixedSalary ?? 0);
  const nextValue = salaryValueFromCompany(input);
  const prevCurrency = previous.currency;
  const nextCurrency = input.currency;

  const salaryChanged =
    prevKind !== nextKind ||
    prevValue !== nextValue ||
    prevCurrency !== nextCurrency;

  if (salaryChanged) {
    const historyCol = collection(
      firestore,
      companySalaryHistoryCollectionPath(uid, companyId),
    );
    const historyRef = doc(historyCol);
    batch.set(historyRef, {
      kind: nextKind,
      value: nextValue,
      currency: nextCurrency,
      effectiveFrom: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function deleteCompany(uid: string, companyId: string) {
  const ref = doc(firestore, userCompaniesCollectionPath(uid), companyId);
  return deleteDoc(ref);
}

export async function setCompanyActive(
  uid: string,
  companyId: string,
  active: boolean,
) {
  const ref = doc(firestore, userCompaniesCollectionPath(uid), companyId);
  return updateDoc(ref, { active, updatedAt: serverTimestamp() });
}
