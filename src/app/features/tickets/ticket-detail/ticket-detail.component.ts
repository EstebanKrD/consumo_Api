import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TicketService } from '../../../core/services/ticket.service';
import { UserService } from '../../../core/services/user.service';
import { Comment, Priority, Ticket, TicketStatus } from '../../../core/models/ticket.model';
import { User } from '../../../core/models/auth.model';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './ticket-detail.component.html',
  styleUrl: './ticket-detail.component.scss'
})
export class TicketDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ticketService = inject(TicketService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  private readonly ticketId = this.route.snapshot.paramMap.get('id')!;

  readonly currentUser = this.authService.currentUser;
  readonly ticket = signal<Ticket | null>(null);
  readonly comments = signal<Comment[]>([]);
  readonly agents = signal<User[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly isSubmittingComment = signal(false);
  readonly commentError = signal<string | null>(null);

  readonly isSubmittingUpdate = signal(false);
  readonly updateError = signal<string | null>(null);
  readonly updateSuccess = signal(false);

  readonly isAssigning = signal(false);
  readonly assignError = signal<string | null>(null);

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

  readonly commentForm = this.fb.group({
    body: ['', [Validators.required]]
  });

  readonly updateForm = this.fb.group({
    title: [''],
    description: [''],
    priority: [''],
    status: ['']
  });

  readonly assignForm = this.fb.group({
    agentId: ['', [Validators.required]]
  });

  readonly canEditFull = computed(() => this.currentUser()?.role === 'admin');
  readonly canEditAssigned = computed(() => {
    const user = this.currentUser();
    const ticket = this.ticket();
    return user?.role === 'agent' && ticket?.assignedTo === user.id;
  });
  readonly canUpdate = computed(() => this.canEditFull() || this.canEditAssigned());
  readonly canAssign = computed(() => this.currentUser()?.role === 'admin');
  readonly isClosed = computed(() => this.ticket()?.status === 'closed');

  ngOnInit(): void {
    this.loadTicket();
    this.loadComments();
  }

  submitComment(): void {
    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.isSubmittingComment.set(true);
    this.commentError.set(null);

    const { body } = this.commentForm.getRawValue();

    this.ticketService.addComment(this.ticketId, { body: body! }).subscribe({
      next: () => {
        this.commentForm.reset();
        this.isSubmittingComment.set(false);
        this.loadComments();
      },
      error: (error) => {
        this.isSubmittingComment.set(false);
        this.commentError.set(error?.error?.error?.message ?? 'No se pudo agregar el comentario.');
      }
    });
  }

  submitUpdate(): void {
    if (!this.canUpdate()) {
      return;
    }

    this.isSubmittingUpdate.set(true);
    this.updateError.set(null);
    this.updateSuccess.set(false);

    const raw = this.updateForm.getRawValue();
    const payload = this.canEditFull()
      ? {
          title: raw.title || undefined,
          description: raw.description || undefined,
          priority: (raw.priority || undefined) as Priority | undefined,
          status: (raw.status || undefined) as TicketStatus | undefined
        }
      : {
          priority: (raw.priority || undefined) as Priority | undefined,
          status: (raw.status || undefined) as TicketStatus | undefined
        };

    this.ticketService.updateTicket(this.ticketId, payload).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.isSubmittingUpdate.set(false);
        this.updateSuccess.set(true);
      },
      error: (error) => {
        this.isSubmittingUpdate.set(false);
        this.updateError.set(error?.error?.error?.message ?? 'No se pudo actualizar el ticket.');
      }
    });
  }

  submitAssign(): void {
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }

    this.isAssigning.set(true);
    this.assignError.set(null);

    const { agentId } = this.assignForm.getRawValue();

    this.ticketService.assignTicket(this.ticketId, { agentId: agentId! }).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.isAssigning.set(false);
      },
      error: (error) => {
        this.isAssigning.set(false);
        this.assignError.set(error?.error?.error?.message ?? 'No se pudo asignar el ticket.');
      }
    });
  }

  private loadTicket(): void {
    this.isLoading.set(true);
    this.ticketService.getTicket(this.ticketId).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.updateForm.patchValue({
          title: ticket.title,
          description: ticket.description,
          priority: ticket.priority,
          status: ticket.status
        });
        this.isLoading.set(false);

        if (this.canAssign()) {
          this.loadAgents();
        }
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el ticket.');
        this.isLoading.set(false);
      }
    });
  }

  private loadAgents(): void {
    this.userService.getUsers('agent').subscribe({
      next: (agents) => this.agents.set(agents),
      error: () => {}
    });
  }

  private loadComments(): void {
    this.ticketService.getComments(this.ticketId).subscribe({
      next: (comments) => this.comments.set(comments),
      error: () => {}
    });
  }
}
