<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class PerfilController extends Controller
{
    /**
     * Obtener datos del perfil del usuario autenticado
     */
    public function show(Request $request)
    {
        try {
            $user = $request->attributes->get('user');
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Obtener datos completos del usuario desde la base de datos
            $userData = DB::table('usuarios')
                ->where('id', $user->usuario_id)
                ->first();

            if (!$userData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $userData->id,
                    'name' => $userData->name,
                    'email' => $userData->email,
                    'role' => $userData->role,
                    'dni' => $userData->dni,
                    'telefono' => $userData->telefono,
                    'direccion' => $userData->direccion,
                    'avatar' => $userData->avatar,
                    'created_at' => $userData->created_at,
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error en PerfilController@show: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener perfil: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar datos del perfil (sin contraseña)
     */
    public function update(Request $request)
    {
        try {
            $userData = $request->attributes->get('user');
            
            if (!$userData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:usuarios,email,' . $userData->usuario_id,
                'dni' => 'nullable|string|max:20',
                'telefono' => 'nullable|string|max:20',
                'direccion' => 'nullable|string',
                'avatar' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            DB::table('usuarios')
                ->where('id', $userData->usuario_id)
                ->update([
                    'name' => $request->name,
                    'email' => $request->email,
                    'dni' => $request->dni,
                    'telefono' => $request->telefono,
                    'direccion' => $request->direccion,
                    'avatar' => $request->avatar,
                    'updated_at' => now(),
                ]);

            DB::commit();

            $updatedUser = DB::table('usuarios')->where('id', $userData->usuario_id)->first();

            return response()->json([
                'success' => true,
                'message' => 'Perfil actualizado exitosamente',
                'data' => [
                    'id' => $updatedUser->id,
                    'name' => $updatedUser->name,
                    'email' => $updatedUser->email,
                    'role' => $updatedUser->role,
                    'dni' => $updatedUser->dni,
                    'telefono' => $updatedUser->telefono,
                    'direccion' => $updatedUser->direccion,
                    'avatar' => $updatedUser->avatar,
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar perfil: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar contraseña
     */
    public function cambiarPassword(Request $request)
    {
        try {
            $userData = $request->attributes->get('user');
            
            if (!$userData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Obtener usuario completo con contraseña
            $user = DB::table('usuarios')->where('id', $userData->usuario_id)->first();

            $validator = Validator::make($request->all(), [
                'current_password' => 'required|string',
                'new_password' => 'required|string|min:6|confirmed',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Verificar contraseña actual
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'La contraseña actual es incorrecta'
                ], 422);
            }

            DB::beginTransaction();

            DB::table('usuarios')
                ->where('id', $userData->usuario_id)
                ->update([
                    'password' => Hash::make($request->new_password),
                    'updated_at' => now(),
                ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Contraseña actualizada exitosamente'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al cambiar contraseña: ' . $e->getMessage()
            ], 500);
        }
    }
}
