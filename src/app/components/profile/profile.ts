import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of, throwError } from 'rxjs';

import {
  AuthService,
  ProfileAddress,
  ProfileOrder,
  ProfileOrderItem,
  ProfileOrderItemReview,
  UpsertOrderReviewRequest
} from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
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
  private static readonly STATIC_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/ashusharma1958/static/main/image/';
  user: AuthUser | null = null;
  orders: ProfileOrder[] = [];
  addresses: ProfileAddress[] = [];
  expandedOrderKeys = new Set<string>();
  activeReviewKey: string | null = null;
  readonly reviewStars = [1, 2, 3, 4, 5];
  private reviewRatingByKey: Record<string, number> = {};
  private reviewTextByKey: Record<string, string> = {};
  private reviewSubmittingByKey: Record<string, boolean> = {};
  private reviewSuccessByKey: Record<string, string> = {};
  private reviewErrorByKey: Record<string, string> = {};
  private orderItemsByKey: Record<string, ProfileOrderItem[]> = {};

  constructor(
    private router: Router,
    private authService: AuthService,
    private cartService: CartService,
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
    this.cartService.clearCart();
    sessionStorage.removeItem('checkout.pendingOrderPayload');
    localStorage.removeItem('auth.accessToken');
    localStorage.removeItem('auth.refreshToken');
    localStorage.removeItem('auth.idToken');
    localStorage.removeItem('auth.user');
    localStorage.removeItem('auth.userId');
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

    // Keep only one interaction open at a time: close review panel on order toggle.
    this.activeReviewKey = null;

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
        productImage: (item['productImage'] as string | undefined) ?? (item['product_image'] as string | undefined) ?? undefined,
        canReview: this.resolveCanReview(item['canReview'], order),
        review: this.normalizeItemReview(item['review'])
      }));

    this.orderItemsByKey[key] = normalized;
    return normalized;
  }

  toggleItemReview(order: ProfileOrder, item: ProfileOrderItem, itemIndex: number): void {
    const reviewKey = this.getReviewKey(order, item, itemIndex);

    if (this.activeReviewKey === reviewKey) {
      this.activeReviewKey = null;
      return;
    }

    this.activeReviewKey = reviewKey;

    const existingReview = item.review;
    this.reviewRatingByKey[reviewKey] = this.normalizeRating(existingReview?.rating) ?? 5;
    this.reviewTextByKey[reviewKey] = existingReview?.review?.trim() ?? '';
    this.reviewSuccessByKey[reviewKey] = '';
    this.reviewErrorByKey[reviewKey] = '';
  }

  isItemReviewOpen(order: ProfileOrder, item: ProfileOrderItem, itemIndex: number): boolean {
    return this.activeReviewKey === this.getReviewKey(order, item, itemIndex);
  }

  setItemReviewRating(order: ProfileOrder, item: ProfileOrderItem, itemIndex: number, rating: number): void {
    const reviewKey = this.getReviewKey(order, item, itemIndex);
    this.reviewRatingByKey[reviewKey] = this.normalizeRating(rating) ?? 5;
    this.reviewSuccessByKey[reviewKey] = '';
    this.reviewErrorByKey[reviewKey] = '';
  }

  getItemReviewRating(order: ProfileOrder, item: ProfileOrderItem, itemIndex: number): number {
    const reviewKey = this.getReviewKey(order, item, itemIndex);
    return this.reviewRatingByKey[reviewKey] ?? 5;
  }

  updateItemReviewText(order: ProfileOrder, item: ProfileOrderItem, itemIndex: number, event: Event): void {
    const textarea = event.target as HTMLTextAreaElement | null;
    const reviewKey = this.getReviewKey(order, item, itemIndex);
    this.reviewTextByKey[reviewKey] = textarea?.value ?? '';
    this.reviewSuccessByKey[reviewKey] = '';
    this.reviewErrorByKey[reviewKey] = '';
  }

  getItemReviewText(order: ProfileOrder, item: ProfileOrderItem, itemIndex: number): string {
    const reviewKey = this.getReviewKey(order, item, itemIndex);
    return this.reviewTextByKey[reviewKey] ?? '';
  }

  canItemBeReviewed(item: ProfileOrderItem): boolean {
    return item.canReview === true;
  }

  hasItemReview(item: ProfileOrderItem): boolean {
    return !!item.review;
  }

  getReviewActionLabel(order: ProfileOrder, item: ProfileOrderItem, itemIndex: number): string {
    const isSubmitting = this.isItemReviewSubmitting(order, item, itemIndex);
    const baseLabel = this.hasItemReview(item) ? 'Update' : 'Post';

    if (!isSubmitting) {
      return baseLabel;
    }

    return this.hasItemReview(item) ? 'Updating...' : 'Posting...';
  }

  isItemReviewSubmitting(order: ProfileOrder, item: ProfileOrderItem, itemIndex: number): boolean {
    const reviewKey = this.getReviewKey(order, item, itemIndex);
    return this.reviewSubmittingByKey[reviewKey] === true;
  }

  getItemReviewSuccess(order: ProfileOrder, item: ProfileOrderItem, itemIndex: number): string {
    const reviewKey = this.getReviewKey(order, item, itemIndex);
    return this.reviewSuccessByKey[reviewKey] ?? '';
  }

  getItemReviewError(order: ProfileOrder, item: ProfileOrderItem, itemIndex: number): string {
    const reviewKey = this.getReviewKey(order, item, itemIndex);
    return this.reviewErrorByKey[reviewKey] ?? '';
  }

  canSubmitItemReview(order: ProfileOrder, item: ProfileOrderItem, itemIndex: number): boolean {
    if (!this.canItemBeReviewed(item)) {
      return false;
    }

    const orderId = this.resolveOrderId(order);
    if (orderId === null || this.resolveProductId(item) === null) {
      return false;
    }

    const rating = this.getItemReviewRating(order, item, itemIndex);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return false;
    }

    const comment = this.getItemReviewText(order, item, itemIndex).trim();
    if (comment.length === 0 || comment.length > 2000) {
      return false;
    }

    return !this.isItemReviewSubmitting(order, item, itemIndex);
  }

  submitItemReview(order: ProfileOrder, item: ProfileOrderItem, itemIndex: number): void {
    const reviewKey = this.getReviewKey(order, item, itemIndex);
    const orderId = this.resolveOrderId(order);
    const productId = this.resolveProductId(item);
    const rating = this.getItemReviewRating(order, item, itemIndex);
    const comment = this.getItemReviewText(order, item, itemIndex).trim();

    this.reviewSuccessByKey[reviewKey] = '';
    this.reviewErrorByKey[reviewKey] = '';

    if (!this.canItemBeReviewed(item)) {
      this.reviewErrorByKey[reviewKey] = 'You can review this item once the order is delivered.';
      return;
    }

    if (orderId === null) {
      this.reviewErrorByKey[reviewKey] = 'Unable to identify this order for review.';
      return;
    }

    if (productId === null) {
      this.reviewErrorByKey[reviewKey] = 'Unable to identify this product for review.';
      return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      this.reviewErrorByKey[reviewKey] = 'Rating is required and must be between 1 and 5.';
      return;
    }

    if (!comment) {
      this.reviewErrorByKey[reviewKey] = 'Please enter your review before posting.';
      return;
    }

    if (comment.length > 2000) {
      this.reviewErrorByKey[reviewKey] = 'Review must be 2000 characters or less.';
      return;
    }

    const payload: UpsertOrderReviewRequest = { rating, review: comment };
    const hasExistingReview = this.hasItemReview(item);

    this.reviewSubmittingByKey[reviewKey] = true;

    this.submitOrderReview(orderId, productId, payload, hasExistingReview)
      .pipe(
        catchError((error: unknown) => {
          if (!hasExistingReview && this.isConflictError(error)) {
            return this.authService.updateOrderProductReview(orderId, productId, payload);
          }
          return throwError(() => error);
        }),
        finalize(() => {
          this.reviewSubmittingByKey[reviewKey] = false;
        })
      )
      .subscribe({
        next: () => {
          this.reviewSuccessByKey[reviewKey] = hasExistingReview ? 'Review updated successfully.' : 'Review posted successfully.';
          this.reviewErrorByKey[reviewKey] = '';
          this.refreshOrdersAfterReview();
        },
        error: (error: unknown) => {
          this.reviewErrorByKey[reviewKey] = this.mapReviewError(error, hasExistingReview);
          this.reviewSuccessByKey[reviewKey] = '';
        }
      });
  }

  getItemImage(item: ProfileOrderItem): string {
    if (item.productImage && typeof item.productImage === 'string') {
      const trimmed = item.productImage.trim();
      if (trimmed) {
        return this.resolveImageUrl(trimmed);
      }
    }
    // Return a subtle placeholder/fallback
    return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e8e8e8%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23999%22 font-size=%2212%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ENo Image%3C/text%3E%3C/svg%3E';
  }

  private resolveImageUrl(rawUrl: string | null | undefined): string {
    const url = String(rawUrl ?? '').trim();
    if (!url) {
      return '';
    }

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    const normalized = url.replace(/^\/+/, '');

    if (normalized.startsWith('assets/image/')) {
      return ProfileComponent.STATIC_IMAGE_BASE_URL + normalized.slice('assets/image/'.length);
    }

    if (normalized.startsWith('image/')) {
      return ProfileComponent.STATIC_IMAGE_BASE_URL + normalized.slice('image/'.length);
    }

    if (normalized.startsWith('products/') || normalized.startsWith('banners/')) {
      return ProfileComponent.STATIC_IMAGE_BASE_URL + normalized;
    }

    return ProfileComponent.STATIC_IMAGE_BASE_URL + normalized;
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

  private getReviewKey(order: ProfileOrder, item: ProfileOrderItem, itemIndex: number): string {
    const orderKey = this.getOrderKey(order);
    const itemIdentity = String(item.id ?? item.productId ?? item.productName ?? itemIndex);
    return `${orderKey}::${itemIdentity}::${itemIndex}`;
  }

  private resolveProductId(item: ProfileOrderItem): number | null {
    const raw = item.productId ?? item.id;
    if (raw == null) {
      return null;
    }

    const normalized = Number(raw);
    if (!Number.isInteger(normalized) || normalized <= 0) {
      return null;
    }

    return normalized;
  }

  private resolveOrderId(order: ProfileOrder): number | null {
    if (order.id == null) {
      return null;
    }

    const normalized = Number(order.id);
    if (!Number.isInteger(normalized) || normalized <= 0) {
      return null;
    }

    return normalized;
  }

  private normalizeRating(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
      return null;
    }

    return parsed;
  }

  private normalizeItemReview(value: unknown): ProfileOrderItemReview | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const payload = value as Record<string, unknown>;
    const normalizedReview = String(payload['review'] ?? payload['comment'] ?? '').trim();
    const rating = this.normalizeRating(payload['rating']);

    if (!normalizedReview && rating == null) {
      return null;
    }

    return {
      id: (payload['id'] as number | string | undefined) ?? undefined,
      rating: rating ?? undefined,
      review: normalizedReview || undefined,
      createdAt: (payload['createdAt'] as string | undefined) ?? undefined,
      updatedAt: (payload['updatedAt'] as string | undefined) ?? undefined
    };
  }

  private resolveCanReview(value: unknown, order: ProfileOrder): boolean {
    // Reviews are allowed only after delivery, while still respecting explicit backend lock.
    if (value === false) {
      return false;
    }

    const status = this.getOrderStatus(order);
    return status === 'DELIVERED';
  }

  private submitOrderReview(orderId: number, productId: number, payload: UpsertOrderReviewRequest, updateMode: boolean) {
    if (updateMode) {
      return this.authService.updateOrderProductReview(orderId, productId, payload);
    }

    return this.authService.createOrderProductReview(orderId, productId, payload);
  }

  private isConflictError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 409;
  }

  private mapReviewError(error: unknown, updateMode: boolean): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        return 'Invalid review request. Please check rating and review text.';
      }

      if (error.status === 404) {
        return updateMode
          ? 'Review not found for this order item.'
          : 'Order or product was not found for this review.';
      }

      if (error.status === 409) {
        return 'A review already exists. Please update it instead.';
      }
    }

    return updateMode ? 'Failed to update review. Please try again.' : 'Failed to post review. Please try again.';
  }

  private refreshOrdersAfterReview(): void {
    this.authService
      .getMyOrders()
      .pipe(catchError(() => of({ body: this.orders as ProfileOrder[] })))
      .subscribe((orders) => {
        this.orders = this.extractList<ProfileOrder>(orders);
        this.orderItemsByKey = {};
        for (const order of this.orders) {
          this.getOrderItems(order);
        }
        this.cdr.markForCheck();
      });
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
    const orderWithOptionalStatus = order as ProfileOrder & { orderStatus?: string | null };
    return String(order.status ?? orderWithOptionalStatus.orderStatus ?? '').trim().toUpperCase();
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