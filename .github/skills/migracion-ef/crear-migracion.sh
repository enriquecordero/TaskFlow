#!/bin/bash
# Uso: ./crear-migracion.sh NombreDeLaMigracion
set -e

MIGRATION_NAME=${1:?"Uso: $0 <NombreDeLaMigracion>"}

echo "Compilando el proyecto..."
dotnet build TaskFlow.Api

echo "Creando migración: $MIGRATION_NAME"
dotnet ef migrations add "$MIGRATION_NAME" --project TaskFlow.Api

echo "Aplicando migración..."
dotnet ef database update --project TaskFlow.Api

echo "Migración '$MIGRATION_NAME' creada y aplicada."
