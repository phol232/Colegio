import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { getCourseColor } from '../../utils/courseColors';
import api from '../../services/api';

interface NotaDetallada {
    curso_id: number;
    curso_nombre: string;
    curso_codigo: string;
    evaluaciones: {
        id: number;
        nombre: string;
        tipo_evaluacion: string;
        mes: number;
        puntaje: number | null;
        peso: number | null;
    }[];
    promedio_numerico: number;
    promedio_literal: string;
}

const MESES = {
    3: 'Marzo',
    4: 'Abril',
    5: 'Mayo',
    6: 'Junio',
    7: 'Julio',
    8: 'Agosto',
    9: 'Septiembre',
    10: 'Octubre',
    11: 'Noviembre',
    12: 'Diciembre'
};

// Helper functions
const getNotaColor = (puntaje: number | null): string => {
    if (puntaje === null) return 'text-[#6B7280]';
    if (puntaje >= 17) return 'text-[#22C55E]';
    if (puntaje >= 14) return 'text-[#17A2E5]';
    if (puntaje >= 11) return 'text-[#F4C20D]';
    return 'text-[#DC2626]';
};

const getNotaBg = (puntaje: number | null): string => {
    if (puntaje === null) return 'bg-[#F5F7FA]';
    if (puntaje >= 17) return 'bg-[#F0FDF4]';
    if (puntaje >= 14) return 'bg-[#EFF6FF]';
    if (puntaje >= 11) return 'bg-[#FFFBEB]';
    return 'bg-[#FEF2F2]';
};

// Componente para la fila de evaluación
const EvaluacionRow: React.FC<{ evaluacion: NotaDetallada['evaluaciones'][0] }> = ({ evaluacion }) => (
    <tr className="border-b border-[#F5F7FA]">
        <td className="py-3 px-4">
            <p className="text-sm font-medium text-[#1F2937]">{evaluacion.nombre}</p>
        </td>
        <td className="py-3 px-4">
            <span className="px-2 py-1 bg-[#EFF6FF] text-[#17A2E5] rounded text-xs">
                {evaluacion.tipo_evaluacion}
            </span>
        </td>
        <td className="py-3 px-4 text-center">
            <span className="text-sm text-[#6B7280]">
                {MESES[evaluacion.mes as keyof typeof MESES]}
            </span>
        </td>
        <td className="py-3 px-4 text-center">
            {evaluacion.peso ? (
                <span className="text-sm font-medium text-[#1F2937]">{evaluacion.peso}%</span>
            ) : (
                <span className="text-sm text-[#6B7280]">-</span>
            )}
        </td>
        <td className="py-3 px-4 text-center">
            <div className={`inline-flex items-center justify-center w-16 h-8 rounded-lg ${getNotaBg(evaluacion.puntaje)}`}>
                <span className={`text-sm font-bold ${getNotaColor(evaluacion.puntaje)}`}>
                    {evaluacion.puntaje !== null ? evaluacion.puntaje.toFixed(1) : '-'}
                </span>
            </div>
        </td>
    </tr>
);

// Componente para el estado vacío
const EmptyState: React.FC<{ filtroMes: number | null }> = ({ filtroMes }) => (
    <div className="text-center py-8">
        <svg className="w-16 h-16 mx-auto mb-4 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-[#6B7280]">
            {filtroMes ? `No hay evaluaciones en ${MESES[filtroMes as keyof typeof MESES]}` : 'No hay evaluaciones registradas'}
        </p>
    </div>
);

// Componente para la tarjeta de curso
const CursoCard: React.FC<{
    curso: NotaDetallada;
    evaluacionesVisibles: NotaDetallada['evaluaciones']
}> = ({ curso, evaluacionesVisibles }) => {
    const courseColor = getCourseColor(curso.curso_nombre);

    return (
        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-shadow">
            {/* Header del Curso */}
            <div className="p-4" style={{ backgroundColor: courseColor.light }}>
                <div className="flex items-center space-x-3 mb-3">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: courseColor.primary }}
                    >
                        {curso.curso_nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-[#0E2B5C] truncate">{curso.curso_nombre}</h3>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6B7280]">Promedio</span>
                    <div className="text-right">
                        <p className={`text-2xl font-bold ${getNotaColor(curso.promedio_numerico)}`}>
                            {curso.promedio_numerico.toFixed(1)}
                        </p>
                        <p className="text-xs text-[#6B7280]">{curso.promedio_literal}</p>
                    </div>
                </div>
            </div>

            {/* Evaluaciones - Versión simplificada */}
            <div className="p-4 border-t border-[#E5E7EB]">
                {evaluacionesVisibles.length > 0 ? (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-[#6B7280] uppercase mb-2">Evaluaciones</p>
                        {evaluacionesVisibles.slice(0, 3).map((evaluacion) => (
                            <div key={evaluacion.id} className="flex items-center justify-between py-2 border-b border-[#F5F7FA] last:border-0">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[#1F2937] truncate">{evaluacion.nombre}</p>
                                    <p className="text-xs text-[#6B7280]">{MESES[evaluacion.mes as keyof typeof MESES]}</p>
                                </div>
                                <div className={`ml-2 px-2 py-1 rounded ${getNotaBg(evaluacion.puntaje)}`}>
                                    <span className={`text-sm font-bold ${getNotaColor(evaluacion.puntaje)}`}>
                                        {evaluacion.puntaje !== null ? evaluacion.puntaje.toFixed(1) : '-'}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {evaluacionesVisibles.length > 3 && (
                            <p className="text-xs text-[#17A2E5] text-center pt-2">
                                +{evaluacionesVisibles.length - 3} más
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-xs text-[#6B7280]">Sin evaluaciones</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export const MisNotas = () => {
    const navigate = useNavigate();
    const [notasDetalladas, setNotasDetalladas] = useState<NotaDetallada[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroMes, setFiltroMes] = useState<number | null>(null);

    useEffect(() => {
        cargarNotasDetalladas();
    }, []);

    const cargarNotasDetalladas = async () => {
        try {
            setLoading(true);
            const response = await api.get('/notas/estudiante/detalladas');
            
            // Los datos ya vienen con evaluaciones desde el backend
            const notasTransformadas = (response.data.data || []).map((nota: any) => ({
                curso_id: nota.curso_id,
                curso_nombre: nota.curso_nombre,
                curso_codigo: nota.curso_codigo || '',
                evaluaciones: nota.evaluaciones || [],
                promedio_numerico: nota.promedio_numerico,
                promedio_literal: nota.promedio_literal
            }));
            
            setNotasDetalladas(notasTransformadas);
        } catch (error) {
            console.error('Error al cargar notas detalladas:', error);
        } finally {
            setLoading(false);
        }
    };

    const evaluacionesFiltradas = (evaluaciones: NotaDetallada['evaluaciones']) => {
        if (filtroMes === null) return evaluaciones;
        return evaluaciones.filter(evaluacion => evaluacion.mes === filtroMes);
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

    return (
        <Layout>
            <div className="min-h-screen bg-[#F4F6F8]">
                {/* Header */}
                <div className="bg-white border-b border-[#E5E7EB] shadow-sm">
                    <div className="max-w-[1600px] mx-auto px-6 py-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/estudiante/dashboard')}
                                className="text-[#6B7280] hover:text-[#1F2937] transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-[#0E2B5C]">Mis Notas</h1>
                                <p className="text-sm text-[#6B7280] mt-1">Consulta tus calificaciones por curso</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto px-6 py-6">
                    {/* Filtros */}
                    <div className="mb-6 bg-white rounded-lg shadow border border-[#E5E7EB] p-4">
                        <div className="flex items-center space-x-4">
                            <label className="text-sm font-medium text-[#6B7280]">Filtrar por mes:</label>
                            <select
                                value={filtroMes || ''}
                                onChange={(e) => setFiltroMes(e.target.value ? parseInt(e.target.value) : null)}
                                className="px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#17A2E5] text-sm"
                            >
                                <option value="">Todos los meses</option>
                                {Object.entries(MESES).map(([num, nombre]) => (
                                    <option key={num} value={num}>{nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Notas por Curso */}
                    {notasDetalladas.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {notasDetalladas.map((curso) => (
                                <CursoCard
                                    key={curso.curso_id}
                                    curso={curso}
                                    evaluacionesVisibles={evaluacionesFiltradas(curso.evaluaciones)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-12">
                            <div className="text-center">
                                <svg className="w-24 h-24 mx-auto mb-4 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 className="text-lg font-medium text-[#1F2937] mb-2">No hay notas registradas</h3>
                                <p className="text-sm text-[#6B7280]">Aún no tienes calificaciones registradas en el sistema.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};