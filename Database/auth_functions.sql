-- ============================================
-- FUNCIONES DE AUTENTICACIÓN
-- Sistema de login/registro con tokens de 3 horas
-- ============================================

-- ============================================
-- 1. REGISTRAR USUARIO
-- ============================================

-- Ejemplo: Registrar un docente
SELECT registrar_usuario(
    'juan.perez@escuela.com',           -- email
    'password123',                       -- password (en producción debe estar hasheado)
    'Juan Pérez García',                 -- name
    'docente',                           -- role (docente, estudiante, padre, admin)
    '12345678',                          -- dni (opcional)
    '987654321',                         -- telefono (opcional)
    'Av. Principal 123, Lima'            -- direccion (opcional)
);

-- Ejemplo: Registrar un estudiante
SELECT registrar_usuario(
    'maria.lopez@estudiante.com',
    'password456',
    'María López Sánchez',
    'estudiante',
    '87654321',
    '912345678',
    'Jr. Los Olivos 456, Lima'
);

-- Ejemplo: Registrar un padre
SELECT registrar_usuario(
    'carlos.gomez@padre.com',
    'password789',
    'Carlos Gómez Ruiz',
    'padre',
    '11223344',
    '998877665',
    'Calle Las Flores 789, Lima'
);

-- Respuesta exitosa:
-- {
--   "success": true,
--   "message": "Usuario registrado exitosamente",
--   "data": {
--     "usuario_id": 1,
--     "email": "juan.perez@escuela.com",
--     "name": "Juan Pérez García",
--     "role": "docente",
--     "token": "a1b2c3d4e5f6...",
--     "expires_at": "2025-10-22 09:30:00"
--   }
-- }

-- ============================================
-- 2. LOGIN DE USUARIO
-- ============================================

-- Ejemplo: Login
SELECT login_usuario(
    'juan.perez@escuela.com',           -- email
    'password123'                        -- password
);

-- Respuesta exitosa:
-- {
--   "success": true,
--   "message": "Login exitoso",
--   "data": {
--     "usuario_id": 1,
--     "email": "juan.perez@escuela.com",
--     "name": "Juan Pérez García",
--     "role": "docente",
--     "dni": "12345678",
--     "telefono": "987654321",
--     "direccion": "Av. Principal 123, Lima",
--     "avatar": null,
--     "token": "x1y2z3a4b5c6...",
--     "expires_at": "2025-10-22 09:30:00"
--   }
-- }

-- Respuesta con credenciales inválidas:
-- {
--   "success": false,
--   "message": "Credenciales inválidas"
-- }

-- ============================================
-- 3. VALIDAR TOKEN
-- ============================================

-- Ejemplo: Validar token (para verificar si el usuario está autenticado)
SELECT validar_token('x1y2z3a4b5c6...');

-- Respuesta con token válido:
-- {
--   "success": true,
--   "data": {
--     "usuario_id": 1,
--     "email": "juan.perez@escuela.com",
--     "name": "Juan Pérez García",
--     "role": "docente",
--     "dni": "12345678",
--     "telefono": "987654321",
--     "direccion": "Av. Principal 123, Lima",
--     "avatar": null
--   }
-- }

-- Respuesta con token inválido o expirado:
-- {
--   "success": false,
--   "message": "Token inválido o expirado"
-- }

-- ============================================
-- 4. LOGOUT (CERRAR SESIÓN)
-- ============================================

-- Ejemplo: Logout
SELECT logout_usuario('x1y2z3a4b5c6...');

-- Respuesta exitosa:
-- {
--   "success": true,
--   "message": "Sesión cerrada exitosamente"
-- }

-- ============================================
-- 5. LIMPIAR TOKENS EXPIRADOS
-- ============================================

-- Ejecutar periódicamente (por ejemplo, cada hora con un cron job)
SELECT limpiar_tokens_expirados();

-- Retorna el número de tokens eliminados

-- ============================================
-- CONSULTAS ÚTILES
-- ============================================

-- Ver todos los tokens activos
SELECT 
    u.name,
    u.email,
    u.role,
    t.token,
    t.created_at,
    t.expires_at,
    CASE 
        WHEN t.expires_at > CURRENT_TIMESTAMP THEN 'Activo'
        ELSE 'Expirado'
    END AS estado
FROM auth_tokens t
JOIN usuarios u ON t.usuario_id = u.id
ORDER BY t.created_at DESC;

-- Ver tokens de un usuario específico
SELECT 
    token,
    created_at,
    expires_at,
    CASE 
        WHEN expires_at > CURRENT_TIMESTAMP THEN 'Activo'
        ELSE 'Expirado'
    END AS estado
FROM auth_tokens
WHERE usuario_id = 1
ORDER BY created_at DESC;

-- Contar tokens activos por rol
SELECT 
    u.role,
    COUNT(*) AS tokens_activos
FROM auth_tokens t
JOIN usuarios u ON t.usuario_id = u.id
WHERE t.expires_at > CURRENT_TIMESTAMP
GROUP BY u.role;

-- Ver usuarios registrados recientemente
SELECT 
    id,
    name,
    email,
    role,
    dni,
    created_at
FROM usuarios
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- INTEGRACIÓN CON LARAVEL
-- ============================================

-- En Laravel, puedes llamar estas funciones así:

-- Registro:
-- $result = DB::select("SELECT registrar_usuario(?, ?, ?, ?, ?, ?, ?)", [
--     $email, $password, $name, $role, $dni, $telefono, $direccion
-- ]);

-- Login:
-- $result = DB::select("SELECT login_usuario(?, ?)", [$email, $password]);

-- Validar token:
-- $result = DB::select("SELECT validar_token(?)", [$token]);

-- Logout:
-- $result = DB::select("SELECT logout_usuario(?)", [$token]);

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

-- 1. SEGURIDAD:
--    - En producción, las contraseñas deben estar hasheadas (bcrypt, argon2)
--    - Los tokens se generan con md5 (timestamp + usuario_id + random)
--    - Los tokens expiran automáticamente después de 3 horas

-- 2. LIMPIEZA:
--    - Ejecutar limpiar_tokens_expirados() periódicamente
--    - Recomendado: cada hora o diariamente

-- 3. VALIDACIÓN:
--    - El email debe ser único
--    - El DNI debe ser único (si se proporciona)
--    - El rol debe ser: docente, estudiante, padre, o admin

-- 4. TOKENS:
--    - Duración: 3 horas
--    - Se eliminan automáticamente al hacer logout
--    - Se eliminan automáticamente al expirar (con limpieza)

-- ============================================
-- EJEMPLO DE USO COMPLETO
-- ============================================

-- 1. Registrar usuario
DO $$
DECLARE
    v_result JSON;
BEGIN
    SELECT registrar_usuario(
        'test@example.com',
        'password123',
        'Usuario Test',
        'estudiante',
        '99887766',
        '999888777',
        'Dirección de prueba'
    ) INTO v_result;
    
    RAISE NOTICE 'Resultado registro: %', v_result;
END $$;

-- 2. Login
DO $$
DECLARE
    v_result JSON;
    v_token TEXT;
BEGIN
    SELECT login_usuario(
        'test@example.com',
        'password123'
    ) INTO v_result;
    
    -- Extraer token del resultado
    v_token := v_result->>'data'->>'token';
    
    RAISE NOTICE 'Resultado login: %', v_result;
    RAISE NOTICE 'Token: %', v_token;
END $$;

-- ============================================
-- FIN
-- ============================================
