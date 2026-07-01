import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateTaskRequest, TaskResponse, UpdateTaskRequest } from '../models/task.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tasks`;

  getAll(): Observable<TaskResponse[]> {
    return this.http.get<TaskResponse[]>(this.baseUrl);
  }

  getById(id: number): Observable<TaskResponse> {
    return this.http.get<TaskResponse>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateTaskRequest): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(this.baseUrl, request);
  }

  update(id: number, request: UpdateTaskRequest): Observable<TaskResponse> {
    return this.http.put<TaskResponse>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
