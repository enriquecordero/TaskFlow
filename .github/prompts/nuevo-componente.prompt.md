---
description: Crea un componente Angular completo con servicio, modelo, ruta y test.
argument-hint: recurso=<NombreDelRecurso>
agent: agent
---

# Nuevo componente Angular: ${input:recurso:NombreDelRecurso}

Crea una feature completa en el frontend Angular para el recurso **${input:recurso}**.

> En los pasos, `{Recurso}` es el nombre en **PascalCase** y `{recurso}` en **minusculas** (para carpetas, archivos y rutas). Mira `features/tasks/` como referencia.

> **Prerequisito:** el recurso debe existir en el backend para poder espejar sus DTOs.

1. **Modelo** en `TaskFlow.Web/src/app/models/{recurso}.model.ts`:
   - Interfaces `{Recurso}Response`, `Create{Recurso}Request`, `Update{Recurso}Request`
   - Deben espejar los DTOs del backend

2. **Servicio** en `TaskFlow.Web/src/app/services/{recurso}.service.ts`:
   - CRUD completo con `HttpClient`
   - `{ providedIn: 'root' }`
   - Usa `inject(HttpClient)` y `environment.apiUrl`

3. **Componente** en `TaskFlow.Web/src/app/features/{recurso}s/{recurso}-list.component.ts`:
   - Standalone component con signals
   - Formulario de creacion
   - Lista con acciones (editar, eliminar)
   - Manejo de errores con signal `error`

4. **Ruta** en `app.routes.ts`:
   - Lazy loading con `loadComponent`

5. **Navegacion** en `app.component.ts`:
   - Agregar link en la nav

6. **Test** en `TaskFlow.Web/src/app/services/{recurso}.service.spec.ts`:
   - Test basico del servicio con `provideHttpClientTesting`
   - Verifica que las llamadas HTTP apuntan a las URLs correctas

Sigue las convenciones de Angular del proyecto (signals, inject, standalone, @if/@for).
