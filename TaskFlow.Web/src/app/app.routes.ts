import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'tasks', pathMatch: 'full' },
  {
    path: 'tasks',
    loadComponent: () => import('./features/tasks/task-list.component').then(m => m.TaskListComponent)
  },
  {
    path: 'projects',
    loadComponent: () => import('./features/projects/project-list.component').then(m => m.ProjectListComponent)
  }
];
