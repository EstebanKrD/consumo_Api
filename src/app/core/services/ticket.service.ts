import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssignTicketRequest,
  Comment,
  CreateCommentRequest,
  CreateTicketRequest,
  PaginatedResponse,
  Ticket,
  TicketFilters,
  UpdateTicketRequest
} from '../models/ticket.model';

// El API envuelve los recursos individuales y las listas simples en { data: ... }
// (la unica excepcion es el listado paginado de tickets, que ya trae { data, meta }).
interface DataEnvelope<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tickets`;

  getTickets(filters: TicketFilters = {}): Observable<PaginatedResponse<Ticket>> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.priority) params = params.set('priority', filters.priority);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.limit) params = params.set('limit', filters.limit);

    return this.http.get<PaginatedResponse<Ticket>>(this.baseUrl, { params });
  }

  getTicket(id: string): Observable<Ticket> {
    return this.http
      .get<DataEnvelope<Ticket>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  createTicket(request: CreateTicketRequest): Observable<Ticket> {
    return this.http
      .post<DataEnvelope<Ticket>>(this.baseUrl, request)
      .pipe(map((response) => response.data));
  }

  updateTicket(id: string, request: UpdateTicketRequest): Observable<Ticket> {
    return this.http
      .patch<DataEnvelope<Ticket>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((response) => response.data));
  }

  deleteTicket(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  assignTicket(id: string, request: AssignTicketRequest): Observable<Ticket> {
    return this.http
      .post<DataEnvelope<Ticket>>(`${this.baseUrl}/${id}/assign`, request)
      .pipe(map((response) => response.data));
  }

  getComments(ticketId: string): Observable<Comment[]> {
    return this.http
      .get<DataEnvelope<Comment[]>>(`${this.baseUrl}/${ticketId}/comments`)
      .pipe(map((response) => response.data));
  }

  addComment(ticketId: string, request: CreateCommentRequest): Observable<Comment> {
    return this.http
      .post<DataEnvelope<Comment>>(`${this.baseUrl}/${ticketId}/comments`, request)
      .pipe(map((response) => response.data));
  }
}
