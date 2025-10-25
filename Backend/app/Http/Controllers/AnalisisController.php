<?php

namespace App\Http\Controllers;

use App\Services\AnalisisService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AnalisisController extends Controller
{
    protected AnalisisService $analisisService;

    public function __construct(AnalisisService $analisisService)
    {
        $this->analisisService = $analisisService;
    }

    /**
     * Obtiene el rendimiento de un curso
     * GET /api/analisis/curso/{id}
     */
    public function rendimientoCurso(Request $request, int $id): JsonResponse
    {
        $fechaInicio = $request->get('fecha_inicio');
        $fechaFin = $request->get('fecha_fin');

        $rendimiento = $this->analisisService->rendimientoCurso($id, $fechaInicio, $fechaFin);

        // Calcular estadísticas adicionales si hay datos
        $estadisticas = null;
        if ($rendimiento['total_estudiantes'] > 0) {
            // Obtener datos detallados para estadísticas
            $evolucion = $this->analisisService->evolucionEstudiante(0, $id); // Todos los estudiantes del curso
            if (!empty($evolucion)) {
                $estadisticas = $this->analisisService->calcularEstadisticas($evolucion);
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'rendimiento' => $rendimiento,
                'estadisticas' => $estadisticas
            ]
        ]);
    }

    /**
     * Obtiene la evolución de un estudiante
     * GET /api/analisis/estudiante/{id}
     */
    public function evolucionEstudiante(Request $request, int $id): JsonResponse
    {
        $cursoId = $request->get('curso_id');

        $evolucion = $this->analisisService->evolucionEstudiante($id, $cursoId);

        // Calcular estadísticas
        $estadisticas = $this->analisisService->calcularEstadisticas($evolucion);

        return response()->json([
            'success' => true,
            'data' => [
                'evolucion' => $evolucion,
                'estadisticas' => $estadisticas
            ]
        ]);
    }

    /**
     * Obtiene estadísticas generales del sistema
     * GET /api/analisis/estadisticas
     */
    public function estadisticasGenerales(Request $request): JsonResponse
    {
        $fechaInicio = $request->get('fecha_inicio');
        $fechaFin = $request->get('fecha_fin');

        $estadisticas = $this->analisisService->estadisticasGenerales($fechaInicio, $fechaFin);

        return response()->json([
            'success' => true,
            'data' => $estadisticas
        ]);
    }

    /**
     * Obtiene el ranking de estudiantes por curso
     * GET /api/analisis/ranking/curso/{id}
     */
    public function rankingCurso(Request $request, int $id): JsonResponse
    {
        $limite = $request->get('limite', 10);

        $ranking = $this->analisisService->rankingEstudiantesCurso($id, $limite);

        return response()->json([
            'success' => true,
            'data' => $ranking
        ]);
    }

    /**
     * Obtiene comparativa entre cursos
     * GET /api/analisis/comparativa
     */
    public function comparativaCursos(Request $request): JsonResponse
    {
        $fechaInicio = $request->get('fecha_inicio');
        $fechaFin = $request->get('fecha_fin');

        $comparativa = $this->analisisService->comparativaCursos($fechaInicio, $fechaFin);

        return response()->json([
            'success' => true,
            'data' => $comparativa
        ]);
    }

    /**
     * Obtiene análisis de rendimiento con filtros
     * GET /api/analisis/rendimiento
     */
    public function rendimiento(Request $request): JsonResponse
    {
        $cursoId = $request->get('curso_id');
        $fechaInicio = $request->get('fecha_inicio');
        $fechaFin = $request->get('fecha_fin');

        if ($cursoId) {
            // Rendimiento de un curso específico
            $data = $this->analisisService->rendimientoCurso($cursoId, $fechaInicio, $fechaFin);
        } else {
            // Estadísticas generales
            $data = $this->analisisService->estadisticasGenerales($fechaInicio, $fechaFin);
        }

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }
}
