<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // Obtener el usuario autenticado desde el request attributes
        $usuario = $request->attributes->get('user');

        if (!$usuario) {
            \Log::warning('RoleMiddleware: Usuario no encontrado en request', [
                'path' => $request->path(),
                'roles_required' => $roles
            ]);
            return response()->json([
                'success' => false,
                'message' => 'No autenticado'
            ], 401);
        }

        // Verificar si el usuario tiene uno de los roles permitidos
        if (!in_array($usuario->role, $roles)) {
            \Log::warning('RoleMiddleware: Usuario sin permisos', [
                'user_role' => $usuario->role,
                'required_roles' => $roles,
                'path' => $request->path()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'No tiene permisos para acceder a este recurso'
            ], 403);
        }

        return $next($request);
    }
}
