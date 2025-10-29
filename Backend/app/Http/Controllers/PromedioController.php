<?php

namespace App\Http\Controllers;

use App\Models\PromedioUnidad;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class PromedioController extends Controller
{
    /**
     * Obtener promedio de un estudiante en un curso/unidad
     * GET /api/promedios/estudiante/{estudianteId}/curso/{cursoId}/unidad/{unidad}
     */
    public function getByEstudianteCursoUnidad($estudianteId, $cursoId, $unidad): JsonResponse
    {
        try {
            // Intentar obtener del caché primero
            $cacheKey = "promedio_{$estudianteId}_{$cursoId}_{$unidad}";

            $resultado = Cache::remember($cacheKey, 300, function() use ($estudianteId, $cursoId, $unidad) {
                $result = DB::selectOne(
                    'SELECT obtener_promedio_estudiante(?, ?, ?) as result',
                    [$estudianteId, $cursoId, $unidad]
                );

                return json_decode($result->result, true);
            });

            return response()->json($resultado);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener promedio: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener todos los promedios de un estudiante en un curso
     * GET /api/promedios/estudiante/{estudianteId}/curso/{cursoId}
     */
    public function getByEstudianteCurso($estudianteId, $cursoId): JsonResponse
    {
        try {
            $promedios = PromedioUnidad::where('estudiante_id', $estudianteId)
                ->where('curso_id', $cursoId)
                ->orderBy('unidad')
                ->get();

            // Calcular promedio general del curso
            $promedioGeneral = $promedios->avg('promedio_numerico');
            $literalGeneral = $this->convertirALiteral($promedioGeneral);

            return response()->json([
                'success' => true,
                'data' => [
                    'promedios_por_unidad' => $promedios,
                    'promedio_general' => round($promedioGeneral, 2),
                    'promedio_general_literal' => $literalGeneral,
                    'total_unidades' => $promedios->count()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener promedios: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener promedios de todos los estudiantes de un curso/unidad
     * GET /api/promedios/curso/{cursoId}/unidad/{unidad}
     */
    public function getByCursoUnidad($cursoId, $unidad): JsonResponse
    {
        try {
            // Usar la función de base de datos
            $result = DB::selectOne(
                'SELECT obtener_promedios_curso_unidad(?, ?) as result',
                [$cursoId, $unidad]
            );

            $resultado = json_decode($result->result, true);

            if ($resultado['success'] && count($resultado['data']) > 0) {
                $promedios = collect($resultado['data']);

                $resultado['estadisticas'] = [
                    'total_estudiantes' => $promedios->count(),
                    'promedio_general' => round($promedios->avg('promedio_numerico'), 2),
                    'promedio_maximo' => $promedios->max('promedio_numerico'),
                    'promedio_minimo' => $promedios->min('promedio_numerico'),
                    'aprobados' => $promedios->where('promedio_numerico', '>=', 11)->count(),
                    'desaprobados' => $promedios->where('promedio_numerico', '<', 11)->count(),
                ];
            }

            return response()->json($resultado);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener promedios: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Recalcular todos los promedios de un curso/unidad
     * POST /api/promedios/recalcular
     */
    public function recalcular(Request $request): JsonResponse
    {
        $validator = \Validator::make($request->all(), [
            'curso_id' => 'required|exists:cursos,id',
            'unidad' => 'required|integer|between:1,4'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Usar la función de base de datos
            $result = DB::selectOne(
                'SELECT recalcular_promedios_curso_unidad(?, ?) as result',
                [$request->curso_id, $request->unidad]
            );

            $resultado = json_decode($result->result, true);

            // Limpiar caché de promedios
            $this->limpiarCachePromedios($request->curso_id, $request->unidad);

            $statusCode = $resultado['success'] ? 200 : 400;
            return response()->json($resultado, $statusCode);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al recalcular promedios: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener ranking de estudiantes por promedio en un curso/unidad
     * GET /api/promedios/ranking/curso/{cursoId}/unidad/{unidad}
     */
    public function getRanking($cursoId, $unidad): JsonResponse
    {
        try {
            $promedios = PromedioUnidad::with('estudiante')
                ->where('curso_id', $cursoId)
                ->where('unidad', $unidad)
                ->orderBy('promedio_numerico', 'desc')
                ->get();

            $ranking = $promedios->map(function($promedio, $index) {
                return [
                    'posicion' => $index + 1,
                    'estudiante_id' => $promedio->estudiante_id,
                    'estudiante_nombre' => $promedio->estudiante->name,
                    'promedio_numerico' => $promedio->promedio_numerico,
                    'promedio_literal' => $promedio->promedio_literal,
                    'total_evaluaciones' => $promedio->total_evaluaciones
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $ranking
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener ranking: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas generales de un curso
     * GET /api/promedios/estadisticas/curso/{cursoId}
     */
    public function getEstadisticasCurso($cursoId): JsonResponse
    {
        try {
            // Obtener todas las evaluaciones del curso
            $evaluaciones = \App\Models\Evaluacion::where('curso_id', $cursoId)->get();

            if ($evaluaciones->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'total_estudiantes' => 0,
                        'promedio_general' => 0,
                        'estudiantes_aprobados' => 0,
                        'estudiantes_desaprobados' => 0,
                        'total_evaluaciones' => 0
                    ]
                ]);
            }

            // Obtener todas las notas de esas evaluaciones
            $evaluacionIds = $evaluaciones->pluck('id');
            $notasDetalle = \App\Models\NotaDetalle::whereIn('evaluacion_id', $evaluacionIds)->get();

            if ($notasDetalle->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'total_estudiantes' => 0,
                        'promedio_general' => 0,
                        'estudiantes_aprobados' => 0,
                        'estudiantes_desaprobados' => 0,
                        'total_evaluaciones' => $evaluaciones->count()
                    ]
                ]);
            }

            // Calcular promedio por estudiante
            $promediosPorEstudiante = $notasDetalle->groupBy('estudiante_id')->map(function($notasEstudiante) {
                return round($notasEstudiante->avg('puntaje'), 2);
            });

            $promedioGeneral = round($promediosPorEstudiante->avg(), 2);
            $estudiantesAprobados = $promediosPorEstudiante->filter(function($promedio) {
                return $promedio >= 11;
            })->count();
            $estudiantesDesaprobados = $promediosPorEstudiante->filter(function($promedio) {
                return $promedio < 11;
            })->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_estudiantes' => $promediosPorEstudiante->count(),
                    'promedio_general' => $promedioGeneral,
                    'estudiantes_aprobados' => $estudiantesAprobados,
                    'estudiantes_desaprobados' => $estudiantesDesaprobados,
                    'total_evaluaciones' => $evaluaciones->count()
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Error al obtener estadísticas del curso: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas: ' . $e->getMessage()
            ], 500);
        }
    }

    // Métodos auxiliares privados

    /**
     * Convierte promedio numérico a literal
     */
    private function convertirALiteral($promedio): string
    {
        if ($promedio >= 17) return 'AD';
        if ($promedio >= 14) return 'A';
        if ($promedio >= 11) return 'B';
        return 'C';
    }

    /**
     * Limpia el caché de promedios de un curso/unidad
     */
    private function limpiarCachePromedios($cursoId, $unidad): void
    {
        // Obtener todos los estudiantes del curso
        $estudiantes = DB::table('estudiantes_cursos')
            ->where('curso_id', $cursoId)
            ->pluck('estudiante_id');

        // Limpiar caché de cada estudiante
        foreach ($estudiantes as $estudianteId) {
            $cacheKey = "promedio_{$estudianteId}_{$cursoId}_{$unidad}";
            Cache::forget($cacheKey);
        }
    }
}
