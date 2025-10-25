<?php

namespace App\Http\Controllers;

use App\Services\AsistenciaService;
use App\Services\NotaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PadreController extends Controller
{
    protected AsistenciaService $asistenciaService;
    protected NotaService $notaService;

    public function __construct(AsistenciaService $asistenciaService, NotaService $notaService)
    {
        $this->asistenciaService = $asistenciaService;
        $this->notaService = $notaService;
    }

    /**
     * Obtiene la lista de hijos vinculados al padre autenticado
     * GET /api/hijos
     */
    public function hijos(Request $request): JsonResponse
    {
        $user = $request->attributes->get('user');
        $padreId = $user->usuario_id ?? $user->id;

        // Obtener hijos del padre desde la tabla padres_estudiantes
        $hijos = DB::table('padres_estudiantes')
            ->join('usuarios', 'padres_estudiantes.estudiante_id', '=', 'usuarios.id')
            ->where('padres_estudiantes.padre_id', $padreId)
            ->select(
                'usuarios.id',
                'usuarios.name',
                'usuarios.email',
                'usuarios.avatar',
                'padres_estudiantes.created_at as fecha_vinculacion'
            )
            ->get();

        return response()->json([
            'success' => true,
            'data' => $hijos
        ]);
    }

    /**
     * Obtiene las asistencias de un hijo
     * GET /api/asistencias/hijo/{id}
     */
    public function asistenciasHijo(Request $request, int $hijoId): JsonResponse
    {
        $user = $request->attributes->get('user');
        $padreId = $user->usuario_id ?? $user->id;

        // Verificar que existe la relación padre-hijo
        $relacionExiste = DB::table('padres_estudiantes')
            ->where('padre_id', $padreId)
            ->where('estudiante_id', $hijoId)
            ->exists();

        if (!$relacionExiste) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene permisos para ver la información de este estudiante'
            ], 403);
        }

        // Obtener filtros opcionales
        $cursoId = $request->get('curso_id');
        $fechaInicio = $request->get('fecha_inicio');
        $fechaFin = $request->get('fecha_fin');

        // Obtener asistencias del hijo
        $resultado = $this->asistenciaService->obtenerAsistenciasEstudiante(
            $hijoId,
            $cursoId,
            $fechaInicio,
            $fechaFin
        );

        // Si se solicita con resumen, agregar resumen por curso
        if ($request->get('con_resumen') === 'true') {
            $cursos = \App\Models\Curso::whereHas('estudiantes', function ($query) use ($hijoId) {
                $query->where('estudiante_id', $hijoId);
            })->get();

            $resumenes = [];
            foreach ($cursos as $curso) {
                $resumen = $this->asistenciaService->obtenerResumenAsistencia($hijoId, $curso->id);
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

    /**
     * Obtiene las notas de un hijo
     * GET /api/notas/hijo/{id}
     */
    public function notasHijo(Request $request, int $hijoId): JsonResponse
    {
        $user = $request->attributes->get('user');
        $padreId = $user->usuario_id ?? $user->id;

        // Verificar que existe la relación padre-hijo
        $relacionExiste = DB::table('padres_estudiantes')
            ->where('padre_id', $padreId)
            ->where('estudiante_id', $hijoId)
            ->exists();

        if (!$relacionExiste) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene permisos para ver la información de este estudiante'
            ], 403);
        }

        // Obtener filtros opcionales
        $cursoId = $request->get('curso_id');
        $unidad = $request->get('unidad');

        // Obtener notas del hijo
        $resultado = $this->notaService->obtenerNotasEstudiante(
            $hijoId,
            $cursoId,
            $unidad
        );

        // Si se solicita con resumen, agregar resumen por curso
        if ($request->get('con_resumen') === 'true') {
            $cursos = \App\Models\Curso::whereHas('estudiantes', function ($query) use ($hijoId) {
                $query->where('estudiante_id', $hijoId);
            })->get();

            $resumenes = [];
            foreach ($cursos as $curso) {
                $resumen = $this->notaService->obtenerResumenNotas($hijoId, $curso->id);
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

    /**
     * Obtiene el resumen completo de un hijo (asistencias y notas)
     * GET /api/hijo/{id}/resumen
     */
    public function resumenHijo(Request $request, int $hijoId): JsonResponse
    {
        $user = $request->attributes->get('user');
        $padreId = $user->usuario_id ?? $user->id;

        // Verificar que existe la relación padre-hijo
        $relacionExiste = DB::table('padres_estudiantes')
            ->where('padre_id', $padreId)
            ->where('estudiante_id', $hijoId)
            ->exists();

        if (!$relacionExiste) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene permisos para ver la información de este estudiante'
            ], 403);
        }

        // Obtener información del hijo
        $hijo = DB::table('usuarios')
            ->where('id', $hijoId)
            ->select('id', 'name', 'email', 'avatar')
            ->first();

        // Obtener cursos del hijo
        $cursos = \App\Models\Curso::whereHas('estudiantes', function ($query) use ($hijoId) {
            $query->where('estudiante_id', $hijoId);
        })->get();

        $resumenCursos = [];
        foreach ($cursos as $curso) {
            $resumenAsistencia = $this->asistenciaService->obtenerResumenAsistencia($hijoId, $curso->id);
            $resumenNotas = $this->notaService->obtenerResumenNotas($hijoId, $curso->id);

            $resumenCursos[] = [
                'curso_id' => $curso->id,
                'curso_nombre' => $curso->nombre,
                'curso_codigo' => $curso->codigo,
                'asistencia' => $resumenAsistencia,
                'notas' => $resumenNotas
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'hijo' => $hijo,
                'cursos' => $resumenCursos
            ]
        ]);
    }
}
