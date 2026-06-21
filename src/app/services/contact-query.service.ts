import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type ContactQuery = {
  id?: number | string;
  name: string;
  email: string;
  phoneNumber: string;
  message: string;
  notificationConsent: boolean;
  createdAt?: string;
};

export type ContactQueryApiResponse = {
  statusCode: number;
  message: string;
  body: unknown;
  timestamp?: string;
};

@Injectable({
  providedIn: 'root'
})
export class ContactQueryService {
  constructor(private http: HttpClient) {}

  getAdminQueries(): Observable<ContactQueryApiResponse> {
    const token = localStorage.getItem('auth.accessToken') || localStorage.getItem('auth.idToken');

    const options = token
      ? {
          headers: new HttpHeaders({
            Authorization: `Bearer ${token}`
          })
        }
      : undefined;

    return this.http.get<ContactQueryApiResponse>(`${environment.apiBaseUrl}/home-page/contact-us`, options);
  }
}
