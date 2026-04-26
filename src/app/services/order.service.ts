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
}
