import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import api from '../../services/api';

interface Grado {
    id: number;
    nivel: string;
    numero: number;
    nombre: string;
    secciones?: Seccion[];
}

interface Seccion {
    id: number;
    grado_id: number;
    nombre: string;
    capacidad: number;
}

export const GradosYSecciones = () => {
    const [grados, setGrados] = useState<Grado[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGradoModal, setShowGradoModal] = useState(false);
    const [showSeccionModal, setShowSeccionModal] = useState(false);
    const [selectedGrado, setSelectedGrado] = useState<number | null>(null);
    const [editingGrado, setEditingGrado] = useState<Grado | null>(null);
    const [editingSeccion, setEditingSeccion] = useState<Seccion | null>(null);

    // Form states
    const [nivel, setNivel] = useState('primaria');
    const [numero, setNumero] = useState(1);
    const [nombreGrado, setNombreGrado] = useState('');
    const [nombreSeccion, setNombreSeccion] = useState('');
    const [capacidad, setCapacidad] = useState(30);

    useEffect(() => {
        cargarGrados();
    }, []);

    const cargarGrados = async () => {
        try {
            const response = await api.get('/admin/grados');
            setGrados(response.data.data);
        } catch (error) {
            console.error('Error al cargar grados:', error);
        } finally {
            setLoading(false);
        }
    };

    const crearGrado = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingGrado) {
                // Actualizar
                await api.put(`/admin/grados/${editingGrado.id}`, {
                    nivel,
                    numero,
                    nombre: nombreGrado
                });
            } else {
                // Crear
                await api.post('/admin/grados', {
                    nivel,
                    numero,
                    nombre: nombreGrado
                });
            }
            setShowGradoModal(false);
            setEditingGrado(null);
            cargarGrados();
            // Reset form
            setNivel('primaria');
            setNumero(1);
            setNombreGrado('');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al guardar grado');
        }
    };

    const abrirEditarGrado = (grado: Grado) => {
        setEditingGrado(grado);
        setNivel(grado.nivel);
        setNumero(grado.numero);
        setNombreGrado(grado.nombre);
        setShowGradoModal(true);
    };

    const crearSeccion = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingSeccion) {
                // Actualizar
                await api.put(`/admin/secciones/${editingSeccion.id}`, {
                    nombre: nombreSeccion,
                    capacidad
                });
            } else {
                // Crear
                if (!selectedGrado) return;
                await api.post(`/admin/grados/${selectedGrado}/secciones`, {
                    nombre: nombreSeccion,
                    capacidad
                });
            }
            setShowSeccionModal(false);
            setEditingSeccion(null);
            cargarGrados();
            // Reset form
            setNombreSeccion('');
            setCapacidad(30);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al guardar sección');
        }
    };

    const abrirEditarSeccion = (seccion: Seccion) => {
        setEditingSeccion(seccion);
        setNombreSeccion(seccion.nombre);
        setCapacidad(seccion.capacidad);
        setShowSeccionModal(true);
    };

    const eliminarGrado = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este grado? Se eliminarán todas sus secciones y cursos.')) return;

        try {
            await api.delete(`/admin/grados/${id}`);
            cargarGrados();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al eliminar grado');
        }
    };

    const eliminarSeccion = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar esta sección? Se eliminarán todos sus cursos.')) return;

        try {
            await api.delete(`/admin/secciones/${id}`);
            cargarGrados();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al eliminar sección');
        }
    };

    const actualizarGrado = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGrado) return;

        try {
            await api.put(`/admin/grados/${editingGrado.id}`, {
                nivel,
                numero,
                nombre: nombreGrado
            });
            setShowGradoModal(false);
            setEditingGrado(null);
            cargarGrados();
            // Reset form
            setNivel('primaria');
            setNumero(1);
            setNombreGrado('');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al actualizar grado');
        }
    };

    const actualizarSeccion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSeccion) return;

        try {
            await api.put(`/admin/secciones/${editingSeccion.id}`, {
                nombre: nombreSeccion,
                capacidad
            });
            setShowSeccionModal(false);
            setEditingSeccion(null);
            cargarGrados();
            // Reset form
            setNombreSeccion('');
            setCapacidad(30);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al actualizar sección');
        }
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

    return (
        <Layout>
            <div className="p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Grados y Secciones</h1>
                        <p className="text-gray-600 mt-1">Gestiona la estructura académica del colegio</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingGrado(null);
                            setNivel('primaria');
                            setNumero(1);
                            setNombreGrado('');
                            setShowGradoModal(true);
                        }}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Nuevo Grado</span>
                    </button>
                </div>

                {/* Grados Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {grados.map((grado) => (
                        <div key={grado.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold">{grado.nombre}</h3>
                                    <p className="text-sm opacity-90 capitalize">{grado.nivel}</p>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => abrirEditarGrado(grado)}
                                        className="text-white hover:text-yellow-200 p-1"
                                        title="Editar grado"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => eliminarGrado(grado.id)}
                                        className="text-white hover:text-red-200 p-1"
                                        title="Eliminar grado"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold text-gray-900">Secciones</h4>
                                    <button
                                        onClick={() => {
                                            setEditingSeccion(null);
                                            setSelectedGrado(grado.id);
                                            setNombreSeccion('');
                                            setCapacidad(30);
                                            setShowSeccionModal(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                    >
                                        + Agregar
                                    </button>
                                </div>

                                {grado.secciones && grado.secciones.length > 0 ? (
                                    <div className="space-y-2">
                                        {grado.secciones.map((seccion) => (
                                            <div key={seccion.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <span className="font-medium text-gray-900">Sección {seccion.nombre}</span>
                                                    <p className="text-xs text-gray-600">Capacidad: {seccion.capacidad} estudiantes</p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => abrirEditarSeccion(seccion)}
                                                        className="text-blue-600 hover:text-blue-700 p-1"
                                                        title="Editar sección"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => eliminarSeccion(seccion.id)}
                                                        className="text-red-600 hover:text-red-700 p-1"
                                                        title="Eliminar sección"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm text-center py-4">No hay secciones</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {grados.length === 0 && (
                    <div className="text-center py-12">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-gray-600">No hay grados registrados</p>
                        <button
                            onClick={() => {
                                setEditingGrado(null);
                                setNivel('primaria');
                                setNumero(1);
                                setNombreGrado('');
                                setShowGradoModal(true);
                            }}
                            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Crear el primer grado
                        </button>
                    </div>
                )}

                {/* Modal Crear/Editar Grado */}
                {showGradoModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-8 max-w-md w-full">
                            <h2 className="text-2xl font-bold mb-6">
                                {editingGrado ? 'Editar Grado' : 'Crear Nuevo Grado'}
                            </h2>
                            <form onSubmit={crearGrado} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nivel</label>
                                    <select
                                        value={nivel}
                                        onChange={(e) => setNivel(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="primaria">Primaria</option>
                                        <option value="secundaria">Secundaria</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Número</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="6"
                                        value={numero}
                                        onChange={(e) => setNumero(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                                    <input
                                        type="text"
                                        value={nombreGrado}
                                        onChange={(e) => setNombreGrado(e.target.value)}
                                        placeholder="Ej: 1ro Primaria"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div className="flex space-x-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowGradoModal(false);
                                            setEditingGrado(null);
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        {editingGrado ? 'Actualizar' : 'Crear Grado'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal Crear/Editar Sección */}
                {showSeccionModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-8 max-w-md w-full">
                            <h2 className="text-2xl font-bold mb-6">
                                {editingSeccion ? 'Editar Sección' : 'Crear Nueva Sección'}
                            </h2>
                            <form onSubmit={crearSeccion} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de Sección</label>
                                    <input
                                        type="text"
                                        value={nombreSeccion}
                                        onChange={(e) => setNombreSeccion(e.target.value)}
                                        placeholder="Ej: A, B, C"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Capacidad</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={capacidad}
                                        onChange={(e) => setCapacidad(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div className="flex space-x-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowSeccionModal(false);
                                            setEditingSeccion(null);
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        {editingSeccion ? 'Actualizar' : 'Crear Sección'}
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
