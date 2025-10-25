<?php

namespace App\Services;

use App\Models\Nota;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class NotaService
{
    /**
     * Registra una nota usando función PostgreSQL
     */
    public function registrarNota(array $datos): array
    {
        try {
            // Llamar a la función PostgreSQL
            $resultado = DB::select("SELECT registrar_nota(?, ?, ?, ?)", [
                $datos['estudiante_id'],
                $datos['curso_id'],
                $datos['unidad'],
                $datos['puntaje']
            ]);

            $response = json_decode($resultado[0]->registrar_nota, true);

            // Si fue exitoso, invalidar caché del estudiante y del curso
            if ($response['success']) {
                $this->invalidarCacheEstudiante($datos['estudiante_id']);
                // Invalidar cache del curso para esta unidad
                $cacheKey = "notas:curso:{$datos['curso_id']}:unidad:{$datos['unidad']}";
                Cache::forget($cacheKey);
            }

            return $response;

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error al registrar nota: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Actualiza una nota usando función PostgreSQL
     */
    public function actualizarNota(int $notaId, float $puntaje): array
    {
        try {
            // Llamar a la función PostgreSQL
            $resultado = DB::select("SELECT actualizar_nota(?, ?)", [
                $notaId,
                $puntaje
            ]);

            $response = json_decode($resultado[0]->actualizar_nota, true);

            // Si fue exitoso, invalidar caché
            if ($response['success']) {
                $nota = Nota::find($notaId);
                if ($nota) {
                    $this->invalidarCacheEstudiante($nota->estudiante_id);
                }
            }

            return $response;

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error al actualizar nota: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Calcula el promedio de notas de un estudiante en un curso
     */
    public function calcularPromedioUnidad(int $estudianteId, int $cursoId): float
    {
        $cacheKey = "notas:promedio:estudiante:{$estudianteId}:curso:{$cursoId}";

        return Cache::remember($cacheKey, 3600, function () use ($estudianteId, $cursoId) {
            $promedio = Nota::where('estudiante_id', $estudianteId)
                ->where('curso_id', $cursoId)
                ->avg('puntaje');

            return $promedio ? round($promedio, 2) : 0;
        });
    }

    /**
     * Obtiene las notas de un estudiante con filtros usando función PostgreSQL
     */
    public function obtenerNotasEstudiante(int $estudianteId, ?int $cursoId = null, ?int $unidad = null): array
    {
        try {
            // Llamar a la función PostgreSQL
            $resultado = DB::select("SELECT obtener_notas_estudiante(?, ?, ?)", [
                $estudianteId,
                $cursoId,
                $unidad
            ]);

            return json_decode($resultado[0]->obtener_notas_estudiante, true);

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener notas: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Obtiene las notas de un curso por unidad usando función PostgreSQL
     */
    public function obtenerNotasCurso(int $cursoId, int $unidad): array
    {
        $cacheKey = "notas:curso:{$cursoId}:unidad:{$unidad}";

        return Cache::remember($cacheKey, 3600, function () use ($cursoId, $unidad) {
            try {
                // Llamar a la función PostgreSQL
                $resultado = DB::select("SELECT obtener_notas_curso(?, ?)", [
                    $cursoId,
                    $unidad
                ]);

                return json_decode($resultado[0]->obtener_notas_curso, true);

            } catch (\Exception $e) {
                return [
                    'success' => false,
                    'message' => 'Error al obtener notas: ' . $e->getMessage()
                ];
            }
        });
    }

    /**
     * Obtiene el resumen de notas de un estudiante en un curso usando función PostgreSQL
     */
    public function obtenerResumenNotas(int $estudianteId, int $cursoId): array
    {
        try {
            // Llamar a la función PostgreSQL
            $resultado = DB::select("SELECT obtener_resumen_notas(?, ?)", [
                $estudianteId,
                $cursoId
            ]);

            $response = json_decode($resultado[0]->obtener_resumen_notas, true);

            return $response['success'] ? $response['data'] : [];

        } catch (\Exception $e) {
            return [
                'promedio_general' => 0,
                'unidad_1' => null,
                'unidad_2' => null,
                'unidad_3' => null,
                'unidad_4' => null,
                'total_notas' => 0
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
            // Invalidar caché de promedio
            $cacheKey = "notas:promedio:estudiante:{$estudianteId}:curso:{$cursoId}";
            Cache::forget($cacheKey);

            // Invalidar caché de notas por unidad
            for ($unidad = 1; $unidad <= 4; $unidad++) {
                $cacheKey = "notas:curso:{$cursoId}:unidad:{$unidad}";
                Cache::forget($cacheKey);
            }
        }
    }
}
