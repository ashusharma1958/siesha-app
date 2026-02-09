import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { Product } from '../../data/products.data';
import { Navigation } from '../navigation/navigation';
import { Footer } from '../footer/footer';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, RouterLink, Navigation, Footer],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit, OnDestroy {
  product: Product | undefined;
  fullStars: number[] = [];
  emptyStars: number[] = [];
  quantity = 1;

  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private cart: CartService,
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      const id = idParam ? Number(idParam) : NaN;

      if (!idParam || Number.isNaN(id)) {
        this.product = undefined;
        this.updateStars();
        return;
      }

      this.productService.getProduct(id).subscribe({
        next: (item) => {
          this.product = item;
          this.updateStars();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Failed to load product detail', error);
          this.product = undefined;
          this.updateStars();
          this.cdr.detectChanges();
        }
      });
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  get displayPrice(): number | undefined {
    if (!this.product) {
      return undefined;
    }

    return this.product.salePrice ?? this.product.price ?? undefined;
  }

  updateStars() {
    if (!this.product) {
      this.fullStars = [];
      this.emptyStars = [];
      return;
    }

    const rating = this.product.rating ?? 0;
    const rounded = Math.round(rating);
    this.fullStars = Array.from({ length: Math.min(rounded, 5) }, (_, index) => index);
    this.emptyStars = Array.from({ length: Math.max(5 - rounded, 0) }, (_, index) => index);
  }

  addToCart() {
    if (!this.product) {
      return;
    }

    this.cart.addItem(this.product, this.quantity);
    this.cart.openCart();
  }

  increaseQuantity() {
    this.quantity = Math.min(this.quantity + 1, 10);
  }

  decreaseQuantity() {
    this.quantity = Math.max(this.quantity - 1, 1);
  }
}
