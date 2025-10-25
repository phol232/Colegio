<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ActualizarDimensiones implements ShouldQueue
{
    use Queueable;

    /**
     * Número de intentos
     */
    public $tries = 3;

    /**
     * Backoff exponencial
     */
    public $backoff = [60, 300, 900];

    /**
     * Timeout del job
     */
    public $timeout = 300;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info('ETL: Iniciando actualización de dimensiones');

            $totalActualizados = 0;

            // Actualizar dim_estudiante
            $totalActualizados += $this->actualizarEstudiantes();

            // Actualizar dim_curso
            $totalActualizados += $this->actualizarCursos();

            // Actualizar dim_docente
            $totalActualizados += $this->actualizarDocentes();

            Log::info('ETL: Actualización de dimensiones completada', [
                'total_actualizados' => $totalActualizados
            ]);

        } catch (\Exception $e) {
            Log::error('ETL: Error en actualización de dimensiones', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            throw $e;
        }
    }

    /**
     * Actualiza la dimensión de estudiantes
     */
    private function actualizarEstudiantes(): int
    {
        $estudiantes = DB::connection('pgsql')->table('usuarios')
            ->where('role', 'estudiante')
            ->select('id', 'name', 'email')
            ->get();

        $actualizados = 0;

        foreach ($estudiantes as $estudiante) {
            $existe = DB::connection('pgsql_olap')->table('dim_estudiante')
                ->where('estudiante_id', $estudiante->id)
                ->exists();

            if (!$existe) {
                DB::connection('pgsql_olap')->table('dim_estudiante')->insert([
                    'estudiante_id' => $estudiante->id,
                    'nombre' => $estudiante->name,
                    'email' => $estudiante->email,
                    'fecha_carga' => now()
                ]);
                $actualizados++;
            } else {
                // Actualizar datos si cambiaron
                DB::connection('pgsql_olap')->table('dim_estudiante')
                    ->where('estudiante_id', $estudiante->id)
                    ->update([
                        'nombre' => $estudiante->name,
                        'email' => $estudiante->email
                    ]);
            }
        }

        Log::info('ETL: Estudiantes actualizados', ['count' => $actualizados]);
        return $actualizados;
    }

    /**
     * Actualiza la dimensión de cursos
     */
    private function actualizarCursos(): int
    {
        $cursos = DB::connection('pgsql')->table('cursos as c')
            ->join('usuarios as u', 'c.docente_id', '=', 'u.id')
            ->select('c.id', 'c.nombre', 'c.codigo', 'u.name as docente_nombre')
            ->get();

        $actualizados = 0;

        foreach ($cursos as $curso) {
            $existe = DB::connection('pgsql_olap')->table('dim_curso')
                ->where('curso_id', $curso->id)
                ->exists();

            if (!$existe) {
                DB::connection('pgsql_olap')->table('dim_curso')->insert([
                    'curso_id' => $curso->id,
                    'nombre' => $curso->nombre,
                    'codigo' => $curso->codigo,
                    'docente_nombre' => $curso->docente_nombre,
                    'fecha_carga' => now()
                ]);
                $actualizados++;
            } else {
                // Actualizar datos si cambiaron
                DB::connection('pgsql_olap')->table('dim_curso')
                    ->where('curso_id', $curso->id)
                    ->update([
                        'nombre' => $curso->nombre,
                        'codigo' => $curso->codigo,
                        'docente_nombre' => $curso->docente_nombre
                    ]);
            }
        }

        Log::info('ETL: Cursos actualizados', ['count' => $actualizados]);
        return $actualizados;
    }

    /**
     * Actualiza la dimensión de docentes
     */
    private function actualizarDocentes(): int
    {
        $docentes = DB::connection('pgsql')->table('usuarios')
            ->where('role', 'docente')
            ->select('id', 'name', 'email')
            ->get();

        $actualizados = 0;

        foreach ($docentes as $docente) {
            $existe = DB::connection('pgsql_olap')->table('dim_docente')
                ->where('docente_id', $docente->id)
                ->exists();

            if (!$existe) {
                DB::connection('pgsql_olap')->table('dim_docente')->insert([
                    'docente_id' => $docente->id,
                    'nombre' => $docente->name,
                    'email' => $docente->email,
                    'fecha_carga' => now()
                ]);
                $actualizados++;
            } else {
                // Actualizar datos si cambiaron
                DB::connection('pgsql_olap')->table('dim_docente')
                    ->where('docente_id', $docente->id)
                    ->update([
                        'nombre' => $docente->name,
                        'email' => $docente->email
                    ]);
            }
        }

        Log::info('ETL: Docentes actualizados', ['count' => $actualizados]);
        return $actualizados;
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('ETL: Job de actualización de dimensiones falló', [
            'error' => $exception->getMessage()
        ]);
    }
}
