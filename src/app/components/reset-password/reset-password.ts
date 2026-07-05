import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TimeoutError, finalize, timeout } from 'rxjs';

import { AuthService, mapAuthApiError, ResetPasswordRequest } from '../../services/auth.service';
import { Footer } from '../footer/footer';
import { Navigation } from '../navigation/navigation';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navigation, Footer],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private static readonly RESEND_COOLDOWN_SECONDS = 60;
  private static readonly COOLDOWN_STORAGE_PREFIX = 'password-reset-code-cooldown';
  private static readonly SECRET_CODE_PATTERN = /^[0-9]{4,12}$/;
  private static readonly REQUEST_TIMEOUT_MS = 15000;

  payload: ResetPasswordRequest = {
    email: '',
    secretCode: '',
    newPassword: '',
    confirmPassword: ''
  };

  isSubmitting = false;
  isResending = false;
  feedbackType: 'success' | 'error' | '' = '';
  feedbackMessage = '';
  allErrorMessages: string[] = [];
  codeError = '';
  passwordError = '';
  showNewPassword = false;
  showConfirmPassword = false;
  cooldownSecondsRemaining = 0;
  private cooldownTimerId: ReturnType<typeof setInterval> | null = null;
  private cooldownExpiresAtMs: number | null = null;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const emailFromQuery = (this.route.snapshot.queryParamMap.get('email') || '').trim();
    if (emailFromQuery) {
      this.payload.email = emailFromQuery;
      this.restoreCooldown(this.payload.email);
      if (this.cooldownSecondsRemaining === 0) {
        this.startCooldown(ResetPasswordComponent.RESEND_COOLDOWN_SECONDS, this.payload.email);
      }
    }
  }

  onSubmit(form: NgForm): void {
    if (this.isSubmitting || form.invalid || this.hasClientValidationError()) {
      return;
    }

    this.feedbackType = '';
    this.feedbackMessage = '';
    this.allErrorMessages = [];
    this.codeError = '';
    this.passwordError = '';

    this.isSubmitting = true;

    this.authService
      .resetPasswordWithSecretCode({
        email: this.payload.email.trim(),
        secretCode: this.payload.secretCode.trim(),
        newPassword: this.payload.newPassword,
        confirmPassword: this.payload.confirmPassword
      })
      .pipe(
        timeout(ResetPasswordComponent.REQUEST_TIMEOUT_MS),
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.feedbackType = 'success';
          this.feedbackMessage = response.message || 'Password reset successful.';
          this.cdr.detectChanges();

          setTimeout(() => {
            void this.router.navigate(['/sign-in']);
          }, 1000);
        },
        error: (error: unknown) => {
          this.isSubmitting = false;

          try {
            if (error instanceof TimeoutError) {
              this.feedbackType = 'error';
              this.feedbackMessage = 'Request timed out. Please try again.';
              this.allErrorMessages = [this.feedbackMessage];
              return;
            }

            const mapped = mapAuthApiError(error, 'Unable to reset password right now.');
            const httpStatus = error instanceof HttpErrorResponse ? error.status || null : null;
            const raw = error instanceof HttpErrorResponse
              ? (error.error as { message?: unknown } | string | null | undefined)
              : null;
            const rawMessage =
              typeof raw === 'string'
                ? raw.trim()
                : raw && typeof raw.message === 'string'
                  ? raw.message.trim()
                  : '';
            const resolvedStatus = httpStatus ?? mapped.statusCode;
            const resolvedMessage = (rawMessage || mapped.message || 'Unable to reset password right now.').trim();

            this.feedbackType = 'error';
            this.feedbackMessage = resolvedMessage;
            this.allErrorMessages = [resolvedMessage];
            this.codeError = '';
            this.passwordError = '';

            if (resolvedStatus === 429) {
              this.feedbackMessage = resolvedMessage || 'Too many requests. Please wait and try again.';
              this.allErrorMessages = [this.feedbackMessage];
              return;
            }

            const secretCodeFieldError = mapped.fieldErrors['secretCode'];
            const passwordFieldError = mapped.fieldErrors['confirmPassword'] || mapped.fieldErrors['newPassword'];

            if (resolvedStatus === 400 && (/secret code|invalid|expired/i.test(resolvedMessage) || !!secretCodeFieldError)) {
              this.codeError = (secretCodeFieldError || resolvedMessage || 'Invalid or expired secret code').trim();
              this.feedbackMessage = this.codeError;
              this.allErrorMessages = [this.codeError];
              return;
            }

            if (resolvedStatus === 400 && (/passwords? do not match/i.test(resolvedMessage) || !!passwordFieldError)) {
              this.passwordError = (passwordFieldError || resolvedMessage || 'Passwords do not match').trim();
              this.feedbackMessage = this.passwordError;
              this.allErrorMessages = [this.passwordError];
              return;
            }

            if (mapped.fieldErrors && Object.keys(mapped.fieldErrors).length > 0) {
              const fieldMessages = this.collectErrorMessages(mapped);
              this.allErrorMessages = [...new Set([resolvedMessage, ...fieldMessages])];
              this.feedbackMessage = this.allErrorMessages[0];
            }
          } finally {
            this.cdr.detectChanges();
          }
        }
      });
  }

  hasClientValidationError(): boolean {
    this.allErrorMessages = [];
    this.passwordError = '';

    const secretCode = this.payload.secretCode.trim();
    if (!ResetPasswordComponent.SECRET_CODE_PATTERN.test(secretCode)) {
      this.codeError = 'Secret code must be 4 to 12 digits.';
      return true;
    }

    if (this.payload.newPassword.length < 6) {
      this.passwordError = 'New password must be at least 6 characters.';
      return true;
    }

    if (this.payload.newPassword !== this.payload.confirmPassword) {
      this.passwordError = 'Confirm password must match new password.';
      return true;
    }

    return false;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  resendCode(): void {
    if (this.isResending || this.cooldownSecondsRemaining > 0 || !this.payload.email.trim()) {
      return;
    }

    this.feedbackType = '';
    this.feedbackMessage = '';
    this.allErrorMessages = [];
    this.codeError = '';
    this.passwordError = '';
    this.isResending = true;

    this.authService
      .requestPasswordResetCode({ email: this.payload.email.trim() })
      .pipe(
        timeout(ResetPasswordComponent.REQUEST_TIMEOUT_MS),
        finalize(() => (this.isResending = false))
      )
      .subscribe({
        next: (response) => {
          this.feedbackType = 'success';
          this.feedbackMessage = response.message || 'A new secret code has been sent.';
          this.startCooldown(ResetPasswordComponent.RESEND_COOLDOWN_SECONDS, this.payload.email);
        },
        error: (error: unknown) => {
          if (error instanceof TimeoutError) {
            this.feedbackType = 'error';
            this.feedbackMessage = 'Request timed out. Please try again.';
            this.allErrorMessages = [this.feedbackMessage];
            return;
          }

          const mapped = mapAuthApiError(error, 'Unable to resend secret code right now.');
          this.feedbackType = 'error';
          this.allErrorMessages = this.collectErrorMessages(mapped);
          this.feedbackMessage = this.allErrorMessages[0] || mapped.message;

          if (mapped.statusCode === 429) {
            this.feedbackMessage = mapped.message;
            this.startCooldown(ResetPasswordComponent.RESEND_COOLDOWN_SECONDS, this.payload.email);
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.clearCooldownTimer();
  }

  private startCooldown(seconds: number, email: string): void {
    const normalizedEmail = email.trim().toLowerCase();
    this.cooldownExpiresAtMs = Date.now() + Math.max(0, Math.floor(seconds)) * 1000;
    this.persistCooldown(normalizedEmail, this.cooldownExpiresAtMs);
    this.syncCooldownFromExpiry(normalizedEmail);
    this.clearCooldownTimer();

    if (this.cooldownSecondsRemaining === 0) {
      return;
    }

    this.cooldownTimerId = setInterval(() => {
      this.syncCooldownFromExpiry(normalizedEmail);
    }, 1000);
  }

  private restoreCooldown(email: string): void {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    const stored = localStorage.getItem(this.getCooldownStorageKey(normalizedEmail));
    const parsed = stored ? Number(stored) : 0;
    if (!Number.isFinite(parsed) || parsed <= Date.now()) {
      localStorage.removeItem(this.getCooldownStorageKey(normalizedEmail));
      return;
    }

    this.cooldownExpiresAtMs = parsed;
    this.syncCooldownFromExpiry(normalizedEmail);
    this.clearCooldownTimer();
    this.cooldownTimerId = setInterval(() => {
      this.syncCooldownFromExpiry(normalizedEmail);
    }, 1000);
  }

  private syncCooldownFromExpiry(normalizedEmail: string): void {
    if (!this.cooldownExpiresAtMs) {
      this.cooldownSecondsRemaining = 0;
      return;
    }

    const remainingMs = this.cooldownExpiresAtMs - Date.now();
    this.cooldownSecondsRemaining = Math.max(0, Math.ceil(remainingMs / 1000));

    if (this.cooldownSecondsRemaining === 0) {
      this.clearCooldownTimer();
      localStorage.removeItem(this.getCooldownStorageKey(normalizedEmail));
      this.cooldownExpiresAtMs = null;
    }
  }

  private persistCooldown(normalizedEmail: string, expiresAtMs: number): void {
    if (!normalizedEmail) {
      return;
    }

    localStorage.setItem(this.getCooldownStorageKey(normalizedEmail), String(expiresAtMs));
  }

  private getCooldownStorageKey(normalizedEmail: string): string {
    return `${ResetPasswordComponent.COOLDOWN_STORAGE_PREFIX}:${normalizedEmail}`;
  }

  private collectErrorMessages(mapped: { message: string; fieldErrors: Record<string, string> }): string[] {
    const messages: string[] = [];

    if (mapped.message && mapped.message.trim()) {
      messages.push(mapped.message.trim());
    }

    for (const value of Object.values(mapped.fieldErrors)) {
      if (!value || !value.trim()) {
        continue;
      }

      messages.push(value.trim());
    }

    return [...new Set(messages)];
  }

  private clearCooldownTimer(): void {
    if (!this.cooldownTimerId) {
      return;
    }

    clearInterval(this.cooldownTimerId);
    this.cooldownTimerId = null;
  }
}
