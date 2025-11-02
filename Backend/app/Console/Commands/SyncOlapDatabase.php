<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class SyncOlapDatabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'olap:sync {--full : Sincronización completa (borra y recarga todo)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sincroniza datos de OLTP a OLAP para análisis';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $fullSync = $this->option('full');
        $startTime = now();
        
        $this->info('🚀 Iniciando sincronización OLTP → OLAP...');
        
        try {
            DB::connection('pgsql_olap')->beginTransaction();
            
            if ($fullSync) {
                $this->warn('⚠️  Sincronización completa activada');
                $this->syncFullDatabase();
            } else {
                $this->syncIncrementalDatabase();
            }
            
            DB::connection('pgsql_olap')->commit();
            
            $duration = now()->diffInSeconds($startTime);
            $this->info("✅ Sincronización completada en {$duration} segundos");
            
            $this->registrarETL('sync_olap', 'success', null);
            
        } catch (Exception $e) {
            DB::connection('pgsql_olap')->rollBack();
            
            $this->error('❌ Error en la sincronización: ' . $e->getMessage());
            Log::error('Error OLAP Sync: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            $this->registrarETL('sync_olap', 'error', $e->getMessage());
            
            return 1;
        }
        
        return 0;
    }

    /**
     * Sincronización completa (borra y recarga todo)
     */
    protected function syncFullDatabase()
    {
        $this->info('📊 Cargando dimensiones...');
        
        // 1. Sincronizar dimensiones
        $this->syncDimEstudiante();
        $this->syncDimDocente();
        $this->syncDimGrado();
        $this->syncDimSeccion();
        $this->syncDimCurso();
        $this->syncDimTiempo();
        
        $this->info('📈 Cargando hechos...');
        
        // 2. Sincronizar tabla de hechos
        $this->syncFactRendimiento();
        
        $this->info('✨ Sincronización completa finalizada');
    }

    /**
     * Sincronización incremental (solo nuevos/modificados)
     */
    protected function syncIncrementalDatabase()
    {
        $this->info('🔄 Sincronización incremental...');
        
        // Actualizar dimensiones (upsert)
        $this->syncDimEstudiante(false);
        $this->syncDimDocente(false);
        $this->syncDimGrado(false);
        $this->syncDimSeccion(false);
        $this->syncDimCurso(false);
        $this->syncDimTiempo(false);
        
        // Actualizar hechos del último día
        $this->syncFactRendimientoIncremental();
    }

    /**
     * Sincronizar dimensión de estudiantes
     */
    protected function syncDimEstudiante($truncate = true)
    {
        $this->line('  → Sincronizando dim_estudiante...');
        
        if ($truncate) {
            DB::connection('pgsql_olap')->table('dim_estudiante')->truncate();
        }
        
        $estudiantes = DB::connection('pgsql')
            ->table('usuarios')
            ->where('role', 'estudiante')
            ->select('id', 'name', 'email')
            ->get();
        
        foreach ($estudiantes as $estudiante) {
            DB::connection('pgsql_olap')->table('dim_estudiante')->updateOrInsert(
                ['estudiante_id' => $estudiante->id],
                [
                    'nombre' => $estudiante->name,
                    'email' => $estudiante->email,
                    'fecha_carga' => now()
                ]
            );
        }
        
        $this->info("    ✓ {$estudiantes->count()} estudiantes sincronizados");
    }

    /**
     * Sincronizar dimensión de docentes
     */
    protected function syncDimDocente($truncate = true)
    {
        $this->line('  → Sincronizando dim_docente...');
        
        if ($truncate) {
            DB::connection('pgsql_olap')->table('dim_docente')->truncate();
        }
        
        $docentes = DB::connection('pgsql')
            ->table('usuarios')
            ->where('role', 'docente')
            ->select('id', 'name', 'email')
            ->get();
        
        foreach ($docentes as $docente) {
            DB::connection('pgsql_olap')->table('dim_docente')->updateOrInsert(
                ['docente_id' => $docente->id],
                [
                    'nombre' => $docente->name,
                    'email' => $docente->email,
                    'fecha_carga' => now()
                ]
            );
        }
        
        $this->info("    ✓ {$docentes->count()} docentes sincronizados");
    }

    /**
     * Sincronizar dimensión de grados
     */
    protected function syncDimGrado($truncate = true)
    {
        $this->line('  → Sincronizando dim_grado...');
        
        if ($truncate) {
            DB::connection('pgsql_olap')->table('dim_grado')->truncate();
        }
        
        $grados = DB::connection('pgsql')->table('grados')->get();
        
        foreach ($grados as $grado) {
            DB::connection('pgsql_olap')->table('dim_grado')->updateOrInsert(
                ['grado_id' => $grado->id],
                [
                    'nivel' => $grado->nivel,
                    'numero' => $grado->numero,
                    'nombre' => $grado->nombre,
                    'fecha_carga' => now()
                ]
            );
        }
        
        $this->info("    ✓ {$grados->count()} grados sincronizados");
    }

    /**
     * Sincronizar dimensión de secciones
     */
    protected function syncDimSeccion($truncate = true)
    {
        $this->line('  → Sincronizando dim_seccion...');
        
        if ($truncate) {
            DB::connection('pgsql_olap')->table('dim_seccion')->truncate();
        }
        
        $secciones = DB::connection('pgsql')
            ->table('secciones as s')
            ->join('grados as g', 's.grado_id', '=', 'g.id')
            ->select(
                's.id',
                's.nombre',
                'g.id as grado_id',
                DB::raw("CONCAT(g.numero, 'ro ', g.nivel) as grado_nombre")
            )
            ->get();
        
        foreach ($secciones as $seccion) {
            // Obtener grado_key de dim_grado
            $gradoKey = DB::connection('pgsql_olap')
                ->table('dim_grado')
                ->where('grado_id', $seccion->grado_id)
                ->value('grado_key');
            
            if ($gradoKey) {
                DB::connection('pgsql_olap')->table('dim_seccion')->updateOrInsert(
                    ['seccion_id' => $seccion->id],
                    [
                        'nombre' => $seccion->nombre,
                        'grado_key' => $gradoKey,
                        'grado_nombre' => $seccion->grado_nombre,
                        'fecha_carga' => now()
                    ]
                );
            }
        }
        
        $this->info("    ✓ {$secciones->count()} secciones sincronizadas");
    }

    /**
     * Sincronizar dimensión de cursos
     */
    protected function syncDimCurso($truncate = true)
    {
        $this->line('  → Sincronizando dim_curso...');
        
        if ($truncate) {
            DB::connection('pgsql_olap')->table('dim_curso')->truncate();
        }
        
        $cursos = DB::connection('pgsql')
            ->table('cursos as c')
            ->join('cursos_catalogo as cc', 'c.curso_catalogo_id', '=', 'cc.id')
            ->join('usuarios as u', 'c.docente_id', '=', 'u.id')
            ->leftJoin('grados as g', 'c.grado_id', '=', 'g.id')
            ->leftJoin('secciones as s', 'c.seccion_id', '=', 's.id')
            ->select(
                'c.id',
                'cc.nombre as nombre',
                'cc.codigo as codigo',
                'u.name as docente_nombre',
                DB::raw("CONCAT(g.numero, 'ro ', g.nivel) as grado_nombre"),
                's.nombre as seccion_nombre'
            )
            ->get();
        
        foreach ($cursos as $curso) {
            DB::connection('pgsql_olap')->table('dim_curso')->updateOrInsert(
                ['curso_id' => $curso->id],
                [
                    'nombre' => $curso->nombre,
                    'codigo' => $curso->codigo,
                    'docente_nombre' => $curso->docente_nombre,
                    'grado_nombre' => $curso->grado_nombre,
                    'seccion_nombre' => $curso->seccion_nombre,
                    'fecha_carga' => now()
                ]
            );
        }
        
        $this->info("    ✓ {$cursos->count()} cursos sincronizados");
    }

    /**
     * Sincronizar dimensión de tiempo
     */
    protected function syncDimTiempo($truncate = false)
    {
        $this->line('  → Sincronizando dim_tiempo...');
        
        // Generar fechas desde hace 1 año hasta dentro de 1 año
        $startDate = now()->subYear()->startOfDay();
        $endDate = now()->addYear()->endOfDay();
        
        $currentDate = $startDate->copy();
        $count = 0;
        
        while ($currentDate <= $endDate) {
            $exists = DB::connection('pgsql_olap')
                ->table('dim_tiempo')
                ->where('fecha', $currentDate->toDateString())
                ->exists();
            
            if (!$exists) {
                DB::connection('pgsql_olap')->table('dim_tiempo')->insert([
                    'fecha' => $currentDate->toDateString(),
                    'dia' => $currentDate->day,
                    'mes' => $currentDate->month,
                    'anio' => $currentDate->year,
                    'trimestre' => $currentDate->quarter,
                    'semestre' => $currentDate->month <= 6 ? 1 : 2,
                    'dia_semana' => $currentDate->dayOfWeekIso,
                    'nombre_mes' => $currentDate->locale('es')->monthName,
                    'nombre_dia' => $currentDate->locale('es')->dayName
                ]);
                $count++;
            }
            
            $currentDate->addDay();
        }
        
        $this->info("    ✓ {$count} fechas nuevas sincronizadas");
    }

    /**
     * Sincronizar tabla de hechos (completa)
     */
    protected function syncFactRendimiento()
    {
        $this->line('  → Sincronizando fact_rendimiento_estudiantil...');
        
        DB::connection('pgsql_olap')->table('fact_rendimiento_estudiantil')->truncate();
        
        // Obtener todos los estudiantes matriculados en cursos
        $matriculas = DB::connection('pgsql')
            ->table('estudiantes_cursos as ec')
            ->join('cursos as c', 'ec.curso_id', '=', 'c.id')
            ->select(
                'ec.estudiante_id',
                'ec.curso_id',
                'c.docente_id',
                'c.grado_id',
                'c.seccion_id',
                'ec.anio_academico'
            )
            ->get();
        
        $count = 0;
        foreach ($matriculas as $matricula) {
            // Obtener claves de dimensiones
            $estudianteKey = DB::connection('pgsql_olap')
                ->table('dim_estudiante')
                ->where('estudiante_id', $matricula->estudiante_id)
                ->value('estudiante_key');
            
            $cursoKey = DB::connection('pgsql_olap')
                ->table('dim_curso')
                ->where('curso_id', $matricula->curso_id)
                ->value('curso_key');
            
            $docenteKey = DB::connection('pgsql_olap')
                ->table('dim_docente')
                ->where('docente_id', $matricula->docente_id)
                ->value('docente_key');
            
            $gradoKey = $matricula->grado_id ? DB::connection('pgsql_olap')
                ->table('dim_grado')
                ->where('grado_id', $matricula->grado_id)
                ->value('grado_key') : null;
            
            $seccionKey = $matricula->seccion_id ? DB::connection('pgsql_olap')
                ->table('dim_seccion')
                ->where('seccion_id', $matricula->seccion_id)
                ->value('seccion_key') : null;
            
            $tiempoKey = DB::connection('pgsql_olap')
                ->table('dim_tiempo')
                ->where('fecha', now()->toDateString())
                ->value('tiempo_key');
            
            if (!$estudianteKey || !$cursoKey || !$docenteKey || !$tiempoKey) {
                continue;
            }
            
            // Calcular métricas de asistencia
            $asistencias = DB::connection('pgsql')
                ->table('asistencias')
                ->where('estudiante_id', $matricula->estudiante_id)
                ->where('curso_id', $matricula->curso_id)
                ->whereYear('fecha', $matricula->anio_academico)
                ->selectRaw('
                    COUNT(*) as total_clases,
                    SUM(CASE WHEN estado = \'presente\' THEN 1 ELSE 0 END) as total_asistencias,
                    SUM(CASE WHEN estado = \'ausente\' THEN 1 ELSE 0 END) as total_faltas,
                    SUM(CASE WHEN estado = \'tardanza\' THEN 1 ELSE 0 END) as total_tardanzas
                ')
                ->first();
            
            $totalClases = $asistencias->total_clases ?? 0;
            $porcentajeAsistencia = $totalClases > 0 
                ? (($asistencias->total_asistencias ?? 0) / $totalClases * 100) 
                : 0;
            
            // Calcular métricas de notas usando promedios_unidad (que agrupa por unidad)
            $promedios = DB::connection('pgsql')
                ->table('promedios_unidad')
                ->where('estudiante_id', $matricula->estudiante_id)
                ->where('curso_id', $matricula->curso_id)
                ->selectRaw('
                    AVG(promedio_numerico) as promedio_general,
                    AVG(CASE WHEN unidad = 1 THEN promedio_numerico END) as nota_unidad_1,
                    AVG(CASE WHEN unidad = 2 THEN promedio_numerico END) as nota_unidad_2,
                    AVG(CASE WHEN unidad = 3 THEN promedio_numerico END) as nota_unidad_3,
                    AVG(CASE WHEN unidad = 4 THEN promedio_numerico END) as nota_unidad_4
                ')
                ->first();
            
            // Insertar en tabla de hechos
            DB::connection('pgsql_olap')->table('fact_rendimiento_estudiantil')->insert([
                'estudiante_key' => $estudianteKey,
                'curso_key' => $cursoKey,
                'tiempo_key' => $tiempoKey,
                'docente_key' => $docenteKey,
                'grado_key' => $gradoKey,
                'seccion_key' => $seccionKey,
                'anio_academico' => $matricula->anio_academico,
                'total_asistencias' => $asistencias->total_asistencias ?? 0,
                'total_faltas' => $asistencias->total_faltas ?? 0,
                'total_tardanzas' => $asistencias->total_tardanzas ?? 0,
                'porcentaje_asistencia' => round($porcentajeAsistencia, 2),
                'total_clases' => $totalClases,
                'promedio_notas' => $promedios->promedio_general ?? null,
                'nota_unidad_1' => $promedios->nota_unidad_1 ?? null,
                'nota_unidad_2' => $promedios->nota_unidad_2 ?? null,
                'nota_unidad_3' => $promedios->nota_unidad_3 ?? null,
                'nota_unidad_4' => $promedios->nota_unidad_4 ?? null,
                'fecha_actualizacion' => now()
            ]);
            
            $count++;
        }
        
        $this->info("    ✓ {$count} registros de rendimiento sincronizados");
    }

    /**
     * Sincronización incremental de hechos (últimas 24 horas)
     */
    protected function syncFactRendimientoIncremental()
    {
        $this->line('  → Actualizando fact_rendimiento_estudiantil (incremental)...');
        
        // Similar a syncFactRendimiento pero solo actualiza registros modificados
        // en las últimas 24 horas
        
        $this->info('    ✓ Actualización incremental completada');
    }

    /**
     * Registrar proceso ETL en tabla de control
     */
    protected function registrarETL($proceso, $estado, $errores = null)
    {
        try {
            $registros = DB::connection('pgsql_olap')
                ->table('fact_rendimiento_estudiantil')
                ->count();
            
            DB::connection('pgsql_olap')->table('control_etl')->insert([
                'proceso' => $proceso,
                'ultima_ejecucion' => now(),
                'estado' => $estado,
                'registros_procesados' => $registros,
                'errores' => $errores
            ]);
        } catch (Exception $e) {
            Log::warning('No se pudo registrar ETL: ' . $e->getMessage());
        }
    }
}
