// Colores por curso según el sistema de diseño del colegio
export const COURSE_COLORS: { [key: string]: { primary: string; light: string; border: string } } = {
  // Matemáticas y relacionados
  'matematica': { primary: '#4F46E5', light: '#EEF2FF', border: '#4F46E5' },
  'geometria': { primary: '#0891B2', light: '#ECFEFF', border: '#0891B2' },
  'aritmetica': { primary: '#2563EB', light: '#EFF6FF', border: '#2563EB' },
  'algebra': { primary: '#7C3AED', light: '#FAF5FF', border: '#7C3AED' },
  'estadistica': { primary: '#475569', light: '#F8FAFC', border: '#475569' },
  'trigonometria': { primary: '#4338CA', light: '#EEF2FF', border: '#4338CA' },
  
  // Ciencias Sociales
  'historia': { primary: '#D97706', light: '#FFFBEB', border: '#D97706' },
  'historia universal': { primary: '#D97706', light: '#FFFBEB', border: '#D97706' },
  'historia del peru': { primary: '#C2410C', light: '#FFF7ED', border: '#C2410C' },
  'etica': { primary: '#0D9488', light: '#F0FDFA', border: '#0D9488' },
  'etica y ciudadania': { primary: '#0D9488', light: '#F0FDFA', border: '#0D9488' },
  'ciudadania': { primary: '#0D9488', light: '#F0FDFA', border: '#0D9488' },
  'economia': { primary: '#059669', light: '#F0FDF4', border: '#059669' },
  
  // Ciencias Naturales
  'biologia': { primary: '#16A34A', light: '#F0FDF4', border: '#16A34A' },
  'quimica': { primary: '#C026D3', light: '#FDF4FF', border: '#C026D3' },
  
  // Otros
  'educacion fisica': { primary: '#65A30D', light: '#F7FEE7', border: '#65A30D' },
  'talleres': { primary: '#EA580C', light: '#FFF7ED', border: '#EA580C' },
  'computacion': { primary: '#0284C7', light: '#F0F9FF', border: '#0284C7' },
  'ingles': { primary: '#DB2777', light: '#FDF2F8', border: '#DB2777' },
  'arte': { primary: '#E11D48', light: '#FFF1F2', border: '#E11D48' },
};

// Función para obtener el color de un curso
export const getCourseColor = (courseName: string) => {
  if (!courseName) {
    return { primary: '#17A2E5', light: '#F0F9FF', border: '#17A2E5' };
  }
  
  // Normalizar: minúsculas, sin acentos, sin espacios extras
  const normalizedName = courseName
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remover acentos
  
  // Buscar coincidencia exacta
  if (COURSE_COLORS[normalizedName]) {
    return COURSE_COLORS[normalizedName];
  }
  
  // Buscar coincidencia exacta con el nombre original (con acentos)
  const originalLower = courseName.toLowerCase().trim();
  if (COURSE_COLORS[originalLower]) {
    return COURSE_COLORS[originalLower];
  }
  
  // Buscar coincidencia parcial
  for (const [key, value] of Object.entries(COURSE_COLORS)) {
    const normalizedKey = key
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    if (normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName)) {
      return value;
    }
  }
  
  // Color por defecto (celeste institucional)
  return { primary: '#17A2E5', light: '#F0F9FF', border: '#17A2E5' };
};
