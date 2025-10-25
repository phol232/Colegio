#!/bin/bash

# Script de backup automático para bases de datos PostgreSQL
# Retención: 7 días

# Configuración
BACKUP_DIR="/var/backups/academic"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

# Función para hacer backup
backup_database() {
    local DB_NAME=$1
    local BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"
    
    echo "[$(date)] Iniciando backup de $DB_NAME..."
    
    # Hacer backup con pg_dump y comprimir
    docker-compose exec -T postgres pg_dump -U academic $DB_NAME | gzip > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        echo "[$(date)] Backup de $DB_NAME completado: $BACKUP_FILE"
        
        # Verificar tamaño del archivo
        SIZE=$(du -h $BACKUP_FILE | cut -f1)
        echo "[$(date)] Tamaño del backup: $SIZE"
    else
        echo "[$(date)] ERROR: Falló el backup de $DB_NAME"
        return 1
    fi
}

# Función para limpiar backups antiguos
cleanup_old_backups() {
    echo "[$(date)] Limpiando backups antiguos (más de $RETENTION_DAYS días)..."
    find $BACKUP_DIR -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    echo "[$(date)] Limpieza completada"
}

# Ejecutar backups
echo "========================================="
echo "Backup Automático - Academic Management"
echo "Fecha: $(date)"
echo "========================================="

backup_database "academic_oltp"
backup_database "academic_olap"

# Limpiar backups antiguos
cleanup_old_backups

# Mostrar resumen
echo ""
echo "========================================="
echo "Resumen de backups disponibles:"
echo "========================================="
ls -lh $BACKUP_DIR | tail -n 10

echo ""
echo "[$(date)] Proceso de backup completado"
