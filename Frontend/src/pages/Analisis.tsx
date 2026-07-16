import { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import api from '../services/api';

interface EstadisticasGenerales {
    total_estudiantes: number;
    promedio_general: number;
    promedio_asistencia: number;
    cursos_con_bajo_rendimiento: number;
    tendencia_mensual: Array<{
        mes: string;
        promedio: number;
        asistencia: number;
    }>;
    distribucion_notas: {
        excelente: number; // 18-20
        bueno: number;     // 15-17
        regular: number;   // 11-14
        bajo: number;      // 0-10
    };
}

interface ComparativaCursos {
    id: number;
    nombre: string;
    promedio: number;
    asistencia: number;
    total_estudiantes: number;
    tendencia: string; // 'up' | 'down' | 'stable'
}

export const Analisis = () => {
    const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales | null>(null);
    const [comparativa, setComparativa] = useState<ComparativaCursos[]>([]);
    const [loading, setLoading] = useState(true);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    useEffect(() => {
        // Establecer fecha por defecto: último mes
        const hoy = new Date();
        const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        setFechaInicio(hace30Dias.toISOString().split('T')[0]);
        setFechaFin(hoy.toISOString().split('T')[0]);
        
        cargarDatos();
    }, []);

    const cargarDatos = async (inicio?: string, fin?: string) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (inicio) params.append('fecha_inicio', inicio);
            if (fin) params.append('fecha_fin', fin);

            const [estadisticasRes, comparativaRes] = await Promise.all([
                api.get(`/analisis/estadisticas?${params.toString()}`),
                api.get(`/analisis/comparativa?${params.toString()}`)
            ]);

            setEstadisticas(estadisticasRes.data.data);
            setComparativa(comparativaRes.data.data || []);
        } catch (error: any) {
            setModalConfig({
                isOpen: true,
                title: 'Error',
                message: error.response?.data?.message || 'Error al cargar datos de análisis',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFiltrar = () => {
        if (!fechaInicio || !fechaFin) {
            setModalConfig({
                isOpen: true,
                title: 'Validación',
                message: 'Por favor seleccione ambas fechas',
                type: 'warning'
            });
            return;
        }
        cargarDatos(fechaInicio, fechaFin);
    };

    const getTendenciaIcon = (tendencia: string) => {
        switch (tendencia) {
            case 'up':
                return <span className="text-green-600">↗️</span>;
            case 'down':
                return <span className="text-red-600">↘️</span>;
            default:
                return <span className="text-yellow-600">→</span>;
        }
    };

    if (loading) {
        return (
            <>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-[#F4F6F8]">
                {/* Header */}
                <div className="bg-white border-b border-[#E5E7EB] shadow-sm">
                    <div className="max-w-[1600px] mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-[#0E2B5C]">📊 Análisis de Rendimiento</h1>
                                <p className="text-sm text-[#6B7280] mt-1">Métricas y estadísticas del sistema educativo</p>
                            </div>
                            
                            {/* Filtros de fecha */}
                            <div className="flex items-center gap-3">
                                <div>
                                    <label className="block text-xs text-[#6B7280] mb-1">Desde</label>
                                    <input
                                        type="date"
                                        value={fechaInicio}
                                        onChange={(e) => setFechaInicio(e.target.value)}
                                        className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-[#6B7280] mb-1">Hasta</label>
                                    <input
                                        type="date"
                                        value={fechaFin}
                                        onChange={(e) => setFechaFin(e.target.value)}
                                        className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <button
                                    onClick={handleFiltrar}
                                    className="mt-5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    Filtrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contenido */}
                <div className="max-w-[1600px] mx-auto p-6">
                    {/* Estadísticas Principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">👥</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#6B7280]">Estudiantes</p>
                                    <p className="text-2xl font-bold text-[#0E2B5C]">
                                        {estadisticas?.total_estudiantes || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">📈</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#6B7280]">Promedio General</p>
                                    <p className="text-2xl font-bold text-[#0E2B5C]">
                                        {estadisticas?.promedio_general?.toFixed(2) || '0.00'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">✅</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#6B7280]">Asistencia</p>
                                    <p className="text-2xl font-bold text-[#0E2B5C]">
                                        {estadisticas?.promedio_asistencia?.toFixed(1) || '0.0'}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">⚠️</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#6B7280]">Bajo Rendimiento</p>
                                    <p className="text-2xl font-bold text-[#0E2B5C]">
                                        {estadisticas?.cursos_con_bajo_rendimiento || 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Distribución de Notas */}
                    <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6 mb-6">
                        <h3 className="text-lg font-semibold text-[#0E2B5C] mb-4">📊 Distribución de Notas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                                <p className="text-3xl font-bold text-green-700">
                                    {estadisticas?.distribucion_notas?.excelente || 0}
                                </p>
                                <p className="text-sm text-green-600 font-medium mt-1">Excelente (18-20)</p>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                                <p className="text-3xl font-bold text-blue-700">
                                    {estadisticas?.distribucion_notas?.bueno || 0}
                                </p>
                                <p className="text-sm text-blue-600 font-medium mt-1">Bueno (15-17)</p>
                            </div>
                            <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                                <p className="text-3xl font-bold text-yellow-700">
                                    {estadisticas?.distribucion_notas?.regular || 0}
                                </p>
                                <p className="text-sm text-yellow-600 font-medium mt-1">Regular (11-14)</p>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
                                <p className="text-3xl font-bold text-red-700">
                                    {estadisticas?.distribucion_notas?.bajo || 0}
                                </p>
                                <p className="text-sm text-red-600 font-medium mt-1">Bajo (0-10)</p>
                            </div>
                        </div>
                    </div>

                    {/* Comparativa de Cursos */}
                    <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                        <h3 className="text-lg font-semibold text-[#0E2B5C] mb-4">📚 Comparativa de Cursos</h3>
                        {comparativa.length === 0 ? (
                            <div className="text-center py-8 text-[#6B7280]">
                                <p>No hay datos de cursos disponibles</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-[#F5F7FA]">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#0E2B5C]">Curso</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#0E2B5C]">Estudiantes</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#0E2B5C]">Promedio</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#0E2B5C]">Asistencia</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#0E2B5C]">Tendencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E5E7EB]">
                                        {comparativa.map((curso) => (
                                            <tr key={curso.id} className="hover:bg-[#F9FAFB]">
                                                <td className="px-4 py-3 text-sm font-medium text-[#0E2B5C]">
                                                    {curso.nombre}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-[#1F2937]">
                                                    {curso.total_estudiantes}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                        curso.promedio >= 15 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : curso.promedio >= 11 
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {curso.promedio.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-[#1F2937]">
                                                    {curso.asistencia.toFixed(1)}%
                                                </td>
                                                <td className="px-4 py-3 text-center text-2xl">
                                                    {getTendenciaIcon(curso.tendencia)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal */}
                <Modal
                    isOpen={modalConfig.isOpen}
                    onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    type={modalConfig.type}
                />
            </div>
        </>
    );
};
