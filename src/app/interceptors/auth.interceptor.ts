import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';

const AUTH_EXCLUDED_PATHS = ['/api/auth/sign-in', '/api/auth/sign-up'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const accessToken = localStorage.getItem('auth.accessToken');
  const isApiRequest = request.url.startsWith(environment.apiBaseUrl);
  const isExcludedPath = AUTH_EXCLUDED_PATHS.some((path) => request.url.includes(path));

  if (!isApiRequest) {
    return next(request);
  }

  const shouldAttachToken = !!accessToken && !isExcludedPath;
  const requestToSend = shouldAttachToken
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`
        }
      })
    : request;

  return next(requestToSend).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;

      if (isUnauthorized && !isExcludedPath) {
        localStorage.removeItem('auth.accessToken');
        localStorage.removeItem('auth.refreshToken');
        localStorage.removeItem('auth.idToken');
        localStorage.removeItem('auth.user');

        if (router.url !== '/sign-in') {
          void router.navigate(['/sign-in']);
        }
      }

      return throwError(() => error);
    })
  );
};