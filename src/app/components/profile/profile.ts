import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { AuthService, ProfileAddress, ProfileOrder, ProfileOrderItem } from '../../services/auth.service';
import { Footer } from '../footer/footer';
import { Navigation } from '../navigation/navigation';

type AuthUser = {
  fullName?: string;
  email?: string;
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, Navigation, Footer],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {
  user: AuthUser | null = null;
  orders: ProfileOrder[] = [];
  addresses: ProfileAddress[] = [];
  expandedOrderKeys = new Set<string>();
  private orderItemsByKey: Record<string, ProfileOrderItem[]> = {};

  constructor(
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const accessToken = localStorage.getItem('auth.accessToken');

    if (!accessToken) {
      void this.router.navigate(['/sign-in']);
      return;
    }

    this.user = this.readStoredUser();
    this.loadProfileData();
  }

  logout(): void {
    localStorage.removeItem('auth.accessToken');
    localStorage.removeItem('auth.refreshToken');
    localStorage.removeItem('auth.idToken');
    localStorage.removeItem('auth.user');
    void this.router.navigate(['/sign-in']);
  }

  editAddress(address: ProfileAddress): void {
    if (!address.id) {
      return;
    }
    void this.router.navigate(['/checkout'], {
      queryParams: { mode: 'address', id: address.id }
    });
  }

  deleteAddress(address: ProfileAddress): void {
    if (!address.id) {
      return;
    }

    if (!confirm(`Delete address: ${address.label}?`)) {
      return;
    }

    this.authService.deleteAddress(address.id).subscribe({
      next: () => {
        this.addresses = this.addresses.filter((a) => a.id !== address.id);
        this.refreshAddresses();
      },
      error: () => {
        alert('Failed to delete address. Please try again.');
      }
    });
  }

  toggleOrderItems(order: ProfileOrder): void {
    const key = this.getOrderKey(order);

    if (this.expandedOrderKeys.has(key)) {
      this.expandedOrderKeys.delete(key);
      return;
    }

    this.expandedOrderKeys.add(key);
  }

  isOrderExpanded(order: ProfileOrder): boolean {
    return this.expandedOrderKeys.has(this.getOrderKey(order));
  }

  getOrderItems(order: ProfileOrder): ProfileOrderItem[] {
    const key = this.getOrderKey(order);
    if (this.orderItemsByKey[key]) {
      return this.orderItemsByKey[key];
    }

    const source = (order.items ?? order.orderItems) as unknown;
    if (!Array.isArray(source)) {
      this.orderItemsByKey[key] = [];
      return [];
    }

    const normalized = source
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        id: (item['id'] as number | string | undefined) ?? undefined,
        productId: (item['productId'] as number | string | undefined) ?? (item['product_id'] as number | string | undefined),
        productName: String(item['productName'] ?? item['name'] ?? '-'),
        quantity: Number(item['quantity'] ?? 0),
        unitPrice: (item['unitPrice'] as number | string | undefined) ?? item['price'] as number | string | undefined,
        totalPrice: (item['totalPrice'] as number | string | undefined) ?? item['amount'] as number | string | undefined,
        productImage: (item['productImage'] as string | undefined) ?? (item['product_image'] as string | undefined) ?? undefined
      }));

    this.orderItemsByKey[key] = normalized;
    return normalized;
  }

  getItemImage(item: ProfileOrderItem): string {
    if (item.productImage && typeof item.productImage === 'string') {
      const trimmed = item.productImage.trim();
      if (trimmed) {
        return trimmed;
      }
    }
    // Return a subtle placeholder/fallback
    return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e8e8e8%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23999%22 font-size=%2212%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ENo Image%3C/text%3E%3C/svg%3E';
  }

  formatItemAmount(value: number | string | undefined): string {
    if (value == null) {
      return '-';
    }

    if (typeof value === 'string' && /[₹$€£]/.test(value)) {
      return value;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return String(value);
    }

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(numeric);
  }

  shouldShowTrackingNumber(order: ProfileOrder): boolean {
    const normalizedStatus = this.getOrderStatus(order);
    if (!['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(normalizedStatus)) {
      return false;
    }

    return this.getTrackingNumber(order) !== null;
  }

  getTrackingNumber(order: ProfileOrder): string | null {
    const orderWithOptionalTracking = order as ProfileOrder & { trackingNo?: unknown; tracking_number?: unknown };
    const rawTrackingNumber =
      order.trackingNumber ??
      orderWithOptionalTracking.trackingNo ??
      orderWithOptionalTracking.tracking_number;

    if (rawTrackingNumber == null) {
      return null;
    }

    const normalized = String(rawTrackingNumber).trim();
    if (!normalized || normalized === '-' || normalized.toLowerCase() === 'null') {
      return null;
    }

    return normalized;
  }

  getTrackingUrl(order: ProfileOrder): string | null {
    const orderWithOptionalTrackingUrl = order as ProfileOrder & {
      trackingURL?: unknown;
      tracking_link?: unknown;
      trackingLink?: unknown;
      tracking_url?: unknown;
      shipping?: Record<string, unknown>;
      tracking?: Record<string, unknown>;
    };

    const rawTrackingUrl =
      order.trackingUrl ??
      orderWithOptionalTrackingUrl.trackingURL ??
      orderWithOptionalTrackingUrl.tracking_link ??
      orderWithOptionalTrackingUrl.trackingLink ??
      orderWithOptionalTrackingUrl.tracking_url ??
      this.readTrackingUrlFromObject(orderWithOptionalTrackingUrl.shipping) ??
      this.readTrackingUrlFromObject(orderWithOptionalTrackingUrl.tracking);

    if (rawTrackingUrl == null) {
      return null;
    }

    const normalized = String(rawTrackingUrl).trim();
    if (!normalized || normalized === '-' || normalized.toLowerCase() === 'null') {
      return null;
    }

    return normalized;
  }

  getTrackingHref(order: ProfileOrder): string | null {
    const trackingUrl = this.getTrackingUrl(order);
    if (!trackingUrl) {
      return null;
    }

    const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trackingUrl);
    return hasScheme ? trackingUrl : `https://${trackingUrl}`;
  }

  hasTrackingUrl(order: ProfileOrder): boolean {
    return this.getTrackingHref(order) !== null;
  }

  private getOrderKey(order: ProfileOrder): string {
    return String(order.orderNumber ?? order.id ?? 'unknown-order');
  }

  private readTrackingUrlFromObject(source: unknown): string | null {
    if (!source || typeof source !== 'object') {
      return null;
    }

    const payload = source as Record<string, unknown>;
    const candidate =
      payload['trackingUrl'] ??
      payload['trackingURL'] ??
      payload['tracking_link'] ??
      payload['trackingLink'] ??
      payload['url'] ??
      payload['link'];

    if (candidate == null) {
      return null;
    }

    const normalized = String(candidate).trim();
    if (!normalized || normalized === '-' || normalized.toLowerCase() === 'null') {
      return null;
    }

    return normalized;
  }

  private getOrderStatus(order: ProfileOrder): string {
    return String(order.status ?? '').trim().toUpperCase();
  }

  private readStoredUser(): AuthUser | null {
    const rawUser = localStorage.getItem('auth.user');

    if (!rawUser) {
      return null;
    }

    try {
      const parsedUser = JSON.parse(rawUser) as AuthUser;
      return {
        fullName: parsedUser.fullName,
        email: parsedUser.email
      };
    } catch {
      return null;
    }
  }

  private loadProfileData(): void {
    forkJoin({
      orders: this.authService.getMyOrders().pipe(catchError(() => of({ body: [] as ProfileOrder[] }))),
      addresses: this.authService
        .getMyAddresses()
        .pipe(catchError(() => of({ body: [] as ProfileAddress[] })))
    }).subscribe(({ orders, addresses }) => {
      this.orders = this.extractList<ProfileOrder>(orders);
      this.orderItemsByKey = {};
      for (const order of this.orders) {
        this.getOrderItems(order);
      }
      this.addresses = this.extractList<ProfileAddress>(addresses);
      this.cdr.markForCheck();
      setTimeout(() => this.cdr.detectChanges(), 0);
    });
  }

  private refreshAddresses(): void {
    this.authService
      .getMyAddresses()
      .pipe(catchError(() => of({ body: this.addresses as ProfileAddress[] })))
      .subscribe((addresses) => {
        this.addresses = this.extractList<ProfileAddress>(addresses);
        this.cdr.markForCheck();
        setTimeout(() => this.cdr.detectChanges(), 0);
      });
  }

  private extractList<T>(response: unknown): T[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response as T[];
    }

    if (typeof response === 'string') {
      try {
        return this.extractList<T>(JSON.parse(response));
      } catch {
        return [];
      }
    }

    if (typeof response === 'object') {
      const payload = response as Record<string, unknown>;
      
      // Try common array property names
      for (const prop of ['body', 'data', 'addresses', 'items', 'records', 'results']) {
        const value = payload[prop];
        
        if (Array.isArray(value)) {
          return value as T[];
        }
        
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return parsed as T[];
            }
          } catch {
            // Continue to next property
          }
        }
      }
    }

    return [];
  }
}