<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DocenteController extends Controller
{
    /**
     * Obtiene los cursos del docente autenticado
     * GET /api/docente/cursos
     */
    public function misCursos(Request $request): JsonResponse
    {
        try {
            $user = $request->attributes->get('user');
            $docenteId = $user->usuario_id ?? $user->id;

            $cursos = DB::table('cursos')
                ->join('cursos_catalogo', 'cursos.curso_catalogo_id', '=', 'cursos_catalogo.id')
                ->join('secciones', 'cursos.seccion_id', '=', 'secciones.id')
                ->join('grados', 'secciones.grado_id', '=', 'grados.id')
                ->where('cursos.docente_id', $docenteId)
                ->select(
                    'cursos.id',
                    'cursos_catalogo.nombre',
                    'cursos_catalogo.codigo',
                    'grados.nombre as grado',
                    'secciones.nombre as seccion',
                    'cursos.seccion_id'
                )
                ->get();

            return response()->json([
                'success' => true,
                'data' => $cursos
            ]);

        } catch (\Exception $e) {
            \Log::error('Error al obtener cursos del docente: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener cursos'
            ], 500);
        }
    }

    /**
     * Obtiene estadísticas completas del dashboard del docente
     * GET /api/docente/dashboard
     */
    public function dashboard(Request $request): JsonResponse
    {
        try {
            $user = $request->attributes->get('user');
            $docenteId = $user->usuario_id ?? $user->id;

            // Usar la función de PostgreSQL para obtener todas las estadísticas de una vez
            $estadisticas = DB::select('SELECT * FROM get_dashboard_docente(?)', [$docenteId]);

            // Obtener el total de estudiantes únicos del docente
            $totalEstudiantesUnicos = DB::table('estudiantes_cursos')
                ->join('cursos', 'estudiantes_cursos.curso_id', '=', 'cursos.id')
                ->where('cursos.docente_id', $docenteId)
                ->distinct('estudiantes_cursos.estudiante_id')
                ->count('estudiantes_cursos.estudiante_id');

            // Separar cursos y estadísticas
            $cursos = [];
            $estadisticasCursos = [];

            foreach ($estadisticas as $stat) {
                $cursos[] = [
                    'id' => $stat->curso_id,
                    'nombre' => $stat->curso_nombre,
                    'codigo' => $stat->curso_codigo,
                    'grado' => $stat->grado,
                    'seccion' => $stat->seccion,
                    'total_estudiantes' => $stat->total_estudiantes
                ];

                $estadisticasCursos[] = [
                    'curso_id' => $stat->curso_id,
                    'curso_nombre' => $stat->curso_nombre,
                    'curso_codigo' => $stat->curso_codigo,
                    'grado' => $stat->grado,
                    'seccion' => $stat->seccion,
                    'total_estudiantes' => (int) $stat->total_estudiantes,
                    'promedio_curso' => (float) $stat->promedio_curso,
                    'asistencia_promedio' => (float) $stat->asistencia_promedio,
                    'estudiantes_aprobados' => (int) $stat->estudiantes_aprobados,
                    'evaluaciones_creadas' => (int) $stat->evaluaciones_creadas
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'cursos' => $cursos,
                    'estadisticas' => $estadisticasCursos,
                    'total_estudiantes_unicos' => $totalEstudiantesUnicos
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Error al obtener dashboard del docente: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener datos del dashboard'
            ], 500);
        }
    }

    /**
     * Obtiene los estudiantes de un curso
     * GET /api/cursos/{cursoId}/estudiantes
     */
    public function estudiantesCurso(int $cursoId): JsonResponse
    {
        try {
            $estudiantes = DB::table('estudiantes_cursos')
                ->join('usuarios', 'estudiantes_cursos.estudiante_id', '=', 'usuarios.id')
                ->where('estudiantes_cursos.curso_id', $cursoId)
                ->select(
                    'usuarios.id',
                    'usuarios.name',
                    'usuarios.email'
                )
                ->get();

            return response()->json([
                'success' => true,
                'data' => $estudiantes
            ]);

        } catch (\Exception $e) {
            \Log::error('Error al obtener estudiantes del curso: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estudiantes'
            ], 500);
        }
    }
}
