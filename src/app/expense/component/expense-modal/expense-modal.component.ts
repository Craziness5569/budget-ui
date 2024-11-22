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
  ModalController
} from '@ionic/angular/standalone';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { addIcons } from 'ionicons';
import { add, calendar, cash, close, pricetag, save, text, trash } from 'ionicons/icons';
import CategoryModalComponent from '../../../category/component/category-modal/category-modal.component';
import { LoadingIndicatorService } from '../../../shared/service/loading-indicator.service';
import { ToastService } from '../../../shared/service/toast.service';
import { ActionSheetService } from '../../../shared/service/action-sheet.service';
import { ExpenseService } from '../../../category/service/expenses.service';
import { Subscription } from 'rxjs';
import { Expense, SortOption } from '../../../shared/domain';

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
export default class ExpenseModalComponent {
  // Dependency Injection
  private readonly ExpenseService = inject(ExpenseService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly loadingIndicatorService = inject(LoadingIndicatorService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastService = inject(ToastService);
  private readonly actionSheetService = inject(ActionSheetService);

  // Form Group
  readonly expenseForm = this.formBuilder.group({
    id: [null! as string],
    name: ['', [Validators.required, Validators.maxLength(40)]],
    category: [''],
    amount: [0, [Validators.required, Validators.min(0)]],
    date: [new Date(), Validators.required]
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

  constructor() {
    addIcons({ close, save, text, pricetag, add, cash, calendar, trash });
  }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
    if (this.expenseForm.valid) {
      const updatedExpense: Expense = {
        ...this.expense,
        ...(this.expenseForm.value as Partial<Expense>)
      };
      this.modalCtrl.dismiss(updatedExpense, 'save');
    }
  }

  delete(): void {
    this.modalCtrl.dismiss(null, 'delete');
  }

  async showCategoryModal(): Promise<void> {
    const categoryModal = await this.modalCtrl.create({ component: CategoryModalComponent });
    categoryModal.present();
    const { role } = await categoryModal.onWillDismiss();
    console.log('role', role);
  }
}
