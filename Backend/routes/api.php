<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AsistenciaController;
use App\Http\Controllers\NotaController;
use App\Http\Controllers\PadreController;
use App\Http\Controllers\DocenteController;
use App\Http\Controllers\AnalisisController;
use App\Http\Controllers\PerfilController;
use App\Http\Controllers\EvaluacionController;
use App\Http\Controllers\NotaDetalleController;
use App\Http\Controllers\PromedioController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Rutas públicas (sin autenticación)
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:200,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:200,1');
});

// Rutas protegidas (requieren autenticación y rate limiting)
Route::middleware(['auth.token', 'throttle:500,1'])->group(function () {
    
    // Autenticación
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });

    // Perfil de usuario (todos los roles autenticados)
    Route::prefix('perfil')->group(function () {
        Route::get('/', [PerfilController::class, 'show']);
        Route::put('/', [PerfilController::class, 'update']);
        Route::post('/cambiar-password', [PerfilController::class, 'cambiarPassword']);
    });

    // Docentes - Endpoints específicos
    Route::middleware(['role:docente'])->group(function () {
        Route::get('/docente/cursos', [DocenteController::class, 'misCursos']);
        Route::get('/docente/dashboard', [DocenteController::class, 'dashboard']);
        Route::get('/cursos/{cursoId}/estudiantes', [DocenteController::class, 'estudiantesCurso']);
    });

    // Asistencias - Solo docentes pueden registrar
    Route::middleware(['role:docente'])->group(function () {
        Route::post('/asistencias', [AsistenciaController::class, 'store']);
        Route::put('/asistencias/{id}', [AsistenciaController::class, 'update']);
    });

    // Asistencias - Consultas (docentes y estudiantes)
    Route::middleware(['role:docente,estudiante,padre'])->group(function () {
        Route::get('/asistencias', [AsistenciaController::class, 'index']);
        Route::get('/asistencias/resumen', [AsistenciaController::class, 'resumen']);
        Route::get('/asistencias/curso/{cursoId}/resumen', [AsistenciaController::class, 'resumenCurso']);
        Route::get('/asistencias/curso/{cursoId}/fecha/{fecha}', [AsistenciaController::class, 'porCursoYFecha']);
    });

    // Asistencias - Endpoint específico para estudiantes
    Route::middleware(['role:estudiante'])->group(function () {
        Route::get('/asistencias/estudiante', [AsistenciaController::class, 'misAsistencias']);
    });

    // Notas - Solo docentes pueden registrar
    Route::middleware(['role:docente'])->group(function () {
        Route::post('/notas', [NotaController::class, 'store']);
        Route::put('/notas/{id}', [NotaController::class, 'update']);
    });

    // Notas - Consultas (docentes y estudiantes)
    Route::middleware(['role:docente,estudiante,padre'])->group(function () {
        Route::get('/notas', [NotaController::class, 'index']);
        Route::get('/notas/resumen', [NotaController::class, 'resumen']);
        Route::get('/notas/curso/{cursoId}/unidad/{unidad}', [NotaController::class, 'porCursoYUnidad']);
    });

    // Notas - Endpoint específico para estudiantes
    Route::middleware(['role:estudiante'])->group(function () {
        Route::get('/notas/estudiante', [NotaController::class, 'misNotas']);
        Route::get('/notas/estudiante/detalladas', [NotaController::class, 'misNotasDetalladas']);
    });

    // Evaluaciones - Solo docentes pueden gestionar
    Route::middleware(['role:docente'])->group(function () {
        Route::post('/evaluaciones', [EvaluacionController::class, 'store']);
        Route::put('/evaluaciones/{id}', [EvaluacionController::class, 'update']);
        Route::delete('/evaluaciones/{id}', [EvaluacionController::class, 'destroy']);
        Route::put('/evaluaciones/reordenar', [EvaluacionController::class, 'reordenar']);
    });

    // Evaluaciones - Consultas (docentes y estudiantes)
    Route::middleware(['role:docente,estudiante,padre'])->group(function () {
        Route::get('/evaluaciones/{id}', [EvaluacionController::class, 'show']);
        Route::get('/evaluaciones/curso/{cursoId}', [EvaluacionController::class, 'getByCurso']);
        Route::get('/evaluaciones/curso/{cursoId}/mes/{mes}', [EvaluacionController::class, 'getByCursoMes']);
    });

    // Notas Detalle - Solo docentes pueden registrar
    Route::middleware(['role:docente'])->group(function () {
        Route::post('/notas-detalle', [NotaDetalleController::class, 'store']);
        Route::post('/notas-detalle/bulk', [NotaDetalleController::class, 'storeBulk']);
        Route::put('/notas-detalle/{id}', [NotaDetalleController::class, 'update']);
        Route::delete('/notas-detalle/{id}', [NotaDetalleController::class, 'destroy']);
    });

    // Notas Detalle - Consultas (docentes y estudiantes)
    Route::middleware(['role:docente,estudiante,padre'])->group(function () {
        Route::get('/notas-detalle/{id}', [NotaDetalleController::class, 'show']);
        Route::get('/notas-detalle/evaluacion/{evaluacionId}', [NotaDetalleController::class, 'getByEvaluacion']);
        Route::get('/notas-detalle/estudiante/{estudianteId}/curso/{cursoId}/unidad/{unidad}', [NotaDetalleController::class, 'getByEstudianteCursoUnidad']);
    });

    // Promedios - Consultas (docentes y estudiantes)
    Route::middleware(['role:docente,estudiante,padre'])->group(function () {
        Route::get('/promedios/estudiante/{estudianteId}/curso/{cursoId}', [PromedioController::class, 'getByEstudianteCurso']);
        Route::get('/promedios/estudiante/{estudianteId}/curso/{cursoId}/unidad/{unidad}', [PromedioController::class, 'getByEstudianteCursoUnidad']);
        Route::get('/promedios/curso/{cursoId}/unidad/{unidad}', [PromedioController::class, 'getByCursoUnidad']);
        Route::get('/promedios/ranking/curso/{cursoId}/unidad/{unidad}', [PromedioController::class, 'getRanking']);
        Route::get('/promedios/estadisticas/curso/{cursoId}', [PromedioController::class, 'getEstadisticasCurso']);
    });

    // Promedios - Recalcular (solo docentes)
    Route::middleware(['role:docente'])->group(function () {
        Route::post('/promedios/recalcular', [PromedioController::class, 'recalcular']);
    });

    // Padres - Endpoints específicos
    Route::middleware(['role:padre'])->group(function () {
        Route::get('/hijos', [PadreController::class, 'hijos']);
        Route::get('/asistencias/hijo/{id}', [PadreController::class, 'asistenciasHijo']);
        Route::get('/notas/hijo/{id}', [PadreController::class, 'notasHijo']);
        Route::get('/hijo/{id}/resumen', [PadreController::class, 'resumenHijo']);
    });

    // Análisis - Solo docentes y administradores
    Route::middleware(['role:docente,admin'])->group(function () {
        Route::get('/analisis/rendimiento', [AnalisisController::class, 'rendimiento']);
        Route::get('/analisis/curso/{id}', [AnalisisController::class, 'rendimientoCurso']);
        Route::get('/analisis/estudiante/{id}', [AnalisisController::class, 'evolucionEstudiante']);
        Route::get('/analisis/estadisticas', [AnalisisController::class, 'estadisticasGenerales']);
        Route::get('/analisis/ranking/curso/{id}', [AnalisisController::class, 'rankingCurso']);
        Route::get('/analisis/comparativa', [AnalisisController::class, 'comparativaCursos']);
    });

    // Administración - Solo administradores
    Route::middleware(['role:admin'])->prefix('admin')->group(function () {
        // Grados
        Route::get('/grados', [App\Http\Controllers\AdminController::class, 'listarGrados']);
        Route::post('/grados', [App\Http\Controllers\AdminController::class, 'crearGrado']);
        Route::put('/grados/{id}', [App\Http\Controllers\AdminController::class, 'actualizarGrado']);
        Route::delete('/grados/{id}', [App\Http\Controllers\AdminController::class, 'eliminarGrado']);
        
        // Secciones
        Route::get('/grados/{gradoId}/secciones', [App\Http\Controllers\AdminController::class, 'listarSecciones']);
        Route::post('/grados/{gradoId}/secciones', [App\Http\Controllers\AdminController::class, 'crearSeccion']);
        Route::put('/secciones/{id}', [App\Http\Controllers\AdminController::class, 'actualizarSeccion']);
        Route::delete('/secciones/{id}', [App\Http\Controllers\AdminController::class, 'eliminarSeccion']);
        
        // Asignación de estudiantes
        Route::post('/cursos/{cursoId}/estudiantes', [App\Http\Controllers\AdminController::class, 'asignarEstudiante']);
        
        // Listados
        Route::get('/estudiantes', [App\Http\Controllers\AdminController::class, 'listarEstudiantes']);
        Route::get('/estudiantes/disponibles', [App\Http\Controllers\AdminController::class, 'listarEstudiantesDisponibles']);
        Route::get('/docentes', [App\Http\Controllers\AdminController::class, 'listarDocentes']);
        
        // Asignación de estudiantes a secciones
        Route::get('/secciones/{seccionId}/estudiantes', [App\Http\Controllers\AdminController::class, 'listarEstudiantesSeccion']);
        Route::post('/secciones/{seccionId}/asignar-estudiantes', [App\Http\Controllers\AdminController::class, 'asignarEstudiantesSeccion']);
        
        // Catálogo de cursos - CRUD
        Route::get('/catalogo-cursos', [App\Http\Controllers\AdminController::class, 'listarCatalogoCursos']);
        Route::post('/catalogo-cursos', [App\Http\Controllers\AdminController::class, 'crearCursoCatalogo']);
        Route::put('/catalogo-cursos/{id}', [App\Http\Controllers\AdminController::class, 'actualizarCursoCatalogo']);
        Route::delete('/catalogo-cursos/{id}', [App\Http\Controllers\AdminController::class, 'eliminarCursoCatalogo']);
        
        // Asignación de cursos a secciones
        Route::post('/secciones/{seccionId}/asignar-cursos', [App\Http\Controllers\AdminController::class, 'asignarCursosSeccion']);
        Route::get('/secciones/{seccionId}/cursos-asignados', [App\Http\Controllers\AdminController::class, 'listarCursosSeccion']);
        Route::delete('/cursos-asignados/{cursoId}', [App\Http\Controllers\AdminController::class, 'desasignarCursoSeccion']);
        Route::put('/cursos-asignados/{cursoId}/docente', [App\Http\Controllers\AdminController::class, 'actualizarDocenteCurso']);
    });
});

// Health check
Route::get('/health', function () {
    $status = 'healthy';
    $checks = [];

    // Verificar PostgreSQL OLTP
    try {
        DB::connection('pgsql')->getPdo();
        $checks['database_oltp'] = 'ok';
    } catch (\Exception $e) {
        $checks['database_oltp'] = 'down';
        $status = 'unhealthy';
    }

    // Verificar PostgreSQL OLAP
    try {
        DB::connection('pgsql_olap')->getPdo();
        $checks['database_olap'] = 'ok';
    } catch (\Exception $e) {
        $checks['database_olap'] = 'down';
        $status = 'unhealthy';
    }

    // Verificar Redis
    try {
        Cache::store('redis')->get('health_check');
        $checks['redis'] = 'ok';
    } catch (\Exception $e) {
        $checks['redis'] = 'down';
        $status = 'unhealthy';
    }

    $statusCode = $status === 'healthy' ? 200 : 503;

    return response()->json([
        'status' => $status,
        'timestamp' => now()->toIso8601String(),
        'service' => 'Academic Management API',
        'version' => '1.0.0',
        'checks' => $checks
    ], $statusCode);
});
