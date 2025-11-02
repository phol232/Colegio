# Sincronización OLAP

## Descripción
Este comando sincroniza datos desde la base de datos transaccional (OLTP) a la base de datos analítica (OLAP) para análisis y reportes.

## Comandos Disponibles

### Sincronización Incremental (Por Defecto)
Actualiza solo los datos nuevos o modificados:

```bash
php artisan olap:sync
```

### Sincronización Completa
Borra y recarga toda la base de datos OLAP:

```bash
php artisan olap:sync --full
```

## Programación Automática

El sistema ejecuta automáticamente:

1. **Sincronización incremental cada hora** (ejecución en background)
   - Actualiza datos nuevos o modificados
   - No bloquea otras operaciones

2. **Sincronización completa diaria a las 3:00 AM**
   - Reconstruye completamente la base de datos OLAP
   - Asegura consistencia de datos

## Proceso de Sincronización

### 1. Dimensiones
- `dim_estudiante` - Estudiantes del sistema
- `dim_docente` - Docentes del sistema
- `dim_grado` - Grados académicos
- `dim_seccion` - Secciones por grado
- `dim_curso` - Cursos asignados
- `dim_tiempo` - Dimensión temporal (fechas)

### 2. Tabla de Hechos
- `fact_rendimiento_estudiantil` - Métricas de rendimiento
  - Asistencias (presente, faltas, tardanzas)
  - Porcentaje de asistencia
  - Promedios de notas por unidad
  - Promedio general

## Uso en Docker

```bash
# Sincronización incremental
docker-compose exec backend php artisan olap:sync

# Sincronización completa
docker-compose exec backend php artisan olap:sync --full
```

## Verificación

Para verificar que el cron está funcionando:

```bash
# Ver los comandos programados
docker-compose exec backend php artisan schedule:list

# Ejecutar el scheduler manualmente (prueba)
docker-compose exec backend php artisan schedule:run
```

## Logs

Los errores se registran en:
- Laravel Log: `storage/logs/laravel.log`
- Tabla de control: `control_etl` en base de datos OLAP

## Monitoreo

Puedes consultar la tabla `control_etl` para ver el historial de sincronizaciones:

```sql
SELECT * FROM control_etl ORDER BY ultima_ejecucion DESC LIMIT 10;
```

## Notas Importantes

1. La sincronización completa puede tardar varios minutos dependiendo del volumen de datos
2. La sincronización incremental es más rápida y se ejecuta sin bloquear el sistema
3. Se recomienda ejecutar una sincronización completa después de cambios importantes en la estructura
4. El sistema previene ejecuciones simultáneas con `withoutOverlapping()`

## Troubleshooting

### Error: "Connection refused"
Verifica que ambas bases de datos (OLTP y OLAP) estén corriendo:
```bash
docker-compose ps
```

### Error: "Table doesn't exist"
Ejecuta las migraciones de OLAP primero:
```bash
docker-compose exec postgres psql -U postgres -d academic_olap -f /docker-entrypoint-initdb.d/schema_olap.sql
```

### Datos no actualizados
Ejecuta una sincronización completa:
```bash
docker-compose exec backend php artisan olap:sync --full
```
