interface Evaluacion {
    id: number;
    peso: number | null;
}

interface NotaEstudiante {
    evaluacionId: number;
    puntaje: number;
}

interface PromedioResult {
    promedio_numerico: number;
    promedio_literal: string;
    total_evaluaciones: number;
}

/**
 * Convierte un promedio numérico a calificación literal (primaria)
 */
export const convertirALiteral = (promedio: number): string => {
    if (promedio >= 17) return 'AD'; // Logro destacado
    if (promedio >= 14) return 'A';  // Logro esperado
    if (promedio >= 11) return 'B';  // En proceso
    return 'C';  // En inicio
};

/**
 * Calcula el promedio simple (sin pesos)
 */
export const calcularPromedioSimple = (notas: number[]): number => {
    if (notas.length === 0) return 0;
    const suma = notas.reduce((acc, nota) => acc + nota, 0);
    return suma / notas.length;
};

/**
 * Calcula el promedio ponderado (con pesos)
 */
export const calcularPromedioPonderado = (
    notasConPeso: Array<{ puntaje: number; peso: number }>
): number => {
    if (notasConPeso.length === 0) return 0;
    
    const sumaProductos = notasConPeso.reduce(
        (acc, item) => acc + (item.puntaje * item.peso / 100),
        0
    );
    
    return sumaProductos;
};

/**
 * Valida si todas las evaluaciones tienen peso y suman 100%
 */
export const validarPesos = (evaluaciones: Evaluacion[]): boolean => {
    const evaluacionesConPeso = evaluaciones.filter(e => e.peso !== null);
    
    // Si no todas tienen peso, no es válido
    if (evaluacionesConPeso.length !== evaluaciones.length) {
        return false;
    }
    
    // Verificar que sumen 100%
    const sumaPesos = evaluacionesConPeso.reduce((sum, e) => sum + (e.peso || 0), 0);
    return Math.abs(sumaPesos - 100) < 0.01; // Tolerancia para decimales
};

/**
 * Calcula el promedio de un estudiante según las evaluaciones y notas
 */
export const calcularPromedioEstudiante = (
    evaluaciones: Evaluacion[],
    notasEstudiante: NotaEstudiante[]
): PromedioResult => {
    // Filtrar solo las notas que tienen evaluación
    const notasValidas = notasEstudiante.filter(nota => 
        evaluaciones.some(e => e.id === nota.evaluacionId)
    );
    
    if (notasValidas.length === 0) {
        return {
            promedio_numerico: 0,
            promedio_literal: 'C',
            total_evaluaciones: 0
        };
    }
    
    let promedioNumerico: number;
    
    // Verificar si se debe usar promedio ponderado
    if (validarPesos(evaluaciones)) {
        // Promedio ponderado
        const notasConPeso = notasValidas.map(nota => {
            const evaluacion = evaluaciones.find(e => e.id === nota.evaluacionId);
            return {
                puntaje: nota.puntaje,
                peso: evaluacion?.peso || 0
            };
        });
        
        promedioNumerico = calcularPromedioPonderado(notasConPeso);
    } else {
        // Promedio simple
        const puntajes = notasValidas.map(n => n.puntaje);
        promedioNumerico = calcularPromedioSimple(puntajes);
    }
    
    // Redondear a 2 decimales
    promedioNumerico = Math.round(promedioNumerico * 100) / 100;
    
    return {
        promedio_numerico: promedioNumerico,
        promedio_literal: convertirALiteral(promedioNumerico),
        total_evaluaciones: notasValidas.length
    };
};

/**
 * Calcula los promedios de todos los estudiantes
 */
export const calcularPromediosTodos = (
    evaluaciones: Evaluacion[],
    notasPorEstudiante: Map<number, NotaEstudiante[]>
): Map<number, PromedioResult> => {
    const promedios = new Map<number, PromedioResult>();
    
    notasPorEstudiante.forEach((notas, estudianteId) => {
        const promedio = calcularPromedioEstudiante(evaluaciones, notas);
        promedios.set(estudianteId, promedio);
    });
    
    return promedios;
};

/**
 * Valida que un puntaje esté en el rango correcto
 */
export const validarPuntaje = (puntaje: number): boolean => {
    return puntaje >= 0 && puntaje <= 20;
};

/**
 * Obtiene estadísticas generales de un conjunto de promedios
 */
export const calcularEstadisticas = (promedios: PromedioResult[]) => {
    if (promedios.length === 0) {
        return {
            promedio_general: 0,
            promedio_maximo: 0,
            promedio_minimo: 0,
            aprobados: 0,
            desaprobados: 0,
            total: 0
        };
    }
    
    const puntajes = promedios.map(p => p.promedio_numerico);
    const suma = puntajes.reduce((acc, p) => acc + p, 0);
    
    return {
        promedio_general: Math.round((suma / puntajes.length) * 100) / 100,
        promedio_maximo: Math.max(...puntajes),
        promedio_minimo: Math.min(...puntajes),
        aprobados: puntajes.filter(p => p >= 11).length,
        desaprobados: puntajes.filter(p => p < 11).length,
        total: puntajes.length
    };
};
