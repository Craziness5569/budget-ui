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
import CategoryModalComponent from '../../component/category-modal/category-modal.component';
import { ToastService } from '../../../shared/service/toast.service';
import { CategoryService } from '../../service/category.service';
import { Category, CategoryCriteria, SortOption } from '../../../shared/domain';
import { debounceTime, finalize } from 'rxjs/operators';
import { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.component.html',
  standalone: true,
  imports: [
    ReactiveFormsModule,

    // Ionic
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
export default class CategoryListComponent implements ViewDidEnter {
  // DI
  private readonly categoryService = inject(CategoryService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  categories: Category[] | null = null;
  readonly initialSort = 'name,asc';
  lastPageReached = false;
  loading = false;
  searchCriteria: CategoryCriteria = { page: 0, size: 25, sort: this.initialSort };
  readonly searchForm = this.formBuilder.group({ name: [''], sort: [this.initialSort] });
  private searchFormSubscription?: Subscription;
  readonly sortOptions: SortOption[] = [
    { label: 'Created at (newest first)', value: 'createdAt,desc' },
    { label: 'Created at (oldest first)', value: 'createdAt,asc' },
    { label: 'Name (A-Z)', value: 'name,asc' },
    { label: 'Name (Z-A)', value: 'name,desc' }
  ];

  constructor() {
    // Add all used Ionic icons
    addIcons({ swapVertical, search, alertCircleOutline, add });
  }

  async openModal(category?: Category): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: CategoryModalComponent,
      componentProps: { category: category ?? {} }
    });
    modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'refresh') this.reloadCategories();
  }
  ionViewDidEnter(): void {
    this.searchFormSubscription = this.searchForm.valueChanges.pipe(debounceTime(400)).subscribe(searchParams => {
      this.searchCriteria = { ...this.searchCriteria, ...searchParams, page: 0 };
      this.loadCategories();
    });
    this.loadCategories();
  }

  ionViewDidLeave(): void {
    this.searchFormSubscription?.unsubscribe();
    this.searchFormSubscription = undefined;
  }

  private loadCategories(next?: () => void): void {
    if (!this.searchCriteria.name) delete this.searchCriteria.name;
    this.loading = true;
    this.categoryService
      .getCategories(this.searchCriteria)
      .pipe(
        finalize(() => {
          this.loading = false;
          if (next) next();
        })
      )
      .subscribe({
        next: categories => {
          if (this.searchCriteria.page === 0 || !this.categories) this.categories = [];
          this.categories.push(...categories.content);
          this.lastPageReached = categories.last;
        },
        error: error => this.toastService.displayWarningToast('Could not load categories', error)
      });
  }

  loadNextCategoryPage($event: InfiniteScrollCustomEvent) {
    this.searchCriteria.page++;
    this.loadCategories(() => $event.target.complete());
  }

  reloadCategories($event?: RefresherCustomEvent): void {
    this.searchCriteria.page = 0;
    this.loadCategories(() => $event?.target.complete());
  }
}
