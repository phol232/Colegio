import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { FormModal, btnPrimary, btnPrimarySm, btnOutlineSecondary } from '../../components/FormModal';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToastStore } from '../../stores/toastStore';
import api from '../../services/api';

interface Usuario {
    id: number;
    name: string;
    email: string;
    role: string;
    activo: boolean;
    dni?: string | null;
    telefono?: string | null;
}

const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    docente: 'Docente',
    estudiante: 'Estudiante',
    padre: 'Padre',
};

const roleStyle: Record<string, { bg: string; text: string }> = {
    admin: { bg: '#E8EEF7', text: '#0E2B5C' },
    docente: { bg: '#E6F4FB', text: '#17A2E5' },
    estudiante: { bg: '#E8F5E9', text: '#2E7D32' },
    padre: { bg: '#FFF3E0', text: '#E65100' },
};

const UsuarioAvatar = ({ name, role }: { name: string; role: string }) => {
    const style = roleStyle[role] ?? { bg: '#F1F5F9', text: '#475569' };
    const initial = name.trim().charAt(0).toUpperCase() || '?';

    return (
        <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
            style={{ backgroundColor: style.bg, color: style.text }}
        >
            {initial}
        </div>
    );
};

const filtros = [
    { id: 'todos' as const, label: 'Todos' },
    { id: 'admin' as const, label: 'Administradores' },
    { id: 'docente' as const, label: 'Docentes' },
    { id: 'estudiante' as const, label: 'Estudiantes' },
    { id: 'padre' as const, label: 'Padres' },
];

export const Usuarios = () => {
    const showToast = useToastStore((s) => s.show);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroRol, setFiltroRol] = useState<'todos' | 'admin' | 'docente' | 'estudiante' | 'padre'>('todos');
    const [showModal, setShowModal] = useState(false);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('estudiante');
    const [dni, setDni] = useState('');
    const [telefono, setTelefono] = useState('');

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

    useEffect(() => {
        cargarUsuarios();
    }, [filtroRol]);

    const cargarUsuarios = async () => {
        try {
            setLoading(true);
            const params = filtroRol !== 'todos' ? { role: filtroRol } : {};
            const response = await api.get('/admin/usuarios', { params });
            setUsuarios(response.data.data);
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setRole('estudiante');
        setDni('');
        setTelefono('');
    };

    const abrirModalNuevo = () => {
        resetForm();
        setShowModal(true);
    };

    const crearUsuario = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            showToast('La contraseña y su confirmación deben ser iguales.', 'error', 3500, 'Contraseñas no coinciden');
            return;
        }

        try {
            const response = await api.post('/admin/usuarios', {
                name,
                email,
                password,
                role,
                dni: dni || undefined,
                telefono: telefono || undefined,
            });

            if (response.data.success) {
                showToast(response.data.message, 'success', 3500, 'Usuario creado');
                setShowModal(false);
                resetForm();
                cargarUsuarios();
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            showToast(err.response?.data?.message || 'No se pudo crear el usuario.', 'error', 3500, 'Error al crear usuario');
        }
    };

    const cambiarEstado = (usuario: Usuario) => {
        const accion = usuario.activo ? 'bloquear' : 'desbloquear';
        setModalConfig({
            isOpen: true,
            title: usuario.activo ? 'Bloquear cuenta' : 'Desbloquear cuenta',
            message: `¿Deseas ${accion} la cuenta de ${usuario.name}?`,
            type: 'confirm',
            onConfirm: async () => {
                setModalConfig((prev) => ({ ...prev, isOpen: false }));
                try {
                    const response = await api.patch(`/admin/usuarios/${usuario.id}/estado`, {
                        activo: !usuario.activo,
                    });
                    showToast(response.data.message, 'success', 3500, 'Estado actualizado');
                    cargarUsuarios();
                } catch (error: unknown) {
                    const err = error as { response?: { data?: { message?: string } } };
                    showToast(err.response?.data?.message || 'No se pudo cambiar el estado.', 'error');
                }
            },
        });
    };

    const eliminarUsuario = (usuario: Usuario) => {
        setModalConfig({
            isOpen: true,
            title: 'Eliminar usuario',
            message: `¿Eliminar permanentemente la cuenta de ${usuario.name}? Esta acción no se puede deshacer.`,
            type: 'confirm',
            onConfirm: async () => {
                setModalConfig((prev) => ({ ...prev, isOpen: false }));
                try {
                    const response = await api.delete(`/admin/usuarios/${usuario.id}`);
                    showToast(response.data.message, 'success', 3500, 'Usuario eliminado');
                    cargarUsuarios();
                } catch (error: unknown) {
                    const err = error as { response?: { data?: { message?: string } } };
                    showToast(err.response?.data?.message || 'No se pudo eliminar el usuario.', 'error');
                }
            },
        });
    };

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
                            Usuarios
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 md:text-base">
                            Crear, bloquear o eliminar cuentas del sistema
                        </p>
                    </div>
                    <button type="button" onClick={abrirModalNuevo} className={`${btnPrimary} gap-2 px-5`}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo usuario
                    </button>
                </div>

                <div className="mb-6 flex flex-wrap gap-2">
                    {filtros.map((filtro) => (
                        <button
                            key={filtro.id}
                            type="button"
                            onClick={() => setFiltroRol(filtro.id)}
                            className={
                                filtroRol === filtro.id
                                    ? `${btnPrimarySm} !px-4`
                                    : 'inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50'
                            }
                        >
                            {filtro.label}
                        </button>
                    ))}
                </div>

                {usuarios.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {usuarios.map((usuario) => (
                            <article
                                key={usuario.id}
                                className={`flex flex-col rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
                                    usuario.activo ? 'border-slate-200' : 'border-red-200 opacity-90'
                                }`}
                            >
                                <div className="p-5">
                                    <div className="flex items-start gap-4">
                                        <UsuarioAvatar name={usuario.name} role={usuario.role} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                                    {roleLabel[usuario.role] ?? usuario.role}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                        usuario.activo
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}
                                                >
                                                    {usuario.activo ? 'Activo' : 'Bloqueado'}
                                                </span>
                                            </div>
                                            <h3 className="mt-2 truncate text-lg font-semibold text-slate-900">
                                                {usuario.name}
                                            </h3>
                                            <p className="mt-1 truncate text-sm text-slate-500">{usuario.email}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                                        {usuario.dni ? (
                                            <div className="flex items-center gap-2">
                                                <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                                </svg>
                                                <span>DNI: <strong className="font-semibold text-slate-900">{usuario.dni}</strong></span>
                                            </div>
                                        ) : null}
                                        {usuario.telefono ? (
                                            <div className="flex items-center gap-2">
                                                <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                <span>{usuario.telefono}</span>
                                            </div>
                                        ) : null}
                                        {!usuario.dni && !usuario.telefono && (
                                            <p className="text-sm italic text-slate-400">Sin datos de contacto adicionales</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto flex gap-2 border-t border-slate-100 bg-slate-50/50 p-4">
                                    <button
                                        type="button"
                                        onClick={() => cambiarEstado(usuario)}
                                        className={`${btnOutlineSecondary} flex-1`}
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            {usuario.activo ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            )}
                                        </svg>
                                        {usuario.activo ? 'Bloquear' : 'Desbloquear'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => eliminarUsuario(usuario)}
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
                            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <p className="text-slate-600">
                            {filtroRol === 'todos'
                                ? 'No hay usuarios registrados'
                                : `No hay usuarios con rol ${roleLabel[filtroRol]?.toLowerCase()}`}
                        </p>
                        {filtroRol === 'todos' && (
                            <button
                                type="button"
                                onClick={abrirModalNuevo}
                                className="mt-4 text-sm font-semibold text-secondary hover:underline"
                            >
                                Crear el primer usuario
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
                    title="Nuevo usuario"
                    subtitle="Registra una cuenta para docente, estudiante, padre o administrador"
                    icon={
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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
                            <button type="submit" form="usuario-form" className={btnPrimary}>
                                Crear usuario
                            </button>
                        </>
                    }
                >
                    <form id="usuario-form" onSubmit={crearUsuario} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Nombre completo
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Juan Pérez"
                                className="input-field"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Correo electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="correo@ejemplo.com"
                                className="input-field"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Rol
                            </label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger id="role">
                                    <SelectValue placeholder="Seleccionar rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="estudiante">Estudiante</SelectItem>
                                    <SelectItem value="docente">Docente</SelectItem>
                                    <SelectItem value="padre">Padre</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="dni" className="mb-1.5 block text-sm font-medium text-slate-700">
                                    DNI <span className="font-normal text-slate-400">(opcional)</span>
                                </label>
                                <input
                                    id="dni"
                                    type="text"
                                    value={dni}
                                    onChange={(e) => setDni(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label htmlFor="telefono" className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Teléfono <span className="font-normal text-slate-400">(opcional)</span>
                                </label>
                                <input
                                    id="telefono"
                                    type="text"
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                minLength={6}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Confirmar contraseña
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-field"
                                minLength={6}
                                required
                            />
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
                        confirmText="Confirmar"
                        cancelText="Cancelar"
                    />
                )}
            </div>
        </>
    );
};
