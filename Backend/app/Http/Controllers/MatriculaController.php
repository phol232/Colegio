<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MatriculaController extends Controller
{
    /**
     * Obtiene todos los grados y secciones disponibles para matrícula
     * GET /api/matricula/opciones
     */
    public function obtenerOpciones(): JsonResponse
    {
        try {
            // Obtener todos los grados (primaria y secundaria)
            $grados = DB::table('grados')
                ->orderBy('nivel')
                ->orderBy('numero')
                ->get();

            $opciones = [];
            foreach ($grados as $grado) {
                $secciones = DB::table('secciones')
                    ->where('grado_id', $grado->id)
                    ->orderBy('nombre')
                    ->get();

                $opciones[] = [
                    'grado' => [
                        'id' => $grado->id,
                        'nombre' => $grado->nombre,
                        'numero' => $grado->numero,
                        'nivel' => $grado->nivel
                    ],
                    'secciones' => $secciones->map(function ($seccion) {
                        return [
                            'id' => $seccion->id,
                            'nombre' => $seccion->nombre,
                            'capacidad' => $seccion->capacidad
                        ];
                    })
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $opciones
            ]);

        } catch (\Exception $e) {
            \Log::error('Error al obtener opciones de matrícula: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener opciones de matrícula'
            ], 500);
        }
    }

    /**
     * Verifica si el estudiante ya está matriculado
     * GET /api/matricula/estado
     */
    public function verificarEstado(Request $request): JsonResponse
    {
        try {
            $user = $request->attributes->get('user');
            $estudianteId = $user->usuario_id ?? $user->id;

            $estudiante = DB::table('usuarios')
                ->where('id', $estudianteId)
                ->first(['grado_id', 'seccion_id']);

            // Verificar si tiene grado y sección asignados directamente
            $matriculado = !is_null($estudiante->grado_id) && !is_null($estudiante->seccion_id);

            $info = null;
            
            if ($matriculado) {
                // Tiene grado y sección en usuarios
                $grado = DB::table('grados')->where('id', $estudiante->grado_id)->first();
                $seccion = DB::table('secciones')->where('id', $estudiante->seccion_id)->first();

                $info = [
                    'grado' => $grado->nombre,
                    'seccion' => $seccion->nombre
                ];
            } else {
                // Verificar si tiene cursos asignados (asignado por admin)
                $cursosAsignados = DB::table('estudiantes_cursos')
                    ->where('estudiante_id', $estudianteId)
                    ->count();

                if ($cursosAsignados > 0) {
                    // Tiene cursos asignados, obtener grado y sección del primer curso
                    $primerCurso = DB::table('estudiantes_cursos as ec')
                        ->join('cursos as c', 'ec.curso_id', '=', 'c.id')
                        ->join('grados as g', 'c.grado_id', '=', 'g.id')
                        ->join('secciones as s', 'c.seccion_id', '=', 's.id')
                        ->where('ec.estudiante_id', $estudianteId)
                        ->select('g.nombre as grado', 's.nombre as seccion')
                        ->first();

                    if ($primerCurso) {
                        $matriculado = true;
                        $info = [
                            'grado' => $primerCurso->grado,
                            'seccion' => $primerCurso->seccion
                        ];
                    }
                }
            }

            return response()->json([
                'success' => true,
                'matriculado' => $matriculado,
                'info' => $info
            ]);

        } catch (\Exception $e) {
            \Log::error('Error al verificar estado de matrícula: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al verificar estado de matrícula'
            ], 500);
        }
    }

    /**
     * Matricula al estudiante en un grado y sección
     * POST /api/matricula
     */
    public function matricular(Request $request): JsonResponse
    {
        try {
            $user = $request->attributes->get('user');
            $estudianteId = $user->usuario_id ?? $user->id;

            // Verificar que no esté ya matriculado
            $estudiante = DB::table('usuarios')
                ->where('id', $estudianteId)
                ->first(['grado_id', 'seccion_id']);

            if (!is_null($estudiante->grado_id) || !is_null($estudiante->seccion_id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ya estás matriculado en un grado y sección'
                ], 400);
            }

            $gradoId = $request->input('grado_id');
            $seccionId = $request->input('seccion_id');

            // Verificar que el grado y sección existan
            $grado = DB::table('grados')->where('id', $gradoId)->first();
            $seccion = DB::table('secciones')->where('id', $seccionId)->where('grado_id', $gradoId)->first();

            if (!$grado || !$seccion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Grado o sección no válidos'
                ], 400);
            }

            DB::beginTransaction();

            // Actualizar el estudiante con grado y sección
            DB::table('usuarios')
                ->where('id', $estudianteId)
                ->update([
                    'grado_id' => $gradoId,
                    'seccion_id' => $seccionId,
                    'updated_at' => now()
                ]);

            // Obtener todos los cursos de ese grado y sección
            $cursos = DB::table('cursos')
                ->where('grado_id', $gradoId)
                ->where('seccion_id', $seccionId)
                ->pluck('id');

            // Asignar todos los cursos al estudiante
            foreach ($cursos as $cursoId) {
                DB::table('estudiantes_cursos')->insert([
                    'estudiante_id' => $estudianteId,
                    'curso_id' => $cursoId,
                    'fecha_matricula' => now()->toDateString(),
                    'anio_academico' => now()->year
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Matrícula realizada exitosamente',
                'data' => [
                    'grado' => $grado->nombre,
                    'seccion' => $seccion->nombre,
                    'cursos_asignados' => count($cursos)
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error al matricular estudiante: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al realizar la matrícula'
            ], 500);
        }
    }
}
