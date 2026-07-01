---
name: migracion-ef
description: Crea y aplica migraciones de EF Core en TaskFlow. Usalo cuando cambien las entidades del dominio, el modelo de datos, o necesites actualizar el esquema de base de datos.
---

# Migracion de EF Core

## Cuando usar

Cuando se modifica una entidad en `Domain/`, se anade un nuevo `DbSet` al contexto, o se cambia la configuracion del modelo.

## Procedimiento

1. Verifica que los cambios en las entidades compilan: `dotnet build`
2. Crea la migracion:
   ```bash
   dotnet ef migrations add <NombreDescriptivo> --project TaskFlow.Api
   ```
3. Revisa el archivo de migracion generado en `Migrations/`.
4. Aplica la migracion:
   ```bash
   dotnet ef database update --project TaskFlow.Api
   ```

## Script auxiliar

Este skill incluye `crear-migracion.sh` que automatiza los 4 pasos anteriores en un solo comando:

```bash
./crear-migracion.sh AddDueDateToTask
```

El script compila, crea la migracion y la aplica. Acepta el nombre como argumento y falla rapido si algo sale mal (`set -e`).

## Nota sobre InMemory

Este proyecto usa `InMemoryDatabase` para desarrollo. Con InMemory, las migraciones **se crean pero no tienen efecto real** — el esquema se genera en memoria al iniciar. Este skill es pedagogico: demuestra el procedimiento para cuando uses un proveedor real (SQL Server, PostgreSQL, etc.).

## Convenciones

- Nombres de migracion descriptivos: `AddDueDateToTask`, `CreateNotificationsTable`.
- Una migracion por cambio logico — no agrupar cambios no relacionados.
