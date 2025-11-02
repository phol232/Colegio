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
        // ETL: Sincronización completa OLTP → OLAP cada hora
        $schedule->command('olap:sync')
            ->hourly()
            ->withoutOverlapping()
            ->onOneServer()
            ->runInBackground();
        
        // ETL: Sincronización completa diaria (3:00 AM)
        $schedule->command('olap:sync --full')
            ->dailyAt('03:00')
            ->withoutOverlapping()
            ->onOneServer();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
