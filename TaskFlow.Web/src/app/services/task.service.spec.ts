import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskService } from './task.service';
import { CreateTaskRequest, TaskResponse } from '../models/task.model';
import { environment } from '../../environments/environment';

describe('TaskService', () => {
  let service: TaskService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TaskService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all tasks', () => {
    // Arrange
    const mockTasks: TaskResponse[] = [
      { id: 1, title: 'Test', description: null, isCompleted: false, createdAt: '2026-01-01', projectId: null }
    ];

    // Act
    service.getAll().subscribe(tasks => {
      // Assert
      expect(tasks).toEqual(mockTasks);
    });

    // Assert
    const req = httpTesting.expectOne(`${environment.apiUrl}/tasks`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTasks);
  });

  it('should create a task', () => {
    // Arrange
    const request: CreateTaskRequest = { title: 'New Task', description: null, projectId: null };
    const mockResponse: TaskResponse = {
      id: 1, title: 'New Task', description: null, isCompleted: false, createdAt: '2026-01-01', projectId: null
    };

    // Act
    service.create(request).subscribe(task => {
      // Assert
      expect(task).toEqual(mockResponse);
    });

    // Assert
    const req = httpTesting.expectOne(`${environment.apiUrl}/tasks`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('should delete a task', () => {
    // Act
    service.delete(1).subscribe();

    // Assert
    const req = httpTesting.expectOne(`${environment.apiUrl}/tasks/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
