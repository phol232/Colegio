-- ============================================
-- INSERT INTO cursos_catalogo
-- Catálogo completo de cursos para Primaria y Secundaria
-- ============================================

-- CURSOS PARA AMBOS NIVELES (Primaria y Secundaria)
INSERT INTO cursos_catalogo (nombre, codigo, nivel, descripcion, created_at, updated_at) VALUES
-- Matemática (ambos niveles)
('Matemática', 'MAT-001', 'ambos', 'Curso de matemática fundamental', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Lengua (ambos niveles)
('Inglés', 'ENG-001', 'ambos', 'Curso de idioma inglés', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Educación Física (ambos niveles)
('Educación Física', 'EF-001', 'ambos', 'Curso de educación física y deporte', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Computación (ambos niveles)
('Computación', 'COM-001', 'ambos', 'Curso de informática y tecnología', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Talleres (ambos niveles)
('Talleres', 'TAL-001', 'ambos', 'Cursos de talleres prácticos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Ciencias Naturales (ambos niveles)
('Biología', 'BIO-001', 'ambos', 'Curso de biología y ciencias de la vida', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Química', 'QUI-001', 'ambos', 'Curso de química y reacciones químicas', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Ciencias Sociales (ambos niveles)
('Historia Universal', 'HU-001', 'ambos', 'Curso de historia universal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Historia del Perú', 'HP-001', 'ambos', 'Curso de historia del Perú', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Ética y Ciudadanía', 'ETI-001', 'ambos', 'Curso de ética, valores y ciudadanía', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Arte (solo para Primaria)
('Arte', 'ART-001', 'primaria', 'Curso de arte, dibujo y pintura', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- CURSOS SOLO PARA PRIMARIA
-- Matemática - Cursos específicos de primaria
('Geometría - Primaria', 'GEO-P-001', 'primaria', 'Curso de geometría para primaria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Aritmética - Primaria', 'ARI-P-001', 'primaria', 'Curso de aritmética para primaria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- CURSOS SOLO PARA SECUNDARIA
-- Matemática - Cursos específicos de secundaria
('Geometría - Secundaria', 'GEO-S-001', 'secundaria', 'Curso de geometría para secundaria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Aritmética - Secundaria', 'ARI-S-001', 'secundaria', 'Curso de aritmética para secundaria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Estadística', 'EST-001', 'secundaria', 'Curso de estadística y probabilidad', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Álgebra', 'ALG-001', 'secundaria', 'Curso de álgebra y funciones', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Trigonometría', 'TRI-001', 'secundaria', 'Curso de trigonometría', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Economía (solo secundaria)
('Economía', 'ECO-001', 'secundaria', 'Curso de economía y finanzas', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);


