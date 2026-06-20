import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Product } from '../data/products.data';

export type CartItem = {
  product: Product;
  quantity: number;
};

type StoredCartState = {
  items: CartItem[];
  specialInstructions: string;
};

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly storageKey = 'siesha.cart';
  private itemsSubject = new BehaviorSubject<CartItem[]>([]);
  items$ = this.itemsSubject.asObservable();
  private specialInstructionsSubject = new BehaviorSubject<string>('');
  specialInstructions$ = this.specialInstructionsSubject.asObservable();

  constructor() {
    this.restoreState();
  }

  get items(): CartItem[] {
    return this.itemsSubject.value;
  }

  get specialInstructions(): string {
    return this.specialInstructionsSubject.value;
  }

  setSpecialInstructions(value: string): void {
    this.specialInstructionsSubject.next((value ?? '').slice(0, 500));
    this.persistState();
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
    this.persistState();
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
    this.persistState();
  }

  removeItem(productId: number) {
    const items = this.itemsSubject.value.filter((item) => item.product.id !== productId);
    this.itemsSubject.next(items);
    this.persistState();
  }

  clearCart() {
    this.itemsSubject.next([]);
    this.specialInstructionsSubject.next('');
    this.clearPersistedState();
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

  private restoreState(): void {
    const storedState = this.readStoredState();
    if (!storedState) {
      return;
    }

    this.itemsSubject.next(storedState.items);
    this.specialInstructionsSubject.next(storedState.specialInstructions);
  }

  private persistState(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const state: StoredCartState = {
      items: this.itemsSubject.value,
      specialInstructions: this.specialInstructionsSubject.value
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage failures and keep the in-memory cart working.
    }
  }

  private clearPersistedState(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore storage failures.
    }
  }

  private readStoredState(): StoredCartState | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const rawState = localStorage.getItem(this.storageKey);
      if (!rawState) {
        return null;
      }

      const parsed = JSON.parse(rawState) as Partial<StoredCartState> | null;
      const items = Array.isArray(parsed?.items) ? parsed.items.filter(this.isValidCartItem) : [];
      const specialInstructions = typeof parsed?.specialInstructions === 'string'
        ? parsed.specialInstructions.slice(0, 500)
        : '';

      return { items, specialInstructions };
    } catch {
      return null;
    }
  }

  private isValidCartItem(item: unknown): item is CartItem {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const cartItem = item as CartItem;
    return !!cartItem.product && typeof cartItem.product.id === 'number' && typeof cartItem.quantity === 'number';
  }
}
