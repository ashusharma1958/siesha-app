import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

type ApiResponse<T> = {
  statusCode: number;
  message: string;
  body: T;
};

export type CreateRazorpayOrderRequest = {
  amount: number; // rupees
  currency: 'INR';
  receipt: string;
  notes?: Record<string, string | number | boolean | null>;
};

export type CreateRazorpayOrderResponseBody = {
  orderId: string;
  amount: number; // paise
  currency: string;
  keyId?: string;
  name?: string;
  description?: string;
};

export type VerifyRazorpayPaymentResponseBody = {
  verified: boolean;
  transactionId?: string;
  message?: string;
};

export type VerifyRazorpayPaymentRequest = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(private http: HttpClient) {}

  createRazorpayOrder(
    payload: CreateRazorpayOrderRequest
  ): Observable<ApiResponse<CreateRazorpayOrderResponseBody>> {
    const endpoints = (environment.paymentEndpoints as Record<string, string | undefined> | undefined);
    const endpoint =
      endpoints?.['razorpayCreateOrder'] ??
      '/api/payments/razorpay/order';

    return this.http.post<ApiResponse<CreateRazorpayOrderResponseBody>>(
      `${environment.apiBaseUrl}${endpoint}`,
      payload
    );
  }

  verifyRazorpayPayment(payload: VerifyRazorpayPaymentRequest): Observable<ApiResponse<VerifyRazorpayPaymentResponseBody>> {
    const endpoints = (environment.paymentEndpoints as Record<string, string | undefined> | undefined);
    const endpoint =
      endpoints?.['razorpayVerify'] ??
      '/api/payments/razorpay/verify';

    return this.http.post<ApiResponse<VerifyRazorpayPaymentResponseBody>>(
      `${environment.apiBaseUrl}${endpoint}`,
      payload
    );
  }
}
