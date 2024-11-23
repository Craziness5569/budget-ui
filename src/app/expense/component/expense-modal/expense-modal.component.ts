import { Component, inject, Input, ViewChild } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonDatetime,
  IonDatetimeButton,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ModalController,
  ViewDidEnter,
  ViewWillEnter
} from '@ionic/angular/standalone';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { addIcons } from 'ionicons';
import { add, calendar, cash, close, pricetag, save, text, trash } from 'ionicons/icons';
import { ToastService } from '../../../shared/service/toast.service';
import { ExpenseService } from '../../../category/service/expenses.service';
import { LoadingIndicatorService } from '../../../shared/service/loading-indicator.service';
import { finalize } from 'rxjs/operators';
import { Category, Expense, ExpenseUpsertDto, SortOption } from '../../../shared/domain';
import { mergeMap, Subscription } from 'rxjs';
import { ActionSheetService } from '../../../shared/service/action-sheet.service';
import { formatISO, parseISO } from 'date-fns';
import { CategoryService } from '../../../category/service/category.service';

@Component({
  selector: 'app-expense-modal',
  templateUrl: './expense-modal.component.html',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    // Ionic
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonItem,
    IonInput,
    IonChip,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonNote,
    IonDatetimeButton,
    IonModal,
    IonDatetime,
    IonFab,
    IonFabButton
  ]
})
export default class ExpenseModalComponent implements ViewWillEnter, ViewDidEnter {
  // Dependency Injection
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(CategoryService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly loadingIndicatorService = inject(LoadingIndicatorService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastService = inject(ToastService);
  private readonly actionSheetService = inject(ActionSheetService);

  // Form Group
  readonly expenseForm = this.formBuilder.group({
    id: [null! as string],
    name: ['', [Validators.required, Validators.maxLength(40)]],
    categories: [''],
    amount: [0, [Validators.required, Validators.min(0)]],
    date: [formatISO(new Date()), Validators.required]
  });

  @ViewChild('nameInput') nameInput?: IonInput;
  @Input() expense: Expense = {} as Expense;
  private searchFormSubscription?: Subscription;
  readonly sortOptions: SortOption[] = [
    { label: 'Created at (newest first)', value: 'createdAt,desc' },
    { label: 'Created at (oldest first)', value: 'createdAt,asc' },
    { label: 'Name (A-Z)', value: 'name,asc' },
    { label: 'Name (Z-A)', value: 'name,desc' }
  ];
  categories: Category[] = [];
  constructor() {
    // Icons registrieren
    addIcons({ close, save, text, add, pricetag, cash, calendar, trash });
  }
  // Lifecycle-Hook
  ionViewDidEnter(): void {
    this.nameInput?.setFocus();
  }
  ionViewWillEnter(): void {
    this.expenseForm.patchValue(this.expense);
  }
  // Methode zum Laden aller Kategorien
  private loadAllCategories(): void {
    this.categoryService.getAllCategories({ sort: 'name,asc' }).subscribe({
      next: categories => (this.categories = categories),
      error: error => this.toastService.displayWarningToast('Could not load categories', error)
    });
  }
  // Modal-Operationen
  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
    this.loadingIndicatorService.showLoadingIndicator({ message: 'Saving expense' }).subscribe(loadingIndicator => {
      const expense = {
        ...this.expenseForm.value,
        date: formatISO(parseISO(this.expenseForm.value.date!), { representation: 'date' }) // Datum korrekt formatieren
      } as ExpenseUpsertDto;

      this.expenseService
        .upsertExpense(expense)
        .pipe(finalize(() => loadingIndicator.dismiss()))
        .subscribe({
          next: () => {
            this.toastService.displaySuccessToast('Expense saved');
            this.modalCtrl.dismiss(null, 'refresh');
          },
          error: error => this.toastService.displayWarningToast('Could not save expense', error)
        });
    });
  }
  delete(): void {
    this.actionSheetService
      .showDeletionConfirmation('Are you sure you want to delete this expense?')
      .pipe(mergeMap(() => this.loadingIndicatorService.showLoadingIndicator({ message: 'Deleting expense' })))
      .subscribe(loadingIndicator => {
        this.expenseService
          .deleteExpense(this.expense.id!)
          .pipe(finalize(() => loadingIndicator.dismiss()))
          .subscribe({
            next: () => {
              this.toastService.displaySuccessToast('Expense deleted');
              this.modalCtrl.dismiss(null, 'refresh');
            },
            error: error => this.toastService.displayWarningToast('Could not delete expense', error)
          });
      });
  }
}
