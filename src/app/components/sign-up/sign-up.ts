import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { Navigation } from '../navigation/navigation';
import { Footer } from '../footer/footer';
import { environment } from '../../../environments/environment';
import { AuthService, SignUpRequest } from '../../services/auth.service';

type SocialProvider = 'google' | 'facebook' | 'apple';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navigation, Footer],
  templateUrl: './sign-up.html',
  styleUrls: ['./sign-up.css'],
})
export class SignUpComponent {
  signUpData: SignUpRequest = {
    fullName: '',
    email: '',
    contactNumber: '',
    password: '',
    confirmPassword: '',
    role: 'USER'
  };

  isSubmitting = false;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' | null = null;
  errorStatusCode: number | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  socialSignUp(provider: SocialProvider) {
    const providerUrl = environment.socialAuthUrls?.[provider];

    if (!providerUrl) {
      window.alert(`Social sign-up for ${provider} is not configured yet.`);
      return;
    }

    const callbackUrl = `${window.location.origin}/auth/callback`;
    const separator = providerUrl.includes('?') ? '&' : '?';
    const redirectUrl = `${providerUrl}${separator}redirect_uri=${encodeURIComponent(callbackUrl)}`;

    window.location.href = redirectUrl;
  }

  onSubmit(form: NgForm): void {
    if (this.isSubmitting) {
      return;
    }

    this.feedbackMessage = '';
    this.feedbackType = null;
    this.errorStatusCode = null;

    if (this.signUpData.password !== this.signUpData.confirmPassword) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'Password and confirm password must match.';
      return;
    }

    const normalizedPayload = this.buildSignUpPayload();

    if (!normalizedPayload.contactNumber) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'Contact number is required.';
      return;
    }

    this.isSubmitting = true;

    this.authService
      .signUp(normalizedPayload)
      .pipe(
        timeout(15000),
        finalize(() => (this.isSubmitting = false))
      )
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;

          if (response.body.token) {
            localStorage.setItem('auth.accessToken', response.body.token);
          }

          const derivedRole = this.extractRoleFromResponseBody(response.body);
          localStorage.setItem(
            'auth.user',
            JSON.stringify({
              email: response.body.email,
              fullName: response.body.fullName,
              role: derivedRole
            })
          );

          this.feedbackType = 'success';
          this.feedbackMessage = response.message || 'User registered successfully.';
          this.errorStatusCode = null;
          this.cdr.detectChanges();
          form.resetForm();

          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1000);
        },
        error: (errorResponse: unknown) => {
          this.isSubmitting = false;
          const statusCode = errorResponse instanceof HttpErrorResponse ? errorResponse.status : null;
          const message = this.resolveSignUpError(errorResponse);
          this.setErrorFeedback(message, statusCode);
          this.cdr.detectChanges();
        }
      });
  }

  private resolveSignUpError(errorResponse: unknown): string {
    if (errorResponse instanceof TimeoutError) {
      return 'Request timed out. Please try again.';
    }

    if (!(errorResponse instanceof HttpErrorResponse)) {
      return 'Unable to sign up right now. Please try again.';
    }

    const apiMessage = this.extractApiMessage(errorResponse.error);

    if (apiMessage) {
      return apiMessage;
    }

    return 'Unable to sign up right now. Please try again.';
  }

  private setErrorFeedback(message: string, statusCode: number | null): void {
    this.feedbackType = 'error';
    this.errorStatusCode = statusCode;

    const trimmedMessage = message.trim();

    if (trimmedMessage) {
      this.feedbackMessage = trimmedMessage;
      return;
    }

    this.feedbackMessage = statusCode
      ? 'Request failed. Please try again.'
      : 'Unable to sign up right now. Please try again.';
  }

  private buildSignUpPayload(): SignUpRequest {
    return {
      fullName: this.signUpData.fullName.trim(),
      email: this.signUpData.email.trim().toLowerCase(),
      contactNumber: this.normalizePhoneNumber(this.signUpData.contactNumber),
      password: this.signUpData.password,
      confirmPassword: this.signUpData.confirmPassword,
      role: 'USER'
    };
  }

  private normalizePhoneNumber(value: string): string {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return '';
    }

    const hasLeadingPlus = trimmedValue.startsWith('+');
    const digitsOnly = trimmedValue.replace(/\D/g, '');

    return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
  }

  private extractApiMessage(errorBody: unknown): string | null {
    if (!errorBody || typeof errorBody !== 'object') {
      return null;
    }

    const body = errorBody as {
      message?: unknown;
      body?: {
        message?: unknown;
      };
    };

    const message = body.message ?? body.body?.message;

    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      const textMessages = message.filter((item): item is string => typeof item === 'string');
      if (textMessages.length > 0) {
        return textMessages.join(', ');
      }
    }

    return null;
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
}
