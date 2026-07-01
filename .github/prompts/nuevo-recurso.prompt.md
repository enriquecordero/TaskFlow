---
mode: agent
description: Crea un recurso CRUD completo con DTOs, validadores, endpoints y tests.
---

# Nuevo recurso: {{recurso}}

Crea una feature completa para el recurso **{{recurso}}** siguiendo la arquitectura del proyecto:

1. **Entidad** en `Domain/{{recurso}}.cs`
2. **DTOs** en `Features/{{recurso}}s/{{recurso}}Dto.cs`:
   - `{{recurso}}Response` (record)
   - `Create{{recurso}}Request` (record)
   - `Update{{recurso}}Request` (record)
3. **Validadores** en `Features/{{recurso}}s/{{recurso}}Validators.cs` con FluentValidation
4. **Endpoints** en `Features/{{recurso}}s/{{recurso}}Endpoints.cs`:
   - GET /{{recurso | lowercase}}s — listar todos
   - GET /{{recurso | lowercase}}s/{id} — obtener por id
   - POST /{{recurso | lowercase}}s — crear
   - PUT /{{recurso | lowercase}}s/{id} — actualizar
   - DELETE /{{recurso | lowercase}}s/{id} — eliminar
5. **Registrar** los endpoints en `Program.cs`
6. **Tests** en `TaskFlow.Tests/{{recurso}}EndpointsTests.cs`
7. Actualizar el `DbContext` si hace falta

Sigue todas las convenciones del proyecto (DTOs, validación, Results.Problem, nombres).
