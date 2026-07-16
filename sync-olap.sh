#!/bin/bash

# Script para sincronizar base de datos OLAP
# Uso: ./sync-olap.sh [full|incremental]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  Sincronización OLTP → OLAP${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    echo "Uso: $0 [OPCION]"
    echo ""
    echo "Opciones:"
    echo "  incremental    Sincronización incremental (por defecto)"
    echo "  full           Sincronización completa (borra y recarga todo)"
    echo "  status         Ver estado de última sincronización"
    echo "  help           Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0                   # Sincronización incremental"
    echo "  $0 full              # Sincronización completa"
    echo "  $0 status            # Ver estado"
    echo ""
}

# Función para verificar si Docker está corriendo
check_docker() {
    if ! docker-compose ps | grep -q "app"; then
        echo -e "${RED}❌ Error: El contenedor app no está corriendo${NC}"
        echo -e "${YELLOW}Ejecuta: docker-compose up -d${NC}"
        exit 1
    fi
}

# Función para sincronización incremental
sync_incremental() {
    echo -e "${BLUE}🔄 Iniciando sincronización incremental...${NC}"
    docker-compose exec -T app php artisan olap:sync
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Sincronización incremental completada${NC}"
    else
        echo -e "${RED}❌ Error en la sincronización${NC}"
        exit 1
    fi
}

# Función para sincronización completa
sync_full() {
    echo -e "${YELLOW}⚠️  Sincronización completa: se borrarán todos los datos de OLAP${NC}"
    read -p "¿Deseas continuar? (s/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${YELLOW}Operación cancelada${NC}"
        exit 0
    fi
    
    echo -e "${BLUE}🚀 Iniciando sincronización completa...${NC}"
    docker-compose exec -T app php artisan olap:sync --full
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Sincronización completa exitosa${NC}"
    else
        echo -e "${RED}❌ Error en la sincronización${NC}"
        exit 1
    fi
}

# Función para ver estado
show_status() {
    echo -e "${BLUE}📊 Estado de sincronización OLAP${NC}"
    echo ""
    
    # Consultar última ejecución desde la base de datos
    docker-compose exec -T postgres psql -U postgres -d academic_olap -c "
        SELECT 
            proceso,
            ultima_ejecucion,
            estado,
            registros_procesados
        FROM control_etl 
        ORDER BY ultima_ejecucion DESC 
        LIMIT 5;
    " 2>/dev/null || echo -e "${YELLOW}No se pudo consultar el estado${NC}"
}

# Main
case "${1:-incremental}" in
    incremental)
        check_docker
        sync_incremental
        ;;
    full)
        check_docker
        sync_full
        ;;
    status)
        check_docker
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Error: Opción no válida '${1}'${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
