import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';

type ApiResponse<T> = {
  statusCode: number;
  message: string;
  body: T;
  timestamp?: string;
};

export type SignUpRequest = {
  fullName: string;
  email: string;
  contactNumber: string;
  password: string;
  confirmPassword: string;
};

export type SignUpResponseBody = {
  token: string;
  email: string;
  fullName: string;
};

export type SignInRequest = {
  email: string;
  password: string;
};

export type SignInResponseBody = {
  token: string;
  email: string;
  fullName: string;
};

export type ProfileOrder = {
  id: string;
  date: string;
  total: string;
  status: string;
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