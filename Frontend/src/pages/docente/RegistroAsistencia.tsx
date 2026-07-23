import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardCheck,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { getCourseColor } from '../../utils/courseColors';
import api from '../../services/api';

interface Curso {
  id: number;
  nombre: string;
  codigo: string;
  grado: string;
  seccion: string;
}

export const RegistroAsistencia = () => {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroNivel, setFiltroNivel] = useState<'todos' | 'primaria' | 'secundaria'>('todos');

  useEffect(() => {
    cargarCursosDocente();
  }, []);

  const cargarCursosDocente = async () => {
    try {
      const response = await api.get('/docente/cursos');
      setCursos(response.data.data || []);
    } catch (error) {
      console.error('Error al cargar cursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cursosFiltrados = useMemo(() => {
    return cursos.filter((curso) => {
      const coincideBusqueda =
        curso.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        curso.codigo.toLowerCase().includes(busqueda.toLowerCase());

      let coincideNivel = true;
      if (filtroNivel === 'primaria') {
        coincideNivel = curso.grado.toLowerCase().includes('primaria');
      } else if (filtroNivel === 'secundaria') {
        coincideNivel = curso.grado.toLowerCase().includes('secundaria');
      }

      return coincideBusqueda && coincideNivel;
    });
  }, [cursos, busqueda, filtroNivel]);

  const abrirRegistro = (curso: Curso) => {
    navigate(`/docente/asistencia/curso/${curso.id}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6F8]">
        <Loader2 className="h-10 w-10 animate-spin text-[#C62828]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] p-6">
      <PageHeader
        title="Registro de Asistencia"
        description="Selecciona un curso para tomar asistencia"
      />

      <div className="mb-4 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar curso por nombre o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-lg border border-[#E5E7EB] bg-[#F4F6F8] py-2 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/20"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-[#F4F6F8] p-1">
            {(['todos', 'primaria', 'secundaria'] as const).map((nivel) => (
              <button
                key={nivel}
                type="button"
                onClick={() => setFiltroNivel(nivel)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                  filtroNivel === nivel
                    ? 'bg-[#C62828] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-white'
                }`}
              >
                {nivel.charAt(0).toUpperCase() + nivel.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cursosFiltrados.map((curso) => {
          const courseColor = getCourseColor(curso.nombre);

          return (
            <div
              key={curso.id}
              className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm transition-all hover:shadow-md"
            >
              <div
                className="border-b border-[#E5E7EB] p-5"
                style={{ backgroundColor: courseColor.light }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white"
                    style={{ backgroundColor: courseColor.primary }}
                  >
                    {curso.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-[#0E2B5C]">{curso.nombre}</h3>
                    <p className="text-xs text-[#6B7280]">{curso.codigo}</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#6B7280]">Grado</p>
                    <p className="text-sm font-bold text-[#1F2937]">{curso.grado}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#6B7280]">Sección</p>
                    <p className="text-sm font-bold text-[#1F2937]">{curso.seccion}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => abrirRegistro(curso)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-sidebar-bg px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sidebar-hover"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Registrar asistencia
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {cursosFiltrados.length === 0 && cursos.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-sm">
          <Search className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            No se encontraron cursos con los filtros aplicados
          </p>
          <button
            type="button"
            onClick={() => {
              setBusqueda('');
              setFiltroNivel('todos');
            }}
            className="mt-3 text-xs font-semibold text-[#C62828] hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {cursos.length === 0 && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-sm">
          <BookOpen className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No tienes cursos asignados</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Users className="h-3.5 w-3.5" />
            Contacta al administrador si crees que es un error
          </p>
        </div>
      )}
    </div>
  );
};
