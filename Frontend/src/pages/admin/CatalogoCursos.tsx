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

export const CatalogoCursos = () => {
  const [cursos, setCursos] = useState<CursoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [cursoEditando, setCursoEditando] = useState<CursoCatalogo | null>(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nivel, setNivel] = useState('ambos');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    cargarCursos();
  }, []);

  const cargarCursos = async () => {
    try {
      const response = await api.get('/admin/catalogo-cursos');
      setCursos(response.data.data);
    } catch (error) {
      console.error('Error al cargar cursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const guardarCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { nombre, codigo, nivel, descripcion: descripcion || null };

      const response = editando && cursoEditando
        ? await api.put(`/admin/catalogo-cursos/${cursoEditando.id}`, data)
        : await api.post('/admin/catalogo-cursos', data);

      if (response.data.success) {
        alert(response.data.message);
        setShowModal(false);
        resetForm();
        cargarCursos();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al guardar curso');
    }
  };

  const abrirModalEditar = (curso: CursoCatalogo) => {
    setEditando(true);
    setCursoEditando(curso);
    setNombre(curso.nombre);
    setCodigo(curso.codigo);
    setNivel(curso.nivel);
    setDescripcion(curso.descripcion || '');
    setShowModal(true);
  };

  const eliminarCurso = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este curso del catálogo?')) return;

    try {
      const response = await api.delete(`/admin/catalogo-cursos/${id}`);
      if (response.data.success) {
        alert('Curso eliminado exitosamente');
        cargarCursos();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al eliminar curso');
    }
  };

  const resetForm = () => {
    setEditando(false);
    setCursoEditando(null);
    setNombre('');
    setCodigo('');
    setNivel('ambos');
    setDescripcion('');
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

  const cursosPrimaria = cursos.filter(c => c.nivel === 'primaria' || c.nivel === 'ambos');
  const cursosSecundaria = cursos.filter(c => c.nivel === 'secundaria' || c.nivel === 'ambos');

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Catálogo de Cursos</h1>
            <p className="text-gray-600 mt-1">Gestiona los cursos disponibles del sistema</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Nuevo Curso</span>
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Cursos</p>
                <p className="text-2xl font-bold text-gray-900">{cursos.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <span className="text-2xl">📚</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Primaria</p>
                <p className="text-2xl font-bold text-gray-900">{cursosPrimaria.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                <span className="text-2xl">🎓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Secundaria</p>
                <p className="text-2xl font-bold text-gray-900">{cursosSecundaria.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Cursos */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nivel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cursos.map((curso) => (
                <tr key={curso.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{curso.codigo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{curso.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${curso.nivel === 'primaria' ? 'bg-blue-100 text-blue-800' :
                        curso.nivel === 'secundaria' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                      }`}>
                      {curso.nivel === 'primaria' ? '📚 Primaria' :
                        curso.nivel === 'secundaria' ? '🎓 Secundaria' :
                          '📖 Ambos'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {curso.descripcion || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => abrirModalEditar(curso)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      title="Editar"
                    >
                      <svg className="w-5 h-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => eliminarCurso(curso.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Eliminar"
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

          {cursos.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No hay cursos en el catálogo</p>
            </div>
          )}
        </div>

        {/* Modal Crear/Editar */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">
                {editando ? 'Editar Curso' : 'Nuevo Curso'}
              </h2>
              <form onSubmit={guardarCurso} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Curso</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Matemática"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Código</label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej: MAT"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nivel</label>
                  <select
                    value={nivel}
                    onChange={(e) => setNivel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="ambos">📖 Ambos niveles</option>
                    <option value="primaria">📚 Solo Primaria</option>
                    <option value="secundaria">🎓 Solo Secundaria</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción (opcional)</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Descripción del curso..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editando ? 'Actualizar' : 'Crear'}
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
