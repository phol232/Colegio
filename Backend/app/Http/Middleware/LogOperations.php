<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LogOperations
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        // Procesar la request
        $response = $next($request);

        // Calcular tiempo de ejecución
        $executionTime = round((microtime(true) - $startTime) * 1000, 2);

        // Obtener información del usuario
        $user = $request->user();
        $userId = $user ? $user->id : null;
        $userEmail = $user ? $user->email : 'guest';

        // Obtener información de la request
        $method = $request->method();
        $path = $request->path();
        $fullUrl = $request->fullUrl();
        $ip = $request->ip();
        $statusCode = $response->getStatusCode();

        // Log solo para operaciones importantes (POST, PUT, DELETE)
        if (in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH'])) {
            Log::channel('operations')->info("$method /$path - $statusCode", [
                'timestamp' => now()->toIso8601String(),
                'user_id' => $userId,
                'user_email' => $userEmail,
                'ip' => $ip,
                'method' => $method,
                'path' => $path,
                'full_url' => $fullUrl,
                'status_code' => $statusCode,
                'execution_time_ms' => $executionTime,
                'user_agent' => $request->userAgent(),
                'success' => $statusCode >= 200 && $statusCode < 300
            ]);
        }

        // Log de errores (4xx, 5xx)
        if ($statusCode >= 400) {
            Log::channel('operations')->warning("ERROR: $method /$path - $statusCode", [
                'timestamp' => now()->toIso8601String(),
                'user_id' => $userId,
                'user_email' => $userEmail,
                'ip' => $ip,
                'method' => $method,
                'path' => $path,
                'full_url' => $fullUrl,
                'status_code' => $statusCode,
                'execution_time_ms' => $executionTime
            ]);
        }

        return $response;
    }
}
