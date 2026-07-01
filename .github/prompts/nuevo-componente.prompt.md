---
mode: agent
description: Crea un componente Angular completo con servicio, modelo, ruta y test.
---

# Nuevo componente Angular: {{recurso}}

Crea una feature completa en el frontend Angular para el recurso **{{recurso}}** siguiendo la arquitectura del proyecto.

> **Prerequisito:** el recurso debe existir en el backend para poder espejar sus DTOs.

1. **Modelo** en `TaskFlow.Web/src/app/models/{{recurso | lowercase}}.model.ts`:
   - Interfaces `{{recurso}}Response`, `Create{{recurso}}Request`, `Update{{recurso}}Request`
   - Deben espejar los DTOs del backend

2. **Servicio** en `TaskFlow.Web/src/app/services/{{recurso | lowercase}}.service.ts`:
   - CRUD completo con `HttpClient`
   - `{ providedIn: 'root' }`
   - Usa `inject(HttpClient)` y `environment.apiUrl`

3. **Componente** en `TaskFlow.Web/src/app/features/{{recurso | lowercase}}s/{{recurso | lowercase}}-list.component.ts`:
   - Standalone component con signals
   - Formulario de creacion
   - Lista con acciones (editar, eliminar)
   - Manejo de errores con signal `error`

4. **Ruta** en `app.routes.ts`:
   - Lazy loading con `loadComponent`

5. **Navegacion** en `app.component.ts`:
   - Agregar link en la nav

6. **Test** en `TaskFlow.Web/src/app/services/{{recurso | lowercase}}.service.spec.ts`:
   - Test basico del servicio con `provideHttpClientTesting`
   - Verifica que las llamadas HTTP apuntan a las URLs correctas

Sigue las convenciones de Angular del proyecto (signals, inject, standalone, @if/@for).
