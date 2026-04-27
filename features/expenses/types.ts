import type { Timestamp } from "firebase/firestore";

export type ExpenseCategory =
  | "COMIDA"
  | "PASAJES"
  | "GASOLINA"
  | "CASA"
  | "SERVICIOS"
  | "DEUDAS"
  | "ROPA"
  | "ZAPATOS"
  | "FIESTA"
  | "CITAS"
  | "GIMNASIO"
  | "TECNOLOGIA"
  | "OTROS";

export type ExpenseCurrency = "COP";

export type Expense = {
  id: string;
  amount: number;
  currency: ExpenseCurrency;
  category: ExpenseCategory;
  date: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type ExpenseInput = {
  amount: number;
  category: ExpenseCategory;
};
