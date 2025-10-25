<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuthTokenMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Obtener token del header Authorization
        $token = $request->bearerToken();

        if (!$token) {
            \Log::warning('AuthTokenMiddleware: Token no proporcionado', [
                'path' => $request->path(),
                'headers' => $request->headers->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Token no proporcionado'
            ], 401);
        }

        // Validar token usando la función PostgreSQL
        try {
            $resultado = DB::select("SELECT validar_token(?)", [$token]);

            if (empty($resultado)) {
                \Log::error('AuthTokenMiddleware: Resultado vacío de validar_token');
                return response()->json([
                    'success' => false,
                    'message' => 'Error al validar token'
                ], 500);
            }

            $validacion = json_decode($resultado[0]->validar_token, true);

            if (!$validacion['success']) {
                \Log::warning('AuthTokenMiddleware: Token inválido', [
                    'message' => $validacion['message'] ?? 'Sin mensaje',
                    'path' => $request->path()
                ]);
                return response()->json([
                    'success' => false,
                    'message' => $validacion['message']
                ], 401);
            }

            // Agregar usuario al request como atributo
            $userData = $validacion['data'];
            $request->attributes->set('user', (object) $userData);

            return $next($request);
        } catch (\Exception $e) {
            \Log::error('AuthTokenMiddleware: Excepción', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error al validar token: ' . $e->getMessage()
            ], 500);
        }
    }
}
