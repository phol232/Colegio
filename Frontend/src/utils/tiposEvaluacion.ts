/**
 * Tipos de evaluación predefinidos
 */
export const TIPOS_EVALUACION_PREDEFINIDOS = [
    'Práctica',
    'Examen',
    'Tarea',
    'Participación',
    'Proyecto',
    'Otro'
] as const;

export type TipoEvaluacion = typeof TIPOS_EVALUACION_PREDEFINIDOS[number] | string;

/**
 * Obtiene los tipos de evaluación personalizados del localStorage
 */
export const getTiposPersonalizados = (): string[] => {
    try {
        const stored = localStorage.getItem('tipos_evaluacion_personalizados');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

/**
 * Guarda un nuevo tipo de evaluación personalizado
 */
export const agregarTipoPersonalizado = (tipo: string): boolean => {
    try {
        const tipos = getTiposPersonalizados();
        
        // Validar que no exista ya
        if (tipos.includes(tipo) || TIPOS_EVALUACION_PREDEFINIDOS.includes(tipo as any)) {
            return false;
        }
        
        tipos.push(tipo);
        localStorage.setItem('tipos_evaluacion_personalizados', JSON.stringify(tipos));
        return true;
    } catch {
        return false;
    }
};

/**
 * Elimina un tipo de evaluación personalizado
 */
export const eliminarTipoPersonalizado = (tipo: string): boolean => {
    try {
        const tipos = getTiposPersonalizados();
        const filtrados = tipos.filter(t => t !== tipo);
        localStorage.setItem('tipos_evaluacion_personalizados', JSON.stringify(filtrados));
        return true;
    } catch {
        return false;
    }
};

/**
 * Obtiene todos los tipos de evaluación (predefinidos + personalizados)
 */
export const getTodosLosTipos = (): string[] => {
    const predefinidos = [...TIPOS_EVALUACION_PREDEFINIDOS];
    const personalizados = getTiposPersonalizados();
    return [...predefinidos, ...personalizados];
};

/**
 * Obtiene el icono para un tipo de evaluación
 */
export const getIconoTipo = (tipo: string): string => {
    switch (tipo) {
        case 'Práctica':
            return '📝';
        case 'Examen':
            return '📋';
        case 'Tarea':
            return '📚';
        case 'Participación':
            return '🙋';
        case 'Proyecto':
            return '🎯';
        default:
            return '📄';
    }
};

/**
 * Obtiene el color para un tipo de evaluación
 */
export const getColorTipo = (tipo: string): { bg: string; text: string; border: string } => {
    switch (tipo) {
        case 'Práctica':
            return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-600' };
        case 'Examen':
            return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-600' };
        case 'Tarea':
            return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-600' };
        case 'Participación':
            return { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-600' };
        case 'Proyecto':
            return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-600' };
        default:
            return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-600' };
    }
};

/**
 * Filtra evaluaciones por tipo
 */
export const filtrarPorTipo = <T extends { tipo_evaluacion: string }>(
    evaluaciones: T[],
    tipo: string | null
): T[] => {
    if (!tipo) return evaluaciones;
    return evaluaciones.filter(e => e.tipo_evaluacion === tipo);
};

/**
 * Agrupa evaluaciones por tipo
 */
export const agruparPorTipo = <T extends { tipo_evaluacion: string }>(
    evaluaciones: T[]
): Map<string, T[]> => {
    const grupos = new Map<string, T[]>();
    
    evaluaciones.forEach(evaluacion => {
        const tipo = evaluacion.tipo_evaluacion;
        if (!grupos.has(tipo)) {
            grupos.set(tipo, []);
        }
        grupos.get(tipo)!.push(evaluacion);
    });
    
    return grupos;
};

/**
 * Obtiene estadísticas por tipo de evaluación
 */
export const getEstadisticasPorTipo = <T extends { tipo_evaluacion: string }>(
    evaluaciones: T[]
): Array<{ tipo: string; cantidad: number; porcentaje: number }> => {
    const grupos = agruparPorTipo(evaluaciones);
    const total = evaluaciones.length;
    
    return Array.from(grupos.entries()).map(([tipo, items]) => ({
        tipo,
        cantidad: items.length,
        porcentaje: Math.round((items.length / total) * 100)
    }));
};
