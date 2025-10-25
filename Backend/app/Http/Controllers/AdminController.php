<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\Grado;
use App\Models\Seccion;
use App\Models\Curso;

class AdminController extends Controller
{
    /**
     * Listar todos los grados
     * GET /api/admin/grados
     */
    public function listarGrados(): JsonResponse
    {
        try {
            $result = DB::select('SELECT listar_grados()')[0]->listar_grados;
            $data = json_decode($result, true);

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al listar grados: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear un nuevo grado
     * POST /api/admin/grados
     */
    public function crearGrado(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nivel' => 'required|in:primaria,secundaria',
            'numero' => 'required|integer',
            'nombre' => 'required|string|max:255'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $result = DB::select('SELECT crear_grado(?, ?, ?)', [
                $request->nivel,
                $request->numero,
                $request->nombre
            ])[0]->crear_grado;

            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data, 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear grado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar secciones de un grado
     * GET /api/admin/grados/{gradoId}/secciones
     */
    public function listarSecciones($gradoId): JsonResponse
    {
        try {
            $result = DB::select('SELECT listar_secciones_grado(?)', [$gradoId])[0]->listar_secciones_grado;
            $data = json_decode($result, true);

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al listar secciones: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear una nueva sección
     * POST /api/admin/grados/{gradoId}/secciones
     */
    public function crearSeccion(Request $request, $gradoId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:10',
            'capacidad' => 'integer|min:1|max:50'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $result = DB::select('SELECT crear_seccion(?, ?, ?)', [
                $gradoId,
                $request->nombre,
                $request->capacidad ?? 30
            ])[0]->crear_seccion;

            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data, 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear sección: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar todos los estudiantes
     * GET /api/admin/estudiantes
     */
    public function listarEstudiantes(): JsonResponse
    {
        try {
            $result = DB::select('SELECT listar_todos_estudiantes()')[0]->listar_todos_estudiantes;
            $data = json_decode($result, true);

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al listar estudiantes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar estudiantes de una sección
     * GET /api/admin/secciones/{seccionId}/estudiantes
     */
    public function listarEstudiantesSeccion($seccionId): JsonResponse
    {
        try {
            $result = DB::select('SELECT listar_estudiantes_seccion(?)', [$seccionId])[0]->listar_estudiantes_seccion;
            $data = json_decode($result, true);

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al listar estudiantes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Asignar estudiantes a una sección
     * POST /api/admin/secciones/{seccionId}/asignar-estudiantes
     */
    public function asignarEstudiantesSeccion(Request $request, $seccionId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'estudiantes_ids' => 'required|array|min:1',
            'estudiantes_ids.*' => 'integer'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $estudiantesIds = '{' . implode(',', $request->estudiantes_ids) . '}';
            $result = DB::select('SELECT asignar_estudiantes_seccion(?, ?)', [
                $seccionId,
                $estudiantesIds
            ])[0]->asignar_estudiantes_seccion;

            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al asignar estudiantes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar estudiantes disponibles (sin asignar)
     * GET /api/admin/estudiantes/disponibles
     */
    public function listarEstudiantesDisponibles(): JsonResponse
    {
        try {
            $result = DB::select('SELECT listar_estudiantes_disponibles()')[0]->listar_estudiantes_disponibles;
            $data = json_decode($result, true);

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al listar estudiantes disponibles: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Asignar estudiante a un curso
     * POST /api/admin/cursos/{cursoId}/estudiantes
     */
    public function asignarEstudiante(Request $request, $cursoId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'estudiante_id' => 'required|exists:usuarios,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Verificar que el usuario sea estudiante
            $estudiante = DB::table('usuarios')
                ->where('id', $request->estudiante_id)
                ->where('role', 'estudiante')
                ->first();

            if (!$estudiante) {
                return response()->json([
                    'success' => false,
                    'message' => 'El usuario no es un estudiante'
                ], 400);
            }

            // Verificar si ya está asignado
            $existe = DB::table('estudiantes_cursos')
                ->where('estudiante_id', $request->estudiante_id)
                ->where('curso_id', $cursoId)
                ->where('anio_academico', date('Y'))
                ->exists();

            if ($existe) {
                return response()->json([
                    'success' => false,
                    'message' => 'El estudiante ya está asignado a este curso'
                ], 400);
            }

            // Asignar estudiante
            DB::table('estudiantes_cursos')->insert([
                'estudiante_id' => $request->estudiante_id,
                'curso_id' => $cursoId,
                'fecha_matricula' => now(),
                'anio_academico' => date('Y'),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Estudiante asignado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al asignar estudiante: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar todos los docentes
     * GET /api/admin/docentes
     */
    public function listarDocentes(): JsonResponse
    {
        try {
            $docentes = DB::table('usuarios')
                ->where('role', 'docente')
                ->select('id', 'name', 'email', 'dni')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $docentes
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al listar docentes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar catálogo de cursos
     * GET /api/admin/catalogo-cursos
     */
    public function listarCatalogoCursos(Request $request): JsonResponse
    {
        try {
            $nivel = $request->query('nivel');
            $result = DB::select('SELECT listar_catalogo_cursos(?)', [$nivel])[0]->listar_catalogo_cursos;
            $data = json_decode($result, true);

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al listar catálogo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear curso en el catálogo
     * POST /api/admin/catalogo-cursos
     */
    public function crearCursoCatalogo(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:100',
            'codigo' => 'required|string|max:20',
            'nivel' => 'required|in:primaria,secundaria,ambos',
            'descripcion' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $result = DB::select('SELECT crear_curso_catalogo(?, ?, ?, ?)', [
                $request->nombre,
                $request->codigo,
                $request->nivel,
                $request->descripcion
            ])[0]->crear_curso_catalogo;

            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data, 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear curso: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar curso del catálogo
     * PUT /api/admin/catalogo-cursos/{id}
     */
    public function actualizarCursoCatalogo(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'sometimes|string|max:100',
            'codigo' => 'sometimes|string|max:20',
            'nivel' => 'sometimes|in:primaria,secundaria,ambos',
            'descripcion' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $result = DB::select('SELECT actualizar_curso_catalogo(?, ?, ?, ?, ?)', [
                $id,
                $request->nombre,
                $request->codigo,
                $request->nivel,
                $request->descripcion
            ])[0]->actualizar_curso_catalogo;

            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar curso: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar curso del catálogo
     * DELETE /api/admin/catalogo-cursos/{id}
     */
    public function eliminarCursoCatalogo($id): JsonResponse
    {
        try {
            $result = DB::select('SELECT eliminar_curso_catalogo(?)', [$id])[0]->eliminar_curso_catalogo;
            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar curso: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Asignar cursos a una sección
     * POST /api/admin/secciones/{seccionId}/asignar-cursos
     */
    public function asignarCursosSeccion(Request $request, $seccionId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'docente_id' => 'required|integer',
            'cursos_catalogo_ids' => 'required|array|min:1',
            'cursos_catalogo_ids.*' => 'integer'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $cursosIds = '{' . implode(',', $request->cursos_catalogo_ids) . '}';
            $result = DB::select('SELECT asignar_cursos_seccion(?, ?, ?)', [
                $seccionId,
                $request->docente_id,
                $cursosIds
            ])[0]->asignar_cursos_seccion;

            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data, 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al asignar cursos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar cursos de una sección
     * GET /api/admin/secciones/{seccionId}/cursos-asignados
     */
    public function listarCursosSeccion($seccionId): JsonResponse
    {
        try {
            $result = DB::select('SELECT listar_cursos_seccion(?)', [$seccionId])[0]->listar_cursos_seccion;
            $data = json_decode($result, true);

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al listar cursos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Desasignar un curso de una sección
     * DELETE /api/admin/cursos-asignados/{cursoId}
     */
    public function desasignarCursoSeccion($cursoId): JsonResponse
    {
        try {
            $result = DB::select('SELECT desasignar_curso_seccion(?)', [$cursoId])[0]->desasignar_curso_seccion;
            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al desasignar curso: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar docente de un curso
     * PUT /api/admin/cursos-asignados/{cursoId}/docente
     */
    public function actualizarDocenteCurso(Request $request, $cursoId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'docente_id' => 'required|integer'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $result = DB::select('SELECT actualizar_docente_curso(?, ?)', [
                $cursoId,
                $request->docente_id
            ])[0]->actualizar_docente_curso;

            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar docente: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener el docente asignado a una sección (para primaria)
     * GET /api/admin/secciones/{seccionId}/docente
     */
    public function obtenerDocenteSeccion($seccionId): JsonResponse
    {
        try {
            $result = DB::select('SELECT obtener_docente_seccion(?)', [$seccionId])[0]->obtener_docente_seccion;
            $data = json_decode($result, true);

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener docente: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar un curso
     * PUT /api/admin/cursos/{id}
     */
    public function actualizarCurso(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'sometimes|string|max:255',
            'codigo' => 'sometimes|string|max:50',
            'docente_id' => 'sometimes|integer',
            'grado_id' => 'sometimes|integer',
            'seccion_id' => 'sometimes|integer'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $result = DB::select('SELECT actualizar_curso(?, ?, ?, ?, ?, ?)', [
                $id,
                $request->nombre,
                $request->codigo,
                $request->docente_id,
                $request->grado_id,
                $request->seccion_id
            ])[0]->actualizar_curso;

            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar curso: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar un curso
     * DELETE /api/admin/cursos/{id}
     */
    public function eliminarCurso($id): JsonResponse
    {
        try {
            $result = DB::select('SELECT eliminar_curso(?)', [$id])[0]->eliminar_curso;
            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar curso: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar un grado
     * PUT /api/admin/grados/{id}
     */
    public function actualizarGrado(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nivel' => 'sometimes|in:primaria,secundaria',
            'numero' => 'sometimes|integer',
            'nombre' => 'sometimes|string|max:255'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $result = DB::select('SELECT actualizar_grado(?, ?, ?, ?)', [
                $id,
                $request->nivel,
                $request->numero,
                $request->nombre
            ])[0]->actualizar_grado;

            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar grado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar un grado
     * DELETE /api/admin/grados/{id}
     */
    public function eliminarGrado($id): JsonResponse
    {
        try {
            $result = DB::select('SELECT eliminar_grado(?)', [$id])[0]->eliminar_grado;
            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar grado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar una sección
     * PUT /api/admin/secciones/{id}
     */
    public function actualizarSeccion(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'sometimes|string|max:10',
            'capacidad' => 'sometimes|integer|min:1|max:50'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $result = DB::select('SELECT actualizar_seccion(?, ?, ?)', [
                $id,
                $request->nombre,
                $request->capacidad
            ])[0]->actualizar_seccion;

            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar sección: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar una sección
     * DELETE /api/admin/secciones/{id}
     */
    public function eliminarSeccion($id): JsonResponse
    {
        try {
            $result = DB::select('SELECT eliminar_seccion(?)', [$id])[0]->eliminar_seccion;
            $data = json_decode($result, true);

            if (!$data['success']) {
                return response()->json($data, 400);
            }

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar sección: ' . $e->getMessage()
            ], 500);
        }
    }
}
