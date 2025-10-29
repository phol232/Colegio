import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { getCourseColor } from '../../utils/courseColors';
import api from '../../services/api';

interface AsistenciaDetallada {
    curso_id: number;
    curso_nombre: string;
    curso_codigo: string;
    registros: {
        id: number;
        fecha: string;
        estado: 'presente' | 'ausente' | 'tardanza';
        observaciones?: string;
    }[];
    estadisticas: {
        total_clases: number;
        asistencias: number;
        tardanzas: number;
        faltas: number;
        porcentaje_asistencia: number;
    };
}

export const MisAsistencias = () => {
    const navigate = useNavigate();
    const [asistenciasDetalladas, setAsistenciasDetalladas] = useState<AsistenciaDetallada[]>([]);
    const [loading, setLoading] = useState(true);
    const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('');

    useEffect(() => {
        cargarAsistenciasDetalladas();
    }, [fechaSeleccionada]);

    const cargarAsistenciasDetalladas = async () => {
        try {
            setLoading(true);
            
            // Agregar fecha como parámetro si está seleccionada
            const params = fechaSeleccionada ? { fecha: fechaSeleccionada } : {};
            const response = await api.get('/asistencias/estudiante', { params });

            // Transformar los datos del resumen a formato detallado
            const asistenciasTransformadas = (response.data.data || []).map((asist: any) => ({
                curso_id: asist.curso_id,
                curso_nombre: asist.curso_nombre,
                curso_codigo: '',
                registros: [],
                estadisticas: {
                    total_clases: parseInt(asist.total_clases) || 0,
                    asistencias: parseInt(asist.asistencias) || 0,
                    tardanzas: parseInt(asist.tardanzas) || 0,
                    faltas: parseInt(asist.faltas) || 0,
                    porcentaje_asistencia: parseFloat(asist.porcentaje_asistencia) || 0
                }
            }));

            setAsistenciasDetalladas(asistenciasTransformadas);
        } catch (error) {
            console.error('Error al cargar asistencias detalladas:', error);
        } finally {
            setLoading(false);
        }
    };



    const getAsistenciaColor = (porcentaje: number) => {
        if (porcentaje >= 90) return 'text-[#22C55E]';
        if (porcentaje >= 80) return 'text-[#F4C20D]';
        return 'text-[#DC2626]';
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
                                <h1 className="text-2xl font-bold text-[#0E2B5C]">Mis Asistencias</h1>
                                <p className="text-sm text-[#6B7280] mt-1">Consulta tu registro de asistencias por curso</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto px-6 py-6">
                    {/* Filtros */}
                    <div className="mb-6 bg-white rounded-lg shadow border border-[#E5E7EB] p-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium text-[#6B7280]">Seleccionar fecha:</label>
                                <input
                                    type="date"
                                    value={fechaSeleccionada}
                                    onChange={(e) => setFechaSeleccionada(e.target.value)}
                                    className="px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#17A2E5] text-sm"
                                />
                            </div>
                            {fechaSeleccionada && (
                                <button
                                    onClick={() => setFechaSeleccionada('')}
                                    className="px-3 py-2 text-sm text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                                >
                                    Ver todas las fechas
                                </button>
                            )}
                            {fechaSeleccionada && (
                                <p className="text-sm text-[#6B7280]">
                                    Mostrando asistencias del {new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-ES', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Asistencias por Curso */}
                    {asistenciasDetalladas.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {asistenciasDetalladas.map((curso) => {
                                const courseColor = getCourseColor(curso.curso_nombre);

                                return (
                                    <div key={curso.curso_id} className="bg-white rounded-lg shadow border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-shadow">
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
                                                <span className="text-xs text-[#6B7280]">Asistencia</span>
                                                <div className="text-right">
                                                    <p className={`text-2xl font-bold ${getAsistenciaColor(curso.estadisticas.porcentaje_asistencia)}`}>
                                                        {curso.estadisticas.porcentaje_asistencia.toFixed(1)}%
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Estadísticas */}
                                        <div className="p-4 border-t border-[#E5E7EB]">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="text-center p-2 bg-[#F0FDF4] rounded">
                                                    <p className="text-lg font-bold text-[#22C55E]">{curso.estadisticas.asistencias}</p>
                                                    <p className="text-xs text-[#6B7280]">Presentes</p>
                                                </div>
                                                <div className="text-center p-2 bg-[#FFFBEB] rounded">
                                                    <p className="text-lg font-bold text-[#F4C20D]">{curso.estadisticas.tardanzas}</p>
                                                    <p className="text-xs text-[#6B7280]">Tardanzas</p>
                                                </div>
                                                <div className="text-center p-2 bg-[#FEF2F2] rounded">
                                                    <p className="text-lg font-bold text-[#DC2626]">{curso.estadisticas.faltas}</p>
                                                    <p className="text-xs text-[#6B7280]">Faltas</p>
                                                </div>
                                                <div className="text-center p-2 bg-[#F5F7FA] rounded">
                                                    <p className="text-lg font-bold text-[#1F2937]">{curso.estadisticas.total_clases}</p>
                                                    <p className="text-xs text-[#6B7280]">Total</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-12">
                            <div className="text-center">
                                <svg className="w-24 h-24 mx-auto mb-4 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                <h3 className="text-lg font-medium text-[#1F2937] mb-2">No hay asistencias registradas</h3>
                                <p className="text-sm text-[#6B7280]">Aún no tienes registros de asistencia en el sistema.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};