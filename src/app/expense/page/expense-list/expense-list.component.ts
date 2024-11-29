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
  ViewDidEnter,
  IonButton
} from '@ionic/angular/standalone';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { add, alertCircleOutline, search, swapVertical, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import ExpenseModalComponent from '../../../expense/component/expense-modal/expense-modal.component';
import { ToastService } from '../../../shared/service/toast.service';
import { ExpenseService } from '../../../category/service/expenses.service';
import { Category, Expense, ExpenseCriteria, SortOption } from '../../../shared/domain';
import { debounceTime, finalize, groupBy, toArray } from 'rxjs/operators';
import { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';
import { from, mergeMap, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { CategoryService } from '../../../category/service/category.service';
import { formatPeriod } from '../../../shared/period';
import { set } from 'date-fns'; // Importing set from date-fns

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
    IonFabButton,
    IonButton
  ]
})
export default class ExpenseListComponent implements ViewDidEnter {
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(CategoryService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  expenseGroups: ExpenseGroup[] | null = null;
  categories: Category[] = [];
  readonly initialSort = 'name,asc';
  lastPageReached = false;
  loading = false;

  date = set(new Date(), { date: 1 }); // Correctly sets the day of the month to the 1st
  currentMonth: Date = new Date(); // Variable für den aktuell ausgewählten Monat

  searchCriteria: ExpenseCriteria = { page: 0, size: 25, sort: this.initialSort, categoryIds: [] };

  readonly searchForm = this.formBuilder.group({
    name: [''],
    sort: [this.initialSort],
    categoryIds: [[]]
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
    addIcons({ swapVertical, search, alertCircleOutline, add, chevronBackOutline, chevronForwardOutline });
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
    this.categoryService.getAllCategories({ sort: 'name,asc' }).subscribe({
      next: categories => {
        console.log('Categories loaded:', categories);
        this.categories = categories;
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.displayWarningToast('Failed to load categories', error);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private loadExpenses(next: () => void = () => {}): void {
    this.searchCriteria.yearMonth = formatPeriod(this.date);
    if (!this.searchCriteria.categoryIds?.length) delete this.searchCriteria.categoryIds;
    if (!this.searchCriteria.name) delete this.searchCriteria.name;
    this.loading = true;
    const groupByDate = this.searchCriteria.sort.startsWith('date');
    this.expenseService
      .getExpenses(this.searchCriteria)
      .pipe(
        finalize(() => (this.loading = false)),
        mergeMap(expensePage => {
          this.lastPageReached = expensePage.last;
          next();
          if (this.searchCriteria.page === 0 || !this.expenseGroups) this.expenseGroups = [];
          return from(expensePage.content).pipe(
            groupBy(expense => (groupByDate ? expense.date : expense.id)),
            mergeMap(group => group.pipe(toArray()))
          );
        })
      )
      .subscribe({
        next: (expenses: Expense[]) => {
          const expenseGroup: ExpenseGroup = {
            date: expenses[0].date,
            expenses: this.sortExpenses(expenses)
          };
          const expenseGroupWithSameDate = this.expenseGroups!.find(other => other.date === expenseGroup.date);
          if (!expenseGroupWithSameDate || !groupByDate) this.expenseGroups!.push(expenseGroup);
          else expenseGroupWithSameDate.expenses = this.sortExpenses([...expenseGroupWithSameDate.expenses, ...expenseGroup.expenses]);
        },
        error: error => this.toastService.displayWarningToast('Could not load expenses', error)
      });
  }

  private sortExpenses = (expenses: Expense[]): Expense[] => expenses.sort((a, b) => a.name.localeCompare(b.name));

  private groupExpensesByDate(expenses: Expense[]): ExpenseGroup[] {
    return expenses.reduce((groups, expense) => {
      const date = new Date(expense.date);
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      const group = groups.find(g => g.date === dayKey);

      if (group) {
        group.expenses.push(expense);
      } else {
        groups.push({ date: dayKey, expenses: [expense] });
      }

      return groups;
    }, [] as ExpenseGroup[]);
  }

  private addMonths(date: Date, months: number): Date {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    if (newDate.getDate() < date.getDate()) {
      newDate.setDate(0);
    }
    return newDate;
  }

  changeMonth(monthDelta: number): void {
    this.currentMonth = this.addMonths(this.currentMonth, monthDelta);
    this.loadExpenses();
  }

  async openModal(expense?: Expense): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExpenseModalComponent,
      componentProps: { expense: expense ?? {} }
    });

    await modal.present();

    const { role } = await modal.onWillDismiss();

    if (role === 'refresh') {
      this.loadExpenses(); // Aktualisiert die Ausgaben
      this.loadCategories(); // Aktualisiert die Kategorien
    }
  }

  loadNextExpensesPage($event: InfiniteScrollCustomEvent): void {
    this.searchCriteria.page++; // Nächste Seite laden
    this.loadExpenses(() => $event.target.complete()); // Daten laden und Infinite Scroll beenden
  }
  reloadExpenses($event?: RefresherCustomEvent): void {
    this.loadExpenses(() => $event?.target.complete());
  }
}

interface ExpenseGroup {
  date: string;
  expenses: Expense[];
}
