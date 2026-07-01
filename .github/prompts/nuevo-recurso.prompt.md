---
description: Crea un recurso CRUD completo con DTOs, validadores, endpoints y tests.
argument-hint: recurso=<NombreDelRecurso>
agent: agent
---

# Nuevo recurso CRUD: ${input:recurso:NombreDelRecurso}

Crea una feature completa para el recurso **${input:recurso}** siguiendo la arquitectura del proyecto.

> En los pasos, `{Recurso}` es el nombre en **PascalCase** y `{recurso}` en **minusculas** (para carpetas, archivos y rutas URL). Mira `Features/Tasks/` como referencia del patron.

1. **Entidad** en `Domain/{Recurso}.cs`
2. **DTOs** en `Features/{Recurso}s/{Recurso}Dto.cs`:
   - `{Recurso}Response` (record)
   - `Create{Recurso}Request` (record)
   - `Update{Recurso}Request` (record)
3. **Validadores** en `Features/{Recurso}s/{Recurso}Validators.cs` con FluentValidation
4. **Endpoints** en `Features/{Recurso}s/{Recurso}Endpoints.cs`:
   - GET /{recurso}s — listar todos
   - GET /{recurso}s/{id:int} — obtener por id
   - POST /{recurso}s — crear
   - PUT /{recurso}s/{id:int} — actualizar
   - DELETE /{recurso}s/{id:int} — eliminar
5. **Registrar** los endpoints en `Program.cs`
6. **Tests** en `TaskFlow.Tests/{Recurso}EndpointsTests.cs`
7. Actualizar el `DbContext` si hace falta

Si no se especifican las propiedades de la entidad, **pregunta al usuario** antes de asumirlas.

Sigue todas las convenciones del proyecto (DTOs, validacion, Results.Problem, nombres).
