import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  GraduationCap,
  Loader2,
  Mail,
  Search,
  User,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FormModal } from '../../components/FormModal';
import { Modal } from '../../components/Modal';
import { useToastStore } from '../../stores/toastStore';
import api from '../../services/api';
import type { MatriculaRecord, PeriodoMatricula } from '../../types/matricula';

interface ResumenData {
  resumen: {
    pendientes: number;
    activas: number;
    rechazadas: number;
    retiradas: number;
    sinSeccion: number;
  };
  decisiones: Array<{
    matricula: MatriculaRecord;
    decision: { resultado: string } | null;
  }>;
}

interface SeccionOption {
  id: number;
  nombre: string;
  capacidad: number;
}

interface GradoOption {
  id: number;
  nombre: string;
}

const filtrosEstado = [
  { id: '', label: 'Todos' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'activa', label: 'Activas' },
  { id: 'rechazada', label: 'Rechazadas' },
  { id: 'retirada', label: 'Retiradas' },
] as const;

function normalizarSeccion(raw: Record<string, unknown>): SeccionOption {
  return {
    id: Number(raw.id),
    nombre: String(raw.nombre ?? ''),
    capacidad: Number(raw.capacidad ?? 0),
  };
}

export const MatriculasAdmin = () => {
  const showToast = useToastStore((s) => s.show);
  const [resumen, setResumen] = useState<ResumenData | null>(null);
  const [matriculas, setMatriculas] = useState<MatriculaRecord[]>([]);
  const [grados, setGrados] = useState<GradoOption[]>([]);
  const [seccionesDisponibles, setSeccionesDisponibles] = useState<SeccionOption[]>([]);
  const [cargandoSecciones, setCargandoSecciones] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('pendiente');
  const [filtroGrado, setFiltroGrado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState<MatriculaRecord | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState<'aprobar' | 'rechazar' | null>(null);
  const [seccionAprobar, setSeccionAprobar] = useState<number | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [tab, setTab] = useState<'solicitudes' | 'promocion'>('solicitudes');

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const periodoRes = await api.get('/admin/matriculas/periodo-activo');
      const periodoData = periodoRes.data.data as PeriodoMatricula | null;

      const [listRes, resumenRes] = await Promise.all([
        api.get('/admin/matriculas', {
          params: {
            periodo_id: periodoData?.id,
            estado: filtroEstado || undefined,
            grado_id: filtroGrado !== 'todos' ? Number(filtroGrado) : undefined,
            busqueda: busqueda || undefined,
            limit: 50,
          },
        }),
        periodoData
          ? api.get(`/admin/matriculas/resumen/${periodoData.id}`)
          : Promise.resolve({ data: { data: null } }),
      ]);

      setMatriculas(listRes.data.data?.items ?? []);
      setResumen(resumenRes.data.data ?? null);
    } catch {
      setError('Error al cargar datos de matrículas.');
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroGrado, busqueda]);

  useEffect(() => {
    api
      .get('/admin/grados')
      .then((res) => {
        const items = (res.data.data ?? []).map((g: Record<string, unknown>) => ({
          id: Number(g.id),
          nombre: String(g.nombre ?? ''),
        }));
        setGrados(items);
      })
      .catch(() => setGrados([]));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const gradoId = seleccionada?.gradoId ?? seleccionada?.grado?.id;
    if (!gradoId) {
      setSeccionesDisponibles([]);
      setSeccionAprobar(null);
      return;
    }

    let cancelado = false;
    const cargarSecciones = async () => {
      try {
        setCargandoSecciones(true);
        setSeccionAprobar(null);
        const res = await api.get(`/admin/grados/${Number(gradoId)}/secciones`);
        if (cancelado) return;
        const items = (res.data.data ?? []).map((s: Record<string, unknown>) =>
          normalizarSeccion(s),
        );
        setSeccionesDisponibles(items);
      } catch {
        if (!cancelado) setSeccionesDisponibles([]);
      } finally {
        if (!cancelado) setCargandoSecciones(false);
      }
    };

    cargarSecciones();
    return () => {
      cancelado = true;
    };
  }, [seleccionada?.id, seleccionada?.gradoId, seleccionada?.grado?.id]);

  const abrirDetalle = (m: MatriculaRecord) => {
    setSeleccionada(m);
    setSeccionAprobar(null);
    setDetalleAbierto(true);
  };

  const cerrarDetalle = () => {
    setDetalleAbierto(false);
    setSeleccionada(null);
    setSeccionAprobar(null);
    setConfirmacion(null);
  };

  const aprobar = async () => {
    if (!seleccionada || seccionAprobar == null) return;
    try {
      setProcesando(true);
      await api.post(`/admin/matriculas/${seleccionada.id}/aprobar`, {
        seccion_id: seccionAprobar,
      });
      showToast('Matrícula activada correctamente.', 'success', 3500, 'Aprobada');
      cerrarDetalle();
      cargar();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast(e.response?.data?.message ?? 'No se pudo aprobar.', 'error');
    } finally {
      setProcesando(false);
    }
  };

  const rechazar = async () => {
    if (!seleccionada) return;
    try {
      setProcesando(true);
      await api.post(`/admin/matriculas/${seleccionada.id}/rechazar`, {});
      showToast('Solicitud rechazada.', 'success', 3500, 'Rechazada');
      cerrarDetalle();
      cargar();
    } catch {
      showToast('No se pudo rechazar.', 'error');
    } finally {
      setProcesando(false);
    }
  };

  const registrarDecision = async (
    matriculaId: number,
    resultado: 'promovido' | 'repite' | 'egresado',
  ) => {
    try {
      setProcesando(true);
      await api.post('/admin/matriculas/decisiones', {
        matricula_origen_id: matriculaId,
        resultado,
      });
      showToast(`Decisión "${resultado}" guardada.`, 'success', 3500, 'Registrado');
      cargar();
    } catch {
      showToast('No se pudo registrar la decisión.', 'error');
    } finally {
      setProcesando(false);
    }
  };

  if (loading && !resumen) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 md:px-8">
      <PageHeader title="Gestión de matrículas" />

      {error && <ErrorBanner message={error} onRetry={cargar} />}

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === 'solicitudes' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('solicitudes')}
        >
          Solicitudes
        </Button>
        <Button
          type="button"
          variant={tab === 'promocion' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('promocion')}
        >
          Cierre / Promoción
        </Button>
      </div>

      {tab === 'solicitudes' && (
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, email o DNI..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && cargar()}
                  className="pl-9"
                />
              </div>
              <div className="w-full lg:w-56">
                <Label htmlFor="filtro-grado" className="mb-1.5 block text-xs text-slate-500">
                  Grado
                </Label>
                <Select value={filtroGrado} onValueChange={setFiltroGrado}>
                  <SelectTrigger id="filtro-grado" className="w-full">
                    <SelectValue placeholder="Todos los grados" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    <SelectItem value="todos">Todos los grados</SelectItem>
                    {grados.map((grado) => (
                      <SelectItem key={grado.id} value={String(grado.id)}>
                        {grado.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={cargar} className="shrink-0">
                Buscar
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            {filtrosEstado.map((filtro) => (
              <Button
                key={filtro.id || 'todos'}
                type="button"
                size="sm"
                variant={filtroEstado === filtro.id ? 'default' : 'outline'}
                onClick={() => setFiltroEstado(filtro.id)}
              >
                {filtro.label}
              </Button>
            ))}
          </div>

          {matriculas.length === 0 ? (
            <Card className="border-dashed border-slate-200 shadow-sm">
              <CardContent className="py-14 text-center text-sm text-slate-500">
                No hay matrículas con los filtros seleccionados
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {matriculas.map((m) => (
                <article
                  key={m.id}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <StatusBadge status={m.estado} />
                    <span className="text-xs capitalize text-slate-400">{m.tipo}</span>
                  </div>
                  <p className="truncate font-semibold text-slate-900">
                    {m.estudianteNombre ?? `ID ${m.estudianteId}`}
                  </p>
                  {m.estudianteEmail && (
                    <p className="mt-0.5 truncate text-xs text-slate-500">{m.estudianteEmail}</p>
                  )}
                  <div className="mt-4 flex-1 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Grado</span>
                      <span className="truncate font-medium text-slate-800">
                        {m.grado?.nombre ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Sección</span>
                      <span className="truncate font-medium text-slate-800">
                        {m.seccion?.nombre ?? '—'}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => abrirDetalle(m)}
                  >
                    <User className="h-4 w-4" />
                    Ver solicitud
                  </Button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'promocion' && resumen && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Decisiones de promoción</CardTitle>
            <CardDescription>
              Registra si cada estudiante fue promovido, repite o egresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Estudiante</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Grado actual</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Decisión</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumen.decisiones.map(({ matricula: m, decision }) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 font-medium">
                        {m.estudianteNombre ?? `ID ${m.estudianteId}`}
                      </td>
                      <td className="px-4 py-3">{m.grado?.nombre}</td>
                      <td className="px-4 py-3">
                        {decision ? (
                          <span className="capitalize">{decision.resultado}</span>
                        ) : (
                          <span className="font-medium text-amber-600">Pendiente</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!decision && (
                          <div className="flex flex-wrap gap-1">
                            {(['promovido', 'repite', 'egresado'] as const).map((r) => (
                              <Button
                                key={r}
                                size="sm"
                                variant="outline"
                                disabled={procesando}
                                onClick={() => registrarDecision(m.id, r)}
                                className="text-xs capitalize"
                              >
                                {r}
                              </Button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <FormModal
        isOpen={detalleAbierto && seleccionada != null}
        onClose={cerrarDetalle}
        title={seleccionada?.estudianteNombre ?? 'Detalle de solicitud'}
        subtitle={seleccionada?.estudianteEmail ?? 'Revisa la información de la matrícula'}
        icon={<User className="h-5 w-5" />}
        footer={
          seleccionada?.estado === 'pendiente' ? (
            <>
              <Button variant="outline" onClick={cerrarDetalle} disabled={procesando}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmacion('rechazar')}
                disabled={procesando}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                Rechazar
              </Button>
              <Button
                onClick={() => setConfirmacion('aprobar')}
                disabled={seccionAprobar == null || procesando || cargandoSecciones}
              >
                <UserCheck className="h-4 w-4" />
                Aprobar
              </Button>
            </>
          ) : (
            <Button onClick={cerrarDetalle}>Cerrar</Button>
          )
        }
      >
        {seleccionada && (
          <div className="space-y-4">
            <div className="grid gap-2">
              {seleccionada.estudianteEmail && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate text-slate-700">{seleccionada.estudianteEmail}</span>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-slate-500">
                  <GraduationCap className="h-4 w-4" />
                  Grado
                </span>
                <span className="font-medium text-slate-900">
                  {seleccionada.grado?.nombre ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-500">Tipo</span>
                <span className="font-medium capitalize text-slate-900">{seleccionada.tipo}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-500">Estado</span>
                <StatusBadge status={seleccionada.estado} />
              </div>
              {seleccionada.seccion && (
                <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-500">Sección</span>
                  <span className="font-medium text-slate-900">{seleccionada.seccion.nombre}</span>
                </div>
              )}
            </div>

            {seleccionada.estado === 'pendiente' && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <Label className="text-sm font-medium text-slate-800">Asignar sección</Label>

                {cargandoSecciones ? (
                  <div className="flex items-center justify-center py-6 text-sm text-slate-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando secciones…
                  </div>
                ) : seccionesDisponibles.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                    No hay secciones para este grado. Créalas en Grados y Secciones.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {seccionesDisponibles.map((seccion) => {
                      const seleccionadaSeccion = seccionAprobar === seccion.id;
                      return (
                        <button
                          key={seccion.id}
                          type="button"
                          onClick={() => setSeccionAprobar(seccion.id)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition-all',
                            seleccionadaSeccion
                              ? 'border-sidebar-bg bg-blue-50 ring-1 ring-sidebar-bg'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                          )}
                        >
                          <div>
                            <p className="font-medium text-slate-900">Sección {seccion.nombre}</p>
                            <p className="text-xs text-slate-500">
                              Capacidad: {seccion.capacidad} estudiantes
                            </p>
                          </div>
                          {seleccionadaSeccion && (
                            <Check className="h-5 w-5 shrink-0 text-sidebar-bg" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </FormModal>

      <Modal
        stacked
        isOpen={confirmacion != null}
        onClose={() => setConfirmacion(null)}
        type="confirm"
        title={
          confirmacion === 'aprobar'
            ? '¿Aprobar matrícula?'
            : '¿Rechazar solicitud?'
        }
        message={
          confirmacion === 'aprobar'
            ? `Se activará la matrícula de ${seleccionada?.estudianteNombre ?? 'el estudiante'} en la sección ${
                seccionesDisponibles.find((s) => s.id === seccionAprobar)?.nombre ?? 'seleccionada'
              }.`
            : `Se rechazará la solicitud de ${seleccionada?.estudianteNombre ?? 'el estudiante'}. Esta acción no se puede deshacer.`
        }
        confirmText={confirmacion === 'aprobar' ? 'Sí, aprobar' : 'Sí, rechazar'}
        cancelText="Cancelar"
        onConfirm={() => {
          if (confirmacion === 'aprobar') void aprobar();
          else void rechazar();
        }}
      />
    </div>
  );
};
