import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { CartComponent } from '../cart/cart';
import { Product } from '../../data/products.data';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CartComponent],
  templateUrl: './navigation.html',
  styleUrls: ['./navigation.css'],
})
export class Navigation {
  searchTerm = '';
  isSearchOpen = false;
  suggestedProducts: Product[] = [];
  private allProducts: Product[] = [];
  private readonly searchInput$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(private router: Router, private productService: ProductService) {
    this.searchInput$
      .pipe(debounceTime(280), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => this.applySearch(value));
  }

  ngOnInit(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.allProducts = products ?? [];
      },
      error: () => {
        this.allProducts = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSearch(): void {
    this.isSearchOpen = !this.isSearchOpen;

    if (!this.isSearchOpen) {
      this.resetSearchState();
    }
  }

  onSearchInput(): void {
    this.searchTerm = this.sanitizeSearchInput(this.searchTerm);
    this.searchInput$.next(this.searchTerm);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const allowedControlKeys = new Set([
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End',
      'Tab',
      'Enter',
      'Escape'
    ]);

    if (allowedControlKeys.has(event.key)) {
      return;
    }

    if (event.key.length === 1 && !/[A-Za-z\s]/.test(event.key)) {
      event.preventDefault();
    }
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.navigateToShopSearch(this.searchTerm.trim());
  }

  clearSearch(): void {
    this.resetSearchState();
    this.isSearchOpen = false;
  }

  selectProduct(product: Product): void {
    this.resetSearchState();
    this.isSearchOpen = false;
    void this.router.navigate(['/product', product.id]);
  }

  selectCategory(category: string): void {
    this.searchTerm = category;
    this.navigateToShopSearch(category);
    this.isSearchOpen = false;
  }

  get shouldShowSuggestions(): boolean {
    return this.normalizeSearchValue(this.searchTerm).length >= 3;
  }

  get hasSearchMatches(): boolean {
    return this.suggestedProducts.length > 0;
  }

  getDisplayPrice(product: Product): number {
    return product.salePrice ?? product.price ?? product.originalPrice ?? 0;
  }

  private applySearch(rawValue: string): void {
    const query = this.normalizeSearchValue(rawValue);

    if (query.length < 3) {
      this.suggestedProducts = [];
      return;
    }

    this.suggestedProducts = this.allProducts
      .filter((product) => this.matchesProductSearch(product, query))
      .slice(0, 6);

  }

  private navigateToShopSearch(query: string): void {
    const normalizedQuery = this.normalizeSearchValue(query);

    if (normalizedQuery.length > 0 && normalizedQuery.length < 3) {
      return;
    }

    void this.router.navigate(['/shop'], {
      queryParams: {
        q: normalizedQuery || null
      },
      queryParamsHandling: 'merge'
    });
  }

  private matchesProductSearch(product: Product, normalizedQuery: string): boolean {
    const searchableText = this.normalizeSearchValue([
      product.name,
      product.description,
      product.scentFamily,
      ...(product.highlights ?? [])
    ]
      .filter(Boolean)
      .join(' '));

    return searchableText.includes(normalizedQuery);
  }

  private normalizeSearchValue(value: string | null | undefined): string {
    const sanitized = this.sanitizeSearchInput(value ?? '');

    return sanitized
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase();
  }

  private sanitizeSearchInput(value: string): string {
    return value.replace(/[^A-Za-z\s]/g, '');
  }

  private resetSearchState(): void {
    this.searchTerm = '';
    this.suggestedProducts = [];
  }

  get accountLink(): string {
    return localStorage.getItem('auth.accessToken') ? '/profile' : '/sign-in';
  }

  get isAdmin(): boolean {
    return this.resolveCurrentUserRole() === 'ADMIN';
  }

  private resolveCurrentUserRole(): string | null {
    const roleFromUser = this.readRoleFromStoredUser();
    if (roleFromUser) {
      return roleFromUser;
    }

    const claims = this.readTokenClaims();
    if (!claims) {
      return null;
    }

    return this.extractRole(
      claims['role'],
      claims['roles'],
      claims['authorities'],
      claims['scope'],
      claims['scp'],
      this.readNestedValue(claims, ['realm_access', 'roles'])
    );
  }

  private readRoleFromStoredUser(): string | null {
    const rawUser = localStorage.getItem('auth.user');
    if (!rawUser) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawUser) as { role?: unknown; roles?: unknown; authorities?: unknown };
      return this.extractRole(parsed, parsed.role, parsed.roles, parsed.authorities);
    } catch {
      return null;
    }
  }

  private readTokenClaims(): Record<string, unknown> | null {
    const tokenCandidates = [
      localStorage.getItem('auth.accessToken'),
      localStorage.getItem('auth.idToken')
    ];

    for (const token of tokenCandidates) {
      if (!token) {
        continue;
      }

      const parts = token.split('.');
      if (parts.length < 2) {
        continue;
      }

      try {
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='));
        const parsed = JSON.parse(decoded) as Record<string, unknown>;
        if (Object.keys(parsed).length > 0) {
          return parsed;
        }
      } catch {
        // Continue trying other tokens.
      }
    }

    return null;
  }

  private hasAdminRole(claims: Record<string, unknown>): boolean {
    const role = this.extractRole(
      claims['role'],
      claims['roles'],
      claims['authorities'],
      claims['scope'],
      claims['scp'],
      this.readNestedValue(claims, ['realm_access', 'roles'])
    );

    return role === 'ADMIN';
  }

  private extractRole(...sources: unknown[]): string | null {
    const normalizedValues: string[] = [];

    for (const source of sources) {
      this.collectRoleValues(source, normalizedValues);
    }

    if (normalizedValues.includes('ADMIN') || normalizedValues.includes('ROLE_ADMIN')) {
      return 'ADMIN';
    }

    if (normalizedValues.includes('USER') || normalizedValues.includes('ROLE_USER')) {
      return 'USER';
    }

    return null;
  }

  private collectRoleValues(source: unknown, target: string[]): void {
    if (!source) {
      return;
    }

    if (typeof source === 'string') {
      const parsed = this.tryParseJson(source);
      if (parsed && parsed !== source) {
        this.collectRoleValues(parsed, target);
      }

      const separator = source.includes(' ') ? /\s+/ : /,/;
      target.push(
        ...source
          .split(separator)
          .map((value) => this.normalizeRoleToken(value))
          .filter(Boolean)
      );
      return;
    }

    if (Array.isArray(source)) {
      for (const value of source) {
        this.collectRoleValues(value, target);
      }
      return;
    }

    if (typeof source === 'object') {
      const objectValue = source as Record<string, unknown>;
      this.collectRoleValues(objectValue['role'], target);
      this.collectRoleValues(objectValue['roles'], target);
      this.collectRoleValues(objectValue['authority'], target);
      this.collectRoleValues(objectValue['authorities'], target);
      this.collectRoleValues(objectValue['name'], target);
      this.collectRoleValues(objectValue['value'], target);
      this.collectRoleValues(objectValue['permission'], target);
      this.collectRoleValues(objectValue['permissions'], target);
    }
  }

  private normalizeRoleToken(value: string): string {
    return value
      .trim()
      .toUpperCase()
      .replace(/^\[+|\]+$/g, '')
      .replace(/^"+|"+$/g, '')
      .replace(/^'+|'+$/g, '');
  }

  private tryParseJson(value: string): unknown {
    const trimmed = value.trim();
    if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('"'))) {
      return value;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  private readNestedValue(source: Record<string, unknown>, path: string[]): unknown {
    let current: unknown = source;

    for (const segment of path) {
      if (!current || typeof current !== 'object') {
        return null;
      }

      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }
}
