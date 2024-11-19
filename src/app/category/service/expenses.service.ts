import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Expense, ExpenseCriteria, ExpenseUpsertDto, Page } from '../../shared/domain';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private readonly httpClient = inject(HttpClient);

  private readonly apiUrl = `${environment.backendUrl}/expenses`;
  private readonly apiV2Url = `${environment.backendUrl}/v2/expenses`;

  // Read

  getCategories = (pagingCriteria: ExpenseCriteria): Observable<Page<Expense>> =>
    this.httpClient.get<Page<Expense>>(this.apiUrl, { params: new HttpParams({ fromObject: { ...pagingCriteria } }) });

  getAllCategories = (sortCriteria: ExpenseCriteria): Observable<Expense[]> =>
    this.httpClient.get<Expense[]>(this.apiV2Url, { params: new HttpParams({ fromObject: { ...sortCriteria } }) });

  // Create & Update

  upsertCategory = (category: ExpenseUpsertDto): Observable<void> => this.httpClient.put<void>(this.apiUrl, category);

  // Delete

  deleteCategory = (id: string): Observable<void> => this.httpClient.delete<void>(`${this.apiUrl}/${id}`);
}
