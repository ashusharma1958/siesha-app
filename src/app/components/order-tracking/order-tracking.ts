import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { OrderService, TrackOrderResponse } from '../../services/order.service';
import { Navigation } from '../navigation/navigation';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, Navigation],
  templateUrl: './order-tracking.html',
  styleUrls: ['./order-tracking.css']
})
export class OrderTrackingComponent implements OnInit {
  orderNumber = '';
  isLoading = false;
  errorMessage = '';
  trackingInfo: TrackOrderResponse | null = null;

  constructor(
    private orderService: OrderService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const prefillOrderNumber = this.route.snapshot.queryParamMap.get('orderNumber');
    if (!prefillOrderNumber) {
      return;
    }

    this.orderNumber = prefillOrderNumber;
    this.searchOrder();
  }

  searchOrder(): void {
    const value = this.orderNumber.trim();

    if (!value) {
      this.errorMessage = 'Please enter an order number.';
      this.trackingInfo = null;
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.trackingInfo = null;

    this.orderService.trackOrder(value).subscribe({
      next: (response) => {
        this.isLoading = false;

        const parsed = this.extractTrackingInfo(response);
        if (!parsed) {
          this.errorMessage = 'Tracking response was received but had an unexpected format.';
          this.trackingInfo = null;
          this.cdr.detectChanges();
          return;
        }

        this.trackingInfo = parsed;
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.isLoading = false;

        if (error instanceof HttpErrorResponse && error.status === 404) {
          const backendMessage =
            typeof error.error === 'object' && error.error && 'message' in error.error
              ? String((error.error as { message?: unknown }).message ?? '')
              : '';
          this.errorMessage = backendMessage || 'Order not found. Please check the order number and try again.';
          this.cdr.detectChanges();
          return;
        }

        this.errorMessage = 'Unable to fetch order tracking right now. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  }

  formatStatus(status: string | null | undefined): string {
    if (!status) {
      return 'UNKNOWN';
    }
    return status.replace(/_/g, ' ');
  }

  isPending(step: { pending: boolean; completed: boolean }): boolean {
    return !step.completed && !step.pending;
  }

  private static readonly STATIC_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/ashusharma1958/static/main/image/';

  private resolveImageUrl(rawUrl: string | null | undefined): string | null {
    const url = String(rawUrl ?? '').trim();
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    const normalized = url.replace(/^\/+/, '');
    if (normalized.startsWith('assets/image/')) return OrderTrackingComponent.STATIC_IMAGE_BASE_URL + normalized.slice('assets/image/'.length);
    if (normalized.startsWith('image/')) return OrderTrackingComponent.STATIC_IMAGE_BASE_URL + normalized.slice('image/'.length);
    return OrderTrackingComponent.STATIC_IMAGE_BASE_URL + normalized;
  }

  private extractTrackingInfo(response: unknown): TrackOrderResponse | null {
    const parsed = this.parseValue(response);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const root = parsed as Record<string, unknown>;
    const candidateRaw =
      this.parseValue(root['body']) ??
      this.parseValue(root['data']) ??
      parsed;

    if (!candidateRaw || typeof candidateRaw !== 'object') {
      return null;
    }

    const candidate = candidateRaw as Record<string, unknown>;
    const statusHistoryRaw = this.parseValue(candidate['statusHistory']);
    const statusHistory = Array.isArray(statusHistoryRaw)
      ? statusHistoryRaw
          .filter((step): step is Record<string, unknown> => !!step && typeof step === 'object')
          .map((step) => ({
            status: String(step['status'] ?? ''),
            statusLabel: String(step['statusLabel'] ?? step['status'] ?? ''),
            date: step['date'] == null ? null : String(step['date']),
            completed: Boolean(step['completed']),
            pending: Boolean(step['pending'])
          }))
      : [];

    const result: TrackOrderResponse = {
      orderNumber: String(candidate['orderNumber'] ?? this.orderNumber),
      productName: String(candidate['productName'] ?? 'Product'),
      productImage: this.resolveImageUrl(candidate['productImage'] == null ? null : String(candidate['productImage'])),
      quantity: Number(candidate['quantity'] ?? 0),
      totalPaid: Number(candidate['totalPaid'] ?? 0),
      deliveryAddress: String(candidate['deliveryAddress'] ?? '-'),
      currentStatus: String(candidate['currentStatus'] ?? ''),
      statusHistory
    };

    if (!result.orderNumber || !result.productName) {
      return null;
    }

    return result;
  }

  private parseValue(value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return value;
    }

    try {
      return this.parseValue(JSON.parse(trimmed));
    } catch {
      return value;
    }
  }
}
