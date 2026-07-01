import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateProjectRequest, ProjectResponse, UpdateProjectRequest } from '../models/project.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/projects`;

  getAll(): Observable<ProjectResponse[]> {
    return this.http.get<ProjectResponse[]>(this.baseUrl);
  }

  getById(id: number): Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateProjectRequest): Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(this.baseUrl, request);
  }

  update(id: number, request: UpdateProjectRequest): Observable<ProjectResponse> {
    return this.http.put<ProjectResponse>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
