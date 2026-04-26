import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type ShopSortOption = 'featured' | 'best-selling' | 'price-asc' | 'price-desc';
type ShopDropdownSection = 'price' | 'fragrance' | 'ritual' | 'love';

export type ShopFilterState = {
  sortBy: ShopSortOption;
  minPrice: number;
  maxPrice: number;
  fragranceFamilies: string[];
  rituals: string[];
  minRating: number | null;
};

@Component({
  selector: 'app-shop-filter',
  imports: [CommonModule, FormsModule],
  templateUrl: './shop-filter.html',
  styleUrl: './shop-filter.css',
})
export class ShopFilter {
  @Input() productCount = 0;
  @Output() filtersChange = new EventEmitter<ShopFilterState>();

  readonly minAllowedPrice = 0;
  readonly maxAllowedPrice = 11000;

  sortBy: ShopSortOption = 'featured';
  minPrice = this.minAllowedPrice;
  maxPrice = this.maxAllowedPrice;

  readonly fragranceOptions = [
    'Floral',
    'Fresh & Herbal',
    'Warm & Woody',
    'Gourmand',
    'Aquatic & Clean',
    'Fruity'
  ];

  readonly ritualOptions = [
    'Calm & Wind Down',
    'Fresh Start',
    'Romance & Softness',
    'Focus & Grounding',
    'Cozy Evenings'
  ];

  readonly customerLoveOptions = [
    { label: '★★★★★ Most Loved', value: 5 },
    { label: '★★★★☆ & up', value: 4 },
    { label: '★★★☆☆ & up', value: 3 }
  ];

  selectedFragranceFamilies = new Set<string>();
  selectedRituals = new Set<string>();
  selectedRatings = new Set<number>();

  openDropdown: ShopDropdownSection | null = null;

  toggleDropdown(section: ShopDropdownSection, event: Event): void {
    event.preventDefault();
    this.openDropdown = this.openDropdown === section ? null : section;
  }

  onSortChange(): void {
    this.emitFilters();
  }

  onPriceChange(): void {
    this.minPrice = this.clampPrice(this.minPrice);
    this.maxPrice = this.clampPrice(this.maxPrice);

    if (this.minPrice > this.maxPrice) {
      const currentMax = this.maxPrice;
      this.maxPrice = this.minPrice;
      this.minPrice = currentMax;
    }

    this.emitFilters();
  }

  toggleFragrance(family: string, checked: boolean): void {
    if (checked) {
      this.selectedFragranceFamilies.add(family);
    } else {
      this.selectedFragranceFamilies.delete(family);
    }

    this.emitFilters();
  }

  toggleRitual(ritual: string, checked: boolean): void {
    if (checked) {
      this.selectedRituals.add(ritual);
    } else {
      this.selectedRituals.delete(ritual);
    }

    this.emitFilters();
  }

  toggleRating(minimum: number, checked: boolean): void {
    if (checked) {
      this.selectedRatings.add(minimum);
    } else {
      this.selectedRatings.delete(minimum);
    }

    this.emitFilters();
  }

  isFragranceSelected(family: string): boolean {
    return this.selectedFragranceFamilies.has(family);
  }

  isRitualSelected(ritual: string): boolean {
    return this.selectedRituals.has(ritual);
  }

  isRatingSelected(rating: number): boolean {
    return this.selectedRatings.has(rating);
  }

  private clampPrice(value: number): number {
    if (Number.isNaN(value)) {
      return this.minAllowedPrice;
    }

    return Math.min(this.maxAllowedPrice, Math.max(this.minAllowedPrice, value));
  }

  private emitFilters(): void {
    const minRating = this.selectedRatings.size > 0 ? Math.max(...this.selectedRatings) : null;

    this.filtersChange.emit({
      sortBy: this.sortBy,
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
      fragranceFamilies: [...this.selectedFragranceFamilies],
      rituals: [...this.selectedRituals],
      minRating
    });
  }

}
