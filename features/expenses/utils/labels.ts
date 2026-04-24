import type { ExpenseCategory } from "@/features/expenses/types";

export function expenseCategoryLabel(c: ExpenseCategory) {
  return c.replaceAll("_", " ");
}

