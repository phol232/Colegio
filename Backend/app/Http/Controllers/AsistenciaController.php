<?php

namespace App\Http\Controllers;

use App\Services\AsistenciaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class AsistenciaController extends Controller
{
    protected AsistenciaService $asistenciaService;

    public function __construct(AsistenciaService $asistenciaService)
    {
        $this->asistenciaService = $asistenciaService;
    }

    /**
     * Registra asistencia masiva para un curso
     * POST /api/asistencias
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'curso_id' => 'required|exists:cursos,id',
            'fecha' => 'required|date|before_or_equal:today',
            'registros' => 'required|array|min:1',
            'registros.*.estudiante_id' => 'required|exists:usuarios,id',
            'registros.*.estado' => 'required|in:presente,ausente,tardanza'
        ], [
            'fecha.before_or_equal' => 'La fecha no puede ser futura',
            'registros.required' => 'Debe proporcionar al menos un registro de asistencia',
            'registros.*.estado.in' => 'El estado debe ser: presente, ausente o tardanza'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $resultado = $this->asistenciaService->registrarAsistenciaMasiva($request->all());

        $statusCode = $resultado['success'] ? 201 : 400;

        return response()->json($resultado, $statusCode);
    }

    /**
     * Actualiza un registro de asistencia individual
     * PUT /api/asistencias/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'estado' => 'required|in:presente,ausente,tardanza'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $resultado = $this->asistenciaService->actualizarAsistencia($id, $request->estado);

        $statusCode = $resultado['success'] ? 200 : 400;

        return response()->json($resultado, $statusCode);
    }

    /**
     * Lista asistencias con filtros
     * GET /api/asistencias
     */
    public function index(Request $request): JsonResponse
    {
        $query = \App\Models\Asistencia::query()->with(['estudiante:id,name,email', 'curso:id,nombre,codigo']);

        // Filtros
        if ($request->has('estudiante_id')) {
            $query->where('estudiante_id', $request->estudiante_id);
        }

        if ($request->has('curso_id')) {
            $query->where('curso_id', $request->curso_id);
        }

        if ($request->has('fecha')) {
            $query->whereDate('fecha', $request->fecha);
        }

        if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
            $query->whereBetween('fecha', [$request->fecha_inicio, $request->fecha_fin]);
        }

        if ($request->has('estado')) {
            $query->where('estado', $request->estado);
        }

        // Ordenar por fecha descendente
        $query->orderBy('fecha', 'desc');

        // Paginación
        $perPage = $request->get('per_page', 15);
        $asistencias = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $asistencias
        ]);
    }

    /**
     * Obtiene el resumen de asistencia de un estudiante en un curso
     * GET /api/asistencias/resumen
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

        $resumen = $this->asistenciaService->obtenerResumenAsistencia(
            $request->estudiante_id,
            $request->curso_id
        );

        return response()->json([
            'success' => true,
            'data' => $resumen
        ]);
    }

    /**
     * Obtiene las asistencias de un curso en una fecha específica
     * GET /api/asistencias/curso/{cursoId}/fecha/{fecha}
     */
    public function porCursoYFecha(int $cursoId, string $fecha): JsonResponse
    {
        $resultado = $this->asistenciaService->obtenerAsistenciasCurso($cursoId, $fecha);

        return response()->json($resultado);
    }

    /**
     * Obtiene las asistencias del estudiante autenticado
     * GET /api/asistencias/estudiante
     */
    public function misAsistencias(Request $request): JsonResponse
    {
        $user = $request->attributes->get('user');
        $estudianteId = $user->usuario_id ?? $user->id;

        // Obtener filtros opcionales
        $cursoId = $request->get('curso_id');
        $fechaInicio = $request->get('fecha_inicio');
        $fechaFin = $request->get('fecha_fin');

        // Obtener asistencias del estudiante
        $resultado = $this->asistenciaService->obtenerAsistenciasEstudiante(
            $estudianteId,
            $cursoId,
            $fechaInicio,
            $fechaFin
        );

        // Si se solicita con cursos, agregar resumen por curso
        if ($request->get('con_resumen') === 'true') {
            $cursos = \App\Models\Curso::whereHas('estudiantes', function ($query) use ($estudianteId) {
                $query->where('estudiante_id', $estudianteId);
            })->get();

            $resumenes = [];
            foreach ($cursos as $curso) {
                $resumen = $this->asistenciaService->obtenerResumenAsistencia($estudianteId, $curso->id);
                $resumenes[] = [
                    'curso_id' => $curso->id,
                    'curso_nombre' => $curso->nombre,
                    'curso_codigo' => $curso->codigo,
                    'resumen' => $resumen
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $resultado,
                'resumenes' => $resumenes
            ]);
        }

        return response()->json($resultado);
    }
}
