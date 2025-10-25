<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Registra un nuevo usuario
     * POST /api/auth/register
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|unique:usuarios,email',
            'password' => 'required|min:6',
            'name' => 'required|string|max:255',
            'role' => 'required|in:docente,estudiante,padre,admin',
            'dni' => 'nullable|string|max:20|unique:usuarios,dni',
            'telefono' => 'nullable|string|max:20',
            'direccion' => 'nullable|string'
        ], [
            'email.unique' => 'El email ya está registrado',
            'dni.unique' => 'El DNI ya está registrado',
            'role.in' => 'El rol debe ser: docente, estudiante, padre o admin'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Hashear password
            $password = Hash::make($request->password);

            // Llamar a la función PostgreSQL
            $resultado = DB::select("SELECT registrar_usuario(?, ?, ?, ?, ?, ?, ?)", [
                $request->email,
                $password,
                $request->name,
                $request->role,
                $request->dni,
                $request->telefono,
                $request->direccion
            ]);

            $response = json_decode($resultado[0]->registrar_usuario, true);

            $statusCode = $response['success'] ? 201 : 400;

            return response()->json($response, $statusCode);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar usuario: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Login de usuario
     * POST /api/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Buscar usuario por email
            $usuario = DB::table('usuarios')->where('email', $request->email)->first();

            if (!$usuario || !Hash::check($request->password, $usuario->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Credenciales inválidas'
                ], 401);
            }

            // Llamar a la función PostgreSQL con el password hasheado
            $resultado = DB::select("SELECT login_usuario(?, ?)", [
                $request->email,
                $usuario->password
            ]);

            $response = json_decode($resultado[0]->login_usuario, true);

            $statusCode = $response['success'] ? 200 : 401;

            return response()->json($response, $statusCode);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al iniciar sesión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Logout de usuario
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $token = $request->bearerToken();

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Token no proporcionado'
                ], 400);
            }

            // Llamar a la función PostgreSQL
            $resultado = DB::select("SELECT logout_usuario(?)", [$token]);

            $response = json_decode($resultado[0]->logout_usuario, true);

            return response()->json($response);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al cerrar sesión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtiene los datos del usuario autenticado
     * GET /api/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $request->user
        ]);
    }
}
