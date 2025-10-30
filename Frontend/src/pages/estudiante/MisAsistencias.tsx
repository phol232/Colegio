import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
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

// Componente para tarjeta de asistencia por día
const AsistenciaDiaCard: React.FC<{ registro: AsistenciaDetallada['registros'][0] }> = ({ registro }) => {
    const getEstadoConfig = (estado: string) => {
        switch (estado) {
            case 'presente':
                return { bg: 'bg-[#F0FDF4]', text: 'text-[#22C55E]', icon: '✓', label: 'Presente' };
            case 'tardanza':
                return { bg: 'bg-[#FFFBEB]', text: 'text-[#F4C20D]', icon: '⏱', label: 'Tardanza' };
            case 'ausente':
                return { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', icon: '✗', label: 'Ausente' };
            default:
                return { bg: 'bg-[#F5F7FA]', text: 'text-[#6B7280]', icon: '?', label: 'Desconocido' };
        }
    };

    const config = getEstadoConfig(registro.estado);
    // Parsear la fecha correctamente (puede venir como ISO string o como fecha simple)
    const fecha = new Date(registro.fecha);

    return (
        <div className={`${config.bg} rounded-lg border border-[#E5E7EB] p-4 hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1F2937] capitalize">
                        {fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                        {fecha.toLocaleDateString('es-ES', { year: 'numeric' })}
                    </p>
                </div>
                <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${config.bg} border-2 ${config.text.replace('text-', 'border-')}`}>
                    <span className={`text-2xl ${config.text}`}>{config.icon}</span>
                </div>
            </div>
            <div className="mt-3">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${config.text} ${config.bg}`}>
                    {config.label}
                </span>
            </div>
            {registro.observaciones && (
                <p className="text-xs text-[#6B7280] mt-2 italic">{registro.observaciones}</p>
            )}
        </div>
    );
};

const MESES = [
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
];

export const MisAsistencias = () => {
    const navigate = useNavigate();
    const [asistenciasDetalladas, setAsistenciasDetalladas] = useState<AsistenciaDetallada[]>([]);
    const [loading, setLoading] = useState(true);
    const [cursoSeleccionado, setCursoSeleccionado] = useState<AsistenciaDetallada | null>(null);
    const [loadingDetalle, setLoadingDetalle] = useState(false);
    const [mesSeleccionado, setMesSeleccionado] = useState<number | null>(null);

    useEffect(() => {
        cargarAsistenciasDetalladas();
    }, [mesSeleccionado]);

    const cargarAsistenciasDetalladas = async () => {
        try {
            setLoading(true);
            const params = mesSeleccionado ? { mes: mesSeleccionado } : {};
            const response = await api.get('/asistencias/estudiante', { params });

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

    const cargarDetalleAsistencias = async (cursoId: number) => {
        try {
            setLoadingDetalle(true);
            const response = await api.get(`/asistencias/estudiante/curso/${cursoId}`);
            
            const curso = asistenciasDetalladas.find(c => c.curso_id === cursoId);
            if (curso && response.data.data) {
                setCursoSeleccionado({
                    ...curso,
                    registros: response.data.data.map((reg: any) => ({
                        id: reg.id,
                        fecha: reg.fecha,
                        estado: reg.estado,
                        observaciones: reg.observaciones
                    }))
                });
            }
        } catch (error) {
            console.error('Error al cargar detalle de asistencias:', error);
        } finally {
            setLoadingDetalle(false);
        }
    };

    const handleVerDetalle = (curso: AsistenciaDetallada) => {
        cargarDetalleAsistencias(curso.curso_id);
    };

    const handleCerrarModal = () => {
        setCursoSeleccionado(null);
    };

    const getFaltasColor = (faltas: number) => {
        if (faltas === 0) return 'text-[#22C55E]';
        if (faltas <= 2) return 'text-[#F4C20D]';
        return 'text-[#DC2626]';
    };

    const getPorcentajeFaltasColor = (porcentajeFaltas: number) => {
        if (porcentajeFaltas === 0) return 'text-[#22C55E]';
        if (porcentajeFaltas <= 10) return 'text-[#F4C20D]';
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
                                <h1 className="text-2xl font-bold text-[#0E2B5C]">Reporte de Asistencias</h1>
                                <p className="text-sm text-[#6B7280] mt-1">Consulta tu registro de asistencias por curso</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto px-6 py-6">
                    {/* Filtro de Mes */}
                    <div className="mb-6 bg-white rounded-lg shadow border border-[#E5E7EB] p-4">
                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium text-[#6B7280]">Filtrar por mes:</label>
                            <select
                                value={mesSeleccionado || ''}
                                onChange={(e) => setMesSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
                                className="px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#17A2E5] text-sm"
                            >
                                <option value="">Todos los meses</option>
                                {MESES.map((mes) => (
                                    <option key={mes.valor} value={mes.valor}>{mes.nombre}</option>
                                ))}
                            </select>
                            {mesSeleccionado && (
                                <span className="text-sm text-[#6B7280]">
                                    Mostrando asistencias de {MESES.find(m => m.valor === mesSeleccionado)?.nombre}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Tabla de Asistencias */}
                    {asistenciasDetalladas.length > 0 ? (
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[#17A2E5] text-white">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Asignatura</th>
                                            <th className="px-6 py-3 text-center text-sm font-semibold">N° de Faltas</th>
                                            <th className="px-6 py-3 text-center text-sm font-semibold">% de Faltas</th>
                                            <th className="px-6 py-3 text-center text-sm font-semibold">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E5E7EB]">
                                        {asistenciasDetalladas.map((curso, index) => {
                                            // Calcular porcentaje de faltas sobre 20 días de clases por mes
                                            const DIAS_CLASES_MES = 20;
                                            const porcentajeFaltas = (curso.estadisticas.faltas / DIAS_CLASES_MES) * 100;

                                            return (
                                                <tr 
                                                    key={curso.curso_id} 
                                                    className={index % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}
                                                >
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-medium text-[#1F2937]">{curso.curso_nombre}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`text-lg font-bold ${getFaltasColor(curso.estadisticas.faltas)}`}>
                                                            {curso.estadisticas.faltas}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`text-lg font-bold ${getPorcentajeFaltasColor(porcentajeFaltas)}`}>
                                                            {porcentajeFaltas.toFixed(0)}%
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => handleVerDetalle(curso)}
                                                            className="px-4 py-2 bg-[#17A2E5] hover:bg-[#1589C6] text-white text-sm font-medium rounded-lg transition-colors"
                                                        >
                                                            Ver detalle
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
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

                {/* Modal de Detalle de Asistencias */}
                {cursoSeleccionado && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
                            {/* Header del Modal */}
                            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-[#0E2B5C]">{cursoSeleccionado.curso_nombre}</h2>
                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                        <span className="text-[#6B7280]">
                                            Total clases: <span className="font-semibold text-[#1F2937]">{cursoSeleccionado.estadisticas.total_clases}</span>
                                        </span>
                                        <span className="text-[#22C55E]">
                                            Presentes: <span className="font-semibold">{cursoSeleccionado.estadisticas.asistencias}</span>
                                        </span>
                                        <span className="text-[#F4C20D]">
                                            Tardanzas: <span className="font-semibold">{cursoSeleccionado.estadisticas.tardanzas}</span>
                                        </span>
                                        <span className="text-[#DC2626]">
                                            Faltas: <span className="font-semibold">{cursoSeleccionado.estadisticas.faltas}</span>
                                        </span>
                                    </div>
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

                            {/* Contenido del Modal - Tarjetas de Asistencias por Día */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                                {loadingDetalle ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#17A2E5]"></div>
                                    </div>
                                ) : cursoSeleccionado.registros.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {cursoSeleccionado.registros.map((registro) => (
                                            <AsistenciaDiaCard key={registro.id} registro={registro} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <svg className="w-16 h-16 mx-auto mb-4 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                        <p className="text-sm text-[#6B7280]">No hay registros de asistencia para este curso</p>
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