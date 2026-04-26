import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Navigation } from '../navigation/navigation';
import { ShopFilter, ShopFilterState } from '../shop-filter/shop-filter';
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
  allProducts: Product[] = [];
  products: Product[] = [];
  activeFilters: ShopFilterState = {
    sortBy: 'featured',
    minPrice: 0,
    maxPrice: 11000,
    fragranceFamilies: [],
    rituals: [],
    minRating: null,
  };

  constructor(
    private productService: ProductService,
    private cart: CartService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.productService.getProducts().subscribe({
      next: (items) => {
        const priced = items.filter((item) => item.price != null || item.salePrice != null);
        this.allProducts = priced.length > 0 ? priced : items;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load shop products', error);
      }
    });
  }

  onFiltersChange(filters: ShopFilterState): void {
    this.activeFilters = filters;
    this.applyFilters();
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

  private applyFilters(): void {
    let result = [...this.allProducts];

    result = result.filter((product) => {
      const displayPrice = this.getDisplayPrice(product);

      if (displayPrice == null) {
        return false;
      }

      return displayPrice >= this.activeFilters.minPrice && displayPrice <= this.activeFilters.maxPrice;
    });

    if (this.activeFilters.fragranceFamilies.length > 0) {
      const selectedFamilies = this.activeFilters.fragranceFamilies.map((family) => this.normalizeText(family));
      result = result.filter((product) => {
        const scentFamily = this.normalizeText(product.scentFamily);
        return selectedFamilies.some((family) => scentFamily.includes(family));
      });
    }

    if (this.activeFilters.rituals.length > 0) {
      result = result.filter((product) => {
        const searchableText = this.normalizeText(
          `${product.name} ${product.description} ${(product.highlights ?? []).join(' ')} ${product.scentFamily ?? ''}`
        );

        return this.activeFilters.rituals.some((ritual) => {
          const ritualKeywords = this.getRitualKeywords(ritual);
          return ritualKeywords.some((keyword) => searchableText.includes(keyword));
        });
      });
    }

    if (this.activeFilters.minRating != null) {
      result = result.filter((product) => (product.rating ?? 0) >= this.activeFilters.minRating!);
    }

    result.sort((first, second) => {
      switch (this.activeFilters.sortBy) {
        case 'price-asc':
          return this.getComparablePrice(first) - this.getComparablePrice(second);
        case 'price-desc':
          return this.getComparablePrice(second) - this.getComparablePrice(first);
        case 'best-selling':
          return (second.reviewCount ?? 0) - (first.reviewCount ?? 0);
        case 'featured':
        default:
          return 0;
      }
    });

    this.products = result;
    this.cdr.detectChanges();
  }

  private getComparablePrice(product: Product): number {
    return this.getDisplayPrice(product) ?? Number.MAX_SAFE_INTEGER;
  }

  private getRitualKeywords(ritual: string): string[] {
    const keywordsByRitual: Record<string, string[]> = {
      'Calm & Wind Down': ['calm', 'wind down', 'lavender', 'sandalwood', 'relax'],
      'Fresh Start': ['fresh', 'aqua', 'blue sapphire', 'mogra', 'morning'],
      'Romance & Softness': ['romance', 'rose', 'vanilla', 'soft'],
      'Focus & Grounding': ['focus', 'grounding', 'oud', 'coffee', 'sandalwood'],
      'Cozy Evenings': ['cozy', 'evening', 'coffee', 'vanilla', 'warm']
    };

    return keywordsByRitual[ritual] ?? [this.normalizeText(ritual)];
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').toLowerCase().trim();
  }
}
