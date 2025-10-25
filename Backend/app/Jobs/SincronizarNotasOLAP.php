<?php

namespace App\Jobs;

use App\Services\ETLService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SincronizarNotasOLAP implements ShouldQueue
{
    use Queueable;

    /**
     * Número de intentos
     */
    public $tries = 3;

    /**
     * Backoff exponencial (1min, 5min, 15min)
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
    public function handle(ETLService $etlService): void
    {
        try {
            Log::info('ETL: Iniciando sincronización de notas');

            // 1. Extraer notas desde OLTP
            $notas = $etlService->extraerNotas();

            if (empty($notas)) {
                Log::info('ETL: No hay notas nuevas para sincronizar');
                $etlService->registrarEjecucion('notas', 'exitoso', 0);
                return;
            }

            // 2. Transformar a formato estrella
            $datosTransformados = $etlService->transformarAEstrella($notas, 'notas');

            // 3. Cargar en OLAP
            $registrosProcesados = $etlService->cargarEnOLAP($datosTransformados, 'notas');

            // 4. Registrar ejecución exitosa
            $etlService->registrarEjecucion('notas', 'exitoso', $registrosProcesados);

            Log::info('ETL: Sincronización de notas completada', [
                'registros_procesados' => $registrosProcesados
            ]);

        } catch (\Exception $e) {
            Log::error('ETL: Error en sincronización de notas', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $etlService->registrarEjecucion('notas', 'fallido', 0, $e->getMessage());

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('ETL: Job de notas falló después de todos los intentos', [
            'error' => $exception->getMessage()
        ]);
    }
}
