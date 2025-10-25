<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('auth_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->onDelete('cascade');
            $table->string('token', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->useCurrent();
            
            // Índices
            $table->index('token', 'idx_auth_tokens_token');
            $table->index('usuario_id', 'idx_auth_tokens_usuario');
            $table->index('expires_at', 'idx_auth_tokens_expires');
        });
        
        // Crear funciones almacenadas en PostgreSQL
        DB::unprepared("
            -- Función para registrar un nuevo usuario
            CREATE OR REPLACE FUNCTION registrar_usuario(
                p_email VARCHAR(255),
                p_password VARCHAR(255),
                p_name VARCHAR(255),
                p_role VARCHAR(50),
                p_dni VARCHAR(20) DEFAULT NULL,
                p_telefono VARCHAR(20) DEFAULT NULL,
                p_direccion TEXT DEFAULT NULL
            )
            RETURNS JSON AS $$
            DECLARE
                v_usuario_id BIGINT;
                v_token VARCHAR(64);
                v_expires_at TIMESTAMP;
                v_result JSON;
            BEGIN
                -- Validar que el email no exista
                IF EXISTS (SELECT 1 FROM usuarios WHERE email = p_email) THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'El email ya está registrado'
                    );
                END IF;
                
                -- Validar que el DNI no exista (si se proporciona)
                IF p_dni IS NOT NULL AND EXISTS (SELECT 1 FROM usuarios WHERE dni = p_dni) THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'El DNI ya está registrado'
                    );
                END IF;
                
                -- Insertar usuario
                INSERT INTO usuarios (email, password, name, role, dni, telefono, direccion)
                VALUES (p_email, p_password, p_name, p_role, p_dni, p_telefono, p_direccion)
                RETURNING id INTO v_usuario_id;
                
                -- Generar token (usando md5 de timestamp + usuario_id + random)
                v_token := md5(CURRENT_TIMESTAMP::TEXT || v_usuario_id::TEXT || random()::TEXT);
                v_expires_at := CURRENT_TIMESTAMP + INTERVAL '3 hours';
                
                -- Insertar token
                INSERT INTO auth_tokens (usuario_id, token, expires_at)
                VALUES (v_usuario_id, v_token, v_expires_at);
                
                -- Retornar resultado
                SELECT json_build_object(
                    'success', true,
                    'message', 'Usuario registrado exitosamente',
                    'data', json_build_object(
                        'usuario_id', v_usuario_id,
                        'email', p_email,
                        'name', p_name,
                        'role', p_role,
                        'token', v_token,
                        'expires_at', v_expires_at
                    )
                ) INTO v_result;
                
                RETURN v_result;
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Error al registrar usuario: ' || SQLERRM
                    );
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para login de usuario
            CREATE OR REPLACE FUNCTION login_usuario(
                p_email VARCHAR(255),
                p_password VARCHAR(255)
            )
            RETURNS JSON AS $$
            DECLARE
                v_usuario RECORD;
                v_token VARCHAR(64);
                v_expires_at TIMESTAMP;
                v_result JSON;
            BEGIN
                -- Buscar usuario por email y password
                SELECT id, email, name, role, dni, telefono, direccion, avatar
                INTO v_usuario
                FROM usuarios
                WHERE email = p_email AND password = p_password;
                
                -- Validar si el usuario existe
                IF NOT FOUND THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Credenciales inválidas'
                    );
                END IF;
                
                -- Eliminar tokens expirados del usuario
                DELETE FROM auth_tokens 
                WHERE usuario_id = v_usuario.id AND expires_at < CURRENT_TIMESTAMP;
                
                -- Generar nuevo token
                v_token := md5(CURRENT_TIMESTAMP::TEXT || v_usuario.id::TEXT || random()::TEXT);
                v_expires_at := CURRENT_TIMESTAMP + INTERVAL '3 hours';
                
                -- Insertar token
                INSERT INTO auth_tokens (usuario_id, token, expires_at)
                VALUES (v_usuario.id, v_token, v_expires_at);
                
                -- Retornar resultado
                SELECT json_build_object(
                    'success', true,
                    'message', 'Login exitoso',
                    'data', json_build_object(
                        'usuario_id', v_usuario.id,
                        'email', v_usuario.email,
                        'name', v_usuario.name,
                        'role', v_usuario.role,
                        'dni', v_usuario.dni,
                        'telefono', v_usuario.telefono,
                        'direccion', v_usuario.direccion,
                        'avatar', v_usuario.avatar,
                        'token', v_token,
                        'expires_at', v_expires_at
                    )
                ) INTO v_result;
                
                RETURN v_result;
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Error al iniciar sesión: ' || SQLERRM
                    );
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para validar token
            CREATE OR REPLACE FUNCTION validar_token(
                p_token VARCHAR(64)
            )
            RETURNS JSON AS $$
            DECLARE
                v_usuario RECORD;
                v_result JSON;
            BEGIN
                -- Buscar usuario por token válido
                SELECT u.id, u.email, u.name, u.role, u.dni, u.telefono, u.direccion, u.avatar
                INTO v_usuario
                FROM usuarios u
                JOIN auth_tokens t ON u.id = t.usuario_id
                WHERE t.token = p_token AND t.expires_at > CURRENT_TIMESTAMP;
                
                -- Validar si el token es válido
                IF NOT FOUND THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Token inválido o expirado'
                    );
                END IF;
                
                -- Retornar datos del usuario
                SELECT json_build_object(
                    'success', true,
                    'data', json_build_object(
                        'usuario_id', v_usuario.id,
                        'email', v_usuario.email,
                        'name', v_usuario.name,
                        'role', v_usuario.role,
                        'dni', v_usuario.dni,
                        'telefono', v_usuario.telefono,
                        'direccion', v_usuario.direccion,
                        'avatar', v_usuario.avatar
                    )
                ) INTO v_result;
                
                RETURN v_result;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para logout (invalidar token)
            CREATE OR REPLACE FUNCTION logout_usuario(
                p_token VARCHAR(64)
            )
            RETURNS JSON AS $$
            DECLARE
                v_deleted INTEGER;
            BEGIN
                -- Eliminar token
                DELETE FROM auth_tokens WHERE token = p_token;
                GET DIAGNOSTICS v_deleted = ROW_COUNT;
                
                IF v_deleted > 0 THEN
                    RETURN json_build_object(
                        'success', true,
                        'message', 'Sesión cerrada exitosamente'
                    );
                ELSE
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Token no encontrado'
                    );
                END IF;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para limpiar tokens expirados (ejecutar periódicamente)
            CREATE OR REPLACE FUNCTION limpiar_tokens_expirados()
            RETURNS INTEGER AS $$
            DECLARE
                v_deleted INTEGER;
            BEGIN
                DELETE FROM auth_tokens WHERE expires_at < CURRENT_TIMESTAMP;
                GET DIAGNOSTICS v_deleted = ROW_COUNT;
                RETURN v_deleted;
            END;
            $$ LANGUAGE plpgsql;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Eliminar funciones
        DB::unprepared("
            DROP FUNCTION IF EXISTS registrar_usuario;
            DROP FUNCTION IF EXISTS login_usuario;
            DROP FUNCTION IF EXISTS validar_token;
            DROP FUNCTION IF EXISTS logout_usuario;
            DROP FUNCTION IF EXISTS limpiar_tokens_expirados;
        ");
        
        Schema::dropIfExists('auth_tokens');
    }
};
