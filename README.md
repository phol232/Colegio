# Academic Management System

Sistema de gestión académica con arquitectura de tres capas: React frontend, Laravel API, y PostgreSQL con dos bases de datos (OLTP + OLAP).

## Arquitectura

### Servicios Docker

- **nginx**: Reverse proxy para Laravel API y React frontend
- **app**: Laravel 11 con PHP 8.2-FPM
- **postgres**: PostgreSQL 16 con **DOS bases de datos**:
  - `academic_oltp`: Base de datos transaccional (OLTP)
  - `academic_olap`: Base de datos analítica con esquema estrella (OLAP)
- **pgbouncer**: Connection pooler para optimizar conexiones a PostgreSQL
- **redis**: Cache, queue y session storage

### Bases de Datos

#### OLTP (academic_oltp)
Base de datos normalizada para operaciones transaccionales:
- `usuarios`: Usuarios del sistema (docentes, estudiantes, padres)
- `cursos`: Cursos académicos
- `estudiantes_cursos`: Relación estudiantes-cursos
- `asistencias`: Registro de asistencia diaria
- `notas`: Calificaciones por unidad
- `padres_estudiantes`: Relación padres-hijos

#### OLAP (academic_olap)
Base de datos con esquema estrella para análisis:
- **Dimensiones**: `dim_estudiante`, `dim_curso`, `dim_tiempo`, `dim_docente`
- **Hechos**: `fact_rendimiento_estudiantil`
- **Control**: `control_etl`

## Instalación

### Requisitos
- Docker y Docker Compose
- Git

### Pasos

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd academic-management-system
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tu configuración
```

3. **Inicializar el sistema**
```bash
chmod +x init.sh
./init.sh
```

O manualmente:

```bash
# Construir contenedores
docker-compose build

# Iniciar servicios
docker-compose up -d

# Generar key de Laravel
docker-compose exec app php artisan key:generate

# Ejecutar migraciones OLTP
docker-compose exec app php artisan migrate --database=pgsql

# Ejecutar migraciones OLAP
docker-compose exec app php artisan migrate --database=olap --path=database/migrations/olap

# Seed (opcional)
docker-compose exec app php artisan db:seed

# Iniciar queue workers
docker-compose exec -d app php artisan queue:work redis --tries=3
```

## Acceso

- **API Backend**: http://localhost/api
- **Frontend**: http://localhost:8080
- **PostgreSQL**: localhost:5432
  - Database OLTP: `academic_oltp`
  - Database OLAP: `academic_olap`
- **PgBouncer**: localhost:6432
- **Redis**: localhost:6379

## Comandos Útiles

```bash
# Ver logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f app

# Detener servicios
docker-compose down

# Reiniciar un servicio
docker-compose restart app

# Ejecutar comandos artisan
docker-compose exec app php artisan <command>

# Acceder a PostgreSQL
docker-compose exec postgres psql -U academic -d academic_oltp

# Acceder a Redis CLI
docker-compose exec redis redis-cli

# Limpiar cache
docker-compose exec app php artisan cache:clear
docker-compose exec app php artisan config:clear
docker-compose exec app php artisan route:clear
```

## Desarrollo

### Backend (Laravel)
```bash
cd Backend
composer install
php artisan migrate
php artisan serve
```

### Frontend (React)
```bash
cd Frontend
npm install
npm run dev
```

## Testing

```bash
# Tests backend
docker-compose exec app php artisan test

# Tests con coverage
docker-compose exec app php artisan test --coverage

# Tests específicos
docker-compose exec app php artisan test --filter=AsistenciaTest
```

## Performance

El sistema está optimizado para:
- 50 usuarios concurrentes
- Tiempo de respuesta < 1 segundo para operaciones CRUD
- Latencia API: 120-180ms promedio
- Cache hit rate > 80%

### Configuración de Performance
- PHP-FPM: 40 workers
- PgBouncer: 50 conexiones pool
- PostgreSQL: shared_buffers=2GB, effective_cache_size=6GB
- Redis: 500MB maxmemory

## Seguridad

- HTTPS obligatorio en producción
- Google OAuth para autenticación
- Sanctum tokens con expiración de 24 horas
- Rate limiting: 100 req/min por usuario
- Login rate limiting: 5 intentos/min
- CORS configurado
- Variables sensibles en .env

## Backup

```bash
# Backup OLTP
docker-compose exec postgres pg_dump -U academic academic_oltp > backup_oltp_$(date +%Y%m%d).sql

# Backup OLAP
docker-compose exec postgres pg_dump -U academic academic_olap > backup_olap_$(date +%Y%m%d).sql

# Restaurar
docker-compose exec -T postgres psql -U academic academic_oltp < backup_oltp.sql
```

## Monitoreo

### Health Check
```bash
curl http://localhost/api/health
```

### Métricas
- Logs: `docker-compose logs`
- PostgreSQL stats: Conectar y ejecutar queries de pg_stat_*
- Redis info: `docker-compose exec redis redis-cli info`

## Troubleshooting

### PostgreSQL no inicia
```bash
docker-compose down -v
docker-compose up -d postgres
docker-compose logs postgres
```

### Migraciones fallan
```bash
docker-compose exec app php artisan migrate:fresh
```

### Cache issues
```bash
docker-compose exec app php artisan cache:clear
docker-compose exec redis redis-cli FLUSHALL
```

## Licencia

[Tu licencia aquí]
