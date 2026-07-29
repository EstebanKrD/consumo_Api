import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/auth.model';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data['roles'] as Role[] | undefined;
  const currentUser = authService.currentUser();

  if (!currentUser) {
    return router.createUrlTree(['/login']);
  }

  if (!allowedRoles || allowedRoles.includes(currentUser.role)) {
    return true;
  }

  return router.createUrlTree(['/tickets']);
};
