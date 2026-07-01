import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { TaskResponse } from '../../models/task.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container">
      <h2>Tareas</h2>

      <form (ngSubmit)="createTask()" class="create-form">
        <input
          type="text"
          [(ngModel)]="newTitle"
          name="title"
          placeholder="Nueva tarea..."
          required
        />
        <input
          type="text"
          [(ngModel)]="newDescription"
          name="description"
          placeholder="Descripción (opcional)"
        />
        <button type="submit" [disabled]="!newTitle()">Crear</button>
      </form>

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }

      @if (tasks().length === 0) {
        <p class="empty">No hay tareas. Crea una arriba.</p>
      }

      <ul class="task-list">
        @for (task of tasks(); track task.id) {
          <li [class.completed]="task.isCompleted">
            <label>
              <input
                type="checkbox"
                [checked]="task.isCompleted"
                (change)="toggleTask(task)"
              />
              <span class="title">{{ task.title }}</span>
            </label>
            @if (task.description) {
              <span class="description">{{ task.description }}</span>
            }
            <button class="delete" (click)="deleteTask(task.id)">✕</button>
          </li>
        }
      </ul>
    </div>
  `,
  styles: [`
    .container { max-width: 600px; margin: 0 auto; }
    .create-form {
      display: flex; gap: 8px; margin-bottom: 16px;
      input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
      button {
        padding: 8px 16px; background: #4f46e5; color: white;
        border: none; border-radius: 4px; cursor: pointer;
        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }
    }
    .task-list {
      list-style: none; padding: 0;
      li {
        display: flex; align-items: center; gap: 8px;
        padding: 12px; border-bottom: 1px solid #eee;
        &.completed .title { text-decoration: line-through; color: #999; }
      }
      label { display: flex; align-items: center; gap: 8px; flex: 1; cursor: pointer; }
      .description { color: #666; font-size: 0.85em; }
      .delete {
        background: none; border: none; color: #e53e3e;
        cursor: pointer; font-size: 1.1em;
      }
    }
    .error { background: #fee; color: #c00; padding: 8px; border-radius: 4px; margin-bottom: 12px; }
    .empty { color: #999; text-align: center; padding: 24px; }
  `]
})
export class TaskListComponent implements OnInit {
  private readonly taskService = inject(TaskService);

  tasks = signal<TaskResponse[]>([]);
  newTitle = signal('');
  newDescription = signal('');
  error = signal('');

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.taskService.getAll().subscribe({
      next: (tasks) => this.tasks.set(tasks),
      error: () => this.error.set('Error al cargar tareas')
    });
  }

  createTask(): void {
    if (!this.newTitle()) return;
    this.taskService.create({
      title: this.newTitle(),
      description: this.newDescription() || null,
      projectId: null
    }).subscribe({
      next: () => {
        this.newTitle.set('');
        this.newDescription.set('');
        this.loadTasks();
      },
      error: () => this.error.set('Error al crear tarea')
    });
  }

  toggleTask(task: TaskResponse): void {
    this.taskService.update(task.id, {
      title: task.title,
      description: task.description,
      isCompleted: !task.isCompleted
    }).subscribe({
      next: () => this.loadTasks(),
      error: () => this.error.set('Error al actualizar tarea')
    });
  }

  deleteTask(id: number): void {
    this.taskService.delete(id).subscribe({
      next: () => this.loadTasks(),
      error: () => this.error.set('Error al eliminar tarea')
    });
  }
}
