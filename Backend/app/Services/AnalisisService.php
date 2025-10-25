<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class AnalisisService
{
    /**
     * Consulta la base de datos OLAP
     */
    public function consultarOLAP(string $query, array $params = []): array
    {
        try {
            $resultado = DB::connection('pgsql_olap')->select($query, $params);
            return json_decode(json_encode($resultado), true);
        } catch (\Exception $e) {
            \Log::error('Error en consulta OLAP', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Obtiene el rendimiento de un curso
     */
    public function rendimientoCurso(int $cursoId, ?string $fechaInicio = null, ?string $fechaFin = null): array
    {
        $cacheKey = "analisis:curso:{$cursoId}:" . md5($fechaInicio . $fechaFin);

        return Cache::remember($cacheKey, 3600, function () use ($cursoId, $fechaInicio, $fechaFin) {
            $query = "
                SELECT 
                    c.nombre as curso_nombre,
                    c.codigo as curso_codigo,
                    COUNT(DISTINCT f.estudiante_key) as total_estudiantes,
                    AVG(f.promedio_notas) as promedio_general,
                    AVG(f.porcentaje_asistencia) as promedio_asistencia,
                    COUNT(CASE WHEN f.promedio_notas >= 11 THEN 1 END) as aprobados,
                    COUNT(CASE WHEN f.promedio_notas < 11 THEN 1 END) as desaprobados,
                    AVG(f.nota_unidad_1) as promedio_unidad_1,
                    AVG(f.nota_unidad_2) as promedio_unidad_2,
                    AVG(f.nota_unidad_3) as promedio_unidad_3,
                    AVG(f.nota_unidad_4) as promedio_unidad_4
                FROM fact_rendimiento_estudiantil f
                JOIN dim_curso c ON f.curso_key = c.curso_key
                JOIN dim_tiempo t ON f.tiempo_key = t.tiempo_key
                WHERE c.curso_id = ?
            ";

            $params = [$cursoId];

            if ($fechaInicio) {
                $query .= " AND t.fecha >= ?";
                $params[] = $fechaInicio;
            }

            if ($fechaFin) {
                $query .= " AND t.fecha <= ?";
                $params[] = $fechaFin;
            }

            $query .= " GROUP BY c.nombre, c.codigo";

            $resultado = $this->consultarOLAP($query, $params);

            if (empty($resultado)) {
                return [
                    'curso_nombre' => null,
                    'curso_codigo' => null,
                    'total_estudiantes' => 0,
                    'promedio_general' => 0,
                    'promedio_asistencia' => 0,
                    'aprobados' => 0,
                    'desaprobados' => 0,
                    'promedio_unidad_1' => 0,
                    'promedio_unidad_2' => 0,
                    'promedio_unidad_3' => 0,
                    'promedio_unidad_4' => 0
                ];
            }

            return $resultado[0];
        });
    }

    /**
     * Obtiene la evolución de un estudiante
     */
    public function evolucionEstudiante(int $estudianteId, ?int $cursoId = null): array
    {
        $cacheKey = "analisis:estudiante:{$estudianteId}:curso:" . ($cursoId ?? 'all');

        return Cache::remember($cacheKey, 3600, function () use ($estudianteId, $cursoId) {
            $query = "
                SELECT 
                    e.nombre as estudiante_nombre,
                    c.nombre as curso_nombre,
                    c.codigo as curso_codigo,
                    t.fecha,
                    t.mes,
                    t.anio,
                    f.promedio_notas,
                    f.porcentaje_asistencia,
                    f.nota_unidad_1,
                    f.nota_unidad_2,
                    f.nota_unidad_3,
                    f.nota_unidad_4,
                    f.total_asistencias,
                    f.total_faltas,
                    f.total_tardanzas
                FROM fact_rendimiento_estudiantil f
                JOIN dim_estudiante e ON f.estudiante_key = e.estudiante_key
                JOIN dim_curso c ON f.curso_key = c.curso_key
                JOIN dim_tiempo t ON f.tiempo_key = t.tiempo_key
                WHERE e.estudiante_id = ?
            ";

            $params = [$estudianteId];

            if ($cursoId) {
                $query .= " AND c.curso_id = ?";
                $params[] = $cursoId;
            }

            $query .= " ORDER BY t.fecha DESC";

            return $this->consultarOLAP($query, $params);
        });
    }

    /**
     * Obtiene estadísticas generales del sistema
     */
    public function estadisticasGenerales(?string $fechaInicio = null, ?string $fechaFin = null): array
    {
        $cacheKey = "analisis:generales:" . md5($fechaInicio . $fechaFin);

        return Cache::remember($cacheKey, 1800, function () use ($fechaInicio, $fechaFin) {
            $query = "
                SELECT 
                    COUNT(DISTINCT f.estudiante_key) as total_estudiantes,
                    COUNT(DISTINCT f.curso_key) as total_cursos,
                    AVG(f.promedio_notas) as promedio_general_notas,
                    AVG(f.porcentaje_asistencia) as promedio_general_asistencia,
                    SUM(f.total_asistencias) as total_asistencias_registradas,
                    SUM(f.total_faltas) as total_faltas_registradas,
                    COUNT(CASE WHEN f.promedio_notas >= 11 THEN 1 END) as total_aprobados,
                    COUNT(CASE WHEN f.promedio_notas < 11 AND f.promedio_notas > 0 THEN 1 END) as total_desaprobados
                FROM fact_rendimiento_estudiantil f
                JOIN dim_tiempo t ON f.tiempo_key = t.tiempo_key
                WHERE 1=1
            ";

            $params = [];

            if ($fechaInicio) {
                $query .= " AND t.fecha >= ?";
                $params[] = $fechaInicio;
            }

            if ($fechaFin) {
                $query .= " AND t.fecha <= ?";
                $params[] = $fechaFin;
            }

            $resultado = $this->consultarOLAP($query, $params);

            if (empty($resultado)) {
                return [
                    'total_estudiantes' => 0,
                    'total_cursos' => 0,
                    'promedio_general_notas' => 0,
                    'promedio_general_asistencia' => 0,
                    'total_asistencias_registradas' => 0,
                    'total_faltas_registradas' => 0,
                    'total_aprobados' => 0,
                    'total_desaprobados' => 0
                ];
            }

            return $resultado[0];
        });
    }

    /**
     * Calcula estadísticas avanzadas (promedio, mediana, desviación estándar)
     */
    public function calcularEstadisticas(array $datos, string $campo = 'promedio_notas'): array
    {
        if (empty($datos)) {
            return [
                'promedio' => 0,
                'mediana' => 0,
                'desviacion_estandar' => 0,
                'minimo' => 0,
                'maximo' => 0,
                'total' => 0
            ];
        }

        $valores = array_filter(array_column($datos, $campo), function ($v) {
            return $v !== null && $v > 0;
        });

        if (empty($valores)) {
            return [
                'promedio' => 0,
                'mediana' => 0,
                'desviacion_estandar' => 0,
                'minimo' => 0,
                'maximo' => 0,
                'total' => 0
            ];
        }

        sort($valores);
        $count = count($valores);

        // Promedio
        $promedio = array_sum($valores) / $count;

        // Mediana
        $middle = floor($count / 2);
        if ($count % 2 == 0) {
            $mediana = ($valores[$middle - 1] + $valores[$middle]) / 2;
        } else {
            $mediana = $valores[$middle];
        }

        // Desviación estándar
        $varianza = 0;
        foreach ($valores as $valor) {
            $varianza += pow($valor - $promedio, 2);
        }
        $varianza /= $count;
        $desviacionEstandar = sqrt($varianza);

        return [
            'promedio' => round($promedio, 2),
            'mediana' => round($mediana, 2),
            'desviacion_estandar' => round($desviacionEstandar, 2),
            'minimo' => round(min($valores), 2),
            'maximo' => round(max($valores), 2),
            'total' => $count
        ];
    }

    /**
     * Obtiene el ranking de estudiantes por curso
     */
    public function rankingEstudiantesCurso(int $cursoId, int $limite = 10): array
    {
        $cacheKey = "analisis:ranking:curso:{$cursoId}:limite:{$limite}";

        return Cache::remember($cacheKey, 3600, function () use ($cursoId, $limite) {
            $query = "
                SELECT 
                    e.nombre as estudiante_nombre,
                    e.email as estudiante_email,
                    f.promedio_notas,
                    f.porcentaje_asistencia,
                    f.nota_unidad_1,
                    f.nota_unidad_2,
                    f.nota_unidad_3,
                    f.nota_unidad_4
                FROM fact_rendimiento_estudiantil f
                JOIN dim_estudiante e ON f.estudiante_key = e.estudiante_key
                JOIN dim_curso c ON f.curso_key = c.curso_key
                WHERE c.curso_id = ?
                    AND f.promedio_notas > 0
                ORDER BY f.promedio_notas DESC
                LIMIT ?
            ";

            return $this->consultarOLAP($query, [$cursoId, $limite]);
        });
    }

    /**
     * Obtiene comparativa entre cursos
     */
    public function comparativaCursos(?string $fechaInicio = null, ?string $fechaFin = null): array
    {
        $cacheKey = "analisis:comparativa:" . md5($fechaInicio . $fechaFin);

        return Cache::remember($cacheKey, 3600, function () use ($fechaInicio, $fechaFin) {
            $query = "
                SELECT 
                    c.nombre as curso_nombre,
                    c.codigo as curso_codigo,
                    COUNT(DISTINCT f.estudiante_key) as total_estudiantes,
                    AVG(f.promedio_notas) as promedio_notas,
                    AVG(f.porcentaje_asistencia) as promedio_asistencia,
                    COUNT(CASE WHEN f.promedio_notas >= 11 THEN 1 END) as aprobados,
                    COUNT(CASE WHEN f.promedio_notas < 11 AND f.promedio_notas > 0 THEN 1 END) as desaprobados
                FROM fact_rendimiento_estudiantil f
                JOIN dim_curso c ON f.curso_key = c.curso_key
                JOIN dim_tiempo t ON f.tiempo_key = t.tiempo_key
                WHERE 1=1
            ";

            $params = [];

            if ($fechaInicio) {
                $query .= " AND t.fecha >= ?";
                $params[] = $fechaInicio;
            }

            if ($fechaFin) {
                $query .= " AND t.fecha <= ?";
                $params[] = $fechaFin;
            }

            $query .= " GROUP BY c.nombre, c.codigo ORDER BY promedio_notas DESC";

            return $this->consultarOLAP($query, $params);
        });
    }
}
