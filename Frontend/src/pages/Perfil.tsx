import { useState, useEffect, useRef } from 'react';
import { User, Mail, Shield, Lock, Camera, CheckCircle2, AlertCircle, ImagePlus, Trash2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { AVATAR_ACCEPT, AVATAR_MAX_SIZE_BYTES, fileToBase64DataUrl, formatFileSize } from '../utils/avatarUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    docente: 'Docente',
    estudiante: 'Estudiante',
    padre: 'Padre de familia',
};

const tipoDocumentoOptions = [
    { value: 'dni', label: 'DNI' },
    { value: 'ce', label: 'Carné de extranjería' },
    { value: 'pasaporte', label: 'Pasaporte' },
];

export const Perfil = () => {
    const { user, setUser } = useAuthStore();
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [subiendoAvatar, setSubiendoAvatar] = useState(false);
    const [mostrarCambiarPassword, setMostrarCambiarPassword] = useState(false);
    const [tipoDocumento, setTipoDocumento] = useState('dni');
    const [fechaRegistro, setFechaRegistro] = useState<string | null>(null);

    const [perfil, setPerfil] = useState({
        name: '',
        email: '',
        dni: '',
        telefono: '',
        direccion: '',
        avatar: '',
    });

    const [passwords, setPasswords] = useState({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
    });

    const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

    useEffect(() => {
        cargarPerfil();
    }, []);

    const cargarPerfil = async () => {
        try {
            const response = await api.get('/perfil');
            if (response.data.success) {
                const data = response.data.data;
                setPerfil({
                    name: data.name || '',
                    email: data.email || '',
                    dni: data.dni || '',
                    telefono: data.telefono || '',
                    direccion: data.direccion || '',
                    avatar: data.avatar || '',
                });
                if (data.created_at) {
                    setFechaRegistro(
                        new Date(data.created_at).toLocaleDateString('es-PE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        }),
                    );
                }
            }
        } catch {
            mostrarMensaje('error', 'Error al cargar los datos del perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        setMensaje(null);

        try {
            const response = await api.put('/perfil', {
                ...perfil,
                avatar: perfil.avatar.trim() || null,
            });
            if (response.data.success) {
                mostrarMensaje('success', 'Perfil actualizado exitosamente');

                const updatedUser = {
                    id: user!.id,
                    name: response.data.data.name,
                    email: response.data.data.email,
                    role: user!.role,
                    avatar: response.data.data.avatar,
                };

                const token = localStorage.getItem('token') || '';
                setUser(updatedUser, token);
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            mostrarMensaje('error', err.response?.data?.message || 'Error al actualizar el perfil');
        } finally {
            setGuardando(false);
        }
    };

    const handleCambiarPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwords.new_password !== passwords.new_password_confirmation) {
            mostrarMensaje('error', 'Las contraseñas no coinciden');
            return;
        }

        setGuardando(true);
        setMensaje(null);

        try {
            const response = await api.post('/perfil/cambiar-password', passwords);
            if (response.data.success) {
                mostrarMensaje('success', 'Contraseña actualizada exitosamente');
                setPasswords({
                    current_password: '',
                    new_password: '',
                    new_password_confirmation: '',
                });
                setMostrarCambiarPassword(false);
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            mostrarMensaje('error', err.response?.data?.message || 'Error al cambiar la contraseña');
        } finally {
            setGuardando(false);
        }
    };

    const mostrarMensaje = (tipo: 'success' | 'error', texto: string) => {
        setMensaje({ tipo, texto });
        setTimeout(() => setMensaje(null), 5000);
    };

    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSubiendoAvatar(true);
        try {
            const dataUrl = await fileToBase64DataUrl(file);
            setPerfil((prev) => ({ ...prev, avatar: dataUrl }));
            mostrarMensaje('success', 'Foto cargada. Pulsa "Guardar cambios" para aplicarla.');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Error al cargar la imagen';
            mostrarMensaje('error', msg);
        } finally {
            setSubiendoAvatar(false);
            e.target.value = '';
        }
    };

    const quitarAvatar = () => {
        setPerfil((prev) => ({ ...prev, avatar: '' }));
        mostrarMensaje('success', 'Foto eliminada. Guarda los cambios para confirmar.');
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-sidebar-bg" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex justify-center px-4 py-8 md:px-6">
                <div className="w-full max-w-5xl">
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Mi Perfil</h1>
                        <p className="mt-2 text-sm text-slate-500 md:text-base">
                            Administra tu información personal y la seguridad de tu cuenta
                        </p>
                    </div>

                    {mensaje && (
                        <div
                            className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                                mensaje.tipo === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : 'border-red-200 bg-red-50 text-red-800'
                            }`}
                        >
                            {mensaje.tipo === 'success' ? (
                                <CheckCircle2 className="h-5 w-5 shrink-0" />
                            ) : (
                                <AlertCircle className="h-5 w-5 shrink-0" />
                            )}
                            {mensaje.texto}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                        {/* Columna izquierda — resumen + seguridad */}
                        <div className="space-y-6 lg:col-span-2">
                            <Card className="overflow-hidden">
                                <div className="bg-slate-50 px-6 py-8 text-center">
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept={AVATAR_ACCEPT}
                                        className="hidden"
                                        onChange={handleAvatarFileChange}
                                    />
                                    <div className="relative mx-auto mb-4 h-28 w-28">
                                        {perfil.avatar ? (
                                            <img
                                                src={perfil.avatar}
                                                alt={perfil.name}
                                                className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md"
                                            />
                                        ) : (
                                            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-sidebar-bg text-4xl font-bold text-white shadow-md">
                                                {perfil.name.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => avatarInputRef.current?.click()}
                                            disabled={subiendoAvatar}
                                            className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-sidebar-bg text-white shadow transition-colors hover:bg-sidebar-hover disabled:opacity-60"
                                            title="Cambiar foto"
                                        >
                                            <Camera className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-900">{perfil.name || user?.name}</h2>
                                    <p className="mt-1 text-sm text-slate-500">{perfil.email || user?.email}</p>

                                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={subiendoAvatar}
                                            onClick={() => avatarInputRef.current?.click()}
                                        >
                                            <ImagePlus className="h-4 w-4" />
                                            {subiendoAvatar ? 'Cargando...' : 'Subir foto'}
                                        </Button>
                                        {perfil.avatar && (
                                            <Button type="button" variant="ghost" size="sm" onClick={quitarAvatar}>
                                                <Trash2 className="h-4 w-4" />
                                                Quitar
                                            </Button>
                                        )}
                                    </div>
                                    <p className="mt-2 text-xs text-slate-400">
                                        JPG, PNG, WebP o GIF · máximo {formatFileSize(AVATAR_MAX_SIZE_BYTES)}
                                    </p>
                                </div>

                                <CardContent className="space-y-5 pt-6">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-slate-600">
                                            <Shield className="h-4 w-4" />
                                            Rol en el sistema
                                        </Label>
                                        <Select value={user?.role ?? ''} disabled>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Rol" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(roleLabels).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-slate-400">El rol solo puede ser modificado por un administrador.</p>
                                    </div>

                                    {fechaRegistro && (
                                        <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
                                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Miembro desde</p>
                                            <p className="mt-1 text-sm font-medium text-slate-700">{fechaRegistro}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Lock className="h-5 w-5 text-sidebar-bg" />
                                                Seguridad
                                            </CardTitle>
                                            <CardDescription className="mt-1.5">
                                                Protege tu cuenta actualizando tu contraseña periódicamente.
                                            </CardDescription>
                                        </div>
                                        <Button
                                            type="button"
                                            variant={mostrarCambiarPassword ? 'outline' : 'default'}
                                            size="sm"
                                            className="shrink-0"
                                            onClick={() => setMostrarCambiarPassword(!mostrarCambiarPassword)}
                                        >
                                            {mostrarCambiarPassword ? (
                                                'Cancelar'
                                            ) : (
                                                <>
                                                    <Lock className="h-4 w-4" />
                                                    Cambiar contraseña
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardHeader>

                                {mostrarCambiarPassword && (
                                    <CardContent className="border-t border-slate-100 pt-5">
                                        <form id="password-form" onSubmit={handleCambiarPassword} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="current_password">Contraseña actual</Label>
                                                <Input
                                                    id="current_password"
                                                    type="password"
                                                    value={passwords.current_password}
                                                    onChange={(e) =>
                                                        setPasswords({ ...passwords, current_password: e.target.value })
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="new_password">Nueva contraseña</Label>
                                                    <Input
                                                        id="new_password"
                                                        type="password"
                                                        value={passwords.new_password}
                                                        onChange={(e) =>
                                                            setPasswords({ ...passwords, new_password: e.target.value })
                                                        }
                                                        required
                                                        minLength={6}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="new_password_confirmation">Confirmar contraseña</Label>
                                                    <Input
                                                        id="new_password_confirmation"
                                                        type="password"
                                                        value={passwords.new_password_confirmation}
                                                        onChange={(e) =>
                                                            setPasswords({
                                                                ...passwords,
                                                                new_password_confirmation: e.target.value,
                                                            })
                                                        }
                                                        required
                                                        minLength={6}
                                                    />
                                                </div>
                                            </div>
                                            <Button type="submit" className="w-full" disabled={guardando}>
                                                {guardando ? 'Actualizando...' : 'Actualizar contraseña'}
                                            </Button>
                                        </form>
                                    </CardContent>
                                )}
                            </Card>
                        </div>

                        {/* Columna derecha — información personal */}
                        <div className="lg:col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="h-5 w-5 text-sidebar-bg" />
                                        Información personal
                                    </CardTitle>
                                    <CardDescription>Actualiza tus datos de contacto y perfil público.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form id="perfil-form" onSubmit={handleSubmit} className="space-y-5">
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="name">Nombre completo</Label>
                                                <Input
                                                    id="name"
                                                    value={perfil.name}
                                                    onChange={(e) => setPerfil({ ...perfil, name: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="email" className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-slate-400" />
                                                    Correo electrónico
                                                </Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={perfil.email}
                                                    onChange={(e) => setPerfil({ ...perfil, email: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Tipo de documento</Label>
                                                <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar tipo" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {tipoDocumentoOptions.map((opt) => (
                                                            <SelectItem key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="dni">Número de documento</Label>
                                                <Input
                                                    id="dni"
                                                    value={perfil.dni}
                                                    onChange={(e) => setPerfil({ ...perfil, dni: e.target.value })}
                                                    maxLength={20}
                                                    placeholder="Ej: 12345678"
                                                />
                                            </div>

                                            <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="telefono">Teléfono</Label>
                                                <Input
                                                    id="telefono"
                                                    value={perfil.telefono}
                                                    onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })}
                                                    maxLength={20}
                                                    placeholder="Ej: 999 888 777"
                                                />
                                            </div>

                                            <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="direccion">Dirección</Label>
                                                <Textarea
                                                    id="direccion"
                                                    value={perfil.direccion}
                                                    onChange={(e) => setPerfil({ ...perfil, direccion: e.target.value })}
                                                    placeholder="Tu dirección de residencia"
                                                />
                                            </div>
                                        </div>
                                    </form>
                                </CardContent>
                                <CardFooter className="justify-end">
                                    <Button type="submit" form="perfil-form" disabled={guardando}>
                                        {guardando ? 'Guardando...' : 'Guardar cambios'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
