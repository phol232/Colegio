#!/bin/bash

# Script para configurar la zona horaria de Perú en los contenedores

echo "Configurando zona horaria America/Lima en los contenedores..."

# Configurar en el contenedor de PgBouncer (el único que falta)
echo "Configurando PgBouncer..."
docker exec academic_pgbouncer sh -c 'apt-get update && apt-get install -y tzdata && ln -sf /usr/share/zoneinfo/America/Lima /etc/localtime && echo "America/Lima" > /etc/timezone'

echo "Zona horaria configurada. Reiniciando PgBouncer..."

# Reiniciar solo PgBouncer
docker-compose restart pgbouncer

echo "¡Listo! Verifica la hora con:"
echo "  docker exec academic_pgbouncer date"
echo "  docker exec academic_postgres psql -U academic -d academic_oltp -c 'SHOW timezone;'"
