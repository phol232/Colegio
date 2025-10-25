import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { EvaluacionManager } from '../../components/EvaluacionManager';
import { GradesTable } from '../../components/GradesTable';
import { getCourseColor } from '../../utils/courseColors';
import { calcularPromedioEstudiante } from '../../utils/promedioCalculator';
import api from '../../services/api';

interface Curso {
    id: number;
    nombre: string;
    codigo: string;
    grado: string;
    seccion: string;
}

interface Estudiante {
    id: number;
    name: string;
    email: string;
}

interface Evaluacion {
    id: number;
    curso_id: number;
    unidad: number;
    nombre: string;
    tipo_evaluacion: string;
    peso: number | null;
    orden: number;
    total_notas: number;
}

interface NotaDetalle {
    id: number;
    evaluacion_id: number;
    estudiante_id: number;
    puntaje: number;
}

interface Promedio {
    promedio_numerico: number;
    promedio_literal: string;
    total_evaluaciones: number;
}

export const RegistroNotasUnidad = () => {
    const { cursoId, unidad } = useParams<{ cursoId: string; unidad: string }>();
    const navigate = useNavigate();

    const [curso, setCurso] = useState<Curso | null>(null);
    const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
    const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
    const [notas, setNotas] = useState<Map<string, number>>(new Map());
    const [notasOriginales, setNotasOriginales] = useState<Map<string, number>>(new Map());
    const [notasModificadas, setNotasModificadas] = useState<Set<string>>(new Set());
    const [promedios, setPromedios] = useState<Map<number, Promedio>>(new Map());
    const [loading, setLoading] = useState(true);
    const [cargandoDatos, setCargandoDatos] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        cargarDatos();
    }, [cursoId, unidad]);

    const cargarDatos = async () => {
        if (!cursoId || !unidad) return;

        setLoading(true);
        setCargandoDatos(true);
        setError(null);

        try {
            // Cargar todos los cursos del docente para obtener la info del curso
            const respCursos = await api.get('/docente/cursos');
            const cursoEncontrado = respCursos.data.data?.find((c: Curso) => c.id === parseInt(cursoId));
            
            if (!cursoEncontrado) {
                throw new Error('Curso no encontrado');
            }
            
            setCurso(cursoEncontrado);

            // Cargar estudiantes
            const respEstudiantes = await api.get(`/cursos/${cursoId}/estudiantes`);
            setEstudiantes(respEstudiantes.data.data || []);

            // Cargar evaluaciones
            const respEvaluaciones = await api.get(
                `/evaluaciones/curso/${cursoId}/unidad/${unidad}`
            );
            setEvaluaciones(respEvaluaciones.data.data || []);

            // Cargar notas de todas las evaluaciones
            const notasMap = new Map<string, number>();

            for (const evaluacion of respEvaluaciones.data.data || []) {
                const respNotas = await api.get(`/notas-detalle/evaluacion/${evaluacion.id}`);
                const notasEval = respNotas.data.data || [];

                notasEval.forEach((nota: NotaDetalle) => {
                    const key = `${nota.estudiante_id}-${nota.evaluacion_id}`;
                    notasMap.set(key, nota.puntaje);
                });
            }

            setNotas(notasMap);
            setNotasOriginales(new Map(notasMap)); // Guardar copia de las notas originales
            setNotasModificadas(new Set()); // Limpiar modificaciones

            // Calcular promedios en tiempo real
            calcularPromediosLocales(respEvaluaciones.data.data || [], notasMap, respEstudiantes.data.data || []);

        } catch (error: any) {
            console.error('Error al cargar datos:', error);
            const errorMsg = error.response?.data?.message || 'Error al cargar los datos';
            setError(errorMsg);
            alert(errorMsg);
        } finally {
            setLoading(false);
            setCargandoDatos(false);
        }
    };

    const calcularPromediosLocales = (evals: Evaluacion[], notasMap: Map<string, number>, estudiantesData: Estudiante[]) => {
        const promediosMap = new Map<number, Promedio>();

        estudiantesData.forEach(estudiante => {
            const notasEstudiante = evals
                .map(evaluacion => ({
                    evaluacionId: evaluacion.id,
                    puntaje: notasMap.get(`${estudiante.id}-${evaluacion.id}`)
                }))
                .filter(n => n.puntaje !== undefined) as Array<{ evaluacionId: number; puntaje: number }>;

            if (notasEstudiante.length > 0) {
                const promedio = calcularPromedioEstudiante(evals, notasEstudiante);
                promediosMap.set(estudiante.id, promedio);
            }
        });

        setPromedios(promediosMap);
    };

    const handleNotaChange = (estudianteId: number, evaluacionId: number, puntaje: number | null) => {
        const key = `${estudianteId}-${evaluacionId}`;
        const nuevasNotas = new Map(notas);
        const nuevasModificadas = new Set(notasModificadas);

        if (puntaje === null) {
            nuevasNotas.delete(key);
        } else {
            nuevasNotas.set(key, puntaje);
        }

        // Marcar como modificada si es diferente a la original
        const notaOriginal = notasOriginales.get(key);
        if (puntaje !== notaOriginal) {
            nuevasModificadas.add(key);
        } else {
            nuevasModificadas.delete(key);
        }

        setNotas(nuevasNotas);
        setNotasModificadas(nuevasModificadas);
        calcularPromediosLocales(evaluaciones, nuevasNotas, estudiantes);
    };

    const guardarNotas = async () => {
        if (!curso) {
            alert('Error: No hay curso seleccionado');
            return;
        }

        if (notasModificadas.size === 0) {
            alert('No hay cambios para guardar.');
            return;
        }

        // Preparar solo las notas modificadas
        const notasArray: Array<{ evaluacion_id: number; estudiante_id: number; puntaje: number }> = [];
        
        notasModificadas.forEach(key => {
            const puntaje = notas.get(key);
            if (puntaje !== undefined) {
                const [estudiante_id, evaluacion_id] = key.split('-').map(Number);
                
                // Validar rango
                if (puntaje < 0 || puntaje > 20) {
                    alert(`Nota inválida: ${puntaje} (debe estar entre 0 y 20)`);
                    return;
                }
                
                notasArray.push({ evaluacion_id, estudiante_id, puntaje });
            }
        });

        if (notasArray.length === 0) {
            alert('No hay notas válidas para guardar.');
            return;
        }

        setGuardando(true);
        setError(null);

        try {
            const response = await api.post('/notas-detalle/bulk', { notas: notasArray });

            if (response.data.success) {
                alert(`✓ Notas guardadas exitosamente\n\nRegistradas: ${notasArray.length}`);
                // Actualizar las notas originales con las nuevas
                const nuevasOriginales = new Map(notasOriginales);
                notasArray.forEach(nota => {
                    const key = `${nota.estudiante_id}-${nota.evaluacion_id}`;
                    nuevasOriginales.set(key, nota.puntaje);
                });
                setNotasOriginales(nuevasOriginales);
                setNotasModificadas(new Set()); // Limpiar modificaciones
            } else {
                alert(response.data.message || 'Error al guardar notas');
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.message ||
                error.response?.data?.errors?.notas?.[0] ||
                'Error al guardar notas. Por favor intenta nuevamente.';
            setError(errorMsg);
            alert(errorMsg);
        } finally {
            setGuardando(false);
        }
    };

    const handleEvaluacionCreated = (evaluacion: Evaluacion) => {
        setEvaluaciones([...evaluaciones, evaluacion]);
    };

    const handleEvaluacionUpdated = (evaluacion: Evaluacion) => {
        setEvaluaciones(evaluaciones.map(e => e.id === evaluacion.id ? evaluacion : e));
    };

    const handleEvaluacionDeleted = (evaluacionId: number) => {
        setEvaluaciones(evaluaciones.filter(e => e.id !== evaluacionId));

        // Eliminar notas de esa evaluación
        const nuevasNotas = new Map(notas);
        Array.from(nuevasNotas.keys()).forEach(key => {
            if (key.endsWith(`-${evaluacionId}`)) {
                nuevasNotas.delete(key);
            }
        });
        setNotas(nuevasNotas);
        calcularPromediosLocales(evaluaciones.filter(e => e.id !== evaluacionId), nuevasNotas, estudiantes);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C62828]"></div>
                </div>
            </Layout>
        );
    }

    if (!curso) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <p className="text-red-600 mb-4">Curso no encontrado</p>
                        <button
                            onClick={() => navigate('/docente/notas')}
                            className="px-4 py-2 bg-[#C62828] text-white rounded-lg hover:bg-[#B71C1C]"
                        >
                            Volver
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    const courseColor = getCourseColor(curso.nombre);

    return (
        <Layout>
            <div className="min-h-screen bg-[#F4F6F8]">
                {/* Header */}
                <div className="bg-white border-b border-[#E5E7EB] shadow-sm">
                    <div className="max-w-[1600px] mx-auto px-6 py-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/docente/notas')}
                                className="text-[#6B7280] hover:text-[#1F2937] transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-[#0E2B5C]">
                                    {curso.nombre} - Unidad {unidad}
                                </h1>
                                <p className="text-sm text-[#6B7280] mt-1">
                                    {curso.codigo} • {curso.grado} • Sección {curso.seccion}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Banner */}
                <div className="bg-[#EFF6FF] border-b border-[#17A2E5]">
                    <div className="max-w-[1600px] mx-auto px-6 py-3">
                        <p className="text-sm text-[#0E2B5C]">
                            ℹ️ Las notas deben estar en el rango de 0 a 20. Nota mínima aprobatoria: 11
                        </p>
                    </div>
                </div>

                {/* Contenido Principal */}
                <div className="max-w-[1600px] mx-auto px-6 py-6">
                    {/* Gestión de Evaluaciones */}
                    <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6 mb-6">
                        <EvaluacionManager
                            cursoId={parseInt(cursoId!)}
                            unidad={parseInt(unidad!)}
                            evaluaciones={evaluaciones}
                            onEvaluacionCreated={handleEvaluacionCreated}
                            onEvaluacionUpdated={handleEvaluacionUpdated}
                            onEvaluacionDeleted={handleEvaluacionDeleted}
                        />
                    </div>

                    {/* Tabla de Notas */}
                    <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                        {cargandoDatos ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C62828] mx-auto mb-4"></div>
                                    <p className="text-sm text-[#6B7280]">Cargando datos...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-red-600 mb-2">{error}</p>
                                    <button
                                        onClick={() => cargarDatos()}
                                        className="px-4 py-2 bg-[#C62828] text-white rounded-lg text-sm hover:bg-[#B71C1C]"
                                    >
                                        Reintentar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <GradesTable
                                evaluaciones={evaluaciones}
                                estudiantes={estudiantes}
                                notas={notas}
                                promedios={promedios}
                                courseColor={courseColor}
                                onNotaChange={handleNotaChange}
                                onGuardarNotas={guardarNotas}
                                guardando={guardando}
                            />
                        )}
                    </div>

                    {/* Estadísticas */}
                    {promedios.size > 0 && (
                        <div className="mt-6 bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <h3 className="text-sm font-semibold text-[#0E2B5C] mb-4">Estadísticas</h3>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-[#0E2B5C]">{estudiantes.length}</p>
                                    <p className="text-xs text-[#6B7280] mt-1">Total Estudiantes</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-[#17A2E5]">{promedios.size}</p>
                                    <p className="text-xs text-[#6B7280] mt-1">Con Notas</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-[#22C55E]">
                                        {Array.from(promedios.values()).filter(p => p.promedio_numerico >= 11).length}
                                    </p>
                                    <p className="text-xs text-[#6B7280] mt-1">Aprobados</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-[#DC2626]">
                                        {Array.from(promedios.values()).filter(p => p.promedio_numerico < 11).length}
                                    </p>
                                    <p className="text-xs text-[#6B7280] mt-1">Desaprobados</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};
