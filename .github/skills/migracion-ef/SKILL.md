---
name: migracion-ef
description: Crea y aplica migraciones de EF Core en TaskFlow. Úsalo cuando cambien las entidades del dominio o el modelo de datos.
---

# Migración de EF Core

## Cuándo usar

Cuando se modifica una entidad en `Domain/`, se añade un nuevo `DbSet` al contexto, o se cambia la configuración del modelo.

## Procedimiento

1. Verifica que los cambios en las entidades compilan: `dotnet build`
2. Crea la migración:
   ```bash
   dotnet ef migrations add <NombreDescriptivo> --project TaskFlow.Api
   ```
3. Revisa el archivo de migración generado en `Migrations/`.
4. Aplica la migración:
   ```bash
   dotnet ef database update --project TaskFlow.Api
   ```

## Notas

- Este proyecto usa `InMemoryDatabase` para desarrollo, por lo que las migraciones son opcionales durante el taller.
- Para producción, cambiar a un proveedor real (SQL Server, PostgreSQL, etc.).
- Nombres de migración descriptivos: `AddDueDateToTask`, `CreateNotificationsTable`.
