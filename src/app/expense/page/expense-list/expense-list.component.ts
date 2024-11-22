import { Component, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonSelect,
  IonSelectOption,
  IonMenuButton,
  IonProgressBar,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, pricetag, search, swapVertical } from 'ionicons/icons';
import { set, addMonths } from 'date-fns';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common'; // NgFor und NgIf importieren

@Component({
  selector: 'app-expense-list',
  templateUrl: './expense-list.component.html',
  standalone: true,
  imports: [
    // Alle benötigten Ionic-Komponenten importieren
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonMenuButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonGrid,
    IonRow,
    IonCol,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonProgressBar,
    FormsModule,
    NgFor, // NgFor hinzufügen
    NgIf // NgIf hinzufügen
  ]
})
export default class ExpenseListComponent {
  private readonly modalCtrl = inject(ModalController);

  date = set(new Date(), { date: 1 });
  allExpenses = [
    { date: '2024-11-20', description: 'Groceries', category: 'Food', amount: 50 },
    { date: '2024-11-18', description: 'Movie Night', category: 'Entertainment', amount: 15 },
    { date: '2024-11-15', description: 'Gas', category: 'Transport', amount: 30 }
  ];
  expenses = [...this.allExpenses];
  categories = ['Food', 'Entertainment', 'Transport', 'Miscellaneous'];
  selectedCategory: string | null = null;
  searchTerm: string = '';
  loading = false;

  constructor() {
    addIcons({ swapVertical, pricetag, search, add }); // Icons hinzufügen
  }

  addMonths = (number: number): void => {
    this.date = addMonths(this.date, number); // Datum um Monate verschieben
  };

  filterExpenses(): void {
    this.expenses = this.allExpenses.filter(expense => {
      const matchesCategory = this.selectedCategory ? expense.category === this.selectedCategory : true;
      const matchesSearch = this.searchTerm ? expense.description.toLowerCase().includes(this.searchTerm.toLowerCase()) : true;

      return matchesCategory && matchesSearch;
    });
  }

  sortExpenses(sortBy: string): void {
    if (sortBy === 'date') {
      this.expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === 'amount') {
      this.expenses.sort((a, b) => b.amount - a.amount);
    }
  }
}
