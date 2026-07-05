import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService, ForgotPasswordRequest, mapAuthApiError } from '../../services/auth.service';
import { Footer } from '../footer/footer';
import { Navigation } from '../navigation/navigation';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navigation, Footer],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  private static readonly RESEND_COOLDOWN_SECONDS = 60;
  private static readonly COOLDOWN_STORAGE_PREFIX = 'password-reset-code-cooldown';

  payload: ForgotPasswordRequest = {
    email: ''
  };

  isSubmitting = false;
  feedbackType: 'success' | 'error' | '' = '';
  feedbackMessage = '';
  emailError = '';
  cooldownSecondsRemaining = 0;
  private cooldownTimerId: ReturnType<typeof setInterval> | null = null;
  private cooldownExpiresAtMs: number | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.restoreCooldown(this.payload.email);
  }

  onSubmit(form: NgForm): void {
    if (this.isSubmitting || form.invalid || this.cooldownSecondsRemaining > 0) {
      return;
    }

    this.feedbackType = '';
    this.feedbackMessage = '';
    this.emailError = '';
    this.isSubmitting = true;

    this.authService
      .requestPasswordResetCode({ email: this.payload.email.trim() })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          this.feedbackType = 'success';
          this.feedbackMessage = response.message || 'Secret code sent successfully.';
          this.startCooldown(ForgotPasswordComponent.RESEND_COOLDOWN_SECONDS, this.payload.email.trim());

          setTimeout(() => {
            void this.router.navigate(['/reset-password'], {
              queryParams: { email: this.payload.email.trim() }
            });
          }, 600);
        },
        error: (error: unknown) => {
          const mapped = mapAuthApiError(error, 'Unable to request a secret code right now.');
          this.feedbackType = 'error';
          this.feedbackMessage = mapped.message;

          if (mapped.statusCode === 400 && mapped.fieldErrors['email']) {
            this.emailError = mapped.fieldErrors['email'];
            if (/validation failed/i.test(this.feedbackMessage)) {
              this.feedbackMessage = this.emailError;
            }
          }

          if (mapped.statusCode === 429) {
            this.feedbackMessage = mapped.message;
            this.startCooldown(ForgotPasswordComponent.RESEND_COOLDOWN_SECONDS, this.payload.email.trim());
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
    return `${ForgotPasswordComponent.COOLDOWN_STORAGE_PREFIX}:${normalizedEmail}`;
  }

  private clearCooldownTimer(): void {
    if (!this.cooldownTimerId) {
      return;
    }

    clearInterval(this.cooldownTimerId);
    this.cooldownTimerId = null;
  }
}
