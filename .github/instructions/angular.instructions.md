---
applyTo: "TaskFlow.Web/**/*.ts,TaskFlow.Web/**/*.html,TaskFlow.Web/**/*.scss"
---

# Convenciones Angular para TaskFlow

- **Angular 19** con standalone components (sin NgModules).
- Usa **signals** (`signal`, `computed`, `effect`) para estado reactivo en componentes.
- Inyecta dependencias con `inject()` en lugar de constructor injection.
- Organiza por feature: `features/{recurso}/` con componente, servicio y modelo.
- Servicios con `{ providedIn: 'root' }`.
- Usa **lazy loading** con `loadComponent` en las rutas.
- Modelos (interfaces) en `models/{recurso}.model.ts`, espejando los DTOs del backend.
- Servicios en `services/{recurso}.service.ts` usando `HttpClient`.
- Nombres: `camelCase` para variables/funciones, `PascalCase` para tipos/clases, `kebab-case` para archivos.
- Templates inline (`template:`) para componentes simples; archivo separado si el template supera ~50 líneas.
- Estilos con SCSS.
- Usa el nuevo control flow de Angular: `@if`, `@for`, `@switch` en lugar de `*ngIf`, `*ngFor`.
