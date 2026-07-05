import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './auth-callback.html',
  styleUrls: ['./auth-callback.css'],
})
export class AuthCallbackComponent implements OnInit {
  status: 'processing' | 'success' | 'error' = 'processing';
  message = 'Completing sign in...';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    const queryMap = this.route.snapshot.queryParamMap;
    const fragment = this.route.snapshot.fragment ?? '';
    const fragmentMap = new URLSearchParams(fragment);

    const getValue = (key: string): string | null => {
      return queryMap.get(key) ?? fragmentMap.get(key);
    };

    const accessToken = getValue('access_token') ?? getValue('token');
    const refreshToken = getValue('refresh_token');
    const idToken = getValue('id_token');
    const userRaw = getValue('user');
    const stateRaw = getValue('state');
    const error = getValue('error') ?? getValue('error_description');
    const returnTo = this.resolveReturnToPath(stateRaw);

    if (error) {
      this.status = 'error';
      this.message = `Sign in failed: ${error}`;
      setTimeout(() => {
        this.router.navigate(['/sign-in']);
      }, 2200);
      return;
    }

    if (!accessToken && !idToken) {
      this.status = 'error';
      this.message = 'No login token found in callback response.';
      return;
    }

    let nextUserEmail: string | null = null;
    if (userRaw) {
      try {
        const decodedUserRaw = decodeURIComponent(userRaw);
        const parsedUser = JSON.parse(decodedUserRaw) as Record<string, unknown>;
        const parsedEmail = parsedUser['email'];
        nextUserEmail = typeof parsedEmail === 'string' ? parsedEmail.trim().toLowerCase() : null;
      } catch {
        nextUserEmail = null;
      }
    }

    const previousEmail = this.readStoredUserEmail();
    if (previousEmail && nextUserEmail && previousEmail !== nextUserEmail) {
      this.cartService.clearCart();
    }

    sessionStorage.removeItem('checkout.pendingOrderPayload');

    if (accessToken) {
      localStorage.setItem('auth.accessToken', accessToken);
    }

    if (refreshToken) {
      localStorage.setItem('auth.refreshToken', refreshToken);
    }

    if (idToken) {
      localStorage.setItem('auth.idToken', idToken);
    }

    if (userRaw) {
      try {
        const decodedUserRaw = decodeURIComponent(userRaw);
        const parsedUser = JSON.parse(decodedUserRaw);
        localStorage.setItem('auth.user', JSON.stringify(parsedUser));
      } catch {
        localStorage.setItem('auth.user', userRaw);
      }
    }

    this.status = 'success';
    this.message = 'Sign in successful. Redirecting...';

    setTimeout(() => {
      this.router.navigateByUrl(returnTo);
    }, 1400);
  }

  private resolveReturnToPath(stateRaw: string | null): string {
    const fallback = this.normalizeReturnToPath(sessionStorage.getItem('auth.oauth.returnTo'));
    sessionStorage.removeItem('auth.oauth.returnTo');

    if (!stateRaw) {
      return fallback;
    }

    try {
      const decoded = atob(stateRaw);
      const state = JSON.parse(decoded) as Record<string, unknown>;
      return this.normalizeReturnToPath(typeof state['returnTo'] === 'string' ? state['returnTo'] : fallback);
    } catch {
      return fallback;
    }
  }

  private normalizeReturnToPath(candidate: string | null): string {
    if (!candidate || !candidate.trim()) {
      return '/home';
    }

    if (!candidate.startsWith('/')) {
      return '/home';
    }

    if (candidate.startsWith('//')) {
      return '/home';
    }

    return candidate;
  }

  private readStoredUserEmail(): string | null {
    const raw = localStorage.getItem('auth.user');
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const email = parsed['email'];
      return typeof email === 'string' ? email.trim().toLowerCase() : null;
    } catch {
      return null;
    }
  }
}
