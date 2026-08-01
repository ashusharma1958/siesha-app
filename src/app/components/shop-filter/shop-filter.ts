import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, ViewChild } from '@angular/core';
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
  styleUrls: ['./shop-filter.css'],
})
export class ShopFilter implements OnDestroy, AfterViewInit {
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
  openSubPanels = new Set<string>();

  openDropdown: ShopDropdownSection | null = null;
  isMobileFiltersOpen = false;

  @ViewChild('rangeWrapper') private rangeWrapper?: ElementRef<HTMLElement>;
  private dragging: 'min' | 'max' | null = null;
  private readonly boundTouchMove = (e: TouchEvent): void => {
    if (!this.dragging) return;
    e.preventDefault();
    this.updateFromPointer(e.touches[0].clientX);
  };

  ngAfterViewInit(): void {
    document.addEventListener('touchmove', this.boundTouchMove, { passive: false });
  }

  ngOnDestroy(): void {
    document.removeEventListener('touchmove', this.boundTouchMove);
    this.unlockBodyScroll();
  }

  openMobileFilters(): void {
    this.isMobileFiltersOpen = true;
    this.lockBodyScroll();
  }

  closeMobileFilters(): void {
    this.isMobileFiltersOpen = false;
    this.unlockBodyScroll();
  }

  toggleDropdown(section: ShopDropdownSection, event: Event): void {
    event.preventDefault();
    this.openDropdown = this.openDropdown === section ? null : section;
  }

  toggleSubPanel(section: string, event: Event): void {
    event.stopPropagation();
    if (this.openSubPanels.has(section)) {
      this.openSubPanels.delete(section);
    } else {
      this.openSubPanels.add(section);
    }
  }

  isSubPanelOpen(section: string): boolean {
    return this.openSubPanels.has(section);
  }

  onSortChange(): void {
    this.emitFilters();
  }

  get trackFillStyle(): { [key: string]: string } {
    const range = this.maxAllowedPrice - this.minAllowedPrice;
    const left = ((this.minPrice - this.minAllowedPrice) / range) * 100;
    const width = Math.max(0, ((this.maxPrice - this.minPrice) / range) * 100);
    return { left: `${left}%`, width: `${width}%` };
  }

  onPriceChange(): void {
    this.minPrice = this.clampPrice(this.minPrice);
    this.maxPrice = this.clampPrice(this.maxPrice);

    if (this.minPrice > this.maxPrice) {
      this.minPrice = this.maxPrice;
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

  clearAllFilters(): void {
    this.sortBy = 'featured';
    this.minPrice = this.minAllowedPrice;
    this.maxPrice = this.maxAllowedPrice;
    this.selectedFragranceFamilies.clear();
    this.selectedRituals.clear();
    this.selectedRatings.clear();
    this.openDropdown = null;

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

  private lockBodyScroll(): void {
    if (window.innerWidth > 768) {
      return;
    }

    document.documentElement.classList.add('shop-filters-open');
    document.body.classList.add('shop-filters-open');
  }

  private unlockBodyScroll(): void {
    document.documentElement.classList.remove('shop-filters-open');
    document.body.classList.remove('shop-filters-open');
  }

  thumbDragStart(which: 'min' | 'max', event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.dragging = which;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.dragging) return;
    this.updateFromPointer(event.clientX);
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onDragEnd(): void {
    this.dragging = null;
  }

  get minThumbLeft(): string {
    const pct = ((this.minPrice - this.minAllowedPrice) / (this.maxAllowedPrice - this.minAllowedPrice)) * 100;
    return `clamp(11px, ${pct}%, calc(100% - 11px))`;
  }

  get maxThumbLeft(): string {
    const pct = ((this.maxPrice - this.minAllowedPrice) / (this.maxAllowedPrice - this.minAllowedPrice)) * 100;
    return `clamp(11px, ${pct}%, calc(100% - 11px))`;
  }

  private updateFromPointer(clientX: number): void {
    if (!this.rangeWrapper) return;
    const rect = this.rangeWrapper.nativeElement.getBoundingClientRect();
    const thumbR = 11;
    const usableLeft = rect.left + thumbR;
    const usableRight = rect.right - thumbR;
    const ratio = Math.min(1, Math.max(0, (clientX - usableLeft) / (usableRight - usableLeft)));
    const value = Math.round((ratio * (this.maxAllowedPrice - this.minAllowedPrice) + this.minAllowedPrice) / 100) * 100;
    if (this.dragging === 'min') {
      this.minPrice = Math.min(value, this.maxPrice);
    } else {
      this.maxPrice = Math.max(value, this.minPrice);
    }
    this.emitFilters();
  }

}
