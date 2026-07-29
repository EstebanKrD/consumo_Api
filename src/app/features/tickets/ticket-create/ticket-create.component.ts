import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TicketService } from '../../../core/services/ticket.service';
import { Priority } from '../../../core/models/ticket.model';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './ticket-create.component.html',
  styleUrl: './ticket-create.component.scss'
})
export class TicketCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ticketService = inject(TicketService);
  private readonly router = inject(Router);

  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  readonly priorityOptions: Priority[] = ['low', 'medium', 'high', 'urgent'];

  readonly priorityLabels: Record<Priority, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente'
  };

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    priority: ['medium' as Priority, [Validators.required]]
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const { title, description, priority } = this.form.getRawValue();

    this.ticketService
      .createTicket({ title: title!, description: description!, priority: priority! })
      .subscribe({
        next: (ticket) => {
          this.isSubmitting.set(false);
          this.router.navigate(['/tickets', ticket.id]);
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error?.error?.error?.message ?? 'No se pudo crear el ticket.');
        }
      });
  }
}
