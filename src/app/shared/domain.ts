// ------
// Paging
// ------

export interface SortCriteria {
  sort: string;
}

export interface PagingCriteria extends SortCriteria {
  page: number;
  size: number;
}

export interface Page<T> {
  content: T[];
  last: boolean;
  totalElements: number;
}

// ----
// Misc
// ----

export interface SortOption {
  label: string;
  value: string;
}

// --------
// Category
// --------

export interface Category {
  id?: string;
  createdAt: string;
  lastModifiedAt: string;
  color?: string;
  name: string;
  categoryId?: string;
}

export interface CategoryUpsertDto {
  id?: string;
  color?: string;
  name: string;
}

export interface CategoryCriteria extends PagingCriteria {
  name?: string;
}

export interface AllCategoryCriteria extends SortCriteria {
  name?: string;
}

// -------
// Expense
// -------

export interface Expense {
  id?: string;
  name: string;
  amount: number;
  date: string;
  createdAt: string;
  category?: {
    id: string;
    name: string;
  }; // Category with ID and Name
}

export interface ExpenseUpsertDto {
  id?: string;
  amount: number;
  categoryId?: string;
  date: string;
  name: string;
}

export interface ExpenseCriteria extends PagingCriteria {
  categoryIds?: string[];
  name?: string;
  yearMonth?: string;
  dateFrom?: string; // Add dateFrom
  dateTo?: string; // Add dateTo
}

export interface AllExpenseCriteria extends SortCriteria {
  name?: string;
}
