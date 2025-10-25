# Optimizaciones de Performance

Este documento describe las optimizaciones de performance implementadas en el sistema.

## 1. Redis Cache

### Configuración
- **Driver**: Redis
- **TTL**: 1 hora (3600 segundos) para consultas frecuentes
- **Conexión**: Configurada en `config/database.php`

### Implementación
- ✅ Cache en `AsistenciaService` para consultas de asistencias
- ✅ Cache en `NotaService` para consultas de notas
- ✅ Cache en `AnalisisService` para reportes OLAP
- ✅ Invalidación selectiva de caché cuando se actualizan datos

### Uso
```php
// Ejemplo de uso en servicios
Cache::remember($cacheKey, 3600, function () {
    // Query a base de datos
});
```

## 2. Eager Loading

### Implementación
Todas las queries con relaciones usan eager loading para evitar N+1:

```php
// AsistenciaController
$query->with(['estudiante:id,name,email', 'curso:id,nombre,codigo']);

// NotaController
$query->with(['estudiante:id,name,email', 'curso:id,nombre,codigo']);
```

## 3. PgBouncer - Connection Pooling

### Configuración
- **Pool Mode**: Transaction
- **Max Client Connections**: 100
- **Default Pool Size**: 50
- **Min Pool Size**: 10
- **Reserve Pool Size**: 5
- **Server Idle Timeout**: 600 segundos

### Archivo de configuración
`Database/pgbouncer.ini`

## 4. PHP-FPM Workers

### Configuración Recomendada
```ini
pm = dynamic
pm.max_children = 40
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 15
pm.max_requests = 500
```

### Cálculo de memoria
- Cada worker PHP consume ~64MB
- 40 workers × 64MB = 2.56GB RAM

## 5. Rate Limiting

### Configuración por Endpoint

#### Autenticación
- **Login**: 5 requests/minuto
- **Register**: 10 requests/minuto

#### API General
- **Endpoints protegidos**: 100 requests/minuto por usuario

### Implementación
```php
// En routes/api.php
Route::middleware(['throttle:100,1'])->group(function () {
    // Rutas protegidas
});

Route::post('/login')->middleware('throttle:5,1');
```

## 6. PostgreSQL Optimización

### Configuración Recomendada
```conf
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 16MB
maintenance_work_mem = 512MB
max_connections = 200
```

### Índices Implementados

#### OLTP
- `idx_usuarios_role` en usuarios(role)
- `idx_asistencias_estudiante` en asistencias(estudiante_id)
- `idx_asistencias_curso` en asistencias(curso_id)
- `idx_asistencias_fecha` en asistencias(fecha)
- `idx_asistencias_compuesto` en asistencias(curso_id, fecha)
- `idx_notas_estudiante` en notas(estudiante_id)
- `idx_notas_curso` en notas(curso_id)
- `idx_notas_compuesto` en notas(curso_id, unidad)

#### OLAP
- Índices en todas las foreign keys de dimensiones
- Índices compuestos en fact_rendimiento_estudiantil

## 7. Paginación

### Implementación
Todos los endpoints de listado implementan paginación:

```php
// Ejemplo
$perPage = $request->get('per_page', 15);
$asistencias = $query->paginate($perPage);
```

### Endpoints con paginación
- `GET /api/asistencias`
- `GET /api/notas`

## 8. Funciones PostgreSQL

### Ventajas
- Reducción de round-trips a la base de datos
- Lógica de negocio ejecutada en el servidor de BD
- Mejor performance para operaciones complejas

### Funciones Implementadas
- `registrar_asistencia_masiva()`
- `obtener_resumen_asistencia()`
- `registrar_nota()`
- `obtener_resumen_notas()`
- `iniciar_sesion()`
- `registrar_usuario()`

## 9. ETL Optimizado

### Sincronización Incremental
- Solo procesa datos nuevos desde última sincronización
- Usa tabla `control_etl` para tracking
- Ejecuta cada 5 minutos (configurable)

### Jobs con Retry Logic
- 3 intentos con backoff exponencial (1min, 5min, 15min)
- Timeout de 5 minutos por job
- Logging completo de errores

## 10. Métricas de Performance

### Objetivos
- ✅ Tiempo de respuesta API: < 1 segundo
- ✅ Latencia promedio: 120-180ms
- ✅ Cache hit rate: > 80%
- ✅ Soporte para 50 usuarios concurrentes
- ✅ Uso de RAM: < 4GB con 50 usuarios activos

### Monitoreo
- Health check endpoint: `GET /api/health`
- Logs en `storage/logs/laravel.log`
- Métricas de ETL en tabla `control_etl`

## 11. Recomendaciones Adicionales

### Para Producción
1. Habilitar OPcache en PHP
2. Configurar Redis con persistencia AOF
3. Implementar CDN para assets estáticos
4. Configurar Nginx con gzip compression
5. Implementar monitoring con Prometheus/Grafana
6. Configurar backups automáticos diarios

### Comandos Útiles
```bash
# Limpiar caché
php artisan cache:clear

# Ver rutas con rate limiting
php artisan route:list

# Monitorear queue workers
php artisan queue:work --verbose

# Ver logs en tiempo real
tail -f storage/logs/laravel.log
```
