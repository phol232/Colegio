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

// Componente para la tarjeta de evaluación en el modal
const EvaluacionCard: React.FC<{ evaluacion: NotaDetallada['evaluaciones'][0] }> = ({ evaluacion }) => (
    <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
                <h4 className="text-sm font-semibold text-[#1F2937] mb-1">{evaluacion.nombre}</h4>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#17A2E5] rounded text-xs font-medium">
                        {evaluacion.tipo_evaluacion}
                    </span>
                    <span className="text-xs text-[#6B7280]">
                        {MESES[evaluacion.mes as keyof typeof MESES]}
                    </span>
                </div>
            </div>
            <div className={`flex items-center justify-center w-16 h-16 rounded-lg ${getNotaBg(evaluacion.puntaje)}`}>
                <span className={`text-xl font-bold ${getNotaColor(evaluacion.puntaje)}`}>
                    {evaluacion.puntaje !== null ? evaluacion.puntaje.toFixed(1) : '-'}
                </span>
            </div>
        </div>
        {evaluacion.peso && (
            <div className="text-xs text-[#6B7280]">
                Peso: <span className="font-medium text-[#1F2937]">{evaluacion.peso}%</span>
            </div>
        )}
    </div>
);

// Componente para la tarjeta de curso
const CursoCard: React.FC<{
    curso: NotaDetallada;
    mesSeleccionado: number | null;
    onMesChange: (mes: number | null) => void;
    onVerNotas: () => void;
}> = ({ curso, mesSeleccionado, onMesChange, onVerNotas }) => {
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

            {/* Controles */}
            <div className="p-4 border-t border-[#E5E7EB] space-y-3">
                <div>
                    <label className="text-xs font-medium text-[#6B7280] block mb-1">Filtrar por mes:</label>
                    <select
                        value={mesSeleccionado || ''}
                        onChange={(e) => onMesChange(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-2 py-1.5 text-sm border border-[#E5E7EB] rounded focus:ring-2 focus:ring-[#17A2E5]"
                    >
                        <option value="">Todos los meses</option>
                        {Object.entries(MESES).map(([num, nombre]) => (
                            <option key={num} value={num}>{nombre}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={onVerNotas}
                    className="w-full px-3 py-2 bg-[#17A2E5] hover:bg-[#1589C6] text-white text-sm font-medium rounded-lg transition-colors"
                >
                    Ver Notas
                </button>
            </div>
        </div>
    );
};

export const MisNotas = () => {
    const navigate = useNavigate();
    const [notasDetalladas, setNotasDetalladas] = useState<NotaDetallada[]>([]);
    const [loading, setLoading] = useState(true);
    const [cursoSeleccionado, setCursoSeleccionado] = useState<NotaDetallada | null>(null);
    const [mesSeleccionado, setMesSeleccionado] = useState<{ [key: number]: number | null }>({});
    const [mesModalSeleccionado, setMesModalSeleccionado] = useState<number | null>(null);

    useEffect(() => {
        cargarNotasDetalladas();
    }, []);

    const cargarNotasDetalladas = async () => {
        try {
            setLoading(true);
            const response = await api.get('/notas/estudiante/detalladas');

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

    const handleVerNotas = (curso: NotaDetallada) => {
        setCursoSeleccionado(curso);
        setMesModalSeleccionado(mesSeleccionado[curso.curso_id] || null);
    };

    const handleCerrarModal = () => {
        setCursoSeleccionado(null);
        setMesModalSeleccionado(null);
    };

    const handleMesChange = (cursoId: number, mes: number | null) => {
        setMesSeleccionado(prev => ({ ...prev, [cursoId]: mes }));
    };

    const getEvaluacionesFiltradas = (evaluaciones: NotaDetallada['evaluaciones']) => {
        if (!mesModalSeleccionado) return evaluaciones;
        return evaluaciones.filter(ev => ev.mes === mesModalSeleccionado);
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
                    {/* Notas por Curso */}
                    {notasDetalladas.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {notasDetalladas.map((curso) => (
                                <CursoCard
                                    key={curso.curso_id}
                                    curso={curso}
                                    mesSeleccionado={mesSeleccionado[curso.curso_id] || null}
                                    onMesChange={(mes) => handleMesChange(curso.curso_id, mes)}
                                    onVerNotas={() => handleVerNotas(curso)}
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

                {/* Modal de Notas */}
                {cursoSeleccionado && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                            {/* Header del Modal */}
                            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-[#0E2B5C]">{cursoSeleccionado.curso_nombre}</h2>
                                    <p className="text-sm text-[#6B7280] mt-1">
                                        Promedio: <span className={`font-bold ${getNotaColor(cursoSeleccionado.promedio_numerico)}`}>
                                            {cursoSeleccionado.promedio_numerico.toFixed(1)}
                                        </span> ({cursoSeleccionado.promedio_literal})
                                    </p>
                                </div>
                                <button
                                    onClick={handleCerrarModal}
                                    className="text-[#6B7280] hover:text-[#1F2937] transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Filtro de mes en el modal */}
                            <div className="px-6 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-medium text-[#6B7280]">Filtrar por mes:</label>
                                    <select
                                        value={mesModalSeleccionado || ''}
                                        onChange={(e) => setMesModalSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
                                        className="px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#17A2E5]"
                                    >
                                        <option value="">Todos los meses</option>
                                        {Object.entries(MESES).map(([num, nombre]) => (
                                            <option key={num} value={num}>{nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Contenido del Modal - Tarjetas de Evaluaciones */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                                {getEvaluacionesFiltradas(cursoSeleccionado.evaluaciones).length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {getEvaluacionesFiltradas(cursoSeleccionado.evaluaciones).map((evaluacion) => (
                                            <EvaluacionCard key={evaluacion.id} evaluacion={evaluacion} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <svg className="w-16 h-16 mx-auto mb-4 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-sm text-[#6B7280]">
                                            {mesModalSeleccionado
                                                ? `No hay evaluaciones en ${MESES[mesModalSeleccionado as keyof typeof MESES]}`
                                                : 'No hay evaluaciones registradas'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};