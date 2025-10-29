<?php

namespace App\Http\Controllers;

use App\Models\Evaluacion;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class EvaluacionController extends Controller
{
    /**
     * Crear una nueva evaluación por mes
     * POST /api/evaluaciones
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'curso_id' => 'required|exists:cursos,id',
            'mes' => 'required|integer|between:3,12',
            'nombre' => 'required|string|min:3|max:100',
            'tipo_evaluacion' => 'required|string|max:50',
            'peso' => 'nullable|numeric|between:0,100|regex:/^\d+(\.\d{1,2})?$/'
        ], [
            'curso_id.required' => 'El curso es requerido',
            'curso_id.exists' => 'El curso no existe',
            'mes.required' => 'El mes es requerido',
            'mes.between' => 'El mes debe estar entre 3 (marzo) y 12 (diciembre)',
            'nombre.required' => 'El nombre de la evaluación es requerido',
            'nombre.min' => 'El nombre debe tener al menos 3 caracteres',
            'nombre.max' => 'El nombre no puede exceder 100 caracteres',
            'tipo_evaluacion.required' => 'El tipo de evaluación es requerido',
            'peso.between' => 'El peso debe estar entre 0 y 100',
            'peso.regex' => 'El peso debe tener máximo 2 decimales'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Validar que el nombre no esté vacío después de trim
            $nombre = trim($request->nombre);
            if (empty($nombre)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El nombre de la evaluación no puede estar vacío'
                ], 422);
            }

            // Obtener el siguiente orden para este curso y mes
            $siguienteOrden = Evaluacion::where('curso_id', $request->curso_id)
                ->where('mes', $request->mes)
                ->max('orden') + 1;

            // Crear la evaluación
            $evaluacion = Evaluacion::create([
                'curso_id' => $request->curso_id,
                'mes' => $request->mes,
                'nombre' => $nombre,
                'tipo_evaluacion' => $request->tipo_evaluacion,
                'peso' => $request->peso,
                'orden' => $siguienteOrden
            ]);

            // Cargar la relación con el curso
            $evaluacion->load('curso');

            // Agregar el conteo de notas
            $evaluacion->total_notas = $evaluacion->notasDetalle()->count();

            return response()->json([
                'success' => true,
                'message' => 'Evaluación creada exitosamente',
                'data' => $evaluacion
            ], 201);

        } catch (\Exception $e) {
            \Log::error('Error al crear evaluación: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al crear evaluación. Por favor intenta nuevamente.'
            ], 500);
        }
    }

    /**
     * Obtener evaluaciones de un curso y mes
     * GET /api/evaluaciones/curso/{cursoId}/mes/{mes}
     */
    public function getByCursoMes($cursoId, $mes): JsonResponse
    {
        try {
            $evaluaciones = Evaluacion::where('curso_id', $cursoId)
                ->where('mes', $mes)
                ->with(['curso'])
                ->orderBy('orden')
                ->get();

            // Agregar el conteo de notas para cada evaluación
            $evaluaciones->each(function ($evaluacion) {
                $evaluacion->total_notas = $evaluacion->notasDetalle()->count();
            });

            return response()->json([
                'success' => true,
                'data' => $evaluaciones
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener evaluaciones: ' . $e->getMessage()
            ], 500);
        }
    }



    /**
     * Actualizar una evaluación
     * PUT /api/evaluaciones/{id}
     */
    public function update(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'nullable|string|min:3|max:100',
            'tipo_evaluacion' => 'nullable|string|max:50',
            'peso' => 'nullable|numeric|between:0,100|regex:/^\d+(\.\d{1,2})?$/'
        ], [
            'nombre.min' => 'El nombre debe tener al menos 3 caracteres',
            'nombre.max' => 'El nombre no puede exceder 100 caracteres',
            'peso.between' => 'El peso debe estar entre 0 y 100',
            'peso.regex' => 'El peso debe tener máximo 2 decimales'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Validar que el nombre no esté vacío si se proporciona
            $nombre = $request->nombre ? trim($request->nombre) : null;
            if ($nombre !== null && empty($nombre)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El nombre de la evaluación no puede estar vacío'
                ], 422);
            }

            // Usar la función de base de datos
            $result = DB::selectOne(
                'SELECT actualizar_evaluacion(?, ?, ?, ?) as result',
                [
                    $id,
                    $nombre,
                    $request->tipo_evaluacion,
                    $request->peso
                ]
            );

            $resultado = json_decode($result->result, true);

            $statusCode = $resultado['success'] ? 200 : 400;
            return response()->json($resultado, $statusCode);

        } catch (\Exception $e) {
            \Log::error('Error al actualizar evaluación: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar evaluación. Por favor intenta nuevamente.'
            ], 500);
        }
    }

    /**
     * Eliminar una evaluación
     * DELETE /api/evaluaciones/{id}
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            $forzar = $request->input('forzar', false);

            // Usar la función de base de datos
            $result = DB::selectOne(
                'SELECT eliminar_evaluacion(?, ?) as result',
                [$id, $forzar]
            );

            $resultado = json_decode($result->result, true);

            // Si requiere confirmación, devolver 409 (Conflict)
            if (isset($resultado['requires_confirmation']) && $resultado['requires_confirmation']) {
                return response()->json($resultado, 409);
            }

            $statusCode = $resultado['success'] ? 200 : 400;
            return response()->json($resultado, $statusCode);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar evaluación: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener una evaluación específica
     * GET /api/evaluaciones/{id}
     */
    public function show($id): JsonResponse
    {
        try {
            $evaluacion = Evaluacion::with(['curso', 'notasDetalle'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $evaluacion
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Evaluación no encontrada'
            ], 404);
        }
    }

    /**
     * Obtener todas las evaluaciones de un curso
     * GET /api/evaluaciones/curso/{cursoId}
     */
    public function getByCurso($cursoId): JsonResponse
    {
        try {
            $evaluaciones = Evaluacion::where('curso_id', $cursoId)
                ->with(['notasDetalle'])
                ->orderBy('mes')
                ->orderBy('orden')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $evaluaciones
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener evaluaciones: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reordenar evaluaciones
     * PUT /api/evaluaciones/reordenar
     */
    public function reordenar(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'evaluaciones' => 'required|array',
            'evaluaciones.*.id' => 'required|exists:evaluaciones,id',
            'evaluaciones.*.orden' => 'required|integer|min:1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            foreach ($request->evaluaciones as $eval) {
                Evaluacion::where('id', $eval['id'])
                    ->update(['orden' => $eval['orden']]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Evaluaciones reordenadas exitosamente'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al reordenar evaluaciones: ' . $e->getMessage()
            ], 500);
        }
    }
}
