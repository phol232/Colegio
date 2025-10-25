<?php

namespace App\Http\Controllers;

use App\Models\NotaDetalle;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class NotaDetalleController extends Controller
{
    /**
     * Registrar una nota de evaluación
     * POST /api/notas-detalle
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'evaluacion_id' => 'required|exists:evaluaciones,id',
            'estudiante_id' => 'required|exists:usuarios,id',
            'puntaje' => 'required|numeric|between:0,20|regex:/^\d+(\.\d{1,2})?$/'
        ], [
            'evaluacion_id.required' => 'La evaluación es requerida',
            'evaluacion_id.exists' => 'La evaluación no existe',
            'estudiante_id.required' => 'El estudiante es requerido',
            'estudiante_id.exists' => 'El estudiante no existe',
            'puntaje.required' => 'El puntaje es requerido',
            'puntaje.between' => 'El puntaje debe estar entre 0 y 20',
            'puntaje.regex' => 'El puntaje debe tener máximo 2 decimales'
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
                'SELECT registrar_nota_evaluacion(?, ?, ?) as result',
                [
                    $request->evaluacion_id,
                    $request->estudiante_id,
                    $request->puntaje
                ]
            );

            $resultado = json_decode($result->result, true);

            $statusCode = $resultado['success'] ? 201 : 400;
            return response()->json($resultado, $statusCode);

        } catch (\Exception $e) {
            \Log::error('Error al registrar nota: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar nota. Por favor intenta nuevamente.'
            ], 500);
        }
    }

    /**
     * Registrar múltiples notas en una sola operación
     * POST /api/notas-detalle/bulk
     */
    public function storeBulk(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'notas' => 'required|array|min:1',
            'notas.*.evaluacion_id' => 'required|exists:evaluaciones,id',
            'notas.*.estudiante_id' => 'required|exists:usuarios,id',
            'notas.*.puntaje' => 'required|numeric|between:0,20|regex:/^\d+(\.\d{1,2})?$/'
        ], [
            'notas.required' => 'Debe proporcionar al menos una nota',
            'notas.array' => 'El formato de notas es inválido',
            'notas.min' => 'Debe proporcionar al menos una nota',
            'notas.*.evaluacion_id.required' => 'La evaluación es requerida',
            'notas.*.evaluacion_id.exists' => 'Una o más evaluaciones no existen',
            'notas.*.estudiante_id.required' => 'El estudiante es requerido',
            'notas.*.estudiante_id.exists' => 'Uno o más estudiantes no existen',
            'notas.*.puntaje.required' => 'El puntaje es requerido',
            'notas.*.puntaje.between' => 'Todos los puntajes deben estar entre 0 y 20',
            'notas.*.puntaje.regex' => 'Los puntajes deben tener máximo 2 decimales'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Validar que no haya notas duplicadas
            $notasUnicas = [];
            foreach ($request->notas as $nota) {
                $key = $nota['evaluacion_id'] . '-' . $nota['estudiante_id'];
                if (isset($notasUnicas[$key])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Hay notas duplicadas para el mismo estudiante y evaluación'
                    ], 422);
                }
                $notasUnicas[$key] = true;
            }

            // Usar la función de base de datos
            $notasJson = json_encode($request->notas);
            
            $result = DB::selectOne(
                'SELECT registrar_notas_bulk(?::json) as result',
                [$notasJson]
            );

            $resultado = json_decode($result->result, true);

            $statusCode = $resultado['success'] ? 201 : 207; // 207 Multi-Status
            return response()->json($resultado, $statusCode);

        } catch (\Exception $e) {
            \Log::error('Error al registrar notas bulk: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar notas. Por favor intenta nuevamente.'
            ], 500);
        }
    }

    /**
     * Obtener notas de una evaluación
     * GET /api/notas-detalle/evaluacion/{evaluacionId}
     */
    public function getByEvaluacion($evaluacionId): JsonResponse
    {
        try {
            // Usar la función de base de datos
            $result = DB::selectOne(
                'SELECT obtener_notas_evaluacion(?) as result',
                [$evaluacionId]
            );

            $resultado = json_decode($result->result, true);
            return response()->json($resultado);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener notas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar una nota
     * PUT /api/notas-detalle/{id}
     */
    public function update(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'puntaje' => 'required|numeric|between:0,20|regex:/^\d+(\.\d{1,2})?$/'
        ], [
            'puntaje.required' => 'El puntaje es requerido',
            'puntaje.between' => 'El puntaje debe estar entre 0 y 20',
            'puntaje.regex' => 'El puntaje debe tener máximo 2 decimales'
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
                'SELECT actualizar_nota_evaluacion(?, ?) as result',
                [$id, $request->puntaje]
            );

            $resultado = json_decode($result->result, true);

            $statusCode = $resultado['success'] ? 200 : 400;
            return response()->json($resultado, $statusCode);

        } catch (\Exception $e) {
            \Log::error('Error al actualizar nota: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar nota. Por favor intenta nuevamente.'
            ], 500);
        }
    }

    /**
     * Eliminar una nota
     * DELETE /api/notas-detalle/{id}
     */
    public function destroy($id): JsonResponse
    {
        try {
            // Usar la función de base de datos
            $result = DB::selectOne(
                'SELECT eliminar_nota_evaluacion(?) as result',
                [$id]
            );

            $resultado = json_decode($result->result, true);

            $statusCode = $resultado['success'] ? 200 : 400;
            return response()->json($resultado, $statusCode);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar nota: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener notas de un estudiante en un curso/unidad
     * GET /api/notas-detalle/estudiante/{estudianteId}/curso/{cursoId}/unidad/{unidad}
     */
    public function getByEstudianteCursoUnidad($estudianteId, $cursoId, $unidad): JsonResponse
    {
        try {
            // Usar la función de base de datos
            $result = DB::selectOne(
                'SELECT obtener_notas_estudiante_curso_unidad(?, ?, ?) as result',
                [$estudianteId, $cursoId, $unidad]
            );

            $resultado = json_decode($result->result, true);
            return response()->json($resultado);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener notas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener una nota específica
     * GET /api/notas-detalle/{id}
     */
    public function show($id): JsonResponse
    {
        try {
            $nota = NotaDetalle::with(['evaluacion', 'estudiante'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $nota
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Nota no encontrada'
            ], 404);
        }
    }
}
