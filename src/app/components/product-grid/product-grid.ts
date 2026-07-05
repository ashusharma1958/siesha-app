import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Product } from '../../data/products.data';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-grid',
  imports: [CommonModule, RouterLink],
  templateUrl: './product-grid.html',
  styleUrl: './product-grid.css',
})
export class ProductGrid implements OnInit {
  products: Product[] = [];

  constructor(
    private cart: CartService,
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.productService.getProducts().subscribe({
      next: (items) => {
        const priced = items.filter((item) => item.price != null || item.salePrice != null);
        this.products = priced.length > 0 ? priced : items;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load products', error);
      }
    });
  }

  trackByProduct(index: number, product: Product): number {
    return product.id;
  }

  addToCart(product: Product, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.cart.addItem(product, 1);
    this.cart.openCart();
  }

  getDisplayPrice(product: Product): number | undefined {
    return product.salePrice ?? product.price ?? product.originalPrice ?? undefined;
  }

  getRoundedRating(rating: number | null | undefined): number {
    const clamped = Math.max(0, Math.min(5, rating ?? 0));
    return Math.round(clamped);
  }

  getRatingStars(rating: number | null | undefined): string {
    const filled = this.getRoundedRating(rating);
    const empty = 5 - filled;
    return `${'★'.repeat(filled)}${'☆'.repeat(empty)}`;
  }

  getReviewCount(reviewCount: number | null | undefined): number {
    return Math.max(0, reviewCount ?? 0);
  }

  getReviewLabel(reviewCount: number | null | undefined): string {
    return this.getReviewCount(reviewCount) < 2 ? 'review' : 'reviews';
  }

  shouldShowRating(rating: number | null | undefined, reviewCount: number | null | undefined): boolean {
    return !(this.getRoundedRating(rating) === 0 && this.getReviewCount(reviewCount) === 0);
  }
}
