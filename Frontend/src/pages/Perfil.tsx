import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

export const Perfil = () => {
    const { user, setUser } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mostrarCambiarPassword, setMostrarCambiarPassword] = useState(false);

    // Datos del perfil
    const [perfil, setPerfil] = useState({
        name: '',
        email: '',
        dni: '',
        telefono: '',
        direccion: '',
        avatar: ''
    });

    // Datos para cambiar contraseña
    const [passwords, setPasswords] = useState({
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
    });

    const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error', texto: string } | null>(null);

    useEffect(() => {
        cargarPerfil();
    }, []);

    const cargarPerfil = async () => {
        try {
            const response = await api.get('/perfil');
            if (response.data.success) {
                setPerfil({
                    name: response.data.data.name || '',
                    email: response.data.data.email || '',
                    dni: response.data.data.dni || '',
                    telefono: response.data.data.telefono || '',
                    direccion: response.data.data.direccion || '',
                    avatar: response.data.data.avatar || ''
                });
            }
        } catch (error: any) {
            console.error('Error al cargar perfil:', error);
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
            const response = await api.put('/perfil', perfil);
            if (response.data.success) {
                mostrarMensaje('success', 'Perfil actualizado exitosamente');

                // Actualizar el usuario en el store con los nuevos datos
                const updatedUser = {
                    id: user!.id,
                    name: response.data.data.name,
                    email: response.data.data.email,
                    role: user!.role,
                    avatar: response.data.data.avatar
                };

                // Obtener el token actual
                const token = localStorage.getItem('token') || '';

                // Actualizar el store (esto también actualiza localStorage)
                setUser(updatedUser, token);

                // Esperar un momento y recargar para que se vea el cambio
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        } catch (error: any) {
            mostrarMensaje('error', error.response?.data?.message || 'Error al actualizar el perfil');
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
                    new_password_confirmation: ''
                });
                setMostrarCambiarPassword(false);
            }
        } catch (error: any) {
            mostrarMensaje('error', error.response?.data?.message || 'Error al cambiar la contraseña');
        } finally {
            setGuardando(false);
        }
    };

    const mostrarMensaje = (tipo: 'success' | 'error', texto: string) => {
        setMensaje({ tipo, texto });
        setTimeout(() => setMensaje(null), 5000);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
                    <p className="text-gray-600 mt-1">Administra tu información personal</p>
                </div>

                {/* Mensaje de éxito/error */}
                {mensaje && (
                    <div className={`mb-6 p-4 rounded-lg ${mensaje.tipo === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                        }`}>
                        {mensaje.texto}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Información del usuario */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="text-center">
                                {perfil.avatar ? (
                                    <img
                                        src={perfil.avatar}
                                        alt={user?.name}
                                        className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-blue-100"
                                        onError={(e) => {
                                            // Si la imagen falla, mostrar inicial
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                ) : null}
                                <div className={`w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 ${perfil.avatar ? 'hidden' : ''}`}>
                                    {user?.name.charAt(0).toUpperCase()}
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                                <p className="text-sm text-gray-600 capitalize mt-1">{user?.role}</p>
                                <p className="text-sm text-gray-500 mt-2">{user?.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Formulario de edición */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6">Información Personal</h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre Completo
                                    </label>
                                    <input
                                        type="text"
                                        value={perfil.name}
                                        onChange={(e) => setPerfil({ ...perfil, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Correo Electrónico
                                    </label>
                                    <input
                                        type="email"
                                        value={perfil.email}
                                        onChange={(e) => setPerfil({ ...perfil, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            DNI
                                        </label>
                                        <input
                                            type="text"
                                            value={perfil.dni}
                                            onChange={(e) => setPerfil({ ...perfil, dni: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            maxLength={20}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Teléfono
                                        </label>
                                        <input
                                            type="text"
                                            value={perfil.telefono}
                                            onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            maxLength={20}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Dirección
                                    </label>
                                    <textarea
                                        value={perfil.direccion}
                                        onChange={(e) => setPerfil({ ...perfil, direccion: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        rows={3}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Avatar (URL de imagen)
                                    </label>
                                    <input
                                        type="url"
                                        value={perfil.avatar}
                                        onChange={(e) => setPerfil({ ...perfil, avatar: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="https://ejemplo.com/mi-foto.jpg"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Ingresa la URL de tu foto de perfil
                                    </p>
                                    {perfil.avatar && (
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-600 mb-1">Vista previa:</p>
                                            <img
                                                src={perfil.avatar}
                                                alt="Vista previa"
                                                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                                                onError={(e) => {
                                                    e.currentTarget.src = '';
                                                    e.currentTarget.alt = 'Error al cargar imagen';
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        disabled={guardando}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {guardando ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Sección de cambiar contraseña */}
                        <div className="bg-white rounded-lg shadow p-6 mt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Seguridad</h3>
                                <button
                                    onClick={() => setMostrarCambiarPassword(!mostrarCambiarPassword)}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    {mostrarCambiarPassword ? 'Cancelar' : 'Cambiar Contraseña'}
                                </button>
                            </div>

                            {mostrarCambiarPassword && (
                                <form onSubmit={handleCambiarPassword} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Contraseña Actual
                                        </label>
                                        <input
                                            type="password"
                                            value={passwords.current_password}
                                            onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nueva Contraseña
                                        </label>
                                        <input
                                            type="password"
                                            value={passwords.new_password}
                                            onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                            minLength={6}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Confirmar Nueva Contraseña
                                        </label>
                                        <input
                                            type="password"
                                            value={passwords.new_password_confirmation}
                                            onChange={(e) => setPasswords({ ...passwords, new_password_confirmation: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                            minLength={6}
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button
                                            type="submit"
                                            disabled={guardando}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {guardando ? 'Actualizando...' : 'Actualizar Contraseña'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
