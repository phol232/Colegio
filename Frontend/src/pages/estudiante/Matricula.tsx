import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, FileText, GraduationCap, Loader2 } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useToastStore } from '../../stores/toastStore';
import api from '../../services/api';
import type { EstadoMatriculaResponse } from '../../types/matricula';

export const Matricula = () => {
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.show);
  const [estado, setEstado] = useState<EstadoMatriculaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm';
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'confirm' });

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<EstadoMatriculaResponse>('/matricula/estado');
      setEstado(response.data);
    } catch {
      setError('No se pudo cargar la información de matrícula.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleSolicitar = () => {
    const grado = estado?.propuesta.gradoPropuesto?.nombre ?? 'tu grado';
    setModalConfig({
      isOpen: true,
      title: 'Confirmar solicitud',
      message: `¿Deseas enviar tu solicitud de matrícula para ${grado}?\n\nAdministración revisará tu solicitud y asignará la sección correspondiente.`,
      type: 'confirm',
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          setProcesando(true);
          await api.post('/matricula/solicitudes', {});
          showToast('Tu solicitud fue registrada. Te notificaremos cuando sea revisada.', 'success', 3500, 'Solicitud enviada');
          cargarDatos();
        } catch (err: unknown) {
          const axiosErr = err as { response?: { data?: { message?: string } } };
          showToast(axiosErr.response?.data?.message ?? 'No se pudo enviar la solicitud.', 'error');
        } finally {
          setProcesando(false);
        }
      },
    });
  };

  const handleCancelar = () => {
    const id = estado?.solicitud_pendiente?.id;
    if (!id) return;
    setModalConfig({
      isOpen: true,
      title: 'Cancelar solicitud',
      message: '¿Estás seguro de cancelar tu solicitud de matrícula?',
      type: 'confirm',
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          setProcesando(true);
          await api.patch(`/matricula/solicitudes/${id}/cancelar`);
          cargarDatos();
        } catch {
          showToast('No se pudo cancelar la solicitud.', 'error');
        } finally {
          setProcesando(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const vigente = estado?.matricula_vigente;
  const pendiente = estado?.solicitud_pendiente;
  const propuesta = estado?.propuesta;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <PageHeader
        title="Matrícula"
        description={
          vigente
            ? 'Tu matrícula está activa para el período actual'
            : pendiente
              ? 'Tu solicitud está en revisión'
              : 'Solicita tu matrícula para el nuevo período académico'
        }
        onBack={() => navigate('/estudiante/dashboard')}
      />

      {error && <ErrorBanner message={error} onRetry={cargarDatos} />}

      {estado?.periodo && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Período académico {estado.periodo.anio}</CardTitle>
            <CardDescription>
              Estado del período:{' '}
              <StatusBadge
                status={estado.periodo.estado === 'matricula' ? 'elegible' : 'cerrado'}
                label={estado.periodo.estado}
              />
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {vigente && (
        <Card className="mb-6 border-emerald-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Matrícula activa</CardTitle>
                <CardDescription>Tu inscripción ha sido confirmada</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Grado</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">
                  {vigente.grado?.nombre ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Sección</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">
                  {vigente.seccion?.nombre ?? '—'}
                </dd>
              </div>
            </dl>
            <Button className="mt-4" onClick={() => navigate('/estudiante/dashboard')}>
              Ir al dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {pendiente && !vigente && (
        <Card className="mb-6 border-amber-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <CardTitle>Solicitud en revisión</CardTitle>
                <CardDescription>
                  Grado solicitado: {pendiente.grado?.nombre ?? '—'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Administración revisará tu solicitud y asignará la sección. No necesitas elegir sección.
            </div>
            {estado?.acciones.puedeCancelar && (
              <Button variant="outline" onClick={handleCancelar} disabled={procesando}>
                Cancelar solicitud
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!vigente && !pendiente && propuesta && (
        <>
          {propuesta.gradoPropuesto ? (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <GraduationCap className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <CardTitle>Grado de destino</CardTitle>
                    <CardDescription>
                      Determinado según tu historial académico
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-2xl font-bold text-slate-900">
                    {propuesta.gradoPropuesto.nombre}
                  </p>
                  <p className="mt-1 text-sm capitalize text-slate-500">
                    {propuesta.gradoPropuesto.nivel} · Tipo: {propuesta.tipoPropuesto}
                  </p>
                </div>

                {propuesta.requisitosPendientes.length > 0 && (
                  <ul className="space-y-1 text-sm text-amber-700">
                    {propuesta.requisitosPendientes.map((req) => (
                      <li key={req}>• {req}</li>
                    ))}
                  </ul>
                )}

                {propuesta.puedeSolicitar ? (
                  <Button onClick={handleSolicitar} disabled={procesando} className="w-full sm:w-auto">
                    {procesando ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar solicitud de matrícula'
                    )}
                  </Button>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {propuesta.motivoBloqueo ?? 'No puedes solicitar matrícula en este momento.'}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <FileText className="mb-4 h-12 w-12 text-slate-300" />
                <p className="text-slate-600">
                  {propuesta.motivoBloqueo ?? 'No hay matrícula disponible para ti en este período.'}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {modalConfig.type === 'confirm' && (
        <Modal
          isOpen={modalConfig.isOpen}
          onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
          title={modalConfig.title}
          message={modalConfig.message}
          type="confirm"
          onConfirm={modalConfig.onConfirm}
          confirmText="Confirmar"
          cancelText="Cancelar"
        />
      )}
    </div>
  );
};
