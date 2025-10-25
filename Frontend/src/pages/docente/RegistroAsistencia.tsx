import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import api from '../../services/api';
import { getCourseColor } from '../../utils/courseColors';

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
    dni?: string;
}

export const RegistroAsistencia = () => {
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
    const [cursoSeleccionado, setCursoSeleccionado] = useState<Curso | null>(null);
    const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
    const [registros, setRegistros] = useState<Map<number, 'presente' | 'ausente' | 'tardanza'>>(new Map());
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [asistenciaExistente, setAsistenciaExistente] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtroNivel, setFiltroNivel] = useState<'todos' | 'primaria' | 'secundaria'>('todos');

    useEffect(() => {
        cargarCursosDocente();
    }, []);

    const cargarCursosDocente = async () => {
        try {
            const response = await api.get('/docente/cursos');
            const cursosData = response.data.data || [];
            setCursos(cursosData);
        } catch (error) {
            console.error('Error al cargar cursos:', error);
        } finally {
            setLoading(false);
        }
    };

    const abrirModalAsistencia = async (curso: Curso) => {
        setCursoSeleccionado(curso);
        setModalAbierto(true);

        try {
            // Cargar estudiantes
            const responseEst = await api.get(`/cursos/${curso.id}/estudiantes`);
            const estudiantesData = responseEst.data.data || [];
            setEstudiantes(estudiantesData);

            // Verificar asistencia existente
            const responseAsist = await api.get(`/asistencias/curso/${curso.id}/fecha/${fecha}`);

            if (responseAsist.data.success && responseAsist.data.data && responseAsist.data.data.length > 0) {
                setAsistenciaExistente(true);
                const registrosMap = new Map();
                responseAsist.data.data.forEach((asistencia: any) => {
                    registrosMap.set(asistencia.estudiante_id, asistencia.estado);
                });
                setRegistros(registrosMap);
            } else {
                setAsistenciaExistente(false);
                const registrosMap = new Map();
                estudiantesData.forEach((est: Estudiante) => {
                    registrosMap.set(est.id, 'presente');
                });
                setRegistros(registrosMap);
            }
        } catch (error) {
            console.error('Error al cargar datos:', error);
        }
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setCursoSeleccionado(null);
        setEstudiantes([]);
        setRegistros(new Map());
    };

    const cambiarEstado = (estudianteId: number, estado: 'presente' | 'ausente' | 'tardanza') => {
        setRegistros(prev => new Map(prev).set(estudianteId, estado));
    };

    const guardarAsistencia = async () => {
        if (!cursoSeleccionado || registros.size === 0) {
            alert('Error al guardar asistencia');
            return;
        }

        setGuardando(true);
        try {
            const registrosArray = Array.from(registros.entries()).map(([estudiante_id, estado]) => ({
                estudiante_id,
                estado
            }));

            await api.post('/asistencias', {
                curso_id: cursoSeleccionado.id,
                fecha,
                registros: registrosArray
            });

            alert('Asistencia guardada exitosamente');
            cerrarModal();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al guardar asistencia');
        } finally {
            setGuardando(false);
        }
    };

    const cambiarFecha = (dias: number) => {
        const nuevaFecha = new Date(fecha);
        nuevaFecha.setDate(nuevaFecha.getDate() + dias);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        if (nuevaFecha <= hoy) {
            setFecha(nuevaFecha.toISOString().split('T')[0]);
        }
    };

    const contadores = {
        presente: Array.from(registros.values()).filter(e => e === 'presente').length,
        ausente: Array.from(registros.values()).filter(e => e === 'ausente').length,
        tardanza: Array.from(registros.values()).filter(e => e === 'tardanza').length
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4ADE80]"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-6 bg-[#F4F6F8] min-h-screen">
                {/* Header */}
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-[#1E1E1E]">Registro de Asistencia</h1>
                            <p className="text-sm text-[#7A7A7A]">Selecciona un curso para registrar asistencia</p>
                        </div>

                        {/* Selector de fecha */}
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-3 flex items-center space-x-3">
                            <button
                                onClick={() => cambiarFecha(-1)}
                                className="p-2 hover:bg-[#F4F6F8] rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-[#7A7A7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div className="text-center">
                                <p className="text-xs text-[#7A7A7A]">Fecha</p>
                                <p className="text-sm font-bold text-[#1E1E1E]">
                                    {new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                            <button
                                onClick={() => cambiarFecha(1)}
                                disabled={fecha === new Date().toISOString().split('T')[0]}
                                className="p-2 hover:bg-[#F4F6F8] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5 text-[#7A7A7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Buscador y Filtros */}
                <div className="mb-4 bg-white rounded-lg shadow border border-[#E5E7EB] p-4">
                    <div className="flex items-center space-x-4">
                        {/* Buscador */}
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-[#7A7A7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar curso por nombre..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#4ADE80] focus:border-[#4ADE80] transition-all text-sm text-[#1E1E1E] bg-[#F4F6F8]"
                            />
                        </div>

                        {/* Filtro de nivel */}
                        <div className="flex items-center space-x-2 bg-[#F4F6F8] rounded-lg p-1">
                            <button
                                onClick={() => setFiltroNivel('todos')}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${filtroNivel === 'todos'
                                    ? 'bg-[#4ADE80] text-white shadow-md'
                                    : 'text-[#7A7A7A] hover:bg-white'
                                    }`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFiltroNivel('primaria')}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${filtroNivel === 'primaria'
                                    ? 'bg-[#4ADE80] text-white shadow-md'
                                    : 'text-[#7A7A7A] hover:bg-white'
                                    }`}
                            >
                                Primaria
                            </button>
                            <button
                                onClick={() => setFiltroNivel('secundaria')}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${filtroNivel === 'secundaria'
                                    ? 'bg-[#4ADE80] text-white shadow-md'
                                    : 'text-[#7A7A7A] hover:bg-white'
                                    }`}
                            >
                                Secundaria
                            </button>
                        </div>
                    </div>
                </div>

                {/* Grid de cursos 3x2 */}
                <div className="grid grid-cols-3 gap-4">
                    {cursos
                        .filter(curso => {
                            // Filtro por búsqueda
                            const coincideBusqueda = curso.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                                curso.codigo.toLowerCase().includes(busqueda.toLowerCase());

                            // Filtro por nivel
                            let coincideNivel = true;
                            if (filtroNivel === 'primaria') {
                                coincideNivel = curso.grado.toLowerCase().includes('primaria');
                            } else if (filtroNivel === 'secundaria') {
                                coincideNivel = curso.grado.toLowerCase().includes('secundaria');
                            }

                            return coincideBusqueda && coincideNivel;
                        })
                        .map((curso) => {
                            const courseColor = getCourseColor(curso.nombre);

                            return (
                                <div
                                    key={curso.id}
                                    className="bg-white rounded-xl shadow border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-all"
                                >
                                    {/* Header con color del curso */}
                                    <div className="p-5 border-b border-[#E5E7EB]" style={{ backgroundColor: courseColor.light }}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                                                    style={{ backgroundColor: courseColor.primary }}>
                                                    {curso.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-[#0E2B5C]">{curso.nombre}</h3>
                                                    <p className="text-xs text-[#6B7280]">{curso.codigo}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contenido */}
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <p className="text-xs text-[#6B7280]">Grado</p>
                                                <p className="text-sm font-bold text-[#1F2937]">{curso.grado}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-[#6B7280]">Sección</p>
                                                <p className="text-sm font-bold text-[#1F2937]">{curso.seccion}</p>
                                            </div>
                                        </div>

                                        {/* Botón rojo institucional */}
                                        <button
                                            onClick={() => abrirModalAsistencia(curso)}
                                            className="w-full bg-[#C62828] hover:bg-[#B71C1C] text-white py-2.5 px-4 rounded-lg transition-colors font-semibold text-sm flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                            </svg>
                                            <span>Registrar Asistencia</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                </div>

                {/* Mensaje cuando no hay resultados */}
                {cursos.filter(curso => {
                    const coincideBusqueda = curso.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                        curso.codigo.toLowerCase().includes(busqueda.toLowerCase());
                    let coincideNivel = true;
                    if (filtroNivel === 'primaria') {
                        coincideNivel = curso.grado.toLowerCase().includes('primaria');
                    } else if (filtroNivel === 'secundaria') {
                        coincideNivel = curso.grado.toLowerCase().includes('secundaria');
                    }
                    return coincideBusqueda && coincideNivel;
                }).length === 0 && cursos.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-12 text-center border border-[#E5E7EB]">
                            <svg className="w-16 h-16 mx-auto text-[#E5E7EB] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p className="text-sm text-[#7A7A7A] font-medium">No se encontraron cursos con los filtros aplicados</p>
                            <button
                                onClick={() => {
                                    setBusqueda('');
                                    setFiltroNivel('todos');
                                }}
                                className="mt-3 text-xs text-[#4ADE80] hover:underline font-semibold"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    )}

                {cursos.length === 0 && (
                    <div className="bg-white rounded-lg shadow p-12 text-center border border-[#E5E7EB]">
                        <svg className="w-16 h-16 mx-auto text-[#E5E7EB] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-sm text-[#7A7A7A] font-medium">No tienes cursos asignados</p>
                    </div>
                )}

                {/* Modal de asistencia */}
                {modalAbierto && cursoSeleccionado && (() => {
                    const courseColor = getCourseColor(cursoSeleccionado.nombre);
                    return (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                                {/* Header del modal */}
                                <div className="px-4 py-3 border-b border-[#E5E7EB]" style={{ backgroundColor: courseColor.light }}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-bold text-[#0E2B5C]">
                                                {cursoSeleccionado.nombre}
                                            </h2>
                                            <p className="text-xs text-[#6B7280] mt-0.5">
                                                {cursoSeleccionado.codigo} - {cursoSeleccionado.grado} {cursoSeleccionado.seccion}
                                            </p>
                                        </div>
                                        <button
                                            onClick={cerrarModal}
                                            className="text-[#6B7280] hover:text-[#1F2937] transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Estadísticas */}
                                <div className="px-4 py-3 bg-white border-b border-[#E5E7EB]">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-[#F0FDF4] border border-[#22C55E] rounded-lg p-2 text-center">
                                            <p className="text-2xl font-bold text-[#22C55E]">{contadores.presente}</p>
                                            <p className="text-xs text-[#6B7280] mt-0.5">Presentes</p>
                                        </div>
                                        <div className="bg-[#FFFBEB] border border-[#F59E0B] rounded-lg p-2 text-center">
                                            <p className="text-2xl font-bold text-[#F59E0B]">{contadores.tardanza}</p>
                                            <p className="text-xs text-[#6B7280] mt-0.5">Tardanzas</p>
                                        </div>
                                        <div className="bg-[#FEF2F2] border border-[#DC2626] rounded-lg p-2 text-center">
                                            <p className="text-2xl font-bold text-[#DC2626]">{contadores.ausente}</p>
                                            <p className="text-xs text-[#6B7280] mt-0.5">Ausentes</p>
                                        </div>
                                    </div>
                                </div>

                                {asistenciaExistente && (
                                    <div className="mx-4 mt-2 bg-blue-50 border-l-4 border-blue-500 rounded p-2">
                                        <p className="text-xs text-blue-800">
                                            ℹ️ Ya existe registro para esta fecha. Puedes modificarlo.
                                        </p>
                                    </div>
                                )}

                                {/* Lista de estudiantes */}
                                <div className="flex-1 overflow-y-auto px-4 py-2 max-h-[50vh]">
                                    {estudiantes.map((estudiante, index) => {
                                        const estado = registros.get(estudiante.id) || 'presente';
                                        return (
                                            <div
                                                key={estudiante.id}
                                                className="bg-white border border-[#E5E7EB] rounded-lg p-2 mb-2 hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-[#6B7280] w-6">
                                                            {index + 1}
                                                        </span>
                                                        <div
                                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                                            style={{ backgroundColor: courseColor.primary }}
                                                        >
                                                            {estudiante.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-[#1F2937] text-sm">
                                                                {estudiante.name}
                                                            </p>
                                                            <p className="text-xs text-[#6B7280]">
                                                                {estudiante.email}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => cambiarEstado(estudiante.id, 'presente')}
                                                            className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${estado === 'presente'
                                                                ? 'bg-[#22C55E] text-white'
                                                                : 'bg-[#F0FDF4] border border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E] hover:text-white'
                                                                }`}
                                                        >
                                                            ✓ Presente
                                                        </button>
                                                        <button
                                                            onClick={() => cambiarEstado(estudiante.id, 'tardanza')}
                                                            className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${estado === 'tardanza'
                                                                ? 'bg-[#F59E0B] text-white'
                                                                : 'bg-[#FFFBEB] border border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B] hover:text-white'
                                                                }`}
                                                        >
                                                            ⏰ Tardanza
                                                        </button>
                                                        <button
                                                            onClick={() => cambiarEstado(estudiante.id, 'ausente')}
                                                            className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${estado === 'ausente'
                                                                ? 'bg-[#DC2626] text-white'
                                                                : 'bg-[#FEF2F2] border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626] hover:text-white'
                                                                }`}
                                                        >
                                                            ✗ Ausente
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Footer del modal */}
                                <div className="px-4 py-3 bg-[#F5F7FA] border-t border-[#E5E7EB] flex justify-between items-center">
                                    <div className="text-xs text-[#6B7280]">
                                        Total: {estudiantes.length} estudiantes
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={cerrarModal}
                                            className="px-4 py-1.5 border border-[#E5E7EB] text-[#6B7280] rounded-lg hover:bg-white transition-colors text-sm"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={guardarAsistencia}
                                            disabled={guardando}
                                            className="px-4 py-1.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg transition-colors disabled:bg-[#EAB0B0] disabled:cursor-not-allowed text-sm"
                                        >
                                            {guardando ? 'Guardando...' : 'Guardar Asistencia'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </Layout>
    );
};
