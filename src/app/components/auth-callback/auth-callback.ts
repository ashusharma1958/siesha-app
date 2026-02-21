import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

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
    private router: Router
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
    const error = getValue('error') ?? getValue('error_description');

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
        const parsedUser = JSON.parse(userRaw);
        localStorage.setItem('auth.user', JSON.stringify(parsedUser));
      } catch {
        localStorage.setItem('auth.user', userRaw);
      }
    }

    this.status = 'success';
    this.message = 'Sign in successful. Redirecting...';

    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 1400);
  }
}
