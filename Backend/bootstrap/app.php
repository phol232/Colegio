<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Registrar middlewares personalizados
        $middleware->alias([
            'auth.token' => \App\Http\Middleware\AuthTokenMiddleware::class,
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'log.operations' => \App\Http\Middleware\LogOperations::class,
        ]);

        // Aplicar LogOperations a todas las rutas API
        $middleware->api(append: [
            \App\Http\Middleware\LogOperations::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule) {
        // ETL: Sincronizar asistencias cada 5 minutos
        $schedule->job(new \App\Jobs\SincronizarAsistenciaOLAP)->everyFiveMinutes();
        
        // ETL: Sincronizar notas cada 5 minutos
        $schedule->job(new \App\Jobs\SincronizarNotasOLAP)->everyFiveMinutes();
        
        // ETL: Actualizar dimensiones cada hora
        $schedule->job(new \App\Jobs\ActualizarDimensiones)->hourly();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
