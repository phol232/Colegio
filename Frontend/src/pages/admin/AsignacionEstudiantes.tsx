import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import api from '../../services/api';

interface Estudiante {
    id: number;
    name: string;
    email: string;
    dni?: string;
    asignado?: boolean;
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

export const AsignacionEstudiantes = () => {
    const [grados, setGrados] = useState<Grado[]>([]);
    const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
    const [estudiantesAsignados, setEstudiantesAsignados] = useState<Estudiante[]>([]);

    const [gradoSeleccionado, setGradoSeleccionado] = useState<number | null>(null);
    const [seccionSeleccionada, setSeccionSeleccionada] = useState<number | null>(null);
    const [estudiantesSeleccionados, setEstudiantesSeleccionados] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);

    useEffect(() => {
        cargarDatos();
    }, []);

    useEffect(() => {
        if (seccionSeleccionada) {
            cargarEstudiantesAsignados(seccionSeleccionada);
        }
    }, [seccionSeleccionada]);

    const cargarDatos = async () => {
        try {
            const [gradosRes, estudiantesRes] = await Promise.all([
                api.get('/admin/grados'),
                api.get('/admin/estudiantes')
            ]);
            setGrados(gradosRes.data.data);
            setEstudiantes(estudiantesRes.data.data);
        } catch (error) {
            console.error('Error al cargar datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarEstudiantesAsignados = async (seccionId: number) => {
        try {
            const response = await api.get(`/admin/secciones/${seccionId}/estudiantes`);
            setEstudiantesAsignados(response.data.data);
        } catch (error) {
            console.error('Error al cargar estudiantes asignados:', error);
        }
    };

    const abrirModalAsignacion = () => {
        if (estudiantesAsignados.length > 0) {
            setModoEdicion(true);
            const estudiantesIds = estudiantesAsignados.map(e => e.id);
            setEstudiantesSeleccionados(estudiantesIds);
        } else {
            setModoEdicion(false);
            setEstudiantesSeleccionados([]);
        }
        setShowModal(true);
    };

    const asignarEstudiantes = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!seccionSeleccionada || estudiantesSeleccionados.length === 0) {
            alert('Debes seleccionar al menos un estudiante');
            return;
        }

        try {
            const response = await api.post(`/admin/secciones/${seccionSeleccionada}/asignar-estudiantes`, {
                estudiantes_ids: estudiantesSeleccionados
            });

            if (response.data.success) {
                alert(response.data.message);
                setShowModal(false);
                setEstudiantesSeleccionados([]);
                cargarEstudiantesAsignados(seccionSeleccionada);
                cargarDatos(); // Recargar para actualizar el estado "asignado"
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al asignar estudiantes');
        }
    };

    const toggleEstudiante = (estudianteId: number) => {
        setEstudiantesSeleccionados(prev =>
            prev.includes(estudianteId)
                ? prev.filter(id => id !== estudianteId)
                : [...prev, estudianteId]
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

    // Filtrar estudiantes: solo mostrar los que NO están asignados a ninguna sección
    // O los que ya están asignados a la sección actual (para poder editarlos)
    const estudiantesDisponibles = estudiantes.filter(estudiante => {
        const estaEnSeccionActual = estudiantesAsignados.some(e => e.id === estudiante.id);
        // Si está en la sección actual, siempre mostrarlo
        if (estaEnSeccionActual) return true;
        // Si no, solo mostrarlo si no tiene el flag de asignado
        return !estudiante.asignado;
    });

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Asignación de Estudiantes</h1>
          <p className="text-gray-600 mt-1">Asigna estudiantes a las secciones</p>
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
                  setEstudiantesAsignados([]);
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
                {estudiantesAsignados.length > 0 ? '✏️ Editar Estudiantes' : '+ Asignar Estudiantes'}
              </button>
            </div>
          )}
        </div>

        {/* Estudiantes Asignados */}
        {seccionSeleccionada && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Estudiantes Asignados ({estudiantesAsignados.length})
                {nivelGrado && (
                  <span className={`ml-3 px-3 py-1 rounded-full text-sm ${
                    nivelGrado === 'primaria' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {nivelGrado === 'primaria' ? '📚 Primaria' : '🎓 Secundaria'}
                  </span>
                )}
              </h2>
            </div>

            {estudiantesAsignados.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No hay estudiantes asignados a esta sección</p>
                <p className="text-sm text-gray-500 mt-2">Haz clic en "Asignar Estudiantes" para comenzar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {estudiantesAsignados.map((estudiante, index) => (
                      <tr key={estudiante.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{estudiante.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{estudiante.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{estudiante.dni || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal Asignar Estudiantes */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">
                {modoEdicion ? 'Editar Estudiantes Asignados' : 'Asignar Estudiantes a la Sección'}
              </h2>
              <form onSubmit={asignarEstudiantes} className="space-y-6">
                {modoEdicion && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      ℹ️ Estás editando los estudiantes asignados. Los estudiantes ya seleccionados aparecen marcados.
                    </p>
                  </div>
                )}

                {!modoEdicion && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-amber-800">
                      ℹ️ Solo se muestran estudiantes que no están asignados a ninguna sección. Los estudiantes ya asignados a otras secciones no aparecen en esta lista.
                    </p>
                  </div>
                )}

                {/* Lista de Estudiantes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Selecciona los estudiantes ({estudiantesSeleccionados.length} seleccionados)
                  </label>
                  <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {estudiantesDisponibles.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No hay estudiantes disponibles</p>
                        <p className="text-sm mt-2">Todos los estudiantes ya están asignados a otras secciones</p>
                      </div>
                    ) : (
                      estudiantesDisponibles.map((estudiante) => {
                        const yaAsignadoAqui = estudiantesAsignados.some(e => e.id === estudiante.id);
                        const seleccionado = estudiantesSeleccionados.includes(estudiante.id);
                        
                        return (
                          <label
                            key={estudiante.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                              seleccionado
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={seleccionado}
                              onChange={() => toggleEstudiante(estudiante.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {estudiante.name}
                                    {yaAsignadoAqui && (
                                      <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                        En esta sección
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">{estudiante.email}</p>
                                </div>
                                {estudiante.dni && (
                                  <span className="text-xs text-gray-500 font-mono">
                                    DNI: {estudiante.dni}
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Información adicional */}
                {nivelGrado && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Nivel:</span>{' '}
                      <span className={`px-2 py-1 rounded text-xs ${
                        nivelGrado === 'primaria' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {nivelGrado === 'primaria' ? '📚 Primaria' : '🎓 Secundaria'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      Los estudiantes seleccionados serán asignados a esta sección. Puedes agregar o quitar estudiantes en cualquier momento.
                    </p>
                  </div>
                )}

                {/* Botones */}
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEstudiantesSeleccionados([]);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={estudiantesSeleccionados.length === 0}
                  >
                    {modoEdicion ? 'Actualizar' : 'Asignar'} {estudiantesSeleccionados.length} Estudiante(s)
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
