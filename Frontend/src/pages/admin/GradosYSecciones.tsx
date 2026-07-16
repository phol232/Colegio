import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { FormModal, btnPrimary, btnPrimarySm, btnOutlineSecondary } from '../../components/FormModal';
import api from '../../services/api';

interface Grado {
    id: number;
    nivel: string;
    numero: number;
    nombre: string;
    secciones?: { id: number; nombre: string; capacidad: number }[];
}

const GradoIcon = () => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14v7" />
    </svg>
);

const UsersIcon = () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export const GradosYSecciones = () => {
    const [grados, setGrados] = useState<Grado[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGradoModal, setShowGradoModal] = useState(false);
    const [editingGrado, setEditingGrado] = useState<Grado | null>(null);

    const [nivel, setNivel] = useState('primaria');
    const [numero, setNumero] = useState(1);
    const [nombreGrado, setNombreGrado] = useState('');
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
        onConfirm?: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
    });

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

    const abrirNuevoGrado = () => {
        setEditingGrado(null);
        setNivel('primaria');
        setNumero(1);
        setNombreGrado('');
        setShowGradoModal(true);
    };

    const crearGrado = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingGrado) {
                await api.put(`/admin/grados/${editingGrado.id}`, { nivel, numero, nombre: nombreGrado });
            } else {
                await api.post('/admin/grados', { nivel, numero, nombre: nombreGrado });
            }
            setShowGradoModal(false);
            setEditingGrado(null);
            cargarGrados();
            setNivel('primaria');
            setNumero(1);
            setNombreGrado('');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            setModalConfig({
                isOpen: true,
                title: 'Error al guardar',
                message: err.response?.data?.message || 'Error al guardar grado.',
                type: 'error',
            });
        }
    };

    const abrirEditarGrado = (grado: Grado) => {
        setEditingGrado(grado);
        setNivel(grado.nivel);
        setNumero(grado.numero);
        setNombreGrado(grado.nombre);
        setShowGradoModal(true);
    };

    const eliminarGrado = async (id: number) => {
        setModalConfig({
            isOpen: true,
            title: 'Confirmar eliminación',
            message: '¿Estás seguro de eliminar este grado? Se eliminarán todas sus secciones y cursos.',
            type: 'confirm',
            onConfirm: async () => {
                setModalConfig((prev) => ({ ...prev, isOpen: false }));
                try {
                    await api.delete(`/admin/grados/${id}`);
                    cargarGrados();
                } catch (error: unknown) {
                    const err = error as { response?: { data?: { message?: string } } };
                    setModalConfig({
                        isOpen: true,
                        title: 'Error al eliminar',
                        message: err.response?.data?.message || 'Error al eliminar grado.',
                        type: 'error',
                    });
                }
            },
        });
    };

    const totalSecciones = (grado: Grado) => grado.secciones?.length ?? 0;
    const capacidadTotal = (grado: Grado) =>
        grado.secciones?.reduce((sum, s) => sum + s.capacidad, 0) ?? 0;

    if (loading) {
        return (
            <>
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-sidebar-bg" />
                </div>
            </>
        );
    }

    return (
        <>
            <div className="p-6 md:p-8">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                            Grados y Secciones
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 md:text-base">
                            Gestiona la estructura académica del colegio
                        </p>
                    </div>
                    <button type="button" onClick={abrirNuevoGrado} className={`${btnPrimary} gap-2 px-5`}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo Grado
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {grados.map((grado) => (
                        <article
                            key={grado.id}
                            className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                        >
                            <div className="p-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                        <GradoIcon />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-lg font-semibold text-slate-900">{grado.nombre}</h3>
                                        <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                                            {grado.nivel}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-4 border-t border-slate-100 pt-4">
                                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                        </svg>
                                        <span>
                                            <strong className="font-semibold text-slate-900">{totalSecciones(grado)}</strong>{' '}
                                            {totalSecciones(grado) === 1 ? 'sección' : 'secciones'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                        <UsersIcon />
                                        <span>
                                            <strong className="font-semibold text-slate-900">{capacidadTotal(grado)}</strong>{' '}
                                            cupos
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50 p-4">
                                <Link
                                    to={`/admin/grados/${Number(grado.id)}/secciones`}
                                    state={{
                                        grado: {
                                            id: Number(grado.id),
                                            nivel: grado.nivel,
                                            numero: grado.numero,
                                            nombre: grado.nombre,
                                        },
                                    }}
                                    className={`${btnPrimarySm} flex-1`}
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Ver secciones
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => abrirEditarGrado(grado)}
                                    className={btnOutlineSecondary}
                                    title="Editar grado"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Editar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => eliminarGrado(grado.id)}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                                    title="Eliminar grado"
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

                {grados.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                            <GradoIcon />
                        </div>
                        <p className="text-slate-600">No hay grados registrados</p>
                        <button
                            type="button"
                            onClick={abrirNuevoGrado}
                            className="mt-4 text-sm font-semibold text-secondary hover:underline"
                        >
                            Crear el primer grado
                        </button>
                    </div>
                )}

                <FormModal
                    isOpen={showGradoModal}
                    onClose={() => {
                        setShowGradoModal(false);
                        setEditingGrado(null);
                    }}
                    title={editingGrado ? 'Editar grado' : 'Nuevo grado'}
                    subtitle={editingGrado ? 'Modifica los datos del grado académico' : 'Registra un nuevo grado en el sistema'}
                    icon={<GradoIcon />}
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowGradoModal(false);
                                    setEditingGrado(null);
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button type="submit" form="grado-form" className={btnPrimary}>
                                {editingGrado ? 'Guardar cambios' : 'Crear grado'}
                            </button>
                        </>
                    }
                >
                    <form id="grado-form" onSubmit={crearGrado} className="space-y-4">
                        <div>
                            <label htmlFor="nivel" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Nivel
                            </label>
                            <select
                                id="nivel"
                                value={nivel}
                                onChange={(e) => setNivel(e.target.value)}
                                className="input-field"
                                required
                            >
                                <option value="primaria">Primaria</option>
                                <option value="secundaria">Secundaria</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="numero" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Número
                            </label>
                            <input
                                id="numero"
                                type="number"
                                min="1"
                                max="6"
                                value={numero}
                                onChange={(e) => setNumero(parseInt(e.target.value))}
                                className="input-field"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="nombreGrado" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Nombre
                            </label>
                            <input
                                id="nombreGrado"
                                type="text"
                                value={nombreGrado}
                                onChange={(e) => setNombreGrado(e.target.value)}
                                placeholder="Ej: 1ro Primaria"
                                className="input-field"
                                required
                            />
                        </div>
                    </form>
                </FormModal>

                <Modal
                    isOpen={modalConfig.isOpen}
                    onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    type={modalConfig.type}
                    onConfirm={modalConfig.onConfirm}
                />
            </div>
        </>
    );
};
