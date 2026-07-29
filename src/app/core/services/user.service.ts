import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Role, User } from '../models/auth.model';

// El API envuelve los recursos individuales y las listas en { data: ... }.
interface DataEnvelope<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  getUsers(role?: Role): Observable<User[]> {
    const params = role ? new HttpParams().set('role', role) : undefined;
    return this.http
      .get<DataEnvelope<User[]>>(this.baseUrl, { params })
      .pipe(map((response) => response.data));
  }

  getUser(id: string): Observable<User> {
    return this.http
      .get<DataEnvelope<User>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  updateRole(id: string, role: Role): Observable<User> {
    return this.http
      .patch<DataEnvelope<User>>(`${this.baseUrl}/${id}/role`, { role })
      .pipe(map((response) => response.data));
  }
}
