#!/bin/bash

# Script de restore para bases de datos PostgreSQL

# Verificar argumentos
if [ $# -lt 2 ]; then
    echo "Uso: $0 <database_name> <backup_file>"
    echo "Ejemplo: $0 academic_oltp /var/backups/academic/academic_oltp_20251022_120000.sql.gz"
    exit 1
fi

DB_NAME=$1
BACKUP_FILE=$2

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: El archivo de backup no existe: $BACKUP_FILE"
    exit 1
fi

echo "========================================="
echo "Restore de Base de Datos"
echo "========================================="
echo "Base de datos: $DB_NAME"
echo "Archivo: $BACKUP_FILE"
echo "Fecha: $(date)"
echo "========================================="
echo ""

# Confirmar acción
read -p "¿Está seguro de que desea restaurar? Esto sobrescribirá los datos actuales. (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Operación cancelada"
    exit 0
fi

echo ""
echo "[$(date)] Iniciando restore..."

# Descomprimir y restaurar
gunzip -c $BACKUP_FILE | docker-compose exec -T postgres psql -U academic $DB_NAME

if [ $? -eq 0 ]; then
    echo "[$(date)] Restore completado exitosamente"
else
    echo "[$(date)] ERROR: Falló el restore"
    exit 1
fi

echo ""
echo "========================================="
echo "Restore completado"
echo "========================================="
