import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { CartService, CartItem } from '../../services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class CartComponent {
  constructor(private router: Router, public cart: CartService) {}

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
