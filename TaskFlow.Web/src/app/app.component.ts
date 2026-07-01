import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header>
      <h1>TaskFlow</h1>
      <nav>
        <a routerLink="/tasks" routerLinkActive="active">Tareas</a>
        <a routerLink="/projects" routerLinkActive="active">Proyectos</a>
      </nav>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
  styles: [`
    header {
      background: #1e1b4b; color: white; padding: 16px 24px;
      display: flex; align-items: center; gap: 32px;
      h1 { margin: 0; font-size: 1.4em; }
      nav { display: flex; gap: 16px; }
      a {
        color: #c7d2fe; text-decoration: none; padding: 4px 12px;
        border-radius: 4px; transition: background 0.2s;
        &:hover { background: rgba(255,255,255,0.1); }
        &.active { background: #4f46e5; color: white; }
      }
    }
    main { padding: 24px; }
  `]
})
export class AppComponent {}
