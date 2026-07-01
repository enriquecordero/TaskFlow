# TaskFlow — Instrucciones de proyecto

## Stack

### Backend (TaskFlow.Api)
- .NET 10, C# con `nullable` y `implicit usings` activados.
- Minimal APIs organizadas por feature (una carpeta por recurso bajo `Features/`).
- Entity Framework Core con base de datos InMemory para desarrollo.

### Frontend (TaskFlow.Web)
- Angular 19 con standalone components (sin NgModules).
- Signals para estado reactivo.
- SCSS para estilos.
- Conectado al backend en `http://localhost:5100`.

## Arquitectura

### Backend
- Cada feature tiene: endpoints, DTOs (request/response) y validadores.
- **Nunca** exponer entidades de dominio en respuestas de API; siempre usar DTOs.
- Validación con **FluentValidation** registrado por DI.
- Errores con `Results.Problem` / `ProblemDetails` (RFC 7807).

### Frontend
- Organizado por features: `features/{recurso}/` con componentes standalone.
- Modelos (interfaces) en `models/` espejando los DTOs del backend.
- Servicios HTTP en `services/` con `{ providedIn: 'root' }`.
- Rutas con lazy loading (`loadComponent`).

## Convenciones de nombres

- **C#**: `PascalCase` para tipos y métodos, `camelCase` para variables, `_camelCase` para campos privados, `ALL_CAPS` para constantes.
- **TypeScript**: `camelCase` para variables/funciones, `PascalCase` para tipos/interfaces, `kebab-case` para archivos.

## Tests

### Backend
- xUnit + FluentAssertions.
- Patrón **Arrange-Act-Assert**.
- Tests de integración con `WebApplicationFactory<Program>`.

### Frontend
- Jasmine + Karma.
- `TestBed` con `provideHttpClientTesting`.
- Nombres descriptivos: `should do X when Y`.
