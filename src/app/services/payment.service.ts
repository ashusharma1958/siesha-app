import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { CreateOrderRequest } from './order.service';

type ApiResponse<T> = {
  statusCode: number;
  message: string;
  body: T;
  timestamp?: string;
};

export type CreateRazorpayOrderRequest = {
  // Amount in the smallest currency unit (paise for INR)
  amount: number;
  currency: 'INR';
};

export type CreateRazorpayOrderResponseBody = {
  razorpayOrderId?: string;
  orderId?: string;
  amount: number;
  currency: string;
  keyId: string;
};

export type VerifyRazorpayPaymentRequest = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  orderRequest: CreateOrderRequest;
};

export type VerifyRazorpayPaymentResponseBody = {
  id?: number | string;
  orderNumber?: string;
  status?: string;
  payment?: {
    method?: string;
    status?: string;
    transactionId?: string;
  };
};

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(private http: HttpClient) {}

  createRazorpayOrder(payload: CreateRazorpayOrderRequest): Observable<ApiResponse<CreateRazorpayOrderResponseBody>> {
    const endpoints = (environment.paymentEndpoints as Record<string, string | undefined> | undefined);
    const endpoint = endpoints?.['razorpayCreateOrder'] ?? '/api/payment/razorpay/create-order';

    return this.http.post<ApiResponse<CreateRazorpayOrderResponseBody>>(
      `${environment.apiBaseUrl}${endpoint}`,
      payload
    );
  }

  verifyRazorpayPayment(payload: VerifyRazorpayPaymentRequest): Observable<ApiResponse<VerifyRazorpayPaymentResponseBody>> {
    const endpoints = (environment.paymentEndpoints as Record<string, string | undefined> | undefined);
    const endpoint = endpoints?.['razorpayVerify'] ?? '/api/payment/razorpay/verify';

    return this.http.post<ApiResponse<VerifyRazorpayPaymentResponseBody>>(
      `${environment.apiBaseUrl}${endpoint}`,
      payload
    );
  }
}