import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'tickets',
        loadComponent: () =>
          import('./features/tickets/ticket-list/ticket-list.component').then(
            (m) => m.TicketListComponent
          )
      },
      {
        path: 'tickets/new',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'client'] },
        loadComponent: () =>
          import('./features/tickets/ticket-create/ticket-create.component').then(
            (m) => m.TicketCreateComponent
          )
      },
      {
        path: 'tickets/:id',
        loadComponent: () =>
          import('./features/tickets/ticket-detail/ticket-detail.component').then(
            (m) => m.TicketDetailComponent
          )
      },
      {
        path: 'users',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./features/users/user-list/user-list.component').then((m) => m.UserListComponent)
      },
      { path: '', redirectTo: 'tickets', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
