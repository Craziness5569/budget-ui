// src/app/expense.model.ts
export interface Expense {
  name: string;
  category?: string; // Optional
  amount: number;
  date: Date;
}
