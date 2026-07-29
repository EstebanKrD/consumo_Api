import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) => req.url.includes(endpoint));
  const accessToken = authService.getAccessToken();

  if (isPublicEndpoint || !accessToken) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${accessToken}` }
  });

  return next(authReq);
};
