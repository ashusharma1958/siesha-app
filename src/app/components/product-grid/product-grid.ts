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
}
