import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { FormModal, btnPrimary, btnPrimarySm, btnOutlineSecondary } from '../../components/FormModal';
import { useToastStore } from '../../stores/toastStore';
import api from '../../services/api';

interface Grado {
    id: number;
    nivel: string;
    numero: number;
    nombre: string;
}

interface Seccion {
    id: number;
    grado_id: number;
    nombre: string;
    capacidad: number;
}

const SeccionIcon = () => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

export const SeccionesGrado = () => {
    const { gradoId } = useParams<{ gradoId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const showToast = useToastStore((s) => s.show);
    const gradoIdNum = Number(gradoId);
    const gradoFromState = (location.state as { grado?: Grado } | null)?.grado ?? null;

    const [grado, setGrado] = useState<Grado | null>(
        gradoFromState && Number(gradoFromState.id) === gradoIdNum ? gradoFromState : null,
    );
    const [secciones, setSecciones] = useState<Seccion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSeccionModal, setShowSeccionModal] = useState(false);
    const [editingSeccion, setEditingSeccion] = useState<Seccion | null>(null);
    const [nombreSeccion, setNombreSeccion] = useState('');
    const [capacidad, setCapacidad] = useState(30);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'confirm';
        onConfirm?: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm',
    });

    const cargarDatos = useCallback(async () => {
        if (!gradoId || Number.isNaN(gradoIdNum) || gradoIdNum <= 0) {
            navigate('/admin/grados', { replace: true });
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [gradosRes, seccionesRes] = await Promise.all([
                api.get('/admin/grados'),
                api.get(`/admin/grados/${gradoIdNum}/secciones`),
            ]);

            const gradoEncontrado =
                gradosRes.data.data.find((g: Grado) => Number(g.id) === gradoIdNum) ??
                (gradoFromState && Number(gradoFromState.id) === gradoIdNum ? gradoFromState : null);

            if (!gradoEncontrado) {
                setError('No se encontró el grado solicitado.');
                setGrado(null);
                setSecciones([]);
                return;
            }

            setGrado({
                id: Number(gradoEncontrado.id),
                nivel: gradoEncontrado.nivel,
                numero: Number(gradoEncontrado.numero),
                nombre: gradoEncontrado.nombre,
            });
            setSecciones(seccionesRes.data.data ?? []);
        } catch (err) {
            console.error('Error al cargar secciones:', err);
            setError('No se pudieron cargar las secciones. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }, [gradoId, gradoIdNum, gradoFromState, navigate]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const abrirNuevaSeccion = () => {
        setEditingSeccion(null);
        setNombreSeccion('');
        setCapacidad(30);
        setShowSeccionModal(true);
    };

    const abrirEditarSeccion = (seccion: Seccion) => {
        setEditingSeccion(seccion);
        setNombreSeccion(seccion.nombre);
        setCapacidad(seccion.capacidad);
        setShowSeccionModal(true);
    };

    const guardarSeccion = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSeccion) {
                await api.put(`/admin/secciones/${editingSeccion.id}`, {
                    nombre: nombreSeccion,
                    capacidad,
                });
            } else {
                await api.post(`/admin/grados/${gradoIdNum}/secciones`, {
                    nombre: nombreSeccion,
                    capacidad,
                });
            }
            setShowSeccionModal(false);
            setEditingSeccion(null);
            setNombreSeccion('');
            setCapacidad(30);
            await cargarDatos();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            showToast(err.response?.data?.message || 'Error al guardar sección.', 'error', 3500, 'Error al guardar');
        }
    };

    const eliminarSeccion = (id: number) => {
        setModalConfig({
            isOpen: true,
            title: 'Confirmar eliminación',
            message: '¿Estás seguro de eliminar esta sección? Se eliminarán todos sus cursos.',
            type: 'confirm',
            onConfirm: async () => {
                setModalConfig((prev) => ({ ...prev, isOpen: false }));
                try {
                    await api.delete(`/admin/secciones/${id}`);
                    await cargarDatos();
                } catch (error: unknown) {
                    const err = error as { response?: { data?: { message?: string } } };
                    showToast(err.response?.data?.message || 'Error al eliminar sección.', 'error', 3500, 'Error al eliminar');
                }
            },
        });
    };

    const capacidadTotal = secciones.reduce((sum, s) => sum + s.capacidad, 0);

    if (loading) {
        return (
            <>
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-sidebar-bg" />
                </div>
            </>
        );
    }

    if (error || !grado) {
        return (
            <>
                <div className="p-6 md:p-8">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/grados')}
                        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-secondary transition-colors hover:text-sidebar-hover"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver a grados
                    </button>
                    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center">
                        <p className="text-red-700">{error ?? 'Grado no encontrado.'}</p>
                        <button type="button" onClick={cargarDatos} className={`${btnPrimarySm} mt-4`}>
                            Reintentar
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="p-6 md:p-8">
                <button
                    type="button"
                    onClick={() => navigate('/admin/grados')}
                    className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-secondary transition-colors hover:text-sidebar-hover"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver a grados
                </button>

                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                                Secciones — {grado.nombre}
                            </h1>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                                {grado.nivel}
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500 md:text-base">
                            {secciones.length} {secciones.length === 1 ? 'sección' : 'secciones'} · {capacidadTotal} cupos en total
                        </p>
                    </div>
                    <button type="button" onClick={abrirNuevaSeccion} className={`${btnPrimary} gap-2 px-5`}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva sección
                    </button>
                </div>

                {secciones.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {secciones.map((seccion) => (
                            <article
                                key={seccion.id}
                                className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                            >
                                <div className="flex items-start gap-4 p-5">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                        <SeccionIcon />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-lg font-semibold text-slate-900">Sección {seccion.nombre}</h3>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Capacidad: <strong className="font-medium text-slate-700">{seccion.capacidad}</strong> estudiantes
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-auto flex gap-2 border-t border-slate-100 bg-slate-50/50 p-4">
                                    <button
                                        type="button"
                                        onClick={() => abrirEditarSeccion(seccion)}
                                        className={`${btnOutlineSecondary} flex-1`}
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => eliminarSeccion(seccion.id)}
                                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Eliminar
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                            <SeccionIcon />
                        </div>
                        <p className="text-slate-600">Este grado aún no tiene secciones</p>
                        <button
                            type="button"
                            onClick={abrirNuevaSeccion}
                            className={`${btnPrimarySm} mt-4`}
                        >
                            Crear la primera sección
                        </button>
                    </div>
                )}

                <FormModal
                    isOpen={showSeccionModal}
                    onClose={() => {
                        setShowSeccionModal(false);
                        setEditingSeccion(null);
                    }}
                    title={editingSeccion ? 'Editar sección' : 'Nueva sección'}
                    subtitle={
                        editingSeccion
                            ? 'Actualiza el nombre o la capacidad'
                            : `Agrega una sección a ${grado.nombre}`
                    }
                    icon={<SeccionIcon />}
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSeccionModal(false);
                                    setEditingSeccion(null);
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button type="submit" form="seccion-form" className={btnPrimary}>
                                {editingSeccion ? 'Guardar cambios' : 'Crear sección'}
                            </button>
                        </>
                    }
                >
                    <form id="seccion-form" onSubmit={guardarSeccion} className="space-y-4">
                        <div>
                            <label htmlFor="nombreSeccion" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Nombre de sección
                            </label>
                            <input
                                id="nombreSeccion"
                                type="text"
                                value={nombreSeccion}
                                onChange={(e) => setNombreSeccion(e.target.value)}
                                placeholder="Ej: A, B, C"
                                className="input-field"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="capacidad" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Capacidad máxima
                            </label>
                            <input
                                id="capacidad"
                                type="number"
                                min="1"
                                max="50"
                                value={capacidad}
                                onChange={(e) => setCapacidad(parseInt(e.target.value))}
                                className="input-field"
                                required
                            />
                            <p className="mt-1 text-xs text-slate-500">Número máximo de estudiantes por sección</p>
                        </div>
                    </form>
                </FormModal>

                {modalConfig.type === 'confirm' && (
                    <Modal
                        isOpen={modalConfig.isOpen}
                        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
                        title={modalConfig.title}
                        message={modalConfig.message}
                        type="confirm"
                        onConfirm={modalConfig.onConfirm}
                    />
                )}
            </div>
        </>
    );
};
