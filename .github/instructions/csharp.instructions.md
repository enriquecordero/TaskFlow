---
applyTo: "**/*.cs"
---

# Convenciones C# para TaskFlow

- Usa `record` para DTOs (request y response).
- Usa primary constructors cuando sea posible.
- Prefiere `var` para variables locales cuando el tipo es obvio.
- Usa `AsNoTracking()` en consultas de solo lectura.
- Inyecta dependencias por constructor (o primary constructor).
- Maneja respuestas con `Results.Ok()`, `Results.Created()`, `Results.Problem()`, `Results.NoContent()`.
- Valida con FluentValidation antes de procesar: si falla, retorna `Results.ValidationProblem()`.
