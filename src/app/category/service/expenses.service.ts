import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Expense, ExpenseCriteria, ExpenseUpsertDto, Page, Category } from '../../shared/domain';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly httpClient = inject(HttpClient);

  private readonly apiUrl = `${environment.backendUrl}/expenses`;
  private readonly categoryApiUrl = `${environment.backendUrl}/categories`;

  // Read Expenses
  getExpenses(pagingCriteria: ExpenseCriteria): Observable<Page<Expense>> {
    const params = new HttpParams({ fromObject: { ...pagingCriteria } });
    return this.httpClient.get<Page<Expense>>(this.apiUrl, { params });
  }

  // Read Categories
  getCategories(): Observable<{ content: Category[] }> {
    return this.httpClient.get<{ content: Category[] }>(this.categoryApiUrl);
  }

  // Upsert Expense (Create or Update)
  upsertExpense(expense: ExpenseUpsertDto): Observable<void> {
    return this.httpClient.put<void>(this.apiUrl, expense);
  }

  // Delete Expense
  deleteExpense(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}/${id}`);
  }
}
