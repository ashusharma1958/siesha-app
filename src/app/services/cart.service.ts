import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Product } from '../data/products.data';

export type CartItem = {
  product: Product;
  quantity: number;
};

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private itemsSubject = new BehaviorSubject<CartItem[]>([]);
  items$ = this.itemsSubject.asObservable();
  private specialInstructionsSubject = new BehaviorSubject<string>('');
  specialInstructions$ = this.specialInstructionsSubject.asObservable();

  get items(): CartItem[] {
    return this.itemsSubject.value;
  }

  get specialInstructions(): string {
    return this.specialInstructionsSubject.value;
  }

  setSpecialInstructions(value: string): void {
    this.specialInstructionsSubject.next((value ?? '').slice(0, 500));
  }

  addItem(product: Product, quantity = 1) {
    const items = [...this.itemsSubject.value];
    const existing = items.find((item) => item.product.id === product.id);

    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, 10);
    } else {
      items.push({ product, quantity: Math.min(quantity, 10) });
    }

    this.itemsSubject.next(items);
  }

  updateQuantity(productId: number, quantity: number) {
    const items = [...this.itemsSubject.value];
    const target = items.find((item) => item.product.id === productId);

    if (!target) {
      return;
    }

    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    target.quantity = Math.min(quantity, 10);
    this.itemsSubject.next(items);
  }

  removeItem(productId: number) {
    const items = this.itemsSubject.value.filter((item) => item.product.id !== productId);
    this.itemsSubject.next(items);
  }

  clearCart() {
    this.itemsSubject.next([]);
    this.specialInstructionsSubject.next('');
  }

  getTotal(): number {
    return this.itemsSubject.value.reduce((total, item) => {
      const price = item.product.salePrice ?? item.product.price ?? 0;
      return total + price * item.quantity;
    }, 0);
  }

  openCart() {
    const element = document.getElementById('cartOffcanvas');
    if (!element) {
      return;
    }

    const bootstrap = (window as any).bootstrap;
    if (bootstrap?.Offcanvas) {
      const instance = bootstrap.Offcanvas.getOrCreateInstance(element);
      instance.show();
    }
  }
}
