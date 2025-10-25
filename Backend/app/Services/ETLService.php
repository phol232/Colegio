<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ETLService
{
    /**
     * Extrae asistencias desde la última sincronización
     */
    public function extraerAsistencias(?Carbon $desde = null): array
    {
        try {
            if (!$desde) {
                $desde = $this->obtenerUltimaSincronizacion('asistencias');
            }

            $asistencias = DB::connection('pgsql')->table('asistencias as a')
                ->join('usuarios as e', 'a.estudiante_id', '=', 'e.id')
                ->join('cursos as c', 'a.curso_id', '=', 'c.id')
                ->join('usuarios as d', 'c.docente_id', '=', 'd.id')
                ->where('a.updated_at', '>', $desde)
                ->select(
                    'a.id',
                    'a.estudiante_id',
                    'e.name as estudiante_nombre',
                    'e.email as estudiante_email',
                    'a.curso_id',
                    'c.nombre as curso_nombre',
                    'c.codigo as curso_codigo',
                    'c.docente_id',
                    'd.name as docente_nombre',
                    'd.email as docente_email',
                    'a.fecha',
                    'a.estado',
                    'a.updated_at'
                )
                ->get()
                ->toArray();

            Log::info('ETL: Asistencias extraídas', ['count' => count($asistencias), 'desde' => $desde]);

            return $asistencias;
        } catch (\Exception $e) {
            Log::error('ETL: Error al extraer asistencias', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Extrae notas desde la última sincronización
     */
    public function extraerNotas(?Carbon $desde = null): array
    {
        try {
            if (!$desde) {
                $desde = $this->obtenerUltimaSincronizacion('notas');
            }

            $notas = DB::connection('pgsql')->table('notas as n')
                ->join('usuarios as e', 'n.estudiante_id', '=', 'e.id')
                ->join('cursos as c', 'n.curso_id', '=', 'c.id')
                ->join('usuarios as d', 'c.docente_id', '=', 'd.id')
                ->where('n.updated_at', '>', $desde)
                ->select(
                    'n.id',
                    'n.estudiante_id',
                    'e.name as estudiante_nombre',
                    'e.email as estudiante_email',
                    'n.curso_id',
                    'c.nombre as curso_nombre',
                    'c.codigo as curso_codigo',
                    'c.docente_id',
                    'd.name as docente_nombre',
                    'd.email as docente_email',
                    'n.unidad',
                    'n.puntaje',
                    'n.updated_at'
                )
                ->get()
                ->toArray();

            Log::info('ETL: Notas extraídas', ['count' => count($notas), 'desde' => $desde]);

            return $notas;
        } catch (\Exception $e) {
            Log::error('ETL: Error al extraer notas', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Transforma datos a formato estrella
     */
    public function transformarAEstrella(array $datos, string $tipo): array
    {
        $transformados = [];

        foreach ($datos as $dato) {
            $dato = (array) $dato;
            
            // Obtener o crear keys de dimensiones
            $estudianteKey = $this->obtenerOCrearEstudianteKey($dato['estudiante_id'], $dato['estudiante_nombre'], $dato['estudiante_email']);
            $cursoKey = $this->obtenerOCrearCursoKey($dato['curso_id'], $dato['curso_nombre'], $dato['curso_codigo'], $dato['docente_nombre']);
            $docenteKey = $this->obtenerOCrearDocenteKey($dato['docente_id'], $dato['docente_nombre'], $dato['docente_email']);
            
            if ($tipo === 'asistencias') {
                $tiempoKey = $this->obtenerOCrearTiempoKey($dato['fecha']);
                
                $transformados[] = [
                    'estudiante_key' => $estudianteKey,
                    'curso_key' => $cursoKey,
                    'tiempo_key' => $tiempoKey,
                    'docente_key' => $docenteKey,
                    'estado' => $dato['estado'],
                    'fecha' => $dato['fecha']
                ];
            } elseif ($tipo === 'notas') {
                $transformados[] = [
                    'estudiante_key' => $estudianteKey,
                    'curso_key' => $cursoKey,
                    'docente_key' => $docenteKey,
                    'unidad' => $dato['unidad'],
                    'puntaje' => $dato['puntaje']
                ];
            }
        }

        return $transformados;
    }

    /**
     * Carga datos en OLAP
     */
    public function cargarEnOLAP(array $datos, string $tipo): int
    {
        try {
            $registrosProcesados = 0;

            if ($tipo === 'asistencias') {
                $registrosProcesados = $this->cargarAsistenciasOLAP($datos);
            } elseif ($tipo === 'notas') {
                $registrosProcesados = $this->cargarNotasOLAP($datos);
            }

            Log::info('ETL: Datos cargados en OLAP', ['tipo' => $tipo, 'registros' => $registrosProcesados]);

            return $registrosProcesados;
        } catch (\Exception $e) {
            Log::error('ETL: Error al cargar en OLAP', ['tipo' => $tipo, 'error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Carga asistencias en fact_rendimiento_estudiantil
     */
    private function cargarAsistenciasOLAP(array $asistencias): int
    {
        $registrosProcesados = 0;

        foreach ($asistencias as $asistencia) {
            // Buscar o crear registro en fact_rendimiento_estudiantil
            $fact = DB::connection('pgsql_olap')->table('fact_rendimiento_estudiantil')
                ->where('estudiante_key', $asistencia['estudiante_key'])
                ->where('curso_key', $asistencia['curso_key'])
                ->where('tiempo_key', $asistencia['tiempo_key'])
                ->first();

            if ($fact) {
                // Actualizar métricas de asistencia
                $updates = [];
                
                if ($asistencia['estado'] === 'presente') {
                    $updates['total_asistencias'] = DB::raw('total_asistencias + 1');
                } elseif ($asistencia['estado'] === 'ausente') {
                    $updates['total_faltas'] = DB::raw('total_faltas + 1');
                } elseif ($asistencia['estado'] === 'tardanza') {
                    $updates['total_tardanzas'] = DB::raw('total_tardanzas + 1');
                }
                
                $updates['total_clases'] = DB::raw('total_clases + 1');
                $updates['fecha_actualizacion'] = now();

                DB::connection('pgsql_olap')->table('fact_rendimiento_estudiantil')
                    ->where('id', $fact->id)
                    ->update($updates);

                // Recalcular porcentaje de asistencia
                $this->recalcularPorcentajeAsistencia($fact->id);
            } else {
                // Crear nuevo registro
                $nuevoFact = [
                    'estudiante_key' => $asistencia['estudiante_key'],
                    'curso_key' => $asistencia['curso_key'],
                    'tiempo_key' => $asistencia['tiempo_key'],
                    'docente_key' => $asistencia['docente_key'],
                    'total_asistencias' => $asistencia['estado'] === 'presente' ? 1 : 0,
                    'total_faltas' => $asistencia['estado'] === 'ausente' ? 1 : 0,
                    'total_tardanzas' => $asistencia['estado'] === 'tardanza' ? 1 : 0,
                    'total_clases' => 1,
                    'porcentaje_asistencia' => $asistencia['estado'] === 'presente' ? 100 : 0,
                    'fecha_actualizacion' => now()
                ];

                DB::connection('pgsql_olap')->table('fact_rendimiento_estudiantil')->insert($nuevoFact);
            }

            $registrosProcesados++;
        }

        return $registrosProcesados;
    }

    /**
     * Carga notas en fact_rendimiento_estudiantil
     */
    private function cargarNotasOLAP(array $notas): int
    {
        $registrosProcesados = 0;

        foreach ($notas as $nota) {
            // Obtener tiempo_key del mes actual
            $tiempoKey = $this->obtenerOCrearTiempoKey(now()->format('Y-m-d'));

            // Buscar o crear registro en fact_rendimiento_estudiantil
            $fact = DB::connection('pgsql_olap')->table('fact_rendimiento_estudiantil')
                ->where('estudiante_key', $nota['estudiante_key'])
                ->where('curso_key', $nota['curso_key'])
                ->where('tiempo_key', $tiempoKey)
                ->first();

            $campoNota = 'nota_unidad_' . $nota['unidad'];

            if ($fact) {
                // Actualizar nota de la unidad
                DB::connection('pgsql_olap')->table('fact_rendimiento_estudiantil')
                    ->where('id', $fact->id)
                    ->update([
                        $campoNota => $nota['puntaje'],
                        'fecha_actualizacion' => now()
                    ]);

                // Recalcular promedio de notas
                $this->recalcularPromedioNotas($fact->id);
            } else {
                // Crear nuevo registro
                $nuevoFact = [
                    'estudiante_key' => $nota['estudiante_key'],
                    'curso_key' => $nota['curso_key'],
                    'tiempo_key' => $tiempoKey,
                    'docente_key' => $nota['docente_key'],
                    $campoNota => $nota['puntaje'],
                    'total_asistencias' => 0,
                    'total_faltas' => 0,
                    'total_tardanzas' => 0,
                    'total_clases' => 0,
                    'porcentaje_asistencia' => 0,
                    'fecha_actualizacion' => now()
                ];

                DB::connection('pgsql_olap')->table('fact_rendimiento_estudiantil')->insert($nuevoFact);
                
                // Obtener el ID recién insertado y recalcular promedio
                $factId = DB::connection('pgsql_olap')->getPdo()->lastInsertId();
                $this->recalcularPromedioNotas($factId);
            }

            $registrosProcesados++;
        }

        return $registrosProcesados;
    }

    /**
     * Recalcula el porcentaje de asistencia
     */
    private function recalcularPorcentajeAsistencia(int $factId): void
    {
        $fact = DB::connection('pgsql_olap')->table('fact_rendimiento_estudiantil')
            ->where('id', $factId)
            ->first();

        if ($fact && $fact->total_clases > 0) {
            $porcentaje = ($fact->total_asistencias / $fact->total_clases) * 100;
            
            DB::connection('pgsql_olap')->table('fact_rendimiento_estudiantil')
                ->where('id', $factId)
                ->update(['porcentaje_asistencia' => round($porcentaje, 2)]);
        }
    }

    /**
     * Recalcula el promedio de notas
     */
    private function recalcularPromedioNotas(int $factId): void
    {
        $fact = DB::connection('pgsql_olap')->table('fact_rendimiento_estudiantil')
            ->where('id', $factId)
            ->first();

        if ($fact) {
            $notas = array_filter([
                $fact->nota_unidad_1,
                $fact->nota_unidad_2,
                $fact->nota_unidad_3,
                $fact->nota_unidad_4
            ]);

            if (count($notas) > 0) {
                $promedio = array_sum($notas) / count($notas);
                
                DB::connection('pgsql_olap')->table('fact_rendimiento_estudiantil')
                    ->where('id', $factId)
                    ->update(['promedio_notas' => round($promedio, 2)]);
            }
        }
    }

    // Métodos auxiliares para dimensiones

    private function obtenerOCrearEstudianteKey(int $estudianteId, string $nombre, string $email): int
    {
        $dim = DB::connection('pgsql_olap')->table('dim_estudiante')
            ->where('estudiante_id', $estudianteId)
            ->first();

        if ($dim) {
            return $dim->estudiante_key;
        }

        return DB::connection('pgsql_olap')->table('dim_estudiante')->insertGetId([
            'estudiante_id' => $estudianteId,
            'nombre' => $nombre,
            'email' => $email,
            'fecha_carga' => now()
        ]);
    }

    private function obtenerOCrearCursoKey(int $cursoId, string $nombre, string $codigo, string $docenteNombre): int
    {
        $dim = DB::connection('pgsql_olap')->table('dim_curso')
            ->where('curso_id', $cursoId)
            ->first();

        if ($dim) {
            return $dim->curso_key;
        }

        return DB::connection('pgsql_olap')->table('dim_curso')->insertGetId([
            'curso_id' => $cursoId,
            'nombre' => $nombre,
            'codigo' => $codigo,
            'docente_nombre' => $docenteNombre,
            'fecha_carga' => now()
        ]);
    }

    private function obtenerOCrearDocenteKey(int $docenteId, string $nombre, string $email): int
    {
        $dim = DB::connection('pgsql_olap')->table('dim_docente')
            ->where('docente_id', $docenteId)
            ->first();

        if ($dim) {
            return $dim->docente_key;
        }

        return DB::connection('pgsql_olap')->table('dim_docente')->insertGetId([
            'docente_id' => $docenteId,
            'nombre' => $nombre,
            'email' => $email,
            'fecha_carga' => now()
        ]);
    }

    private function obtenerOCrearTiempoKey(string $fecha): int
    {
        $carbon = Carbon::parse($fecha);
        
        $dim = DB::connection('pgsql_olap')->table('dim_tiempo')
            ->where('fecha', $fecha)
            ->first();

        if ($dim) {
            return $dim->tiempo_key;
        }

        return DB::connection('pgsql_olap')->table('dim_tiempo')->insertGetId([
            'fecha' => $fecha,
            'dia' => $carbon->day,
            'mes' => $carbon->month,
            'anio' => $carbon->year,
            'trimestre' => $carbon->quarter,
            'semestre' => $carbon->month <= 6 ? 1 : 2,
            'dia_semana' => $carbon->dayOfWeek,
            'nombre_mes' => $carbon->monthName,
            'nombre_dia' => $carbon->dayName
        ]);
    }

    /**
     * Obtiene la última sincronización desde control_etl
     */
    private function obtenerUltimaSincronizacion(string $proceso): Carbon
    {
        $control = DB::connection('pgsql_olap')->table('control_etl')
            ->where('proceso', $proceso)
            ->where('estado', 'exitoso')
            ->orderBy('ultima_ejecucion', 'desc')
            ->first();

        if ($control && $control->ultima_ejecucion) {
            return Carbon::parse($control->ultima_ejecucion);
        }

        // Si no hay sincronización previa, retornar hace 30 días
        return now()->subDays(30);
    }

    /**
     * Registra la ejecución del ETL en control_etl
     */
    public function registrarEjecucion(string $proceso, string $estado, int $registrosProcesados, ?string $errores = null): void
    {
        DB::connection('pgsql_olap')->table('control_etl')->insert([
            'proceso' => $proceso,
            'ultima_ejecucion' => now(),
            'estado' => $estado,
            'registros_procesados' => $registrosProcesados,
            'errores' => $errores
        ]);
    }
}
