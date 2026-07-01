import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';
import { ProjectResponse } from '../../models/project.model';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container">
      <h2>Proyectos</h2>

      <form (ngSubmit)="createProject()" class="create-form">
        <input
          type="text"
          [(ngModel)]="newName"
          name="name"
          placeholder="Nuevo proyecto..."
          required
        />
        <input
          type="text"
          [(ngModel)]="newDescription"
          name="description"
          placeholder="Descripción (opcional)"
        />
        <button type="submit" [disabled]="!newName()">Crear</button>
      </form>

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }

      @if (projects().length === 0) {
        <p class="empty">No hay proyectos. Crea uno arriba.</p>
      }

      <ul class="project-list">
        @for (project of projects(); track project.id) {
          <li>
            <div class="info">
              <span class="name">{{ project.name }}</span>
              @if (project.description) {
                <span class="description">{{ project.description }}</span>
              }
            </div>
            <button class="delete" (click)="deleteProject(project.id)">✕</button>
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
        padding: 8px 16px; background: #059669; color: white;
        border: none; border-radius: 4px; cursor: pointer;
        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }
    }
    .project-list {
      list-style: none; padding: 0;
      li {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px; border-bottom: 1px solid #eee;
      }
      .info { display: flex; flex-direction: column; gap: 4px; }
      .name { font-weight: 600; }
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
export class ProjectListComponent implements OnInit {
  private readonly projectService = inject(ProjectService);

  projects = signal<ProjectResponse[]>([]);
  newName = signal('');
  newDescription = signal('');
  error = signal('');

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.projectService.getAll().subscribe({
      next: (projects) => this.projects.set(projects),
      error: () => this.error.set('Error al cargar proyectos')
    });
  }

  createProject(): void {
    if (!this.newName()) return;
    this.projectService.create({
      name: this.newName(),
      description: this.newDescription() || null
    }).subscribe({
      next: () => {
        this.newName.set('');
        this.newDescription.set('');
        this.loadProjects();
      },
      error: () => this.error.set('Error al crear proyecto')
    });
  }

  deleteProject(id: number): void {
    this.projectService.delete(id).subscribe({
      next: () => this.loadProjects(),
      error: () => this.error.set('Error al eliminar proyecto')
    });
  }
}
