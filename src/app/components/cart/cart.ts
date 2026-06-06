import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CartService, CartItem } from '../../services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class CartComponent {
  readonly specialInstructionsLimit = 500;

  constructor(private router: Router, public cart: CartService) {}

  get specialInstructions(): string {
    return this.cart.specialInstructions;
  }

  set specialInstructions(value: string) {
    this.cart.setSpecialInstructions(value);
  }

  get specialInstructionsLength(): number {
    return this.specialInstructions.length;
  }

  get isSpecialInstructionsLimitReached(): boolean {
    return this.specialInstructionsLength >= this.specialInstructionsLimit;
  }

  trackByItem(index: number, item: CartItem): number {
    return item.product.id;
  }

  increase(item: CartItem) {
    this.cart.updateQuantity(item.product.id, item.quantity + 1);
  }

  decrease(item: CartItem) {
    this.cart.updateQuantity(item.product.id, item.quantity - 1);
  }

  remove(item: CartItem) {
    this.cart.removeItem(item.product.id);
  }

  checkout() {
    const closeBtn = document.querySelector('#cartOffcanvas .btn-close') as HTMLElement | null;
    if (closeBtn) {
      closeBtn.click();
    }

    setTimeout(() => {
      this.router.navigate(['/checkout']).then(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }, 250);
  }
}
