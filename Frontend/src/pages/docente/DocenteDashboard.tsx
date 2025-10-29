import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useAuthStore } from '../../stores/authStore';
import { getCourseColor } from '../../utils/courseColors';
import api from '../../services/api';

interface Curso {
    id: number;
    nombre: string;
    codigo: string;
    grado: string;
    seccion: string;
    total_estudiantes: number;
}

interface EstadisticasCurso {
    curso_id: number;
    curso_nombre: string;
    total_estudiantes: number;
    promedio_curso: number;
    asistencia_promedio: number;
    estudiantes_aprobados: number;
    evaluaciones_creadas: number;
}



export const DocenteDashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [cursos, setCursos] = useState<Curso[]>([]);
    const [estadisticasCursos, setEstadisticasCursos] = useState<EstadisticasCurso[]>([]);
    const [totalEstudiantesUnicos, setTotalEstudiantesUnicos] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarDatosDocente();
    }, []);

    const cargarDatosDocente = async () => {
        try {
            setLoading(true);

            // Cargar dashboard completo con una sola llamada
            const response = await api.get('/docente/dashboard');
            const data = response.data.data;

            console.log('Dashboard cargado:', data);

            setCursos(data.cursos || []);
            setEstadisticasCursos(data.estadisticas || []);
            setTotalEstudiantesUnicos(data.total_estudiantes_unicos || 0);



        } catch (error) {
            console.error('Error al cargar datos del docente:', error);
        } finally {
            setLoading(false);
        }
    };

    const calcularEstadisticasGenerales = () => {
        if (estadisticasCursos.length === 0) return null;
        
        // Calcular promedio solo de cursos que tienen notas (promedio > 0)
        const cursosConNotas = estadisticasCursos.filter(curso => curso.promedio_curso > 0);
        const promedioGeneral = cursosConNotas.length > 0 
            ? cursosConNotas.reduce((sum, curso) => sum + curso.promedio_curso, 0) / cursosConNotas.length
            : 0;
        
        // Calcular asistencia solo de cursos que tienen registros de asistencia
        const cursosConAsistencia = estadisticasCursos.filter(curso => curso.asistencia_promedio > 0);
        const asistenciaGeneral = cursosConAsistencia.length > 0
            ? cursosConAsistencia.reduce((sum, curso) => sum + curso.asistencia_promedio, 0) / cursosConAsistencia.length
            : 0;
        
        const totalEvaluaciones = estadisticasCursos.reduce((sum, curso) => sum + curso.evaluaciones_creadas, 0);

        return {
            totalEstudiantes: totalEstudiantesUnicos,
            promedioGeneral,
            asistenciaGeneral,
            totalEvaluaciones,
            totalCursos: cursos.length
        };
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

    const estadisticasGenerales = calcularEstadisticasGenerales();

    return (
        <Layout>
            <div className="min-h-screen bg-[#F4F6F8]">
                {/* Header */}
                <div className="bg-white border-b border-[#E5E7EB] shadow-sm">
                    <div className="max-w-[1600px] mx-auto px-6 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-[#0E2B5C]">Dashboard Docente</h1>
                                <p className="text-sm text-[#6B7280] mt-1">Bienvenido, Profesor {user?.name}</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-[#1F2937]">Docente</p>
                                    <p className="text-xs text-[#6B7280]">{user?.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto px-6 py-6">
                    {/* Estadísticas Generales */}
                    {estadisticasGenerales && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                            <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-[#17A2E5] p-3 rounded-lg text-white">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-[#1F2937]">{estadisticasGenerales.totalCursos}</h3>
                                <p className="text-sm text-[#6B7280] mt-1">Mis Cursos</p>
                            </div>

                            <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-[#0E2B5C] p-3 rounded-lg text-white">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-[#1F2937]">{estadisticasGenerales.totalEstudiantes}</h3>
                                <p className="text-sm text-[#6B7280] mt-1">Total Estudiantes</p>
                            </div>

                            <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-[#22C55E] p-3 rounded-lg text-white">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-[#1F2937]">{estadisticasGenerales.promedioGeneral.toFixed(1)}</h3>
                                <p className="text-sm text-[#6B7280] mt-1">Promedio General</p>
                            </div>

                            <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-[#F4C20D] p-3 rounded-lg text-white">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-[#1F2937]">{estadisticasGenerales.asistenciaGeneral.toFixed(1)}%</h3>
                                <p className="text-sm text-[#6B7280] mt-1">Asistencia Promedio</p>
                            </div>

                            <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-[#C62828] p-3 rounded-lg text-white">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-[#1F2937]">{estadisticasGenerales.totalEvaluaciones}</h3>
                                <p className="text-sm text-[#6B7280] mt-1">Evaluaciones Creadas</p>
                            </div>
                        </div>
                    )}

                    {/* Mis Cursos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB]">
                            <div className="px-6 py-4 border-b border-[#E5E7EB]">
                                <h3 className="text-lg font-semibold text-[#0E2B5C]">Mis Cursos</h3>
                            </div>
                            <div className="p-6">
                                {cursos.length > 0 ? (
                                    <div className="space-y-4">
                                        {cursos.slice(0, 4).map((curso) => {
                                            const courseColor = getCourseColor(curso.nombre);
                                            const estadistica = estadisticasCursos.find(e => e.curso_id === curso.id);

                                            return (
                                                <div key={curso.id} className="flex items-center justify-between p-4 bg-[#F5F7FA] rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                                                    onClick={() => navigate(`/docente/notas/curso/${curso.id}/mes/3`)}>
                                                    <div className="flex items-center space-x-3">
                                                        <div
                                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                                            style={{ backgroundColor: courseColor.primary }}
                                                        >
                                                            {curso.nombre.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium text-[#1F2937]">{curso.nombre}</h4>
                                                            <p className="text-xs text-[#6B7280]">{curso.grado} - Sección {curso.seccion}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-[#1F2937]">
                                                            {estadistica?.total_estudiantes || 0} estudiantes
                                                        </p>
                                                        <p className="text-xs text-[#6B7280]">
                                                            Promedio: {estadistica?.promedio_curso.toFixed(1) || '0.0'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {cursos.length > 4 && (
                                            <button
                                                onClick={() => navigate('/docente/notas')}
                                                className="w-full text-center py-2 text-[#17A2E5] hover:text-[#1589C6] text-sm font-medium"
                                            >
                                                Ver todos los cursos ({cursos.length})
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <svg className="w-16 h-16 mx-auto mb-4 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                        <p className="text-sm text-[#6B7280]">No tienes cursos asignados</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Resumen Rápido */}
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB]">
                            <div className="px-6 py-4 border-b border-[#E5E7EB]">
                                <h3 className="text-lg font-semibold text-[#0E2B5C]">Resumen de Cursos</h3>
                            </div>
                            <div className="p-6">
                                {estadisticasCursos.length > 0 ? (
                                    <div className="space-y-4">
                                        {estadisticasCursos.slice(0, 4).map((estadistica) => (
                                            <div key={estadistica.curso_id} className="p-4 bg-[#F5F7FA] rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium text-[#1F2937]">{estadistica.curso_nombre}</h4>
                                                    <span className="text-xs text-[#6B7280]">{estadistica.total_estudiantes} estudiantes</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    <div className="text-center">
                                                        <p className="font-bold text-[#0E2B5C]">{estadistica.promedio_curso > 0 ? estadistica.promedio_curso.toFixed(1) : '-'}</p>
                                                        <p className="text-[#6B7280]">Promedio</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-bold text-[#22C55E]">{estadistica.asistencia_promedio > 0 ? `${estadistica.asistencia_promedio.toFixed(0)}%` : '-'}</p>
                                                        <p className="text-[#6B7280]">Asistencia</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-bold text-[#17A2E5]">{estadistica.evaluaciones_creadas}</p>
                                                        <p className="text-[#6B7280]">Evaluaciones</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <svg className="w-16 h-16 mx-auto mb-4 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        <p className="text-sm text-[#6B7280]">No hay estadísticas disponibles</p>
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
                                    onClick={() => navigate('/docente/notas')}
                                    className="flex items-center justify-center p-4 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg transition-colors"
                                >
                                    <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Registrar Notas
                                </button>

                                <button
                                    onClick={() => navigate('/docente/asistencia')}
                                    className="flex items-center justify-center p-4 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-lg transition-colors"
                                >
                                    <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                    Tomar Asistencia
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