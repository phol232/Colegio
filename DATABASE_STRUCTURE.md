# Estructura de Base de Datos - Academic Management System

## Base de Datos OLTP (Transaccional) - `academic_oltp`

### Tablas Principales

#### 1. **usuarios**
Almacena información de todos los usuarios del sistema (docentes, estudiantes, padres, admin).

**Campos:**
- `id` (PK)
- `email` (unique)
- `dni` (unique, nullable)
- `telefono` (nullable)
- `direccion` (nullable)
- `name`
- `google_id` (unique, nullable) - Para futuro login con Google
- `password` - Para login manual
- `role` (enum: docente, estudiante, padre, admin)
- `avatar` (nullable)
- `created_at`, `updated_at`

**Índices:** role, google_id, dni

---

#### 2. **grados**
Define los grados académicos (1ro-6to Primaria, 1ro-5to Secundaria).

**Campos:**
- `id` (PK)
- `nivel` (enum: primaria, secundaria)
- `numero` (1-6)
- `nombre` (ej: "1ro Primaria", "3ro Secundaria")
- `created_at`, `updated_at`

**Constraint único:** (nivel, numero)
**Índices:** nivel

---

#### 3. **secciones**
Define las secciones por grado (A, B, C, D).

**Campos:**
- `id` (PK)
- `grado_id` (FK → grados)
- `nombre` (A, B, C, D)
- `capacidad` (default: 30)
- `created_at`, `updated_at`

**Constraint único:** (grado_id, nombre)
**Índices:** grado_id

---

#### 4. **cursos**
Cursos académicos asignados a un grado, sección y docente.

**Campos:**
- `id` (PK)
- `nombre` (ej: "Matemáticas", "Comunicación")
- `codigo` (unique)
- `docente_id` (FK → usuarios)
- `grado_id` (FK → grados, nullable)
- `seccion_id` (FK → secciones, nullable)
- `created_at`, `updated_at`

**Índices:** docente_id, grado_id, seccion_id

---

#### 5. **estudiantes_cursos**
Relación muchos a muchos entre estudiantes y cursos (matrícula).

**Campos:**
- `id` (PK)
- `estudiante_id` (FK → usuarios)
- `curso_id` (FK → cursos)
- `fecha_matricula`
- `anio_academico` (year, default: año actual)
- `created_at`

**Constraint único:** (estudiante_id, curso_id)
**Índices:** estudiante_id, curso_id, anio_academico

---

#### 6. **asistencias**
Registro diario de asistencia de estudiantes.

**Campos:**
- `id` (PK)
- `estudiante_id` (FK → usuarios)
- `curso_id` (FK → cursos)
- `fecha` (date)
- `estado` (enum: presente, ausente, tardanza)
- `created_at`, `updated_at`

**Constraint único:** (estudiante_id, curso_id, fecha)
**Índices:** estudiante_id, curso_id, fecha, (curso_id, fecha)

---

#### 7. **notas**
Calificaciones de estudiantes por curso y unidad.

**Campos:**
- `id` (PK)
- `estudiante_id` (FK → usuarios)
- `curso_id` (FK → cursos)
- `unidad` (1-4)
- `puntaje` (decimal 0-20)
- `created_at`, `updated_at`

**Constraint único:** (estudiante_id, curso_id, unidad)
**Índices:** estudiante_id, curso_id, (curso_id, unidad)
**Validación:** unidad 1-4, puntaje 0-20

---

#### 8. **padres_estudiantes**
Relación entre padres e hijos (estudiantes).

**Campos:**
- `id` (PK)
- `padre_id` (FK → usuarios)
- `estudiante_id` (FK → usuarios)
- `created_at`

**Constraint único:** (padre_id, estudiante_id)
**Índices:** padre_id

---

## Base de Datos OLAP (Analítica - Esquema Estrella) - `academic_olap`

### Dimensiones

#### 1. **dim_estudiante**
- `estudiante_key` (PK)
- `estudiante_id` (unique)
- `nombre`
- `email`
- `fecha_carga`

#### 2. **dim_curso**
- `curso_key` (PK)
- `curso_id` (unique)
- `nombre`
- `codigo`
- `docente_nombre`
- `grado_nombre`
- `seccion_nombre`
- `fecha_carga`

#### 3. **dim_tiempo**
- `tiempo_key` (PK)
- `fecha` (unique)
- `dia`, `mes`, `anio`
- `trimestre`, `semestre`
- `dia_semana`
- `nombre_mes`, `nombre_dia`

#### 4. **dim_docente**
- `docente_key` (PK)
- `docente_id` (unique)
- `nombre`
- `email`
- `fecha_carga`

#### 5. **dim_grado** ⭐ NUEVO
- `grado_key` (PK)
- `grado_id` (unique)
- `nivel` (primaria/secundaria)
- `numero` (1-6)
- `nombre`
- `fecha_carga`

#### 6. **dim_seccion** ⭐ NUEVO
- `seccion_key` (PK)
- `seccion_id` (unique)
- `nombre` (A, B, C, D)
- `grado_key`
- `grado_nombre`
- `fecha_carga`

---

### Tabla de Hechos

#### **fact_rendimiento_estudiantil**
Almacena métricas agregadas de rendimiento estudiantil.

**Claves foráneas:**
- `estudiante_key` (FK → dim_estudiante)
- `curso_key` (FK → dim_curso)
- `tiempo_key` (FK → dim_tiempo)
- `docente_key` (FK → dim_docente)
- `grado_key` (FK → dim_grado) ⭐ NUEVO
- `seccion_key` (FK → dim_seccion) ⭐ NUEVO

**Métricas de Asistencia:**
- `total_asistencias`
- `total_faltas`
- `total_tardanzas`
- `porcentaje_asistencia`
- `total_clases`

**Métricas de Notas:**
- `promedio_notas`
- `nota_unidad_1`
- `nota_unidad_2`
- `nota_unidad_3`
- `nota_unidad_4`

**Metadata:**
- `anio_academico` ⭐ NUEVO
- `fecha_actualizacion`

**Constraint único:** (estudiante_key, curso_key, tiempo_key)

**Índices:** estudiante_key, curso_key, tiempo_key, grado_key, seccion_key, anio_academico, (curso_key, tiempo_key)

---

### Tabla de Control

#### **control_etl**
- `id` (PK)
- `proceso`
- `ultima_ejecucion`
- `estado`
- `registros_procesados`
- `errores`

---

## Consultas Analíticas Posibles

Con esta estructura puedes hacer análisis como:

1. **Por Grado:**
   - Promedio de notas por grado
   - Porcentaje de asistencia por grado
   - Comparativa entre grados

2. **Por Sección:**
   - Rendimiento de sección A vs B vs C
   - Asistencia por sección

3. **Por Nivel:**
   - Comparativa Primaria vs Secundaria
   - Tendencias por nivel educativo

4. **Por Tiempo:**
   - Evolución mensual/trimestral
   - Comparativa año a año

5. **Por Docente:**
   - Rendimiento de estudiantes por docente
   - Efectividad docente

6. **Combinadas:**
   - Rendimiento de 3ro Primaria Sección A en el 2025
   - Evolución de un estudiante a través de los grados
   - Comparativa de cursos en diferentes secciones

---

## Cambios Realizados

### ✅ Completado:

1. **Tabla usuarios actualizada:**
   - ✅ Agregado: dni, telefono, direccion, password
   - ✅ google_id ahora es nullable (para futuro)
   - ✅ Índice en dni

2. **Nuevas tablas OLTP:**
   - ✅ grados (nivel, numero, nombre)
   - ✅ secciones (grado_id, nombre, capacidad)

3. **Tabla cursos actualizada:**
   - ✅ Agregado: grado_id, seccion_id
   - ✅ Índices en grado_id y seccion_id

4. **Tabla estudiantes_cursos actualizada:**
   - ✅ Agregado: anio_academico
   - ✅ Índice en anio_academico

5. **Nuevas dimensiones OLAP:**
   - ✅ dim_grado
   - ✅ dim_seccion

6. **Dimensión dim_curso actualizada:**
   - ✅ Agregado: grado_nombre, seccion_nombre

7. **Tabla de hechos actualizada:**
   - ✅ Agregado: grado_key, seccion_key, anio_academico
   - ✅ Foreign keys y índices correspondientes

---

## Próximos Pasos

1. Crear seeder para poblar grados y secciones iniciales
2. Implementar autenticación manual con Sanctum (tokens 3 horas)
3. Crear modelos Eloquent con relaciones
4. Implementar controladores y servicios
5. Crear proceso ETL para sincronizar OLTP → OLAP

---

**Última actualización:** 2025-10-22
