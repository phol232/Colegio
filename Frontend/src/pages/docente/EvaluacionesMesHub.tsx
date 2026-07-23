import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FormModal, btnPrimary } from '../../components/FormModal';
import { Modal } from '../../components/Modal';
import { TIPOS_EVALUACION_PREDEFINIDOS, getColorTipo } from '../../utils/tiposEvaluacion';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  nombreMesNotas,
} from '../../utils/evaluacionNotas';
import { sameId, toId } from '../../utils/ids';
import { useToastStore } from '../../stores/toastStore';
import api from '../../services/api';

interface Curso {
  id: number;
  nombre: string;
  codigo: string;
  grado: string;
  seccion: string;
}

interface Evaluacion {
  id: number;
  nombre: string;
  tipo_evaluacion: string;
  peso: number | null;
  total_notas: number;
}

const emptyForm = {
  nombre: '',
  tipo_evaluacion: 'Práctica',
  peso: '',
};

export const EvaluacionesMesHub = () => {
  const { cursoId, mes } = useParams<{ cursoId: string; mes: string }>();
  const navigate = useNavigate();
  const mesNum = parseInt(mes ?? '0', 10);
  const cursoIdNum = toId(cursoId ?? 0);
  const showToast = useToastStore((s) => s.show);

  const [curso, setCurso] = useState<Curso | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [guardando, setGuardando] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm';
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'confirm' });

  const basePath = `/docente/notas/curso/${cursoId}/mes/${mes}`;

  const cargar = useCallback(async () => {
    if (!cursoId || !mes) return;
    setLoading(true);
    setError(null);
    try {
      const [respCursos, respEval] = await Promise.all([
        api.get('/docente/cursos'),
        api.get(`/evaluaciones/curso/${cursoId}/mes/${mes}`),
      ]);
      const cursoEncontrado = respCursos.data.data?.find((c: Curso) =>
        sameId(c.id, cursoId),
      );
      if (!cursoEncontrado) {
        throw new Error('Curso no encontrado');
      }
      setCurso(cursoEncontrado);
      setEvaluaciones(respEval.data.data || []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err.response?.data?.message || err.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [cursoId, mes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const pesoDisponible = () => {
    const usado = evaluaciones
      .filter((e) => !sameId(e.id, editandoId) && e.peso != null)
      .reduce((sum, e) => sum + (e.peso || 0), 0);
    return Math.round((100 - usado) * 100) / 100;
  };

  const abrirCrear = () => {
    setEditandoId(null);
    setFormData(emptyForm);
    setFormOpen(true);
  };

  const abrirEditar = (ev: Evaluacion) => {
    setEditandoId(toId(ev.id));
    setFormData({
      nombre: ev.nombre,
      tipo_evaluacion: ev.tipo_evaluacion,
      peso: ev.peso != null ? String(ev.peso) : '',
    });
    setFormOpen(true);
  };

  const cerrarForm = () => {
    setFormOpen(false);
    setEditandoId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || formData.nombre.trim().length < 3) {
      showToast('El nombre debe tener al menos 3 caracteres.', 'warning', 3500, 'Nombre requerido');
      return;
    }

    const peso = formData.peso ? parseFloat(formData.peso) : NaN;
    if (Number.isNaN(peso) || peso <= 0 || peso > 100 || peso > pesoDisponible()) {
      showToast(`El peso es obligatorio y debe estar entre 0.01 y ${pesoDisponible()}%.`, 'warning', 3500, 'Peso inválido');
      return;
    }

    setGuardando(true);
    // #region agent log
    fetch('http://127.0.0.1:7707/ingest/88b07e8e-1ca1-4222-bdb9-6865d4ed5e06',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'762257'},body:JSON.stringify({sessionId:'762257',runId:'pre-fix',hypothesisId:'H2',location:'EvaluacionesMesHub.tsx:handleSubmit',message:'Payload crear/editar evaluación',data:{editandoId,cursoId:cursoIdNum,mes:mesNum,tipo:formData.tipo_evaluacion,peso,nombreLen:formData.nombre.trim().length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        tipo_evaluacion: formData.tipo_evaluacion,
        peso,
      };
      const response = editandoId
        ? await api.put(`/evaluaciones/${editandoId}`, payload)
        : await api.post('/evaluaciones', {
            ...payload,
            curso_id: cursoIdNum,
            mes: mesNum,
          });

      // #region agent log
      fetch('http://127.0.0.1:7707/ingest/88b07e8e-1ca1-4222-bdb9-6865d4ed5e06',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'762257'},body:JSON.stringify({sessionId:'762257',runId:'pre-fix',hypothesisId:'H3',location:'EvaluacionesMesHub.tsx:handleSubmit:response',message:'Respuesta API evaluación',data:{ok:Boolean(response.data?.success),status:response.status,apiMessage:response.data?.message??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      if (response.data.success) {
        cerrarForm();
        await cargar();
        showToast(editandoId ? 'Evaluación actualizada.' : 'Evaluación creada.', 'success', 3500, 'Guardado');
      } else {
        showToast(response.data.message || 'No se pudo guardar.', 'error');
      }
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      // #region agent log
      fetch('http://127.0.0.1:7707/ingest/88b07e8e-1ca1-4222-bdb9-6865d4ed5e06',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'762257'},body:JSON.stringify({sessionId:'762257',runId:'pre-fix',hypothesisId:'H1,H4',location:'EvaluacionesMesHub.tsx:handleSubmit:catch',message:'Error HTTP al guardar evaluación',data:{status:error.response?.status??null,apiMessage:error.response?.data?.message??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      showToast(error.response?.data?.message || 'Error al guardar.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (ev: Evaluacion) => {
    const tieneNotas = ev.total_notas > 0;
    setModalConfig({
      isOpen: true,
      title: 'Confirmar eliminación',
      message: tieneNotas
        ? `La evaluación "${ev.nombre}" tiene ${ev.total_notas} nota(s). Se eliminarán todas las notas asociadas. ¿Continuar?`
        : `¿Eliminar la evaluación "${ev.nombre}"?`,
      type: 'confirm',
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          const response = await api.delete(`/evaluaciones/${ev.id}`, {
            params: { forzar: tieneNotas },
          });
          if (response.data.success) {
            setEvaluaciones((prev) => prev.filter((e) => !sameId(e.id, ev.id)));
            showToast('La evaluación fue eliminada.', 'success', 3500, 'Eliminada');
          } else {
            showToast(response.data.message || 'No se pudo eliminar.', 'error');
          }
        } catch (err: unknown) {
          const error = err as { response?: { data?: { message?: string } } };
          showToast(error.response?.data?.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

  const pesoTotal = evaluaciones
    .filter((e) => e.peso != null)
    .reduce((sum, e) => sum + (e.peso ?? 0), 0);

  const pesoPorTipo = evaluaciones.reduce((map, e) => {
    const tipo = e.tipo_evaluacion;
    map.set(tipo, (map.get(tipo) ?? 0) + (e.peso ?? 0));
    return map;
  }, new Map<string, number>());

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-sidebar-bg" />
      </div>
    );
  }

  if (!curso || !cursoId || !mes) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-600">No se pudo cargar el curso</p>
        <button type="button" className={BTN_PRIMARY} onClick={() => navigate('/docente/notas')}>
          Volver a notas
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <div className="border-b border-[#E5E7EB] bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/docente/notas')}
              className="text-[#6B7280] transition-colors hover:text-[#1F2937]"
              aria-label="Volver"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#0E2B5C]">
                {curso.nombre} — {nombreMesNotas(mesNum)}
              </h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                {curso.codigo} · {curso.grado} · Sección {curso.seccion}
              </p>
            </div>
          </div>
          <button type="button" className={BTN_PRIMARY} onClick={abrirCrear}>
            Crear evaluación
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {pesoTotal > 0 && (
          <div className="mb-4 rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm shadow-sm">
            <p className="text-[#6B7280]">
              Peso total del mes:{' '}
              <span className="font-semibold text-[#0E2B5C]">{pesoTotal}%</span>
              {pesoTotal !== 100 && (
                <span className="text-[#6B7280]"> (falta {Math.round((100 - pesoTotal) * 100) / 100}%)</span>
              )}
            </p>
            {pesoPorTipo.size > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from(pesoPorTipo.entries()).map(([tipo, peso]) => (
                  <span
                    key={tipo}
                    className={`rounded px-2 py-0.5 text-xs font-medium ${getColorTipo(tipo).bg} ${getColorTipo(tipo).text}`}
                  >
                    {tipo}: {peso}%
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {evaluaciones.length === 0 ? (
          <div className="rounded-lg border border-[#E5E7EB] bg-white p-10 text-center shadow">
            <p className="mb-4 text-[#6B7280]">No hay evaluaciones para este mes.</p>
            <button type="button" className={BTN_PRIMARY} onClick={abrirCrear}>
              Crear evaluación
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {evaluaciones.map((ev) => {
              const colors = getColorTipo(ev.tipo_evaluacion);
              return (
                <div
                  key={ev.id}
                  className="flex flex-col rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold text-[#0E2B5C]">{ev.nombre}</h2>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                    >
                      {ev.tipo_evaluacion}
                    </span>
                  </div>
                  <p className="mb-4 text-sm text-[#6B7280]">
                    {ev.total_notas} nota(s) registrada(s)
                    {ev.peso != null && (
                      <span className="ml-2 font-medium text-[#0E2B5C]">· Peso {ev.peso}%</span>
                    )}
                  </p>
                  <div className="mt-auto flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => abrirEditar(ev)}
                        className={`${BTN_SECONDARY} w-full`}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminar(ev)}
                        className="inline-flex w-full items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={`${basePath}/registrar?tipo=${encodeURIComponent(ev.tipo_evaluacion)}`}
                        className={`${BTN_PRIMARY} w-full`}
                      >
                        Registrar nota
                      </Link>
                      <Link
                        to={`${basePath}/ver?tipo=${encodeURIComponent(ev.tipo_evaluacion)}`}
                        className={`${BTN_SECONDARY} w-full`}
                      >
                        Ver notas
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FormModal
        isOpen={formOpen}
        onClose={cerrarForm}
        title={editandoId ? 'Editar evaluación' : 'Crear evaluación'}
        subtitle={nombreMesNotas(mesNum)}
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
        footer={
          <>
            <button type="button" onClick={cerrarForm} className={BTN_SECONDARY}>
              Cancelar
            </button>
            <button
              type="submit"
              form="evaluacion-form"
              disabled={guardando}
              className={btnPrimary}
            >
              {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Crear'}
            </button>
          </>
        }
      >
        <form id="evaluacion-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sidebar-bg"
              placeholder="Ej: Examen bimestral"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">Tipo *</label>
            <select
              value={formData.tipo_evaluacion}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tipo_evaluacion: e.target.value,
                })
              }
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sidebar-bg"
            >
              {TIPOS_EVALUACION_PREDEFINIDOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">
              Peso % *
            </label>
            <input
              type="number"
              value={formData.peso}
              onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
              placeholder="0-100"
              min={0.01}
              max={pesoDisponible()}
              step={0.01}
              required
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sidebar-bg"
            />
            <p className="mt-1 text-xs text-[#6B7280]">
              Disponible en el mes: {pesoDisponible()}%. Los pesos de todos los tipos deben sumar 100%.
            </p>
          </div>
        </form>
      </FormModal>

      {modalConfig.type === 'confirm' && (
        <Modal
          isOpen={modalConfig.isOpen}
          onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
          title={modalConfig.title}
          message={modalConfig.message}
          type="confirm"
          onConfirm={modalConfig.onConfirm}
          stacked={formOpen}
        />
      )}
    </div>
  );
};
