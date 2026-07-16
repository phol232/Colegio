import { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { FormModal, btnPrimary, btnPrimarySm, btnOutlineSecondary } from '../../components/FormModal';
import { getCourseColor } from '../../utils/courseColors';
import api from '../../services/api';

interface CursoCatalogo {
    id: number;
    nombre: string;
    codigo: string;
    nivel: string;
    descripcion?: string;
}

const CursoIcon = ({ nombre }: { nombre: string }) => {
    const color = getCourseColor(nombre);
    return (
        <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: color.light, color: color.primary }}
        >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
            </svg>
        </div>
    );
};

const nivelLabel: Record<string, string> = {
    primaria: 'Primaria',
    secundaria: 'Secundaria',
    ambos: 'Ambos niveles',
};

export const CatalogoCursos = () => {
    const [cursos, setCursos] = useState<CursoCatalogo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(false);
    const [cursoEditando, setCursoEditando] = useState<CursoCatalogo | null>(null);
    const [filtroNivel, setFiltroNivel] = useState<'todos' | 'primaria' | 'secundaria' | 'ambos'>('todos');

    const [nombre, setNombre] = useState('');
    const [codigo, setCodigo] = useState('');
    const [nivel, setNivel] = useState('ambos');
    const [descripcion, setDescripcion] = useState('');
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

            const response =
                editando && cursoEditando
                    ? await api.put(`/admin/catalogo-cursos/${cursoEditando.id}`, data)
                    : await api.post('/admin/catalogo-cursos', data);

            if (response.data.success) {
                setModalConfig({
                    isOpen: true,
                    title: editando ? 'Curso actualizado' : 'Curso creado',
                    message: response.data.message,
                    type: 'success',
                });
                setShowModal(false);
                resetForm();
                cargarCursos();
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            setModalConfig({
                isOpen: true,
                title: 'Error al guardar',
                message: err.response?.data?.message || 'Error al guardar curso.',
                type: 'error',
            });
        }
    };

    const abrirModalNuevo = () => {
        resetForm();
        setShowModal(true);
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

    const eliminarCurso = (id: number) => {
        setModalConfig({
            isOpen: true,
            title: 'Confirmar eliminación',
            message: '¿Estás seguro de eliminar este curso del catálogo?',
            type: 'confirm',
            onConfirm: async () => {
                setModalConfig((prev) => ({ ...prev, isOpen: false }));
                try {
                    const response = await api.delete(`/admin/catalogo-cursos/${id}`);
                    if (response.data.success) {
                        setModalConfig({
                            isOpen: true,
                            title: 'Curso eliminado',
                            message: 'El curso ha sido eliminado exitosamente.',
                            type: 'success',
                        });
                        cargarCursos();
                    }
                } catch (error: unknown) {
                    const err = error as { response?: { data?: { message?: string } } };
                    setModalConfig({
                        isOpen: true,
                        title: 'Error al eliminar',
                        message: err.response?.data?.message || 'Error al eliminar curso.',
                        type: 'error',
                    });
                }
            },
        });
    };

    const resetForm = () => {
        setEditando(false);
        setCursoEditando(null);
        setNombre('');
        setCodigo('');
        setNivel('ambos');
        setDescripcion('');
    };

    const cursosFiltrados =
        filtroNivel === 'todos'
            ? cursos
            : cursos.filter((c) => c.nivel === filtroNivel || (filtroNivel !== 'ambos' && c.nivel === 'ambos'));

    const filtros = [
        { id: 'todos' as const, label: 'Todos' },
        { id: 'primaria' as const, label: 'Primaria' },
        { id: 'secundaria' as const, label: 'Secundaria' },
        { id: 'ambos' as const, label: 'Ambos niveles' },
    ];

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
                            Catálogo de Cursos
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 md:text-base">
                            Gestiona los cursos disponibles del sistema
                        </p>
                    </div>
                    <button type="button" onClick={abrirModalNuevo} className={`${btnPrimary} gap-2 px-5`}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo curso
                    </button>
                </div>

                <div className="mb-6 flex flex-wrap gap-2">
                    {filtros.map((filtro) => (
                        <button
                            key={filtro.id}
                            type="button"
                            onClick={() => setFiltroNivel(filtro.id)}
                            className={
                                filtroNivel === filtro.id
                                    ? `${btnPrimarySm} !px-4`
                                    : 'inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50'
                            }
                        >
                            {filtro.label}
                        </button>
                    ))}
                </div>

                {cursosFiltrados.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {cursosFiltrados.map((curso) => (
                            <article
                                key={curso.id}
                                className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                            >
                                <div className="p-5">
                                    <div className="flex items-start gap-4">
                                        <CursoIcon nombre={curso.nombre} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                                                    {curso.codigo}
                                                </span>
                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                                                    {nivelLabel[curso.nivel] ?? curso.nivel}
                                                </span>
                                            </div>
                                            <h3 className="mt-2 text-lg font-semibold text-slate-900">{curso.nombre}</h3>
                                            {curso.descripcion ? (
                                                <p className="mt-2 line-clamp-2 text-sm text-slate-500">{curso.descripcion}</p>
                                            ) : (
                                                <p className="mt-2 text-sm italic text-slate-400">Sin descripción</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto flex gap-2 border-t border-slate-100 bg-slate-50/50 p-4">
                                    <button
                                        type="button"
                                        onClick={() => abrirModalEditar(curso)}
                                        className={`${btnOutlineSecondary} flex-1`}
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                        </svg>
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => eliminarCurso(Number(curso.id))}
                                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
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
                            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.75}
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                />
                            </svg>
                        </div>
                        <p className="text-slate-600">
                            {filtroNivel === 'todos'
                                ? 'No hay cursos en el catálogo'
                                : `No hay cursos para ${nivelLabel[filtroNivel]?.toLowerCase()}`}
                        </p>
                        {filtroNivel === 'todos' && (
                            <button
                                type="button"
                                onClick={abrirModalNuevo}
                                className="mt-4 text-sm font-semibold text-secondary hover:underline"
                            >
                                Crear el primer curso
                            </button>
                        )}
                    </div>
                )}

                <FormModal
                    isOpen={showModal}
                    onClose={() => {
                        setShowModal(false);
                        resetForm();
                    }}
                    title={editando ? 'Editar curso' : 'Nuevo curso'}
                    subtitle={
                        editando
                            ? 'Modifica los datos del curso en el catálogo'
                            : 'Registra un nuevo curso disponible en el sistema'
                    }
                    icon={
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.75}
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                        </svg>
                    }
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModal(false);
                                    resetForm();
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button type="submit" form="curso-form" className={btnPrimary}>
                                {editando ? 'Guardar cambios' : 'Crear curso'}
                            </button>
                        </>
                    }
                >
                    <form id="curso-form" onSubmit={guardarCurso} className="space-y-4">
                        <div>
                            <label htmlFor="nombre" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Nombre del curso
                            </label>
                            <input
                                id="nombre"
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Ej: Matemática"
                                className="input-field"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="codigo" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Código
                            </label>
                            <input
                                id="codigo"
                                type="text"
                                value={codigo}
                                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                                placeholder="Ej: MAT"
                                className="input-field font-mono"
                                required
                            />
                        </div>
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
                                <option value="ambos">Ambos niveles</option>
                                <option value="primaria">Solo primaria</option>
                                <option value="secundaria">Solo secundaria</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="descripcion" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Descripción <span className="font-normal text-slate-400">(opcional)</span>
                            </label>
                            <textarea
                                id="descripcion"
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                placeholder="Descripción breve del curso..."
                                rows={3}
                                className="input-field resize-none"
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
                    confirmText={modalConfig.type === 'confirm' ? 'Eliminar' : 'Aceptar'}
                    cancelText="Cancelar"
                />
            </div>
        </>
    );
};
