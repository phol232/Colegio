import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

interface Curso {
    id: number;
    nombre: string;
    codigo: string;
    grado: string;
    seccion: string;
}

interface NotaResumen {
    curso_id: number;
    curso_nombre: string;
    promedio_numerico: number;
    promedio_literal: string;
    total_evaluaciones: number;
}

interface AsistenciaResumen {
    curso_id: number;
    curso_nombre: string;
    total_clases: number;
    asistencias: number;
    tardanzas: number;
    faltas: number;
    porcentaje_asistencia: number;
}

interface EstadisticasGenerales {
    promedio_general: number;
    asistencia_general: number;
    total_cursos: number;
    cursos_aprobados: number;
}

export const EstudianteDashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    

    const [notasResumen, setNotasResumen] = useState<NotaResumen[]>([]);
    const [asistenciasResumen, setAsistenciasResumen] = useState<AsistenciaResumen[]>([]);
    const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarDatosEstudiante();
    }, []);

    const cargarDatosEstudiante = async () => {
        try {
            setLoading(true);
            
            // Cargar mis notas
            const respNotas = await api.get('/notas/estudiante');
            const notasTransformadas = (respNotas.data.data || []).map((nota: any) => ({
                ...nota,
                promedio_numerico: parseFloat(nota.promedio_numerico) || 0,
                total_evaluaciones: parseInt(nota.total_evaluaciones) || 0
            }));
            setNotasResumen(notasTransformadas);
            
            // Cargar mis asistencias
            const respAsistencias = await api.get('/asistencias/estudiante');
            const asistenciasTransformadas = (respAsistencias.data.data || []).map((asist: any) => ({
                ...asist,
                total_clases: parseInt(asist.total_clases) || 0,
                asistencias: parseInt(asist.asistencias) || 0,
                tardanzas: parseInt(asist.tardanzas) || 0,
                faltas: parseInt(asist.faltas) || 0,
                porcentaje_asistencia: parseFloat(asist.porcentaje_asistencia) || 0
            }));
            setAsistenciasResumen(asistenciasTransformadas);
            
            // Calcular estadísticas generales
            const notas = notasTransformadas;
            const asistencias = asistenciasTransformadas;
            
            const promedioGeneral = notas.length > 0 
                ? notas.reduce((sum: number, nota: any) => sum + nota.promedio_numerico, 0) / notas.length 
                : 0;
                
            const asistenciaGeneral = asistencias.length > 0
                ? asistencias.reduce((sum: number, asist: any) => sum + asist.porcentaje_asistencia, 0) / asistencias.length
                : 0;
                
            const cursosAprobados = notas.filter((nota: any) => nota.promedio_numerico >= 11).length;
            
            setEstadisticas({
                promedio_general: promedioGeneral,
                asistencia_general: asistenciaGeneral,
                total_cursos: notas.length,
                cursos_aprobados: cursosAprobados
            });
            
        } catch (error) {
            console.error('Error al cargar datos del estudiante:', error);
        } finally {
            setLoading(false);
        }
    };

    const getNotaColor = (promedio: number) => {
        if (promedio >= 17) return 'text-[#22C55E]'; // Verde - Excelente
        if (promedio >= 14) return 'text-[#17A2E5]'; // Azul - Bueno
        if (promedio >= 11) return 'text-[#F4C20D]'; // Amarillo - Regular
        return 'text-[#DC2626]'; // Rojo - Deficiente
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
                    <div className="max-w-[1600px] mx-auto px-6 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-[#0E2B5C]">Mi Dashboard</h1>
                                <p className="text-sm text-[#6B7280] mt-1">Bienvenido, {user?.name}</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-[#1F2937]">Estudiante</p>
                                    <p className="text-xs text-[#6B7280]">{user?.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto px-6 py-6">
                    {/* Estadísticas Generales */}
                    {estadisticas && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-[#0E2B5C] p-3 rounded-lg text-white">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-[#1F2937]">{estadisticas.promedio_general.toFixed(1)}</h3>
                                <p className="text-sm text-[#6B7280] mt-1">Promedio General</p>
                            </div>

                            <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-[#22C55E] p-3 rounded-lg text-white">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-[#1F2937]">{estadisticas.asistencia_general.toFixed(1)}%</h3>
                                <p className="text-sm text-[#6B7280] mt-1">Asistencia General</p>
                            </div>

                            <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-[#17A2E5] p-3 rounded-lg text-white">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-[#1F2937]">{estadisticas.total_cursos}</h3>
                                <p className="text-sm text-[#6B7280] mt-1">Total Cursos</p>
                            </div>

                            <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-[#F4C20D] p-3 rounded-lg text-white">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-[#1F2937]">{estadisticas.cursos_aprobados}</h3>
                                <p className="text-sm text-[#6B7280] mt-1">Cursos Aprobados</p>
                            </div>
                        </div>
                    )}

                    {/* Mis Notas */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB]">
                            <div className="px-6 py-4 border-b border-[#E5E7EB]">
                                <h3 className="text-lg font-semibold text-[#0E2B5C]">Mis Notas por Curso</h3>
                            </div>
                            <div className="p-6">
                                {notasResumen.length > 0 ? (
                                    <div className="space-y-4">
                                        {notasResumen.map((nota) => (
                                            <div key={nota.curso_id} className="flex items-center justify-between p-4 bg-[#F5F7FA] rounded-lg">
                                                <div>
                                                    <h4 className="font-medium text-[#1F2937]">{nota.curso_nombre}</h4>
                                                    <p className="text-xs text-[#6B7280]">{nota.total_evaluaciones} evaluación(es)</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-lg font-bold ${getNotaColor(nota.promedio_numerico)}`}>
                                                        {nota.promedio_numerico.toFixed(1)}
                                                    </p>
                                                    <p className="text-xs text-[#6B7280]">{nota.promedio_literal}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <svg className="w-16 h-16 mx-auto mb-4 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-sm text-[#6B7280]">No hay notas registradas</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mis Asistencias */}
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB]">
                            <div className="px-6 py-4 border-b border-[#E5E7EB]">
                                <h3 className="text-lg font-semibold text-[#0E2B5C]">Mis Asistencias por Curso</h3>
                            </div>
                            <div className="p-6">
                                {asistenciasResumen.length > 0 ? (
                                    <div className="space-y-4">
                                        {asistenciasResumen.map((asistencia) => (
                                            <div key={asistencia.curso_id} className="p-4 bg-[#F5F7FA] rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium text-[#1F2937]">{asistencia.curso_nombre}</h4>
                                                    <p className={`text-lg font-bold ${getAsistenciaColor(asistencia.porcentaje_asistencia)}`}>
                                                        {asistencia.porcentaje_asistencia.toFixed(1)}%
                                                    </p>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    <div className="text-center">
                                                        <p className="font-medium text-[#22C55E]">{asistencia.asistencias}</p>
                                                        <p className="text-[#6B7280]">Asistencias</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-medium text-[#F4C20D]">{asistencia.tardanzas}</p>
                                                        <p className="text-[#6B7280]">Tardanzas</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-medium text-[#DC2626]">{asistencia.faltas}</p>
                                                        <p className="text-[#6B7280]">Faltas</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <svg className="w-16 h-16 mx-auto mb-4 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                        <p className="text-sm text-[#6B7280]">No hay asistencias registradas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Acciones Rápidas */}
                    <div className="bg-white rounded-lg shadow border border-[#E5E7EB]">
                        <div className="px-6 py-4 border-b border-[#E5E7EB]">
                            <h3 className="text-lg font-semibold text-[#0E2B5C]">Acciones Rápidas</h3>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button
                                    onClick={() => navigate('/estudiante/notas')}
                                    className="flex items-center justify-center p-4 bg-[#17A2E5] hover:bg-[#1589C6] text-white rounded-lg transition-colors"
                                >
                                    <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Ver Notas Detalladas
                                </button>
                                
                                <button
                                    onClick={() => navigate('/estudiante/asistencias')}
                                    className="flex items-center justify-center p-4 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-lg transition-colors"
                                >
                                    <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                    Ver Asistencias Detalladas
                                </button>
                                
                                <button
                                    onClick={() => navigate('/perfil')}
                                    className="flex items-center justify-center p-4 bg-[#0E2B5C] hover:bg-[#1E3A8A] text-white rounded-lg transition-colors"
                                >
                                    <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Mi Perfil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};