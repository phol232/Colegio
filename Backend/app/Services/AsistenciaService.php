<?php

namespace App\Services;

use App\Models\Asistencia;
use App\Models\Curso;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class AsistenciaService
{
    /**
     * Registra asistencia masiva para un curso usando función PostgreSQL
     */
    public function registrarAsistenciaMasiva(array $datos): array
    {
        try {
            $cursoId = $datos['curso_id'];
            $fecha = $datos['fecha'];
            $registros = json_encode($datos['registros']);

            // Llamar a la función PostgreSQL
            $resultado = DB::select("SELECT registrar_asistencia_masiva(?, ?::date, ?::jsonb)", [
                $cursoId,
                $fecha,
                $registros
            ]);

            $response = json_decode($resultado[0]->registrar_asistencia_masiva, true);

            // Si fue exitoso, invalidar caché de los estudiantes y del curso
            if ($response['success']) {
                foreach ($datos['registros'] as $registro) {
                    $this->invalidarCacheEstudiante($registro['estudiante_id']);
                }
                // Invalidar cache del curso para esta fecha
                $cacheKey = "asistencia:curso:{$cursoId}:fecha:{$fecha}";
                Cache::forget($cacheKey);
            }

            return $response;

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error al registrar asistencia: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Calcula el porcentaje de asistencia de un estudiante en un curso
     */
    public function calcularPorcentajeAsistencia(int $estudianteId, int $cursoId): float
    {
        $cacheKey = "asistencia:estudiante:{$estudianteId}:curso:{$cursoId}";

        return Cache::remember($cacheKey, 3600, function () use ($estudianteId, $cursoId) {
            $totalAsistencias = Asistencia::where('estudiante_id', $estudianteId)
                ->where('curso_id', $cursoId)
                ->count();

            if ($totalAsistencias === 0) {
                return 0;
            }

            $presentes = Asistencia::where('estudiante_id', $estudianteId)
                ->where('curso_id', $cursoId)
                ->where('estado', 'presente')
                ->count();

            return ($presentes / $totalAsistencias) * 100;
        });
    }

    /**
     * Obtiene el resumen de asistencia de un estudiante usando función PostgreSQL
     */
    public function obtenerResumenAsistencia(int $estudianteId, int $cursoId): array
    {
        try {
            // Llamar a la función PostgreSQL
            $resultado = DB::select("SELECT obtener_resumen_asistencia(?, ?)", [
                $estudianteId,
                $cursoId
            ]);

            $response = json_decode($resultado[0]->obtener_resumen_asistencia, true);

            return $response['success'] ? $response['data'] : [];

        } catch (\Exception $e) {
            return [
                'total_clases' => 0,
                'presentes' => 0,
                'ausentes' => 0,
                'tardanzas' => 0,
                'porcentaje' => 0
            ];
        }
    }

    /**
     * Invalida el caché de un estudiante
     */
    public function invalidarCacheEstudiante(int $estudianteId): void
    {
        // Obtener todos los cursos del estudiante
        $cursos = DB::table('estudiantes_cursos')
            ->where('estudiante_id', $estudianteId)
            ->pluck('curso_id');

        foreach ($cursos as $cursoId) {
            $cacheKey = "asistencia:estudiante:{$estudianteId}:curso:{$cursoId}";
            Cache::forget($cacheKey);
        }
    }

    /**
     * Actualiza el caché del curso
     */
    private function actualizarCacheCurso(int $cursoId, Carbon $fecha): void
    {
        $cacheKey = "asistencia:curso:{$cursoId}:fecha:{$fecha->format('Y-m-d')}";
        
        $asistencias = Asistencia::where('curso_id', $cursoId)
            ->where('fecha', $fecha)
            ->with('estudiante:id,name,email')
            ->get();

        Cache::put($cacheKey, $asistencias, 3600);
    }

    /**
     * Obtiene las asistencias de un curso en una fecha usando función PostgreSQL
     */
    public function obtenerAsistenciasCurso(int $cursoId, string $fecha): array
    {
        $cacheKey = "asistencia:curso:{$cursoId}:fecha:{$fecha}";

        return Cache::remember($cacheKey, 3600, function () use ($cursoId, $fecha) {
            try {
                \Log::info('AsistenciaService: Obteniendo asistencias', [
                    'curso_id' => $cursoId,
                    'fecha' => $fecha
                ]);
                
                // Llamar a la función PostgreSQL
                $resultado = DB::select("SELECT obtener_asistencias_curso(?, ?::date)", [
                    $cursoId,
                    $fecha
                ]);

                $data = json_decode($resultado[0]->obtener_asistencias_curso, true);
                
                \Log::info('AsistenciaService: Resultado obtenido', [
                    'data' => $data
                ]);

                return $data;

            } catch (\Exception $e) {
                \Log::error('AsistenciaService: Error al obtener asistencias', [
                    'error' => $e->getMessage(),
                    'curso_id' => $cursoId,
                    'fecha' => $fecha
                ]);
                return [
                    'success' => false,
                    'message' => 'Error al obtener asistencias: ' . $e->getMessage()
                ];
            }
        });
    }

    /**
     * Obtiene las asistencias de un estudiante con filtros
     */
    public function obtenerAsistenciasEstudiante(int $estudianteId, ?int $cursoId = null, ?string $fechaInicio = null, ?string $fechaFin = null): array
    {
        try {
            // Llamar a la función PostgreSQL
            $resultado = DB::select("SELECT obtener_asistencias_estudiante(?, ?, ?::date, ?::date)", [
                $estudianteId,
                $cursoId,
                $fechaInicio,
                $fechaFin
            ]);

            return json_decode($resultado[0]->obtener_asistencias_estudiante, true);

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener asistencias: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Actualiza una asistencia individual usando función PostgreSQL
     */
    public function actualizarAsistencia(int $asistenciaId, string $estado): array
    {
        try {
            // Llamar a la función PostgreSQL
            $resultado = DB::select("SELECT actualizar_asistencia(?, ?)", [
                $asistenciaId,
                $estado
            ]);

            $response = json_decode($resultado[0]->actualizar_asistencia, true);

            // Si fue exitoso, invalidar caché
            if ($response['success']) {
                $asistencia = Asistencia::find($asistenciaId);
                if ($asistencia) {
                    $this->invalidarCacheEstudiante($asistencia->estudiante_id);
                }
            }

            return $response;

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error al actualizar asistencia: ' . $e->getMessage()
            ];
        }
    }
}
