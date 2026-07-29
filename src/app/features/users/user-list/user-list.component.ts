import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { Role, User } from '../../../core/models/auth.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly currentUser = this.authService.currentUser;
  readonly users = signal<User[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly updatingUserId = signal<string | null>(null);
  readonly roleUpdateError = signal<string | null>(null);

  readonly roleOptions: Role[] = ['admin', 'agent', 'client'];

  readonly roleLabels: Record<Role, string> = {
    admin: 'Administrador',
    agent: 'Agente',
    client: 'Cliente'
  };

  readonly filterForm = this.fb.group({
    role: ['']
  });

  constructor() {
    this.loadUsers();
    this.filterForm.valueChanges.subscribe(() => this.loadUsers());
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { role } = this.filterForm.getRawValue();

    this.userService.getUsers((role || undefined) as Role | undefined).subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los usuarios.');
        this.isLoading.set(false);
      }
    });
  }

  onRoleChange(user: User, newRole: string): void {
    if (!newRole || newRole === user.role) {
      return;
    }

    this.roleUpdateError.set(null);
    this.updatingUserId.set(user.id);

    this.userService.updateRole(user.id, newRole as Role).subscribe({
      next: (updatedUser) => {
        this.users.update((list) => list.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
        this.updatingUserId.set(null);
      },
      error: (error) => {
        this.updatingUserId.set(null);
        this.roleUpdateError.set(error?.error?.error?.message ?? 'No se pudo actualizar el rol.');
      }
    });
  }
}
