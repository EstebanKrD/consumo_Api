import { Role } from './auth.model';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TicketStatus;
  createdBy: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; role: Role } | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: Priority;
  page?: number;
  limit?: number;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  priority: Priority;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: TicketStatus;
}

export interface AssignTicketRequest {
  agentId: string;
}

export interface CreateCommentRequest {
  body: string;
}
