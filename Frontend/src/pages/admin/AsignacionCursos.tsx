import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import api from '../../services/api';

interface CursoCatalogo {
    id: number;
    nombre: string;
    codigo: string;
    nivel: string;
    descripcion?: string;
}

interface Grado {
    id: number;
    nombre: string;
    nivel: string;
    secciones?: Seccion[];
}

interface Seccion {
    id: number;
    nombre: string;
    capacidad: number;
}

interface Docente {
    id: number;
    name: string;
    email: string;
}

interface CursoAsignado {
    id: number;
    curso_catalogo_id: number;
    nombre: string;
    codigo: string;
    docente_id: number;
    docente: Docente;
}

export const AsignacionCursos = () => {
    const [grados, setGrados] = useState<Grado[]>([]);
    const [docentes, setDocentes] = useState<Docente[]>([]);
    const [catalogoCursos, setCatalogoCursos] = useState<CursoCatalogo[]>([]);
    const [cursosAsignados, setCursosAsignados] = useState<CursoAsignado[]>([]);

    const [gradoSeleccionado, setGradoSeleccionado] = useState<number | null>(null);
    const [seccionSeleccionada, setSeccionSeleccionada] = useState<number | null>(null);
    const [docenteSeleccionado, setDocenteSeleccionado] = useState<number | null>(null);
    const [cursosSeleccionados, setCursosSeleccionados] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);

    useEffect(() => {
        cargarDatos();
    }, []);

    useEffect(() => {
        if (gradoSeleccionado) {
            const grado = grados.find(g => g.id === gradoSeleccionado);
            if (grado) {
                cargarCatalogoCursos(grado.nivel);
            }
        }
    }, [gradoSeleccionado, grados]);

    useEffect(() => {
        if (seccionSeleccionada) {
            cargarCursosAsignados(seccionSeleccionada);
        }
    }, [seccionSeleccionada]);

    const cargarDatos = async () => {
        try {
            const [gradosRes, docentesRes] = await Promise.all([
                api.get('/admin/grados'),
                api.get('/admin/docentes')
            ]);
            setGrados(gradosRes.data.data);
            setDocentes(docentesRes.data.data);
        } catch (error) {
            console.error('Error al cargar datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarCatalogoCursos = async (nivel: string) => {
        try {
            const response = await api.get(`/admin/catalogo-cursos?nivel=${nivel}`);
            setCatalogoCursos(response.data.data);
        } catch (error) {
            console.error('Error al cargar catálogo:', error);
        }
    };

    const cargarCursosAsignados = async (seccionId: number) => {
        try {
            const response = await api.get(`/admin/secciones/${seccionId}/cursos-asignados`);
            setCursosAsignados(response.data.data);
        } catch (error) {
            console.error('Error al cargar cursos asignados:', error);
        }
    };

    const abrirModalAsignacion = () => {
        // Pre-cargar los cursos ya asignados y el docente
        if (cursosAsignados.length > 0) {
            setModoEdicion(true);
            // Pre-seleccionar los cursos ya asignados
            const cursosIds = cursosAsignados.map(c => c.curso_catalogo_id);
            setCursosSeleccionados(cursosIds);
            // Pre-seleccionar el docente (todos deben tener el mismo en primaria)
            setDocenteSeleccionado(cursosAsignados[0].docente_id);
        } else {
            setModoEdicion(false);
            setCursosSeleccionados([]);
            setDocenteSeleccionado(null);
        }
        setShowModal(true);
    };

    const asignarCursos = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!seccionSeleccionada || !docenteSeleccionado || cursosSeleccionados.length === 0) {
            alert('Debes seleccionar sección, docente y al menos un curso');
            return;
        }

        try {
            const response = await api.post(`/admin/secciones/${seccionSeleccionada}/asignar-cursos`, {
                docente_id: docenteSeleccionado,
                cursos_catalogo_ids: cursosSeleccionados
            });

            if (response.data.success) {
                alert(response.data.message);
                setShowModal(false);
                setCursosSeleccionados([]);
                setDocenteSeleccionado(null);
                cargarCursosAsignados(seccionSeleccionada);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al asignar cursos');
        }
    };

    const desasignarCurso = async (cursoId: number) => {
        if (!confirm('¿Estás seguro de desasignar este curso?')) return;

        try {
            const response = await api.delete(`/admin/cursos-asignados/${cursoId}`);
            if (response.data.success) {
                alert('Curso desasignado exitosamente');
                if (seccionSeleccionada) {
                    cargarCursosAsignados(seccionSeleccionada);
                }
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al desasignar curso');
        }
    };

    const toggleCurso = (cursoId: number) => {
        setCursosSeleccionados(prev =>
            prev.includes(cursoId)
                ? prev.filter(id => id !== cursoId)
                : [...prev, cursoId]
        );
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </Layout>
        );
    }

    const seccionesDisponibles = gradoSeleccionado
        ? grados.find(g => g.id === gradoSeleccionado)?.secciones || []
        : [];

    const nivelGrado = gradoSeleccionado
        ? grados.find(g => g.id === gradoSeleccionado)?.nivel
        : null;

    return (
        <Layout>
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Asignación de Cursos</h1>
                    <p className="text-gray-600 mt-1">Asigna cursos del catálogo a las secciones</p>
                </div>

                {/* Selectores */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Grado</label>
                            <select
                                value={gradoSeleccionado || ''}
                                onChange={(e) => {
                                    setGradoSeleccionado(Number(e.target.value));
                                    setSeccionSeleccionada(null);
                                    setCursosAsignados([]);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar grado</option>
                                {grados.map((grado) => (
                                    <option key={grado.id} value={grado.id}>{grado.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sección</label>
                            <select
                                value={seccionSeleccionada || ''}
                                onChange={(e) => setSeccionSeleccionada(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                disabled={!gradoSeleccionado}
                            >
                                <option value="">Seleccionar sección</option>
                                {seccionesDisponibles.map((seccion) => (
                                    <option key={seccion.id} value={seccion.id}>Sección {seccion.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {seccionSeleccionada && (
                        <div className="mt-4">
                            <button
                                onClick={abrirModalAsignacion}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {cursosAsignados.length > 0 ? '✏️ Editar Cursos Asignados' : '+ Asignar Cursos'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Cursos Asignados */}
                {seccionSeleccionada && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Cursos Asignados
                                {nivelGrado && (
                                    <span className={`ml-3 px-3 py-1 rounded-full text-sm ${nivelGrado === 'primaria' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                        }`}>
                                        {nivelGrado === 'primaria' ? '📚 Primaria' : '🎓 Secundaria'}
                                    </span>
                                )}
                            </h2>
                        </div>

                        {cursosAsignados.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-600">No hay cursos asignados a esta sección</p>
                                <p className="text-sm text-gray-500 mt-2">Haz clic en "Asignar Cursos" para comenzar</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Curso</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docente</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {cursosAsignados.map((curso) => (
                                        <tr key={curso.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{curso.codigo}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{curso.nombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{curso.docente?.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => desasignarCurso(curso.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Desasignar"
                                                >
                                                    <svg className="w-5 h-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Modal Asignar Cursos */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <h2 className="text-2xl font-bold mb-6">
                                {modoEdicion ? 'Editar Cursos Asignados' : 'Asignar Cursos a la Sección'}
                            </h2>
                            <form onSubmit={asignarCursos} className="space-y-6">
                                {modoEdicion && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                        <p className="text-sm text-blue-800">
                                            ℹ️ Estás editando los cursos asignados. Los cursos ya seleccionados aparecen marcados.
                                        </p>
                                    </div>
                                )}

                                {/* Docente */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Docente</label>
                                    <select
                                        value={docenteSeleccionado || ''}
                                        onChange={(e) => setDocenteSeleccionado(Number(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Seleccionar docente</option>
                                        {docentes.map((docente) => (
                                            <option key={docente.id} value={docente.id}>{docente.name}</option>
                                        ))}
                                    </select>
                                    {nivelGrado === 'primaria' && (
                                        <p className="text-xs text-blue-600 mt-2">
                                            ℹ️ En primaria, el mismo docente dicta todos los cursos de la sección
                                        </p>
                                    )}
                                </div>

                                {/* Catálogo de Cursos */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        Selecciona los cursos ({cursosSeleccionados.length} seleccionados)
                                    </label>
                                    <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                                        {catalogoCursos.map((curso) => (
                                            <label
                                                key={curso.id}
                                                className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${cursosSeleccionados.includes(curso.id)
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={cursosSeleccionados.includes(curso.id)}
                                                    onChange={() => toggleCurso(curso.id)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900">{curso.nombre}</p>
                                                    <p className="text-xs text-gray-500">{curso.codigo}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Botones */}
                                <div className="flex space-x-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setCursosSeleccionados([]);
                                            setDocenteSeleccionado(null);
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        disabled={cursosSeleccionados.length === 0 || !docenteSeleccionado}
                                    >
                                        Asignar {cursosSeleccionados.length} Curso(s)
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};
