import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { AuthService, ProfileAddress, ProfileOrder } from '../../services/auth.service';
import { Footer } from '../footer/footer';
import { Navigation } from '../navigation/navigation';

type AuthUser = {
  fullName?: string;
  email?: string;
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, Navigation, Footer],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {
  user: AuthUser | null = null;
  orders: ProfileOrder[] = [];
  addresses: ProfileAddress[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const accessToken = localStorage.getItem('auth.accessToken');

    if (!accessToken) {
      void this.router.navigate(['/sign-in']);
      return;
    }

    this.user = this.readStoredUser();
    this.loadProfileData();
  }

  logout(): void {
    localStorage.removeItem('auth.accessToken');
    localStorage.removeItem('auth.refreshToken');
    localStorage.removeItem('auth.idToken');
    localStorage.removeItem('auth.user');
    void this.router.navigate(['/sign-in']);
  }

  editAddress(address: ProfileAddress): void {
    if (!address.id) {
      return;
    }
    void this.router.navigate(['/checkout'], {
      queryParams: { mode: 'address', id: address.id }
    });
  }

  deleteAddress(address: ProfileAddress): void {
    if (!address.id) {
      return;
    }

    if (!confirm(`Delete address: ${address.label}?`)) {
      return;
    }

    this.authService.deleteAddress(address.id).subscribe({
      next: () => {
        this.addresses = this.addresses.filter((a) => a.id !== address.id);
        this.refreshAddresses();
      },
      error: () => {
        alert('Failed to delete address. Please try again.');
      }
    });
  }

  private readStoredUser(): AuthUser | null {
    const rawUser = localStorage.getItem('auth.user');

    if (!rawUser) {
      return null;
    }

    try {
      const parsedUser = JSON.parse(rawUser) as AuthUser;
      return {
        fullName: parsedUser.fullName,
        email: parsedUser.email
      };
    } catch {
      return null;
    }
  }

  private loadProfileData(): void {
    forkJoin({
      orders: this.authService.getMyOrders().pipe(catchError(() => of({ body: [] as ProfileOrder[] }))),
      addresses: this.authService
        .getMyAddresses()
        .pipe(catchError(() => of({ body: [] as ProfileAddress[] })))
    }).subscribe(({ orders, addresses }) => {
      this.orders = this.extractList<ProfileOrder>(orders);
      this.addresses = this.extractList<ProfileAddress>(addresses);
      this.cdr.markForCheck();
      setTimeout(() => this.cdr.detectChanges(), 0);
    });
  }

  private refreshAddresses(): void {
    this.authService
      .getMyAddresses()
      .pipe(catchError(() => of({ body: this.addresses as ProfileAddress[] })))
      .subscribe((addresses) => {
        this.addresses = this.extractList<ProfileAddress>(addresses);
        this.cdr.markForCheck();
        setTimeout(() => this.cdr.detectChanges(), 0);
      });
  }

  private extractList<T>(response: unknown): T[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response as T[];
    }

    if (typeof response === 'string') {
      try {
        return this.extractList<T>(JSON.parse(response));
      } catch {
        return [];
      }
    }

    if (typeof response === 'object') {
      const payload = response as Record<string, unknown>;
      
      // Try common array property names
      for (const prop of ['body', 'data', 'addresses', 'items', 'records', 'results']) {
        const value = payload[prop];
        
        if (Array.isArray(value)) {
          return value as T[];
        }
        
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return parsed as T[];
            }
          } catch {
            // Continue to next property
          }
        }
      }
    }

    return [];
  }
}