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
import { CommonModule } from '@angular/common';
import CategoryModalComponent from '../../../category/component/category-modal/category-modal.component';

@Component({
  selector: 'app-expense-modal',
  templateUrl: './expense-modal.component.html',
  standalone: true,
  imports: [
    CommonModule,
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

  // Modal-Formular für neue Kategorie
  readonly addCategoryForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(3)]]
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
  isAddCategoryModalOpen = false; // State für das Modal

  constructor() {
    // Icons registrieren
    addIcons({ close, save, text, add, pricetag, cash, calendar, trash });
  }

  // Lifecycle-Hook
  ionViewDidEnter(): void {
    this.nameInput?.setFocus();
  }

  ionViewWillEnter(): void {
    const { id, amount, category, date, name } = this.expense;

    // Safely set form values, fallback if category or fields are undefined
    this.expenseForm.patchValue({
      id,
      amount,
      categories: category?.id ?? '', // Use an empty string if category or ID is missing
      date,
      name
    });

    this.loadAllCategories(); // Load categories from the service

    // Add the current category to the dropdown if it is not already included
    if (category) {
      const isCategoryIncluded = this.categories.some(cat => cat.id === category.id);
      if (!isCategoryIncluded) {
        this.categories.push({
          ...category, // Existing fields
          createdAt: new Date().toISOString(), // Placeholder value
          lastModifiedAt: new Date().toISOString() // Placeholder value
        } as Category);
      }
    }
  }

  // Methode zum Laden aller Kategorien
  private loadAllCategories(): void {
    this.categoryService.getAllCategories({ sort: 'name,asc' }).subscribe({
      next: categories => {
        console.log('Categories loaded:', categories);
        this.categories = categories;
      },
      error: error => this.toastService.displayWarningToast('Could not load categories', error)
    });
  }

  // Modal-Operationen für das Hinzufügen einer Kategorie
  async showCategoryModal(): Promise<void> {
    const categoryModal = await this.modalCtrl.create({ component: CategoryModalComponent });
    await categoryModal.present();

    const { role } = await categoryModal.onWillDismiss();
    if (role === 'refresh') {
      this.loadAllCategories(); // Aktualisiere die Kategorienliste, wenn das Modal mit 'refresh' geschlossen wird
    }
  }

  closeAddCategoryModal(): void {
    this.isAddCategoryModalOpen = false;
  }

  saveNewCategory(): void {
    if (this.addCategoryForm.valid) {
      this.categoryService.addNewCategory(this.addCategoryForm.value).subscribe({
        next: () => {
          this.toastService.displaySuccessToast('Category added successfully');
          this.closeAddCategoryModal();
          this.loadAllCategories(); // Nach Hinzufügen Liste aktualisieren
        },
        error: error => {
          this.toastService.displayWarningToast('Could not add category', error);
        }
      });
    }
  }

  // Modal-Operationen
  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
    if (this.expenseForm.invalid) return;

    this.loadingIndicatorService.showLoadingIndicator({ message: 'Saving expense' }).subscribe(loadingIndicator => {
      // Prepare the payload
      const expense = {
        ...this.expenseForm.value,
        categoryId: this.expenseForm.value.categories, // Map 'categories' to 'categoryId'
        date: formatISO(parseISO(this.expenseForm.value.date!), { representation: 'date' }) // Format the date
      } as ExpenseUpsertDto;

      this.expenseService
        .upsertExpense(expense)
        .pipe(finalize(() => loadingIndicator.dismiss()))
        .subscribe({
          next: () => {
            this.toastService.displaySuccessToast('Expense saved');
            this.modalCtrl.dismiss(null, 'refresh');
          },
          error: error => {
            this.toastService.displayWarningToast('Could not save expense', error);
          }
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
