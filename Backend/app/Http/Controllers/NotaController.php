<?php

namespace App\Http\Controllers;

use App\Models\Evaluacion;
use App\Models\PromedioUnidad;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class NotaController extends Controller
{
    /**
     * Registra una calificación (LEGACY - usa nuevo sistema)
     * POST /api/notas
     * 
     * Este endpoint mantiene compatibilidad con el sistema antiguo
     * pero internamente usa el nuevo sistema de evaluaciones múltiples
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'estudiante_id' => 'required|exists:usuarios,id',
            'curso_id' => 'required|exists:cursos,id',
            'unidad' => 'required|integer|between:1,4',
            'puntaje' => 'required|numeric|between:0,20'
        ], [
            'puntaje.between' => 'El puntaje debe estar entre 0 y 20',
            'unidad.between' => 'La unidad debe estar entre 1 y 4'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Usar la función de compatibilidad que internamente usa el nuevo sistema
            $result = DB::selectOne(
                'SELECT registrar_nota_legacy(?, ?, ?, ?) as result',
                [
                    $request->estudiante_id,
                    $request->curso_id,
                    $request->unidad,
                    $request->puntaje
                ]
            );

            $resultado = json_decode($result->result, true);
            $statusCode = $resultado['success'] ? 201 : 400;

            return response()->json($resultado, $statusCode);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar nota: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualiza una calificación (LEGACY - usa nuevo sistema)
     * PUT /api/notas/{id}
     * 
     * NOTA: El ID ahora se ignora, se busca por estudiante/curso/unidad
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'estudiante_id' => 'required|exists:usuarios,id',
            'curso_id' => 'required|exists:cursos,id',
            'unidad' => 'required|integer|between:1,4',
            'puntaje' => 'required|numeric|between:0,20'
        ], [
            'puntaje.between' => 'El puntaje debe estar entre 0 y 20'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Usar la función de compatibilidad
            $result = DB::selectOne(
                'SELECT actualizar_nota_legacy(?, ?, ?, ?) as result',
                [
                    $request->estudiante_id,
                    $request->curso_id,
                    $request->unidad,
                    $request->puntaje
                ]
            );

            $resultado = json_decode($result->result, true);
            $statusCode = $resultado['success'] ? 200 : 400;

            return response()->json($resultado, $statusCode);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar nota: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lista notas con filtros (LEGACY - usa promedios del nuevo sistema)
     * GET /api/notas
     */
    public function index(Request $request): JsonResponse
    {
        $query = PromedioUnidad::query()->with(['estudiante:id,name,email', 'curso:id,nombre,codigo']);

        // Filtros
        if ($request->has('estudiante_id')) {
            $query->where('estudiante_id', $request->estudiante_id);
        }

        if ($request->has('curso_id')) {
            $query->where('curso_id', $request->curso_id);
        }

        if ($request->has('unidad')) {
            $query->where('unidad', $request->unidad);
        }

        // Ordenar por fecha descendente
        $query->orderBy('updated_at', 'desc');

        // Paginación
        $perPage = $request->get('per_page', 15);
        $promedios = $query->paginate($perPage);

        // Transformar para mantener compatibilidad con formato antiguo
        $promedios->getCollection()->transform(function ($promedio) {
            return [
                'id' => $promedio->id,
                'estudiante_id' => $promedio->estudiante_id,
                'curso_id' => $promedio->curso_id,
                'unidad' => $promedio->unidad,
                'puntaje' => $promedio->promedio_numerico,
                'puntaje_literal' => $promedio->promedio_literal,
                'total_evaluaciones' => $promedio->total_evaluaciones,
                'created_at' => $promedio->created_at,
                'updated_at' => $promedio->updated_at,
                'estudiante' => $promedio->estudiante,
                'curso' => $promedio->curso
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $promedios
        ]);
    }

    /**
     * Obtiene el resumen de notas de un estudiante en un curso (LEGACY)
     * GET /api/notas/resumen
     */
    public function resumen(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'estudiante_id' => 'required|exists:usuarios,id',
            'curso_id' => 'required|exists:cursos,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        // Obtener promedios de todas las unidades
        $promedios = PromedioUnidad::where('estudiante_id', $request->estudiante_id)
            ->where('curso_id', $request->curso_id)
            ->orderBy('unidad')
            ->get();

        $promedio_general = $promedios->avg('promedio_numerico');

        return response()->json([
            'success' => true,
            'data' => [
                'promedio_general' => round($promedio_general, 2),
                'unidad_1' => $promedios->where('unidad', 1)->first()->promedio_numerico ?? null,
                'unidad_2' => $promedios->where('unidad', 2)->first()->promedio_numerico ?? null,
                'unidad_3' => $promedios->where('unidad', 3)->first()->promedio_numerico ?? null,
                'unidad_4' => $promedios->where('unidad', 4)->first()->promedio_numerico ?? null,
                'total_notas' => $promedios->count()
            ]
        ]);
    }

    /**
     * Obtiene las notas de un curso por unidad (LEGACY)
     * GET /api/notas/curso/{cursoId}/unidad/{unidad}
     */
    public function porCursoYUnidad(int $cursoId, int $unidad): JsonResponse
    {
        if ($unidad < 1 || $unidad > 4) {
            return response()->json([
                'success' => false,
                'message' => 'La unidad debe estar entre 1 y 4'
            ], 400);
        }

        try {
            // Usar la función del nuevo sistema
            $result = DB::selectOne(
                'SELECT obtener_promedios_curso_unidad(?, ?) as result',
                [$cursoId, $unidad]
            );

            $resultado = json_decode($result->result, true);
            
            // Transformar para mantener compatibilidad
            if ($resultado['success'] && isset($resultado['data'])) {
                $resultado['data'] = collect($resultado['data'])->map(function($item) {
                    return [
                        'id' => $item['estudiante_id'],
                        'estudiante_id' => $item['estudiante_id'],
                        'estudiante_nombre' => $item['estudiante_nombre'],
                        'estudiante_email' => $item['estudiante_email'],
                        'puntaje' => $item['promedio_numerico'],
                        'puntaje_literal' => $item['promedio_literal'],
                        'total_evaluaciones' => $item['total_evaluaciones'],
                        'updated_at' => $item['updated_at']
                    ];
                })->toArray();
            }

            return response()->json($resultado);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener notas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtiene las notas del estudiante autenticado (LEGACY)
     * GET /api/notas/estudiante
     */
    /**
     * Obtiene las notas del estudiante autenticado (resumen)
     * GET /api/notas/estudiante
     */
    public function misNotas(Request $request): JsonResponse
    {
        try {
            $user = $request->attributes->get('user');
            $estudianteId = $user->usuario_id ?? $user->id;

            // Usar la función de PostgreSQL
            $notas = DB::select('SELECT * FROM get_notas_estudiante(?)', [$estudianteId]);

            return response()->json([
                'success' => true,
                'data' => $notas
            ]);

        } catch (\Exception $e) {
            \Log::error('Error al obtener notas del estudiante: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener notas'
            ], 500);
        }
    }

    /**
     * Obtiene las notas detalladas con evaluaciones del estudiante
     * GET /api/notas/estudiante/detalladas
     */
    public function misNotasDetalladas(Request $request): JsonResponse
    {
        try {
            $user = $request->attributes->get('user');
            $estudianteId = $user->usuario_id ?? $user->id;

            // Usar la función de PostgreSQL que incluye evaluaciones
            $notasDetalladas = DB::select('SELECT * FROM get_notas_detalladas_estudiante(?)', [$estudianteId]);

            // Decodificar el JSON de evaluaciones
            $data = array_map(function($nota) {
                return [
                    'curso_id' => $nota->curso_id,
                    'curso_nombre' => $nota->curso_nombre,
                    'curso_codigo' => $nota->curso_codigo,
                    'promedio_numerico' => (float) $nota->promedio_numerico,
                    'promedio_literal' => $nota->promedio_literal,
                    'evaluaciones' => json_decode($nota->evaluaciones, true)
                ];
            }, $notasDetalladas);

            return response()->json([
                'success' => true,
                'data' => $data
            ]);

        } catch (\Exception $e) {
            \Log::error('Error al obtener notas detalladas del estudiante: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener notas detalladas'
            ], 500);
        }
    }

}
