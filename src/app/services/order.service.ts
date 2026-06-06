import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type CreateOrderRequest = {
  customer: {
    userId: number | null;
    guest: boolean;
  };
  billingAddress: {
    id: number | string | null;
  };
  shippingAddress: {
    id: number | string | null;
    sameAsBilling: boolean;
  };
  items: {
    productId: number | string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  pricing: {
    subtotal: number;
    discountCode?: string | null;
    discountPercent: number;
    discountAmount: number;
    shippingCharge: number;
    taxAmount: number;
    total: number;
  };
  payment: {
    method: string;
    status: string;
    transactionId: string | null;
  };
  orderStatus: string;
  createdAt: string;
  specialInstructions: string | null;
};

export type OrderTrackingStatusStep = {
  status: string;
  statusLabel: string;
  date: string | null;
  completed: boolean;
  pending: boolean;
};

export type TrackOrderResponse = {
  orderNumber: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  totalPaid: number;
  deliveryAddress: string;
  currentStatus: string;
  statusHistory: OrderTrackingStatusStep[];
};

export type AdminOrder = {
  orderNumber: string;
  orderStatus: string;
  createdAt: string;
  total: number;
  customerName: string;
  customerEmail: string;
  specialInstructions: string;
  trackingNumber: string;
  trackingUrl: string;
};

export type AdminOrderStats = {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
};

export type UpdateAdminOrderStatusRequest = {
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
};

type ApiResponse<T> = {
  statusCode: number;
  message: string;
  body: T;
};

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(private http: HttpClient) {}

  createOrder(payload: CreateOrderRequest): Observable<ApiResponse<{ orderId: string }>> {
    return this.http.post<ApiResponse<{ orderId: string }>>(
      `${environment.apiBaseUrl}/api/orders`,
      payload
    );
  }

  trackOrder(orderNumber: string): Observable<ApiResponse<TrackOrderResponse>> {
    return this.http.get<ApiResponse<TrackOrderResponse>>(
      `${environment.apiBaseUrl}/api/orders/track/${encodeURIComponent(orderNumber)}`
    );
  }

  getAdminOrders(status?: string, page = 0, size = 50): Observable<ApiResponse<AdminOrder[]>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(size));

    const normalizedStatus = status?.trim();
    if (normalizedStatus) {
      params.set('status', normalizedStatus);
    }

    return this.http.get<ApiResponse<AdminOrder[]>>(
      `${environment.apiBaseUrl}/api/admin/orders?${params.toString()}`
    );
  }

  getAdminOrder(orderNumber: string): Observable<ApiResponse<AdminOrder>> {
    return this.http.get<ApiResponse<AdminOrder>>(
      `${environment.apiBaseUrl}/api/admin/orders/${encodeURIComponent(orderNumber)}`
    );
  }

  updateAdminOrderStatus(
    orderNumber: string,
    payload: UpdateAdminOrderStatusRequest
  ): Observable<ApiResponse<AdminOrder>> {
    return this.http.put<ApiResponse<AdminOrder>>(
      `${environment.apiBaseUrl}/api/admin/orders/${encodeURIComponent(orderNumber)}/status`,
      payload
    );
  }

  getAdminOrderStats(): Observable<ApiResponse<AdminOrderStats>> {
    return this.http.get<ApiResponse<AdminOrderStats>>(
      `${environment.apiBaseUrl}/api/admin/orders/stats`
    );
  }
}
