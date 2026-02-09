import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Navigation } from '../navigation/navigation';
import { ShopFilter } from '../shop-filter/shop-filter';
import { Footer } from '../footer/footer';
import { Product } from '../../data/products.data';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-shop',
  imports: [CommonModule, RouterLink, Navigation, ShopFilter, Footer],
  templateUrl: './shop.html',
  styleUrl: './shop.css',
})
export class Shop implements OnInit {
  products: Product[] = [];

  constructor(
    private productService: ProductService,
    private cart: CartService,
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
        console.error('Failed to load shop products', error);
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
