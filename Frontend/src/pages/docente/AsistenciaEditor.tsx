import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Save,
  Search,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { getCourseColor } from '../../utils/courseColors';
import { sameId, toId } from '../../utils/ids';
import { cn } from '@/lib/utils';
import { useToastStore } from '../../stores/toastStore';
import api from '../../services/api';

type EstadoAsistencia = 'presente' | 'ausente' | 'tardanza';

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

const hoyIso = () => new Date().toISOString().split('T')[0];

const ESTADOS: Array<{
  id: EstadoAsistencia;
  label: string;
  icon: typeof Check;
  active: string;
  idle: string;
}> = [
  {
    id: 'presente',
    label: 'Presente',
    icon: Check,
    active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
    idle: 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50',
  },
  {
    id: 'tardanza',
    label: 'Tardanza',
    icon: Clock,
    active: 'bg-amber-500 text-white border-amber-500 shadow-sm',
    idle: 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50',
  },
  {
    id: 'ausente',
    label: 'Ausente',
    icon: X,
    active: 'bg-red-600 text-white border-red-600 shadow-sm',
    idle: 'bg-white text-red-700 border-red-200 hover:bg-red-50',
  },
];

export const AsistenciaEditor = () => {
  const { cursoId } = useParams<{ cursoId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const fechaParam = searchParams.get('fecha');
  const fecha = fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) ? fechaParam : hoyIso();

  const [curso, setCurso] = useState<Curso | null>(null);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [registros, setRegistros] = useState<Map<number, EstadoAsistencia>>(new Map());
  const [asistenciaExistente, setAsistenciaExistente] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  
  const showToast = useToastStore((s) => s.show);

  const setFecha = (nueva: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('fecha', nueva);
    setSearchParams(params, { replace: true });
  };

  const cargarDatos = useCallback(async () => {
    if (!cursoId) return;

    setLoading(true);
    setError(null);

    try {
      const respCursos = await api.get('/docente/cursos');
      const cursoEncontrado = (respCursos.data.data || []).find((c: Curso) =>
        sameId(c.id, cursoId),
      );

      if (!cursoEncontrado) {
        throw new Error('No tienes acceso a este curso o no existe.');
      }

      setCurso(cursoEncontrado);

      const respEst = await api.get(`/cursos/${cursoId}/estudiantes`);
      const estudiantesData: Estudiante[] = respEst.data.data || [];
      setEstudiantes(estudiantesData);

      const respAsist = await api.get(`/asistencias/curso/${cursoId}/fecha/${fecha}`);
      const asistencias = respAsist.data.success ? respAsist.data.data || [] : [];

      if (asistencias.length > 0) {
        setAsistenciaExistente(true);
        const map = new Map<number, EstadoAsistencia>();
        asistencias.forEach((a: { estudiante_id: number; estado: EstadoAsistencia }) => {
          map.set(toId(a.estudiante_id), a.estado);
        });
        estudiantesData.forEach((est) => {
          const id = toId(est.id);
          if (!map.has(id)) map.set(id, 'presente');
        });
        setRegistros(map);
      } else {
        setAsistenciaExistente(false);
        const map = new Map<number, EstadoAsistencia>();
        estudiantesData.forEach((est) => map.set(toId(est.id), 'presente'));
        setRegistros(map);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        'Error al cargar los datos de asistencia.';
      setError(message);
      setCurso(null);
      setEstudiantes([]);
      setRegistros(new Map());
    } finally {
      setLoading(false);
    }
  }, [cursoId, fecha]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const cambiarFecha = (dias: number) => {
    const nueva = new Date(`${fecha}T00:00:00`);
    nueva.setDate(nueva.getDate() + dias);
    const limite = new Date();
    limite.setHours(0, 0, 0, 0);
    if (nueva <= limite) {
      setFecha(nueva.toISOString().split('T')[0]);
    }
  };

  const cambiarEstado = (estudianteId: number, estado: EstadoAsistencia) => {
    setRegistros((prev) => new Map(prev).set(toId(estudianteId), estado));
  };

  const marcarTodos = (estado: EstadoAsistencia) => {
    const map = new Map<number, EstadoAsistencia>();
    estudiantes.forEach((est) => map.set(toId(est.id), estado));
    setRegistros(map);
  };

  const guardarAsistencia = async () => {
    if (!curso || registros.size === 0) {
      showToast('No hay registros de asistencia para guardar.', 'error', 3500, 'Sin datos');
      return;
    }

    setGuardando(true);
    try {
      const registrosArray = Array.from(registros.entries()).map(([estudiante_id, estado]) => ({
        estudiante_id,
        estado,
      }));

      await api.post('/asistencias', {
        curso_id: curso.id,
        fecha,
        registros: registrosArray,
      });

      setAsistenciaExistente(true);
      showToast('El registro de asistencia se guardó correctamente.', 'success', 3500, 'Asistencia guardada');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al guardar la asistencia.';
      showToast(message, 'error', 3500, 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const contadores = useMemo(
    () => ({
      presente: Array.from(registros.values()).filter((e) => e === 'presente').length,
      ausente: Array.from(registros.values()).filter((e) => e === 'ausente').length,
      tardanza: Array.from(registros.values()).filter((e) => e === 'tardanza').length,
    }),
    [registros],
  );

  const estudiantesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return estudiantes;
    return estudiantes.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.dni || '').includes(q),
    );
  }, [estudiantes, busqueda]);

  const esHoy = fecha === hoyIso();
  const fechaLabel = new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6F8]">
        <Loader2 className="h-10 w-10 animate-spin text-[#C62828]" />
      </div>
    );
  }

  if (error || !curso) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] p-6">
        <PageHeader
          title="Tomar asistencia"
          description="No se pudo cargar el curso"
          onBack={() => navigate('/docente/asistencia')}
        />
        <ErrorBanner message={error || 'Curso no encontrado'} onRetry={cargarDatos} />
      </div>
    );
  }

  const courseColor = getCourseColor(curso.nombre);

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-28">
      <div className="p-6">
        <PageHeader
          title={curso.nombre}
          description={`${curso.codigo} · ${curso.grado} ${curso.seccion}`}
          onBack={() => navigate('/docente/asistencia')}
          actions={
            <button
              type="button"
              onClick={guardarAsistencia}
              disabled={guardando || estudiantes.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C62828] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B71C1C] disabled:cursor-not-allowed disabled:bg-[#EAB0B0]"
            >
              {guardando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {guardando ? 'Guardando...' : 'Guardar asistencia'}
            </button>
          }
        />

        {/* Banner del curso + fecha */}
        <div
          className="mb-6 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm"
        >
          <div
            className="flex flex-col gap-4 border-b border-[#E5E7EB] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ backgroundColor: courseColor.light }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white"
                style={{ backgroundColor: courseColor.primary }}
              >
                {curso.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0E2B5C]">Registro de asistencia</p>
                <p className="text-xs capitalize text-[#6B7280]">{fechaLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => cambiarFecha(-1)}
                aria-label="Día anterior"
                className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <label className="flex items-center gap-2 px-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={fecha}
                  max={hoyIso()}
                  onChange={(e) => {
                    if (e.target.value && e.target.value <= hoyIso()) {
                      setFecha(e.target.value);
                    }
                  }}
                  className="border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => cambiarFecha(1)}
                disabled={esHoy}
                aria-label="Día siguiente"
                className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Contadores */}
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{contadores.presente}</p>
                <p className="text-xs font-medium text-emerald-800/70">Presentes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{contadores.tardanza}</p>
                <p className="text-xs font-medium text-amber-800/70">Tardanzas</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{contadores.ausente}</p>
                <p className="text-xs font-medium text-red-800/70">Ausentes</p>
              </div>
            </div>
          </div>
        </div>

        {asistenciaExistente && (
          <div
            role="status"
            className="mb-4 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            <p>
              Ya existe un registro para esta fecha. Los cambios que guardes actualizarán la
              asistencia existente.
            </p>
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar estudiante por nombre o correo..."
              className="w-full rounded-lg border border-[#E5E7EB] bg-[#F4F6F8] py-2 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Users className="h-3.5 w-3.5" />
              {estudiantes.length} estudiantes
            </span>
            <button
              type="button"
              onClick={() => marcarTodos('presente')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <Check className="h-3.5 w-3.5" />
              Todos presentes
            </button>
            <button
              type="button"
              onClick={() => marcarTodos('ausente')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
              <X className="h-3.5 w-3.5" />
              Todos ausentes
            </button>
          </div>
        </div>

        {/* Lista */}
        {estudiantes.length === 0 ? (
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-16 text-center shadow-sm">
            <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">
              Este curso aún no tiene estudiantes asignados
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="hidden border-b border-[#E5E7EB] bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
              <span>Estudiante</span>
              <span className="pr-2 text-right">Estado</span>
            </div>

            <ul className="divide-y divide-[#E5E7EB]">
              {estudiantesFiltrados.map((estudiante, index) => {
                const estudianteId = toId(estudiante.id);
                const estado = registros.get(estudianteId) || 'presente';

                return (
                  <li
                    key={estudianteId}
                    className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-6 shrink-0 text-center text-xs font-medium text-slate-400">
                        {index + 1}
                      </span>
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: courseColor.primary }}
                      >
                        {estudiante.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {estudiante.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">{estudiante.email}</p>
                      </div>
                    </div>

                    <div
                      role="group"
                      aria-label={`Asistencia de ${estudiante.name}`}
                      className="flex flex-wrap gap-1.5 sm:justify-end"
                    >
                      {ESTADOS.map(({ id, label, icon: Icon, active, idle }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => cambiarEstado(estudianteId, id)}
                          aria-pressed={estado === id}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                            estado === id ? active : idle,
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>

            {estudiantesFiltrados.length === 0 && (
              <div className="px-6 py-12 text-center">
                <Search className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">No hay coincidencias con la búsqueda</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barra fija inferior */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E5E7EB] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:left-64">
        <div className="mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <div className="hidden text-xs text-slate-500 sm:block">
            <span className="font-semibold text-emerald-600">{contadores.presente}</span> presentes
            <span className="mx-2 text-slate-300">·</span>
            <span className="font-semibold text-amber-600">{contadores.tardanza}</span> tardanzas
            <span className="mx-2 text-slate-300">·</span>
            <span className="font-semibold text-red-600">{contadores.ausente}</span> ausentes
          </div>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/docente/asistencia')}
              className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={guardarAsistencia}
              disabled={guardando || estudiantes.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C62828] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#B71C1C] disabled:cursor-not-allowed disabled:bg-[#EAB0B0]"
            >
              {guardando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {guardando ? 'Guardando...' : 'Guardar asistencia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
