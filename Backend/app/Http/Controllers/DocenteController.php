<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DocenteController extends Controller
{
    /**
     * Obtiene los cursos asignados al docente autenticado
     * GET /api/docente/cursos
     */
    public function misCursos(Request $request): JsonResponse
    {
        try {
            $user = $request->attributes->get('user');
            $docenteId = $user->usuario_id ?? $user->id ?? null;
            
            if (!$docenteId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no válido en el request'
                ], 500);
            }

            $cursos = DB::table('cursos as c')
                ->join('cursos_catalogo as cc', 'c.curso_catalogo_id', '=', 'cc.id')
                ->join('secciones as s', 'c.seccion_id', '=', 's.id')
                ->join('grados as g', 's.grado_id', '=', 'g.id')
                ->where('c.docente_id', $docenteId)
                ->select(
                    'c.id',
                    'cc.nombre as nombre',
                    'cc.codigo as codigo',
                    'g.nombre as grado',
                    's.nombre as seccion',
                    'cc.descripcion'
                )
                ->orderBy('g.nombre')
                ->orderBy('s.nombre')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $cursos
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener cursos: ' . $e->getMessage()
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
            $estudiantes = DB::table('estudiantes_cursos as ec')
                ->join('usuarios as u', 'ec.estudiante_id', '=', 'u.id')
                ->where('ec.curso_id', $cursoId)
                ->select(
                    'u.id',
                    'u.name',
                    'u.email',
                    'u.dni'
                )
                ->orderBy('u.name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $estudiantes
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estudiantes: ' . $e->getMessage()
            ], 500);
        }
    }
}
