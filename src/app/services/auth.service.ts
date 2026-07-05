import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';

type ApiResponse<T> = {
  statusCode: number;
  message: string;
  body: T;
  timestamp?: string;
};

export type ApiFieldErrors = Record<string, string>;

export type ApiErrorResponse = {
  statusCode?: number;
  message?: string;
  body?: ApiFieldErrors | string | null;
  error?: string;
  path?: string;
  timestamp?: string;
};

export type AuthApiError = {
  statusCode: number | null;
  message: string;
  fieldErrors: ApiFieldErrors;
};

export type SignUpRequest = {
  fullName: string;
  email: string;
  contactNumber: string;
  password: string;
  confirmPassword: string;
  role: string;
};

export type SignUpResponseBody = {
  token: string;
  email: string;
  fullName: string;
  role?: string;
};

export type SignInRequest = {
  email: string;
  password: string;
};

export type SignInResponseBody = {
  token: string;
  email: string;
  fullName: string;
  role?: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  email: string;
  secretCode: string;
  newPassword: string;
  confirmPassword: string;
};

export type AuthMessageResponse = ApiResponse<string>;

export type ProfileOrder = {
  id?: string;
  orderNumber?: string;
  date: string;
  total: string;
  status: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  items?: ProfileOrderItem[];
  orderItems?: ProfileOrderItem[];
};

export type ProfileOrderItemReview = {
  id?: number | string;
  rating?: number;
  review?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ProfileOrderItem = {
  id?: number | string;
  productId?: number | string;
  productName?: string;
  quantity?: number;
  unitPrice?: number | string;
  totalPrice?: number | string;
  productImage?: string;
  canReview?: boolean;
  review?: ProfileOrderItemReview | null;
};

export type UpsertOrderReviewRequest = {
  rating: number;
  review: string;
};

export type ProfileAddress = {
  id?: number | string;
  label: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
};

export type AddAddressRequest = {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) {}

  signUp(payload: SignUpRequest): Observable<ApiResponse<SignUpResponseBody>> {
    return this.http.post<ApiResponse<SignUpResponseBody>>(
      `${environment.apiBaseUrl}/api/auth/sign-up`,
      payload
    );
  }

  signIn(payload: SignInRequest): Observable<ApiResponse<SignInResponseBody>> {
    return this.http.post<ApiResponse<SignInResponseBody>>(
      `${environment.apiBaseUrl}/api/auth/sign-in`,
      payload
    );
  }

  requestPasswordResetCode(payload: ForgotPasswordRequest): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(
      `${environment.apiBaseUrl}/api/auth/forgot-password`,
      payload
    );
  }

  resetPasswordWithSecretCode(payload: ResetPasswordRequest): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(
      `${environment.apiBaseUrl}/api/auth/reset-password`,
      payload
    );
  }

  getMyOrders(): Observable<ApiResponse<ProfileOrder[]>> {
    return this.http.get<ApiResponse<ProfileOrder[]>>(
      `${environment.apiBaseUrl}${environment.accountEndpoints.orders}`
    );
  }

  getMyAddresses(): Observable<ApiResponse<ProfileAddress[]>> {
    return this.http
      .get<ApiResponse<ProfileAddress[]>>(`${environment.apiBaseUrl}${environment.accountEndpoints.addresses}`)
      .pipe(
        catchError(() => {
          return this.http.get<ApiResponse<ProfileAddress[]>>(`${environment.apiBaseUrl}/api/addresses`);
        }),
        catchError(() => {
          return this.http
            .get(`${environment.apiBaseUrl}${environment.accountEndpoints.addresses}`, { responseType: 'text' })
            .pipe(map((raw) => this.parseApiResponse<ProfileAddress[]>(raw)));
        }),
        catchError(() => {
          return this.http
            .get(`${environment.apiBaseUrl}/api/addresses`, { responseType: 'text' })
            .pipe(map((raw) => this.parseApiResponse<ProfileAddress[]>(raw)));
        })
      );
  }

  getAddressById(id: number | string): Observable<ApiResponse<ProfileAddress>> {
    return this.http
      .get<ApiResponse<ProfileAddress>>(`${environment.apiBaseUrl}/api/addresses/${id}`)
      .pipe(
        catchError(() =>
          this.http
            .get(`${environment.apiBaseUrl}/api/addresses/${id}`, { responseType: 'text' })
            .pipe(map((raw) => this.parseApiResponse<ProfileAddress>(raw)))
        )
      );
  }

  addAddress(payload: AddAddressRequest): Observable<ApiResponse<ProfileAddress>> {
    return this.http.post<ApiResponse<ProfileAddress>>(
      `${environment.apiBaseUrl}/api/addresses`,
      payload
    );
  }

  updateAddress(id: number | string, payload: AddAddressRequest): Observable<ApiResponse<ProfileAddress>> {
    return this.http.put<ApiResponse<ProfileAddress>>(
      `${environment.apiBaseUrl}/api/addresses/${id}`,
      payload
    );
  }

  deleteAddress(id: number | string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${environment.apiBaseUrl}/api/addresses/${id}`
    );
  }

  createOrderProductReview(
    orderId: number,
    productId: number,
    payload: UpsertOrderReviewRequest
  ): Observable<ApiResponse<ProfileOrderItemReview>> {
    return this.http.post<ApiResponse<ProfileOrderItemReview>>(
      `${environment.apiBaseUrl}/api/reviews/orders/${orderId}/products/${productId}`,
      payload
    );
  }

  updateOrderProductReview(
    orderId: number,
    productId: number,
    payload: UpsertOrderReviewRequest
  ): Observable<ApiResponse<ProfileOrderItemReview>> {
    return this.http.put<ApiResponse<ProfileOrderItemReview>>(
      `${environment.apiBaseUrl}/api/reviews/orders/${orderId}/products/${productId}`,
      payload
    );
  }

  private parseApiResponse<T>(raw: string): ApiResponse<T> {
    const trimmed = raw.trim();
    const unquoted =
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
        ? trimmed.slice(1, -1)
        : trimmed;

    try {
      const parsed = JSON.parse(unquoted) as unknown;

      if (typeof parsed === 'string') {
        return this.parseApiResponse<T>(parsed);
      }

      if (Array.isArray(parsed)) {
        return {
          statusCode: 200,
          message: 'Parsed array response',
          body: parsed as T
        };
      }

      return parsed as ApiResponse<T>;
    } catch {
      return {
        statusCode: 200,
        message: 'Parsed text response',
        body: [] as unknown as T
      };
    }
  }
}

export function mapAuthApiError(error: unknown, fallbackMessage = 'Something went wrong. Please try again.'): AuthApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      statusCode: null,
      message: fallbackMessage,
      fieldErrors: {}
    };
  }

  const raw = error.error as ApiErrorResponse | null | undefined;
  const fieldErrors =
    raw && raw.body && typeof raw.body === 'object' && !Array.isArray(raw.body)
      ? (raw.body as ApiFieldErrors)
      : {};

  const messageFromBody = raw && typeof raw.body === 'string' ? raw.body : '';
  const message =
    (raw && typeof raw.message === 'string' && raw.message.trim()) ||
    (messageFromBody && messageFromBody.trim()) ||
    fallbackMessage;

  return {
    statusCode: error.status || null,
    message,
    fieldErrors
  };
}