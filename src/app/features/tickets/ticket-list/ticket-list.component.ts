import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TicketService } from '../../../core/services/ticket.service';
import { PaginationMeta, Priority, Ticket, TicketStatus } from '../../../core/models/ticket.model';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './ticket-list.component.html',
  styleUrl: './ticket-list.component.scss'
})
export class TicketListComponent {
  private readonly ticketService = inject(TicketService);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly tickets = signal<Ticket[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly currentPage = signal(1);

  readonly statusOptions: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
  readonly priorityOptions: Priority[] = ['low', 'medium', 'high', 'urgent'];

  readonly statusLabels: Record<TicketStatus, string> = {
    open: 'Abierto',
    in_progress: 'En progreso',
    resolved: 'Resuelto',
    closed: 'Cerrado'
  };

  readonly priorityLabels: Record<Priority, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente'
  };

  readonly filterForm = this.fb.group({
    status: [''],
    priority: ['']
  });

  get canCreateTicket(): boolean {
    const role = this.currentUser()?.role;
    return role === 'admin' || role === 'client';
  }

  constructor() {
    this.loadTickets();
    this.filterForm.valueChanges.subscribe(() => {
      this.currentPage.set(1);
      this.loadTickets();
    });
  }

  loadTickets(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { status, priority } = this.filterForm.getRawValue();

    this.ticketService
      .getTickets({
        status: (status || undefined) as TicketStatus | undefined,
        priority: (priority || undefined) as Priority | undefined,
        page: this.currentPage(),
        limit: PAGE_SIZE
      })
      .subscribe({
        next: (response) => {
          this.tickets.set(response.data);
          this.meta.set(response.meta);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los tickets.');
          this.isLoading.set(false);
        }
      });
  }

  goToPage(page: number): void {
    const meta = this.meta();
    if (page < 1 || (meta && page > meta.totalPages)) {
      return;
    }
    this.currentPage.set(page);
    this.loadTickets();
  }
}
