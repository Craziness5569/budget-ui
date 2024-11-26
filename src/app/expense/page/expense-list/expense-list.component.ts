import { Component, inject } from '@angular/core';
import {
  IonButtons,
  IonCol,
  IonContent,
  IonFab,
  IonFabButton,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonItemGroup,
  IonItemDivider,
  IonLabel,
  IonList,
  IonMenuButton,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  ModalController,
  ViewDidEnter
} from '@ionic/angular/standalone';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { add, alertCircleOutline, search, swapVertical } from 'ionicons/icons';
import ExpenseModalComponent from '../../../expense/component/expense-modal/expense-modal.component';
import { ToastService } from '../../../shared/service/toast.service';
import { ExpenseService } from '../../../category/service/expenses.service';
import { Category, Expense, ExpenseCriteria, SortOption } from '../../../shared/domain';
import { debounceTime, finalize } from 'rxjs/operators';
import { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-expense-list',
  templateUrl: './expense-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonProgressBar,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonGrid,
    IonRow,
    IonCol,
    IonList,
    IonItem,
    IonItemGroup,
    IonItemDivider,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonLabel,
    IonSkeletonText,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonFab,
    IonFabButton
  ]
})
export default class ExpenseListComponent implements ViewDidEnter {
  // Dependency Injection
  private readonly expenseService = inject(ExpenseService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  // Klassenvariablen
  expenses: Expense[] | null = null; // Flache Liste von Ausgaben
  expenseGroups: ExpenseGroup[] | null = null; // Gruppen von Ausgaben nach Datum
  categories: Category[] = []; // Kategorienliste
  readonly initialSort = 'name,asc';
  lastPageReached = false;
  loading = false;

  searchCriteria: ExpenseCriteria = { page: 0, size: 25, sort: this.initialSort, categoryIds: [] };

  readonly searchForm = this.formBuilder.group({
    name: [''],
    sort: [this.initialSort],
    categoryIds: [[]] // Multiselect für Kategorie-IDs
  });

  private searchFormSubscription?: Subscription;

  readonly sortOptions: SortOption[] = [
    { label: 'Created at (newest first)', value: 'createdAt,desc' },
    { label: 'Created at (oldest first)', value: 'createdAt,asc' },
    { label: 'Date (newest first)', value: 'createdAt,asc' },
    { label: 'Date (oldest first)', value: 'createdAt,desc' },
    { label: 'Name (A-Z)', value: 'name,asc' },
    { label: 'Name (Z-A)', value: 'name,desc' }
  ];

  constructor() {
    // Add all used Ionic icons
    addIcons({ swapVertical, search, alertCircleOutline, add });
  }

  ionViewDidEnter(): void {
    this.loadCategories();
    this.searchFormSubscription = this.searchForm.valueChanges.pipe(debounceTime(400)).subscribe(searchParams => {
      this.searchCriteria = { ...this.searchCriteria, ...searchParams, page: 0 };
      this.loadExpenses();
    });
    this.loadExpenses();
  }

  ionViewDidLeave(): void {
    this.searchFormSubscription?.unsubscribe();
    this.searchFormSubscription = undefined;
  }

  private loadCategories(): void {
    this.loading = true;
    this.expenseService.getCategories().subscribe({
      next: response => {
        if (response && Array.isArray(response.content)) {
          this.categories = response.content;
        } else {
          this.toastService.displayWarningToast('Failed to load categories');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.displayWarningToast('Failed to load categories', error);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private loadExpenses(next?: () => void): void {
    if (!this.searchCriteria.name) delete this.searchCriteria.name;
    if (!this.searchCriteria.categoryIds || this.searchCriteria.categoryIds.length === 0) {
      delete this.searchCriteria.categoryIds;
    }

    this.loading = true;
    this.expenseService
      .getExpenses(this.searchCriteria)
      .pipe(
        finalize(() => {
          this.loading = false;
          if (next) next();
        })
      )
      .subscribe({
        next: expenses => {
          if (this.searchCriteria.page === 0 || !this.expenses) {
            this.expenses = [];
          }
          this.expenses.push(...expenses.content);
          this.expenseGroups = this.groupExpensesByDate(this.expenses); // Gruppen von Ausgaben erstellen
          this.lastPageReached = expenses.last;
        },
        error: () => {
          this.toastService.displayWarningToast('Failed to load categories');
        }
      });
  }

  private groupExpensesByDate(expenses: Expense[]): ExpenseGroup[] {
    return expenses.reduce((groups, expense) => {
      const date = expense.date; // Ersetze dies durch die tatsächliche Eigenschaft für das Datum
      const group = groups.find(g => g.date === date);

      if (group) {
        group.expenses.push(expense);
      } else {
        groups.push({ date, expenses: [expense] });
      }

      return groups;
    }, [] as ExpenseGroup[]);
  }

  async openModal(expense?: Expense): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExpenseModalComponent,
      componentProps: { expense: expense ?? {} }
    });
    modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'refresh') this.reloadExpenses();
  }

  loadNextExpensesPage($event: InfiniteScrollCustomEvent) {
    this.searchCriteria.page++;
    this.loadExpenses(() => $event.target.complete());
  }

  reloadExpenses($event?: RefresherCustomEvent): void {
    this.searchCriteria.page = 0;
    this.loadExpenses(() => $event?.target.complete());
  }
}

interface ExpenseGroup {
  date: string;
  expenses: Expense[];
}
