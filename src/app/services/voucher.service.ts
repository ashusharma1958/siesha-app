import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type ApiVoucher = {
  id: number | string;
  code: string;
  discountPercentage: number;
  minimumCartValue: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type VoucherStatsResponse = {
  totalVouchers: number;
  activeVouchers: number;
};

export type CreateVoucherRequest = {
  code: string;
  discountPercentage: number;
  minimumCartValue: number;
  isActive: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class VoucherService {
  constructor(private http: HttpClient) {}

  getVouchers(): Observable<ApiVoucher[]> {
    return this.http.get<ApiVoucher[]>(`${environment.apiBaseUrl}/api/vouchers`);
  }

  getVoucherByCode(code: string): Observable<ApiVoucher> {
    return this.http.get<ApiVoucher>(
      `${environment.apiBaseUrl}/api/vouchers/${encodeURIComponent(code)}`
    );
  }

  createVoucher(payload: CreateVoucherRequest): Observable<ApiVoucher> {
    return this.http.post<ApiVoucher>(`${environment.apiBaseUrl}/api/vouchers`, payload);
  }

  updateVoucher(id: string | number, payload: CreateVoucherRequest): Observable<ApiVoucher> {
    return this.http.put<ApiVoucher>(
      `${environment.apiBaseUrl}/api/vouchers/${encodeURIComponent(String(id))}`,
      payload
    );
  }

  getAdminStats(): Observable<VoucherStatsResponse> {
    return this.http.get<VoucherStatsResponse>(`${environment.apiBaseUrl}/api/vouchers/admin/stats`);
  }
}
