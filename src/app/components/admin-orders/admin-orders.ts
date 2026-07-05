import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Footer } from '../footer/footer';
import { Navigation } from '../navigation/navigation';
import { AdminOrder, AdminOrderStats, AdminOrdersPageBody, OrderService } from '../../services/order.service';

type StatusOption = 'ALL' | 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, Navigation, Footer],
  templateUrl: './admin-orders.html',
  styleUrls: ['./admin-orders.css']
})
export class AdminOrdersComponent implements OnInit {
  orders: AdminOrder[] = [];
  stats: AdminOrderStats | null = null;
  selectedStatus: StatusOption = 'ALL';
  orderIdSearch = '';
  currentPage = 0;
  pageSize = 50;
  readonly pageSizeOptions = [10, 25, 50, 100];
  totalPages = 0;
  totalElements = 0;
  isLoadingOrders = false;
  isLoadingStats = false;
  isUpdating = false;
  errorMessage = '';

  readonly statusOptions: StatusOption[] = [
    'ALL',
    'PENDING',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED'
  ];

  constructor(
    private orderService: OrderService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.isAdminUser()) {
      void this.router.navigate(['/home']);
      return;
    }

    this.loadStats();
    this.loadOrders();
  }

  onStatusFilterChange(): void {
    this.currentPage = 0;
    this.loadOrders();
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.loadOrders();
  }

  applyOrderIdSearch(): void {
    this.currentPage = 0;
    this.loadOrders();
  }

  goToPreviousPage(): void {
    if (this.currentPage <= 0 || this.isLoadingOrders) {
      return;
    }

    this.currentPage -= 1;
    this.loadOrders();
  }

  goToNextPage(): void {
    if (this.isLoadingOrders || this.currentPage + 1 >= this.totalPages) {
      return;
    }

    this.currentPage += 1;
    this.loadOrders();
  }

  get filteredOrders(): AdminOrder[] {
    return this.orders;
  }

  saveOrder(order: AdminOrder): void {
    if (this.isUpdating) {
      return;
    }

    this.errorMessage = '';
    this.isUpdating = true;

    this.orderService
      .updateAdminOrderStatus(order.orderNumber, {
        status: order.orderStatus,
        trackingNumber: order.trackingNumber?.trim() || undefined,
        trackingUrl: order.trackingUrl?.trim() || undefined
      })
      .subscribe({
        next: () => {
          this.isUpdating = false;
          this.loadOrders();
          this.loadStats();
          this.cdr.detectChanges();
        },
        error: () => {
          this.isUpdating = false;
          this.errorMessage = 'Unable to update order status right now. Please try again.';
          this.cdr.detectChanges();
        }
      });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(Number.isFinite(value) ? value : 0);
  }

  formatDate(value: string): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private loadOrders(): void {
    this.isLoadingOrders = true;
    this.errorMessage = '';

    const status = this.selectedStatus === 'ALL' ? undefined : this.selectedStatus;
    const search = this.orderIdSearch.trim() || undefined;

    this.orderService.getAdminOrders(status, this.currentPage, this.pageSize, search).subscribe({
      next: (response) => {
        const pageData = this.normalizeOrdersPage(response.body);
        this.isLoadingOrders = false;
        this.orders = pageData.orders;
        this.currentPage = pageData.page;
        this.totalPages = pageData.totalPages;
        this.totalElements = pageData.totalElements;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingOrders = false;
        this.orders = [];
        this.totalPages = 0;
        this.totalElements = 0;
        this.errorMessage = 'Unable to fetch admin orders right now. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  private normalizeOrdersPage(raw: unknown): {
    orders: AdminOrder[];
    page: number;
    totalPages: number;
    totalElements: number;
  } {
    if (Array.isArray(raw)) {
      return {
        orders: this.normalizeOrders(raw),
        page: this.currentPage,
        totalPages: 0,
        totalElements: raw.length
      };
    }

    const pageBody = raw && typeof raw === 'object' ? (raw as AdminOrdersPageBody) : null;
    const content = pageBody?.content;
    const orders = this.normalizeOrders(content);
    const page = Number.isFinite(Number(pageBody?.number)) ? Math.max(0, Number(pageBody?.number)) : this.currentPage;
    const totalPages = Number.isFinite(Number(pageBody?.totalPages)) ? Math.max(0, Number(pageBody?.totalPages)) : 0;
    const totalElements = Number.isFinite(Number(pageBody?.totalElements)) ? Math.max(0, Number(pageBody?.totalElements)) : orders.length;

    return {
      orders,
      page,
      totalPages,
      totalElements
    };
  }

  private loadStats(): void {
    this.isLoadingStats = true;

    this.orderService.getAdminOrderStats().subscribe({
      next: (response) => {
        this.isLoadingStats = false;
        this.stats = this.normalizeStats(response.body);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingStats = false;
        this.stats = null;
        this.cdr.detectChanges();
      }
    });
  }

  private normalizeOrders(raw: unknown): AdminOrder[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => this.normalizeOrderItem(item))
      .filter((order): order is AdminOrder => order !== null)
      .filter((order) => order.orderNumber.length > 0);
  }

  private normalizeOrderItem(item: Record<string, unknown>): AdminOrder | null {
    const order = {
      orderNumber: this.readText(item, ['orderNumber'], ['orderNo'], ['orderId']),
      orderStatus: this.normalizeStatusValue(
        item['orderStatus'] ??
        item['status'] ??
        item['order_state'] ??
        item['orderStatusName'] ??
        item['currentStatus'] ??
        'PENDING'
      ),
      createdAt: this.readText(
        item,
        ['createdAt'],
        ['placedOn'],
        ['orderDate'],
        ['createdOn'],
        ['date'],
        ['created_at']
      ),
      total: this.readNumber(
        item,
        ['total'],
        ['totalPaid'],
        ['totalAmount'],
        ['grandTotal'],
        ['amount'],
        ['pricing', 'total'],
        ['pricing', 'totalAmount'],
        ['pricing', 'grandTotal'],
        ['pricing', 'amount']
      ),
      customerName: this.readText(
        item,
        ['customerName'],
        ['fullName'],
        ['name'],
        ['customer', 'fullName'],
        ['customer', 'name'],
        ['customer', 'customerName'],
        ['buyer', 'fullName'],
        ['user', 'fullName']
      ),
      customerEmail: this.readText(
        item,
        ['customerEmail'],
        ['email'],
        ['customer', 'email'],
        ['buyer', 'email'],
        ['user', 'email']
      ),
      specialInstructions: this.readText(
        item,
        ['specialInstructions'],
        ['specialInstruction'],
        ['notes'],
        ['note'],
        ['customerNote'],
        ['customerNotes']
      ),
      trackingNumber: this.readText(
        item,
        ['trackingNumber'],
        ['trackingNo'],
        ['tracking_no'],
        ['shipping', 'trackingNumber'],
        ['shipping', 'trackingNo']
      ),
      trackingUrl: this.readText(
        item,
        ['trackingUrl'],
        ['trackingURL'],
        ['tracking_link'],
        ['trackingLink'],
        ['shipping', 'trackingUrl'],
        ['shipping', 'trackingURL'],
        ['shipping', 'trackingLink']
      )
    };

    return order.orderNumber.length > 0 ? order : null;
  }

  private normalizeStats(raw: unknown): AdminOrderStats {
    const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

    return {
      totalOrders: Number(data['totalOrders'] ?? 0),
      pendingOrders: Number(data['pendingOrders'] ?? 0),
      processingOrders: Number(data['processingOrders'] ?? 0),
      shippedOrders: Number(data['shippedOrders'] ?? 0),
      deliveredOrders: Number(data['deliveredOrders'] ?? 0),
      cancelledOrders: Number(data['cancelledOrders'] ?? 0)
    };
  }

  private normalizeStatusValue(value: unknown): StatusOption {
    const normalized = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '_');

    switch (normalized) {
      case 'PROCESSING':
      case 'SHIPPED':
      case 'DELIVERED':
      case 'CANCELLED':
      case 'PENDING':
        return normalized;
      case 'ALL':
        return 'PENDING';
      default:
        return 'PENDING';
    }
  }

  private readText(source: Record<string, unknown>, ...paths: string[][]): string {
    for (const path of paths) {
      const value = this.readNestedValue(source, path);
      if (value == null) {
        continue;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          return trimmed;
        }
        continue;
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
    }

    return '-';
  }

  private readNumber(source: Record<string, unknown>, ...paths: string[][]): number {
    for (const path of paths) {
      const value = this.readNestedValue(source, path);
      if (value == null) {
        continue;
      }

      const numericValue = this.parseNumberValue(value);
      if (Number.isFinite(numericValue)) {
        return numericValue;
      }
    }

    return 0;
  }

  private parseNumberValue(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value
        .replace(/[,\s]/g, '')
        .replace(/^[^\d.-]+/, '')
        .replace(/[^\d.-]+$/g, '');

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : NaN;
    }

    return Number(value);
  }

  private normalizeOrderSearchValue(value: string): string {
    return value
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  private isAdminUser(): boolean {
    const rawUser = localStorage.getItem('auth.user');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser) as { role?: unknown; roles?: unknown; authorities?: unknown };
        if (this.extractRole(parsed, parsed.role, parsed.roles, parsed.authorities) === 'ADMIN') {
          return true;
        }
      } catch {
        // Ignore invalid user payload and try token fallback.
      }
    }

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
        const claims = JSON.parse(decoded) as Record<string, unknown>;
        if (
          this.extractRole(
            claims['role'],
            claims['roles'],
            claims['authorities'],
            claims['scope'],
            claims['scp'],
            this.readNestedValue(claims, ['realm_access', 'roles'])
          ) === 'ADMIN'
        ) {
          return true;
        }
      } catch {
        // Try next token candidate.
      }
    }

    return false;
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
      const separator = source.includes(' ') ? /\s+/ : /,/;
      target.push(...source.split(separator).map((value) => value.trim().toUpperCase()).filter(Boolean));
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
