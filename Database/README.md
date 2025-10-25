# Database Schemas - Academic Management System

Esta carpeta contiene los esquemas SQL completos de las bases de datos del sistema.

## Archivos

### 📄 `schema_oltp.sql`
Esquema completo de la base de datos transaccional (OLTP) - `academic_oltp`

**Contiene:**
- ✅ 8 tablas principales
- ✅ Todas las relaciones (foreign keys)
- ✅ Índices optimizados
- ✅ Constraints y validaciones
- ✅ Comentarios descriptivos
- ✅ Datos iniciales (grados y secciones)

**Tablas:**
1. `usuarios` - Usuarios del sistema
2. `grados` - Grados académicos (1ro-6to Primaria, 1ro-5to Secundaria)
3. `secciones` - Secciones por grado (A, B, C)
4. `cursos` - Cursos académicos
5. `estudiantes_cursos` - Matrícula de estudiantes
6. `asistencias` - Registro de asistencia
7. `notas` - Calificaciones
8. `padres_estudiantes` - Relación padres-hijos

---

### 📄 `schema_olap.sql`
Esquema completo de la base de datos analítica (OLAP) - `academic_olap`

**Contiene:**
- ✅ 6 dimensiones
- ✅ 1 tabla de hechos
- ✅ 1 tabla de control ETL
- ✅ 4 vistas analíticas predefinidas
- ✅ Función para poblar dimensión tiempo
- ✅ Índices optimizados para consultas analíticas

**Dimensiones:**
1. `dim_estudiante` - Estudiantes
2. `dim_curso` - Cursos
3. `dim_tiempo` - Temporal
4. `dim_docente` - Docentes
5. `dim_grado` - Grados académicos
6. `dim_seccion` - Secciones

**Tabla de Hechos:**
- `fact_rendimiento_estudiantil` - Métricas de rendimiento

**Vistas Analíticas:**
1. `rendimiento_por_grado` - Análisis por grado
2. `rendimiento_por_seccion` - Análisis por sección
3. `rendimiento_por_curso` - Análisis por curso
4. `evolucion_temporal` - Evolución en el tiempo

---

### 📄 `init-databases.sql`
Script de inicialización que crea las dos bases de datos en PostgreSQL.

---

### 📄 `auth_functions.sql`
Funciones PostgreSQL para autenticación y gestión de usuarios.

**Contiene:**
- ✅ `registrar_usuario()` - Registro de nuevos usuarios
- ✅ `iniciar_sesion()` - Autenticación con email/password
- ✅ `cerrar_sesion()` - Cierre de sesión
- ✅ `validar_token()` - Validación de tokens de sesión
- ✅ `actualizar_perfil()` - Actualización de datos de usuario

---

### 📄 `asistencia_functions.sql`
Funciones PostgreSQL para gestión de asistencias.

**Contiene:**
- ✅ `registrar_asistencia_masiva()` - Registro masivo de asistencias
- ✅ `obtener_resumen_asistencia()` - Resumen de asistencia por estudiante/curso
- ✅ `obtener_asistencias_curso()` - Asistencias de un curso en una fecha
- ✅ `obtener_asistencias_estudiante()` - Asistencias de un estudiante con filtros
- ✅ `actualizar_asistencia()` - Actualización de asistencia individual

---

### 📄 `nota_functions.sql`
Funciones PostgreSQL para gestión de calificaciones.

**Contiene:**
- ✅ `registrar_nota()` - Registro de calificaciones con validación 0-20
- ✅ `actualizar_nota()` - Actualización de calificaciones
- ✅ `obtener_notas_estudiante()` - Notas de un estudiante con filtros
- ✅ `obtener_notas_curso()` - Notas de un curso por unidad
- ✅ `obtener_resumen_notas()` - Resumen de notas con promedio por unidad

---

## Uso

### Opción 1: Usando Docker (Recomendado)

Las bases de datos se crean automáticamente cuando inicias los contenedores:

```bash
docker-compose up -d
```

Las migraciones de Laravel se ejecutan automáticamente.

---

### Opción 2: Ejecución Manual

Si necesitas recrear las bases de datos manualmente:

#### 1. Crear las bases de datos:
```bash
docker-compose exec postgres psql -U academic -f /docker-entrypoint-initdb.d/init-databases.sql
```

#### 2. Ejecutar esquema OLTP:
```bash
docker-compose exec postgres psql -U academic -d academic_oltp -f /path/to/schema_oltp.sql
```

#### 3. Ejecutar esquema OLAP:
```bash
docker-compose exec postgres psql -U academic -d academic_olap -f /path/to/schema_olap.sql
```

---

### Opción 3: Desde tu máquina local

Si tienes PostgreSQL instalado localmente:

```bash
# Conectar a PostgreSQL
psql -U academic -h localhost -p 5432

# Crear base OLTP
CREATE DATABASE academic_oltp;
\c academic_oltp
\i Database/schema_oltp.sql

# Crear base OLAP
CREATE DATABASE academic_olap;
\c academic_olap
\i Database/schema_olap.sql
```

---

## Verificación

### Verificar tablas OLTP:
```bash
docker-compose exec postgres psql -U academic -d academic_oltp -c "\dt"
```

### Verificar tablas OLAP:
```bash
docker-compose exec postgres psql -U academic -d academic_olap -c "\dt"
```

### Verificar vistas OLAP:
```bash
docker-compose exec postgres psql -U academic -d academic_olap -c "\dv"
```

---

## Consultas de Ejemplo

### OLTP - Consultas Transaccionales

```sql
-- Ver todos los grados y sus secciones
SELECT g.nombre AS grado, s.nombre AS seccion, s.capacidad
FROM grados g
JOIN secciones s ON g.id = s.grado_id
ORDER BY g.nivel, g.numero, s.nombre;

-- Ver cursos con su grado y sección
SELECT c.nombre AS curso, c.codigo, g.nombre AS grado, s.nombre AS seccion, u.name AS docente
FROM cursos c
LEFT JOIN grados g ON c.grado_id = g.id
LEFT JOIN secciones s ON c.seccion_id = s.id
JOIN usuarios u ON c.docente_id = u.id;

-- Ver asistencia de un estudiante
SELECT a.fecha, c.nombre AS curso, a.estado
FROM asistencias a
JOIN cursos c ON a.curso_id = c.id
WHERE a.estudiante_id = 1
ORDER BY a.fecha DESC;
```

### OLAP - Consultas Analíticas

```sql
-- Rendimiento por grado
SELECT * FROM rendimiento_por_grado
WHERE anio_academico = 2025;

-- Rendimiento por sección
SELECT * FROM rendimiento_por_seccion
WHERE anio_academico = 2025
ORDER BY promedio_general DESC;

-- Top 10 estudiantes con mejor promedio
SELECT e.nombre, AVG(f.promedio_notas) AS promedio
FROM fact_rendimiento_estudiantil f
JOIN dim_estudiante e ON f.estudiante_key = e.estudiante_key
WHERE f.anio_academico = 2025
GROUP BY e.nombre
ORDER BY promedio DESC
LIMIT 10;

-- Comparativa Primaria vs Secundaria
SELECT g.nivel, 
       AVG(f.promedio_notas) AS promedio,
       AVG(f.porcentaje_asistencia) AS asistencia
FROM fact_rendimiento_estudiantil f
JOIN dim_grado g ON f.grado_key = g.grado_key
WHERE f.anio_academico = 2025
GROUP BY g.nivel;
```

---

## Mantenimiento

### Backup

```bash
# Backup OLTP
docker-compose exec postgres pg_dump -U academic academic_oltp > backup_oltp_$(date +%Y%m%d).sql

# Backup OLAP
docker-compose exec postgres pg_dump -U academic academic_olap > backup_olap_$(date +%Y%m%d).sql
```

### Restore

```bash
# Restore OLTP
docker-compose exec -T postgres psql -U academic academic_oltp < backup_oltp.sql

# Restore OLAP
docker-compose exec -T postgres psql -U academic academic_olap < backup_olap.sql
```

---

## Notas Importantes

1. **Datos Iniciales**: El esquema OLTP incluye datos iniciales de grados y secciones
2. **Dimensión Tiempo**: El esquema OLAP incluye una función que pobla automáticamente la dimensión tiempo para 3 años
3. **Vistas**: Las vistas analíticas se crean automáticamente y están listas para usar
4. **Índices**: Todos los índices están optimizados para las consultas más frecuentes
5. **Comentarios**: Todas las tablas y columnas importantes tienen comentarios descriptivos

---

## Diagrama ER

Para ver el diagrama de relaciones completo, consulta el archivo `DATABASE_STRUCTURE.md` en la raíz del proyecto.

---

**Última actualización:** 2025-10-22
