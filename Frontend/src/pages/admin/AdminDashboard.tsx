import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface EstadisticasGenerales {
    total_estudiantes: number;
    total_docentes: number;
    total_cursos: number;
    total_secciones: number;
    estudiantes_por_nivel: {
        primaria: number;
        secundaria: number;
    };
    cursos_por_nivel: {
        primaria: number;
        secundaria: number;
    };
}

interface SeccionInfo {
    id: number;
    nombre: string;
    nivel: string;
    grado_numero: number;
    estudiantes_actual: number;
    capacidad: number;
    porcentaje_ocupacion: number;
    docente_tutor: string;
}

export const AdminDashboard = () => {
    const navigate = useNavigate();
    const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales | null>(null);
    const [secciones, setSecciones] = useState<SeccionInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            const [estadisticasRes, seccionesRes] = await Promise.all([
                api.get('/admin/estadisticas'),
                api.get('/admin/secciones-info')
            ]);

            setEstadisticas(estadisticasRes.data.data);
            setSecciones(seccionesRes.data.data || []);
        } catch (error) {
            console.error('Error al cargar datos:', error);
        } finally {
            setLoading(false);
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

    const porcentajePrimaria = estadisticas 
        ? (estadisticas.estudiantes_por_nivel.primaria / estadisticas.total_estudiantes * 100).toFixed(1)
        : 0;
    
    const porcentajeSecundaria = estadisticas
        ? (estadisticas.estudiantes_por_nivel.secundaria / estadisticas.total_estudiantes * 100).toFixed(1)
        : 0;

    return (
        <>
            <div className="min-h-screen bg-[#F4F6F8]">
                {/* Header */}
                <div className="bg-white border-b border-[#E5E7EB] shadow-sm">
                    <div className="max-w-[1600px] mx-auto px-6 py-4">
                        <h1 className="text-2xl font-bold text-[#0E2B5C]">Panel de Administración</h1>
                        <p className="text-sm text-[#6B7280] mt-1">Colegio Frederick - Sistema de Gestión</p>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto px-6 py-6">
                    {/* Estadísticas Principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {/* Total Estudiantes */}
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[#6B7280]">Total Estudiantes</p>
                                    <p className="text-3xl font-bold text-[#0E2B5C] mt-1">
                                        {estadisticas?.total_estudiantes || 0}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Total Docentes */}
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[#6B7280]">Total Docentes</p>
                                    <p className="text-3xl font-bold text-[#17A2E5] mt-1">
                                        {estadisticas?.total_docentes || 0}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Total Cursos */}
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[#6B7280]">Total Cursos</p>
                                    <p className="text-3xl font-bold text-[#C62828] mt-1">
                                        {estadisticas?.total_cursos || 0}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Total Secciones */}
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[#6B7280]">Total Secciones</p>
                                    <p className="text-3xl font-bold text-[#4ADE80] mt-1">
                                        {estadisticas?.total_secciones || 0}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Distribución por Nivel */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Estudiantes por Nivel */}
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <h3 className="text-lg font-semibold text-[#0E2B5C] mb-4">Estudiantes por Nivel</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-[#6B7280]">📚 Primaria</span>
                                        <span className="text-sm font-bold text-[#0E2B5C]">
                                            {estadisticas?.estudiantes_por_nivel.primaria || 0} ({porcentajePrimaria}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div 
                                            className="bg-blue-600 h-3 rounded-full transition-all"
                                            style={{ width: `${porcentajePrimaria}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-[#6B7280]">🎓 Secundaria</span>
                                        <span className="text-sm font-bold text-[#0E2B5C]">
                                            {estadisticas?.estudiantes_por_nivel.secundaria || 0} ({porcentajeSecundaria}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div 
                                            className="bg-purple-600 h-3 rounded-full transition-all"
                                            style={{ width: `${porcentajeSecundaria}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cursos por Nivel */}
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <h3 className="text-lg font-semibold text-[#0E2B5C] mb-4">Cursos por Nivel</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                                            📚
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[#6B7280]">Primaria</p>
                                            <p className="text-2xl font-bold text-[#0E2B5C]">
                                                {estadisticas?.cursos_por_nivel.primaria || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                                            🎓
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[#6B7280]">Secundaria</p>
                                            <p className="text-2xl font-bold text-[#0E2B5C]">
                                                {estadisticas?.cursos_por_nivel.secundaria || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secciones y Capacidad */}
                    <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6 mb-6">
                        <h3 className="text-lg font-semibold text-[#0E2B5C] mb-4">Ocupación por Sección</h3>
                        {secciones.length === 0 ? (
                            <div className="text-center py-8 text-[#6B7280]">
                                <p>No hay secciones registradas</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-[#F5F7FA]">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#0E2B5C]">Grado</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#0E2B5C]">Sección</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#0E2B5C]">Nivel</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#0E2B5C]">Estudiantes</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#0E2B5C]">Capacidad</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#0E2B5C]">Ocupación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E5E7EB]">
                                        {secciones.map((seccion) => {
                                            const ocupacionNumero = Number(seccion.porcentaje_ocupacion) || 0;
                                            
                                            let colorOcupacion = 'text-green-600 bg-green-50';
                                            if (ocupacionNumero >= 90) {
                                                colorOcupacion = 'text-red-600 bg-red-50';
                                            } else if (ocupacionNumero >= 75) {
                                                colorOcupacion = 'text-yellow-600 bg-yellow-50';
                                            }

                                            return (
                                                <tr key={seccion.id} className="hover:bg-[#F9FAFB]">
                                                    <td className="px-4 py-3 text-sm text-[#1F2937]">{seccion.grado_numero}ro</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-[#0E2B5C]">{seccion.nombre}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs ${
                                                            seccion.nivel === 'primaria' 
                                                                ? 'bg-blue-100 text-blue-800' 
                                                                : 'bg-purple-100 text-purple-800'
                                                        }`}>
                                                            {seccion.nivel === 'primaria' ? '📚 Primaria' : '🎓 Secundaria'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-sm font-medium text-[#1F2937]">
                                                        {seccion.estudiantes_actual}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-sm text-[#6B7280]">
                                                        {seccion.capacidad}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorOcupacion}`}>
                                                            {ocupacionNumero.toFixed(0)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Accesos Rápidos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button
                            onClick={() => navigate('/admin/grados-secciones')}
                            className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6 hover:shadow-lg transition-all text-left"
                        >
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-[#0E2B5C] mb-1">Grados y Secciones</h3>
                            <p className="text-xs text-[#6B7280]">Gestionar estructura educativa</p>
                        </button>

                        <button
                            onClick={() => navigate('/admin/catalogo')}
                            className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6 hover:shadow-lg transition-all text-left"
                        >
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-[#0E2B5C] mb-1">Catálogo de Cursos</h3>
                            <p className="text-xs text-[#6B7280]">Gestionar cursos disponibles</p>
                        </button>

                        <button
                            onClick={() => navigate('/admin/cursos')}
                            className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6 hover:shadow-lg transition-all text-left"
                        >
                            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-[#0E2B5C] mb-1">Asignación de Cursos</h3>
                            <p className="text-xs text-[#6B7280]">Asignar cursos a secciones</p>
                        </button>

                        <button
                            onClick={() => navigate('/admin/estudiantes')}
                            className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6 hover:shadow-lg transition-all text-left"
                        >
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-[#0E2B5C] mb-1">Asignación de Estudiantes</h3>
                            <p className="text-xs text-[#6B7280]">Asignar estudiantes a secciones</p>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
