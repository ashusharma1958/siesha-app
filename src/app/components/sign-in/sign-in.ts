import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Navigation } from '../navigation/navigation';
import { Footer } from '../footer/footer';
import { environment } from '../../../environments/environment';
import { AuthService, SignInRequest } from '../../services/auth.service';

type SocialProvider = 'google' | 'facebook' | 'apple';

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
  feedbackMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  socialSignIn(provider: SocialProvider) {
    const providerUrl = environment.socialAuthUrls?.[provider];

    if (!providerUrl) {
      window.alert(`Social sign-in for ${provider} is not configured yet.`);
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
    this.isSubmitting = true;

    this.authService
      .signIn(this.signInData)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          localStorage.setItem('auth.accessToken', response.body.token);
          localStorage.setItem(
            'auth.user',
            JSON.stringify({
              email: response.body.email,
              fullName: response.body.fullName
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
        }
      });
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
