import { sameId, type ApiId } from './ids';

interface Evaluacion {
    id: ApiId;
    peso: number | null;
}

interface NotaEstudiante {
    evaluacionId: ApiId;
    puntaje: number;
}

interface PromedioResult {
    promedio_numerico: number;
    total_evaluaciones: number;
}

export const calcularPromedioSimple = (notas: number[]): number => {
    if (notas.length === 0) return 0;
    const suma = notas.reduce((acc, nota) => acc + nota, 0);
    return suma / notas.length;
};

export const calcularPromedioPonderado = (
    notasConPeso: Array<{ puntaje: number; peso: number }>
): number => {
    if (notasConPeso.length === 0) return 0;

    const totalPeso = notasConPeso.reduce((acc, item) => acc + item.peso, 0);
    if (totalPeso <= 0) return 0;

    const sumaProductos = notasConPeso.reduce(
        (acc, item) => acc + item.puntaje * item.peso,
        0
    );

    return sumaProductos / totalPeso;
};

export const tienePesos = (evaluaciones: Evaluacion[]): boolean => {
    return evaluaciones.some(e => e.peso != null && Number(e.peso) > 0);
};

export const validarPesos = (evaluaciones: Evaluacion[]): boolean => {
    const evaluacionesConPeso = evaluaciones.filter(e => e.peso !== null && Number(e.peso) > 0);

    if (evaluacionesConPeso.length !== evaluaciones.length || evaluaciones.length === 0) {
        return false;
    }

    const sumaPesos = evaluacionesConPeso.reduce((sum, e) => sum + (e.peso || 0), 0);
    return Math.abs(sumaPesos - 100) < 0.01;
};

/**
 * Calcula el promedio de un estudiante según las evaluaciones y notas
 */
export const calcularPromedioEstudiante = (
    evaluaciones: Evaluacion[],
    notasEstudiante: NotaEstudiante[]
): PromedioResult => {
    const notasValidas = notasEstudiante.filter(nota =>
        evaluaciones.some(e => sameId(e.id, nota.evaluacionId))
    );
    
    if (notasValidas.length === 0) {
        return {
            promedio_numerico: 0,
            total_evaluaciones: 0
        };
    }
    
    let promedioNumerico: number;
    
    if (tienePesos(evaluaciones)) {
        const notasConPeso = notasValidas
            .map(nota => {
                const evaluacion = evaluaciones.find(e => sameId(e.id, nota.evaluacionId));
                return {
                    puntaje: nota.puntaje,
                    peso: Number(evaluacion?.peso) || 0
                };
            })
            .filter(n => n.peso > 0);
        
        promedioNumerico = calcularPromedioPonderado(notasConPeso);
    } else {
        const puntajes = notasValidas.map(n => n.puntaje);
        promedioNumerico = calcularPromedioSimple(puntajes);
    }
    
    promedioNumerico = Math.round(promedioNumerico * 100) / 100;
    
    return {
        promedio_numerico: promedioNumerico,
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
