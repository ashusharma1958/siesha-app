import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Navigation } from '../navigation/navigation';
import { Footer } from '../footer/footer';
import { environment } from '../../../environments/environment';
import { AuthService, SignInRequest } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

type SocialProvider = 'google';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navigation, Footer],
  templateUrl: './sign-in.html',
  styleUrls: ['./sign-in.css'],
})
export class SignInComponent {
  signInData: SignInRequest = {
    email: '',
    password: ''
  };

  isSubmitting = false;
  isSocialRedirecting = false;
  feedbackMessage = '';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cartService: CartService,
    private cdr: ChangeDetectorRef
  ) {}

  socialSignIn(provider: SocialProvider): void {
    if (this.isSocialRedirecting) {
      return;
    }

    const providerUrl = environment.socialAuthUrls?.[provider];

    if (!providerUrl) {
      this.feedbackMessage = `Social sign-in for ${provider} is not configured yet.`;
      return;
    }

    const callbackUrl = new URL('/auth/callback', window.location.origin).toString();
    const returnTo = this.normalizeReturnToPath(this.route.snapshot.queryParamMap.get('returnTo'));
    const state = btoa(JSON.stringify({ returnTo }));

    const redirectUrl = new URL(providerUrl, window.location.origin);
    redirectUrl.searchParams.set('redirect_uri', callbackUrl);
    redirectUrl.searchParams.set('state', state);

    sessionStorage.setItem('auth.oauth.returnTo', returnTo);
    this.isSocialRedirecting = true;
    this.feedbackMessage = 'Redirecting to Google...';

    window.location.assign(redirectUrl.toString());
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

  onSubmit(form: NgForm): void {
    if (this.isSubmitting) {
      return;
    }

    this.feedbackMessage = '';
    this.isSubmitting = true;

    this.authService
      .signIn(this.signInData)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          const previousEmail = this.readStoredUserEmail();
          const nextEmail = (response.body.email ?? '').trim().toLowerCase();

          if (previousEmail && nextEmail && previousEmail !== nextEmail) {
            this.cartService.clearCart();
          }

          sessionStorage.removeItem('checkout.pendingOrderPayload');

          localStorage.setItem('auth.accessToken', response.body.token);
          const derivedRole = this.extractRoleFromResponseBody(response.body);
          localStorage.setItem(
            'auth.user',
            JSON.stringify({
              email: response.body.email,
              fullName: response.body.fullName,
              role: derivedRole
            })
          );

          this.feedbackMessage = response.message || 'Login successful.';
          form.resetForm();

          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1000);
        },
        error: (errorResponse: HttpErrorResponse) => {
          this.feedbackMessage = this.resolveSignInError(errorResponse);
          this.cdr.markForCheck();
        }
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
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

  private extractRoleFromResponseBody(body: unknown): string | undefined {
    if (!body || typeof body !== 'object') {
      return undefined;
    }

    const candidate = body as Record<string, unknown>;
    const directRole = candidate['role'] ?? candidate['userRole'];

    if (typeof directRole === 'string' && directRole.trim()) {
      return directRole.trim().toUpperCase().replace(/^ROLE_/, '');
    }

    const sources = [candidate['roles'], candidate['authorities']];
    for (const source of sources) {
      const role = this.extractRoleFromUnknown(source);
      if (role) {
        return role;
      }
    }

    if (candidate['user'] && typeof candidate['user'] === 'object') {
      return this.extractRoleFromResponseBody(candidate['user']);
    }

    return undefined;
  }

  private extractRoleFromUnknown(source: unknown): string | undefined {
    if (typeof source === 'string') {
      const values = source.split(/[\s,]+/).map((value) => value.trim().toUpperCase()).filter(Boolean);
      if (values.includes('ADMIN') || values.includes('ROLE_ADMIN')) {
        return 'ADMIN';
      }

      if (values.includes('USER') || values.includes('ROLE_USER')) {
        return 'USER';
      }

      return undefined;
    }

    if (Array.isArray(source)) {
      for (const item of source) {
        const role = this.extractRoleFromUnknown(item);
        if (role) {
          return role;
        }
      }
      return undefined;
    }

    if (source && typeof source === 'object') {
      const objectValue = source as Record<string, unknown>;
      return (
        this.extractRoleFromUnknown(objectValue['role']) ||
        this.extractRoleFromUnknown(objectValue['authority']) ||
        this.extractRoleFromUnknown(objectValue['name']) ||
        this.extractRoleFromUnknown(objectValue['value'])
      );
    }

    return undefined;
  }

  private resolveSignInError(errorResponse: HttpErrorResponse): string {
    const apiMessage =
      (typeof errorResponse.error?.message === 'string' && errorResponse.error.message) ||
      (typeof errorResponse.error?.body?.message === 'string' && errorResponse.error.body.message);

    if (apiMessage) {
      return apiMessage;
    }

    switch (errorResponse.status) {
      case 400:
        return 'Invalid data provided. Please review and try again.';
      case 401:
        return 'Invalid credentials. Please check your email and password.';
      case 500:
        return 'A server error occurred. Please try again shortly.';
      default:
        return 'Unable to sign in right now. Please try again.';
    }
  }
}
