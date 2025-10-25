-- ============================================
-- ACADEMIC MANAGEMENT SYSTEM - OLTP DATABASE
-- Base de datos transaccional (academic_oltp)
-- ============================================

-- Tabla: usuarios
-- Almacena todos los usuarios del sistema (docentes, estudiantes, padres, admin)
CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    dni VARCHAR(20) UNIQUE,
    telefono VARCHAR(20),
    direccion TEXT,
    name VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('docente', 'estudiante', 'padre', 'admin')),
    avatar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_role ON usuarios(role);
CREATE INDEX idx_usuarios_google_id ON usuarios(google_id);
CREATE INDEX idx_usuarios_dni ON usuarios(dni);

COMMENT ON TABLE usuarios IS 'Usuarios del sistema con diferentes roles';
COMMENT ON COLUMN usuarios.role IS 'Rol del usuario: docente, estudiante, padre, admin';
COMMENT ON COLUMN usuarios.google_id IS 'ID de Google OAuth (nullable para login manual)';

-- ============================================

-- Tabla: grados
-- Define los grados académicos (1ro-6to Primaria, 1ro-5to Secundaria)
CREATE TABLE grados (
    id BIGSERIAL PRIMARY KEY,
    nivel VARCHAR(255) NOT NULL CHECK (nivel IN ('primaria', 'secundaria')),
    numero SMALLINT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nivel, numero)
);

CREATE INDEX idx_grados_nivel ON grados(nivel);

COMMENT ON TABLE grados IS 'Grados académicos del sistema educativo';
COMMENT ON COLUMN grados.nivel IS 'Nivel educativo: primaria o secundaria';
COMMENT ON COLUMN grados.numero IS 'Número del grado (1-6 para primaria, 1-5 para secundaria)';

-- ============================================

-- Tabla: secciones
-- Define las secciones por grado (A, B, C, D)
CREATE TABLE secciones (
    id BIGSERIAL PRIMARY KEY,
    grado_id BIGINT NOT NULL REFERENCES grados(id) ON DELETE CASCADE,
    nombre VARCHAR(10) NOT NULL,
    capacidad INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(grado_id, nombre)
);

CREATE INDEX idx_secciones_grado ON secciones(grado_id);

COMMENT ON TABLE secciones IS 'Secciones por grado (A, B, C, D)';
COMMENT ON COLUMN secciones.capacidad IS 'Capacidad máxima de estudiantes por sección';

-- ============================================

-- Tabla: cursos
-- Cursos académicos asignados a un grado, sección y docente
CREATE TABLE cursos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    docente_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    grado_id BIGINT REFERENCES grados(id) ON DELETE CASCADE,
    seccion_id BIGINT REFERENCES secciones(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cursos_docente ON cursos(docente_id);
CREATE INDEX idx_cursos_grado ON cursos(grado_id);
CREATE INDEX idx_cursos_seccion ON cursos(seccion_id);

COMMENT ON TABLE cursos IS 'Cursos académicos del sistema';
COMMENT ON COLUMN cursos.codigo IS 'Código único del curso';

-- ============================================

-- Tabla: estudiantes_cursos
-- Relación muchos a muchos entre estudiantes y cursos (matrícula)
CREATE TABLE estudiantes_cursos (
    id BIGSERIAL PRIMARY KEY,
    estudiante_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    curso_id BIGINT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    fecha_matricula DATE NOT NULL,
    anio_academico SMALLINT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(estudiante_id, curso_id)
);

CREATE INDEX idx_est_cursos_estudiante ON estudiantes_cursos(estudiante_id);
CREATE INDEX idx_est_cursos_curso ON estudiantes_cursos(curso_id);
CREATE INDEX idx_est_cursos_anio ON estudiantes_cursos(anio_academico);

COMMENT ON TABLE estudiantes_cursos IS 'Matrícula de estudiantes en cursos';
COMMENT ON COLUMN estudiantes_cursos.anio_academico IS 'Año académico de la matrícula';

-- ============================================

-- Tabla: asistencias
-- Registro diario de asistencia de estudiantes
CREATE TABLE asistencias (
    id BIGSERIAL PRIMARY KEY,
    estudiante_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    curso_id BIGINT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('presente', 'ausente', 'tardanza')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(estudiante_id, curso_id, fecha)
);

CREATE INDEX idx_asistencias_estudiante ON asistencias(estudiante_id);
CREATE INDEX idx_asistencias_curso ON asistencias(curso_id);
CREATE INDEX idx_asistencias_fecha ON asistencias(fecha);
CREATE INDEX idx_asistencias_compuesto ON asistencias(curso_id, fecha);

COMMENT ON TABLE asistencias IS 'Registro diario de asistencia de estudiantes';
COMMENT ON COLUMN asistencias.estado IS 'Estado de asistencia: presente, ausente, tardanza';

-- ============================================

-- Tabla: notas
-- Calificaciones de estudiantes por curso y unidad
CREATE TABLE notas (
    id BIGSERIAL PRIMARY KEY,
    estudiante_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    curso_id BIGINT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    unidad SMALLINT NOT NULL CHECK (unidad BETWEEN 1 AND 4),
    puntaje DECIMAL(4,2) NOT NULL CHECK (puntaje BETWEEN 0 AND 20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(estudiante_id, curso_id, unidad)
);

CREATE INDEX idx_notas_estudiante ON notas(estudiante_id);
CREATE INDEX idx_notas_curso ON notas(curso_id);
CREATE INDEX idx_notas_compuesto ON notas(curso_id, unidad);

COMMENT ON TABLE notas IS 'Calificaciones de estudiantes por curso y unidad';
COMMENT ON COLUMN notas.unidad IS 'Unidad académica (1-4)';
COMMENT ON COLUMN notas.puntaje IS 'Calificación del estudiante (0-20)';

-- ============================================

-- Tabla: padres_estudiantes
-- Relación entre padres e hijos (estudiantes)
CREATE TABLE padres_estudiantes (
    id BIGSERIAL PRIMARY KEY,
    padre_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    estudiante_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(padre_id, estudiante_id)
);

CREATE INDEX idx_padres_est_padre ON padres_estudiantes(padre_id);

COMMENT ON TABLE padres_estudiantes IS 'Relación entre padres y estudiantes (hijos)';

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar grados de primaria (1ro a 6to)
INSERT INTO grados (nivel, numero, nombre) VALUES
('primaria', 1, '1ro Primaria'),
('primaria', 2, '2do Primaria'),
('primaria', 3, '3ro Primaria'),
('primaria', 4, '4to Primaria'),
('primaria', 5, '5to Primaria'),
('primaria', 6, '6to Primaria');

-- Insertar grados de secundaria (1ro a 5to)
INSERT INTO grados (nivel, numero, nombre) VALUES
('secundaria', 1, '1ro Secundaria'),
('secundaria', 2, '2do Secundaria'),
('secundaria', 3, '3ro Secundaria'),
('secundaria', 4, '4to Secundaria'),
('secundaria', 5, '5to Secundaria');

-- Insertar secciones A, B, C para cada grado
DO $$
DECLARE
    grado_record RECORD;
BEGIN
    FOR grado_record IN SELECT id FROM grados LOOP
        INSERT INTO secciones (grado_id, nombre, capacidad) VALUES
        (grado_record.id, 'A', 30),
        (grado_record.id, 'B', 30),
        (grado_record.id, 'C', 30);
    END LOOP;
END $$;

-- ============================================
-- FIN DEL ESQUEMA OLTP
-- ============================================


-- ============================================
-- TABLA DE AUTENTICACIÓN
-- ============================================

-- Tabla: auth_tokens
-- Almacena tokens de autenticación con duración de 3 horas
CREATE TABLE auth_tokens (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX idx_auth_tokens_usuario ON auth_tokens(usuario_id);
CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at);

COMMENT ON TABLE auth_tokens IS 'Tokens de autenticación con duración de 3 horas';
COMMENT ON COLUMN auth_tokens.expires_at IS 'Fecha y hora de expiración del token';

-- ============================================
-- FUNCIONES DE AUTENTICACIÓN
-- ============================================

-- Ver archivo: Database/auth_functions.sql para ejemplos de uso

-- Función: registrar_usuario
-- Registra un nuevo usuario y genera un token de autenticación
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
    IF EXISTS (SELECT 1 FROM usuarios WHERE email = p_email) THEN
        RETURN json_build_object('success', false, 'message', 'El email ya está registrado');
    END IF;
    
    IF p_dni IS NOT NULL AND EXISTS (SELECT 1 FROM usuarios WHERE dni = p_dni) THEN
        RETURN json_build_object('success', false, 'message', 'El DNI ya está registrado');
    END IF;
    
    INSERT INTO usuarios (email, password, name, role, dni, telefono, direccion)
    VALUES (p_email, p_password, p_name, p_role, p_dni, p_telefono, p_direccion)
    RETURNING id INTO v_usuario_id;
    
    v_token := md5(CURRENT_TIMESTAMP::TEXT || v_usuario_id::TEXT || random()::TEXT);
    v_expires_at := CURRENT_TIMESTAMP + INTERVAL '3 hours';
    
    INSERT INTO auth_tokens (usuario_id, token, expires_at)
    VALUES (v_usuario_id, v_token, v_expires_at);
    
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
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: login_usuario
-- Autentica un usuario y genera un token de 3 horas
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
    SELECT id, email, name, role, dni, telefono, direccion, avatar
    INTO v_usuario
    FROM usuarios
    WHERE email = p_email AND password = p_password;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Credenciales inválidas');
    END IF;
    
    DELETE FROM auth_tokens WHERE usuario_id = v_usuario.id AND expires_at < CURRENT_TIMESTAMP;
    
    v_token := md5(CURRENT_TIMESTAMP::TEXT || v_usuario.id::TEXT || random()::TEXT);
    v_expires_at := CURRENT_TIMESTAMP + INTERVAL '3 hours';
    
    INSERT INTO auth_tokens (usuario_id, token, expires_at)
    VALUES (v_usuario.id, v_token, v_expires_at);
    
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
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: validar_token
-- Valida un token y retorna los datos del usuario
CREATE OR REPLACE FUNCTION validar_token(p_token VARCHAR(64))
RETURNS JSON AS $$
DECLARE
    v_usuario RECORD;
    v_result JSON;
BEGIN
    SELECT u.id, u.email, u.name, u.role, u.dni, u.telefono, u.direccion, u.avatar
    INTO v_usuario
    FROM usuarios u
    JOIN auth_tokens t ON u.id = t.usuario_id
    WHERE t.token = p_token AND t.expires_at > CURRENT_TIMESTAMP;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Token inválido o expirado');
    END IF;
    
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

-- Función: logout_usuario
-- Invalida un token (cierra sesión)
CREATE OR REPLACE FUNCTION logout_usuario(p_token VARCHAR(64))
RETURNS JSON AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM auth_tokens WHERE token = p_token;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    IF v_deleted > 0 THEN
        RETURN json_build_object('success', true, 'message', 'Sesión cerrada exitosamente');
    ELSE
        RETURN json_build_object('success', false, 'message', 'Token no encontrado');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función: limpiar_tokens_expirados
-- Elimina tokens expirados (ejecutar periódicamente)
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

-- ============================================
