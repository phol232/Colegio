import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import api from '../services/api';

interface Usuario {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface ConfiguracionSistema {
    nombre_institucion: string;
    anio_academico: number;
    periodo_evaluacion: string;
    modo_mantenimiento: boolean;
}

export const Configuracion = () => {
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Configuración del sistema (solo admin)
    const [configSistema, setConfigSistema] = useState<ConfiguracionSistema>({
        nombre_institucion: 'Colegio Frederick',
        anio_academico: 2025,
        periodo_evaluacion: 'trimestral',
        modo_mantenimiento: false
    });

    // Preferencias de la aplicación
    const [modoOscuro, setModoOscuro] = useState(false);
    const [idioma, setIdioma] = useState('es');
    const [notificaciones, setNotificaciones] = useState(true);
    const [tamanoFuente, setTamanoFuente] = useState('mediano');
    
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    useEffect(() => {
        cargarDatos();
        
        // Cargar preferencias desde localStorage
        const modoOscuroGuardado = localStorage.getItem('modoOscuro') === 'true';
        const idiomaGuardado = localStorage.getItem('idioma') || 'es';
        const notificacionesGuardadas = localStorage.getItem('notificaciones') !== 'false';
        const tamanoFuenteGuardado = localStorage.getItem('tamanoFuente') || 'mediano';
        
        setModoOscuro(modoOscuroGuardado);
        setIdioma(idiomaGuardado);
        setNotificaciones(notificacionesGuardadas);
        setTamanoFuente(tamanoFuenteGuardado);
        
        // Aplicar modo oscuro si está guardado
        if (modoOscuroGuardado) {
            document.documentElement.classList.add('dark');
        }
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/perfil/');
            const userData = response.data.data;
            
            setUsuario(userData);
            
        } catch (error: any) {
            setModalConfig({
                isOpen: true,
                title: 'Error',
                message: error.response?.data?.message || 'Error al cargar datos',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleActualizarSistema = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            await api.put('/admin/configuracion', configSistema);

            setModalConfig({
                isOpen: true,
                title: 'Éxito',
                message: 'Configuración del sistema actualizada',
                type: 'success'
            });
        } catch (error: any) {
            setModalConfig({
                isOpen: true,
                title: 'Error',
                message: error.response?.data?.message || 'Error al actualizar configuración',
                type: 'error'
            });
        }
    };

    const handleCambiarModoOscuro = (activado: boolean) => {
        setModoOscuro(activado);
        localStorage.setItem('tema', activado ? 'oscuro' : 'claro');
        
        // Aplicar cambio inmediato
        const html = document.documentElement;
        const body = document.body;
        
        if (activado) {
            // Modo oscuro
            html.style.backgroundColor = '#0f172a';
            body.style.backgroundColor = '#0f172a';
            body.style.color = '#e2e8f0';
        } else {
            // Modo claro
            html.style.backgroundColor = '#F4F6F8';
            body.style.backgroundColor = '#F4F6F8';
            body.style.color = '#1e293b';
        }

        setModalConfig({
            isOpen: true,
            title: '✓ Preferencia Guardada',
            message: `Modo ${activado ? '🌙 Oscuro' : '☀️ Claro'} activado correctamente`,
            type: 'success'
        });
    };

    const handleCambiarIdioma = (nuevoIdioma: string) => {
        setIdioma(nuevoIdioma);
        localStorage.setItem('idioma', nuevoIdioma);

        const nombreIdioma = nuevoIdioma === 'es' ? '🇪🇸 Español' : nuevoIdioma === 'en' ? '🇺🇸 English' : '🇫🇷 Français';

        setModalConfig({
            isOpen: true,
            title: '✓ Idioma Configurado',
            message: `Idioma cambiado a ${nombreIdioma}. Se aplicará en la próxima actualización del sistema.`,
            type: 'success'
        });
    };

    const handleCambiarNotificaciones = (activado: boolean) => {
        setNotificaciones(activado);
        localStorage.setItem('notificaciones', activado ? 'true' : 'false');

        setModalConfig({
            isOpen: true,
            title: 'Preferencia Guardada',
            message: `Notificaciones ${activado ? 'activadas' : 'desactivadas'}`,
            type: 'info'
        });
    };

    const handleCambiarTamanoFuente = (tamano: string) => {
        setTamanoFuente(tamano);
        localStorage.setItem('tamanoFuente', tamano);

        // Aplicar tamaño de fuente
        const root = document.documentElement;
        switch (tamano) {
            case 'pequeno':
                root.style.fontSize = '14px';
                break;
            case 'grande':
                root.style.fontSize = '18px';
                break;
            default:
                root.style.fontSize = '16px';
        }

        setModalConfig({
            isOpen: true,
            title: 'Preferencia Guardada',
            message: `Tamaño de fuente: ${tamano}`,
            type: 'success'
        });
    };

    const getRoleLabel = (role: string) => {
        const roles: Record<string, string> = {
            admin: 'Administrador',
            docente: 'Docente',
            estudiante: 'Estudiante'
        };
        return roles[role] || role;
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
            <div className="min-h-screen bg-[#F4F6F8]">
                {/* Header */}
                <div className="bg-white border-b border-[#E5E7EB] shadow-sm">
                    <div className="max-w-[1200px] mx-auto px-6 py-4">
                        <h1 className="text-2xl font-bold text-[#0E2B5C]">⚙️ Configuración</h1>
                        <p className="text-sm text-[#6B7280] mt-1">Gestiona tu perfil y preferencias</p>
                    </div>
                </div>

                {/* Contenido */}
                <div className="max-w-[1200px] mx-auto p-6 space-y-6">
                    {/* Información del Usuario */}
                    <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                                {usuario?.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[#0E2B5C]">{usuario?.name}</h2>
                                <p className="text-sm text-[#6B7280]">{usuario?.email}</p>
                                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                                    usuario?.role === 'admin' 
                                        ? 'bg-purple-100 text-purple-800' 
                                        : usuario?.role === 'docente'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-green-100 text-green-800'
                                }`}>
                                    {getRoleLabel(usuario?.role || '')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Preferencias de Apariencia */}
                    <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                        <h3 className="text-lg font-semibold text-[#0E2B5C] mb-4">🎨 Apariencia</h3>
                        <div className="space-y-4">
                            {/* Modo Oscuro */}
                            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div>
                                    <p className="text-sm font-medium text-[#0E2B5C]">Modo Oscuro</p>
                                    <p className="text-xs text-[#6B7280]">Cambia la apariencia de la aplicación</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={modoOscuro}
                                        onChange={(e) => handleCambiarModoOscuro(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Tamaño de Fuente */}
                            <div className="py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-sm font-medium text-[#0E2B5C] mb-3">Tamaño de Fuente</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleCambiarTamanoFuente('pequeno')}
                                        className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                                            tamanoFuente === 'pequeno'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                                                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                                        }`}
                                    >
                                        <span className="text-xs">Pequeño</span>
                                    </button>
                                    <button
                                        onClick={() => handleCambiarTamanoFuente('mediano')}
                                        className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                                            tamanoFuente === 'mediano'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                                                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                                        }`}
                                    >
                                        <span className="text-sm">Mediano</span>
                                    </button>
                                    <button
                                        onClick={() => handleCambiarTamanoFuente('grande')}
                                        className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                                            tamanoFuente === 'grande'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                                                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                                        }`}
                                    >
                                        <span className="text-base">Grande</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preferencias de Idioma y Notificaciones */}
                    <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                        <h3 className="text-lg font-semibold text-[#0E2B5C] mb-4">🌍 Idioma y Notificaciones</h3>
                        <div className="space-y-4">
                            {/* Idioma */}
                            <div className="py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-sm font-medium text-[#0E2B5C] mb-3">Idioma de la Aplicación</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => handleCambiarIdioma('es')}
                                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                            idioma === 'es'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                                                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                                        }`}
                                    >
                                        🇪🇸 Español
                                    </button>
                                    <button
                                        onClick={() => handleCambiarIdioma('en')}
                                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                            idioma === 'en'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                                                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                                        }`}
                                    >
                                        🇺🇸 English
                                    </button>
                                    <button
                                        onClick={() => handleCambiarIdioma('fr')}
                                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                            idioma === 'fr'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                                                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                                        }`}
                                    >
                                        🇫🇷 Français
                                    </button>
                                </div>
                            </div>

                            {/* Notificaciones */}
                            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div>
                                    <p className="text-sm font-medium text-[#0E2B5C]">Notificaciones Push</p>
                                    <p className="text-xs text-[#6B7280]">Recibe alertas sobre actividades importantes</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificaciones}
                                        onChange={(e) => handleCambiarNotificaciones(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                            </div>

                            {/* Notificaciones por Email */}
                            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div>
                                    <p className="text-sm font-medium text-[#0E2B5C]">Notificaciones por Email</p>
                                    <p className="text-xs text-[#6B7280]">Recibe resúmenes diarios por correo electrónico</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        defaultChecked={true}
                                        onChange={(e) => {
                                            localStorage.setItem('email_notifications', e.target.checked ? 'true' : 'false');
                                            setModalConfig({
                                                isOpen: true,
                                                title: '✓ Preferencia Guardada',
                                                message: `Notificaciones por email ${e.target.checked ? 'activadas' : 'desactivadas'}`,
                                                type: 'success'
                                            });
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Configuración Avanzada */}
                    <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                        <h3 className="text-lg font-semibold text-[#0E2B5C] mb-4">⚡ Configuración Avanzada</h3>
                        <div className="space-y-4">
                            {/* Auto-guardado */}
                            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div>
                                    <p className="text-sm font-medium text-[#0E2B5C]">Auto-guardado</p>
                                    <p className="text-xs text-[#6B7280]">Guarda automáticamente tus cambios</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        defaultChecked={true}
                                        onChange={(e) => {
                                            localStorage.setItem('auto_save', e.target.checked ? 'true' : 'false');
                                            setModalConfig({
                                                isOpen: true,
                                                title: '✓ Preferencia Guardada',
                                                message: `Auto-guardado ${e.target.checked ? 'activado' : 'desactivado'}`,
                                                type: 'info'
                                            });
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>

                            {/* Animaciones */}
                            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div>
                                    <p className="text-sm font-medium text-[#0E2B5C]">Animaciones</p>
                                    <p className="text-xs text-[#6B7280]">Activa/desactiva las transiciones visuales</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        defaultChecked={true}
                                        onChange={(e) => {
                                            localStorage.setItem('animations', e.target.checked ? 'true' : 'false');
                                            document.documentElement.style.setProperty(
                                                '--animation-duration',
                                                e.target.checked ? '0.3s' : '0s'
                                            );
                                            setModalConfig({
                                                isOpen: true,
                                                title: '✓ Preferencia Guardada',
                                                message: `Animaciones ${e.target.checked ? 'activadas' : 'desactivadas'}`,
                                                type: 'info'
                                            });
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            {/* Limpiar Caché */}
                            <div className="py-3 px-4 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-orange-900">Limpiar Caché Local</p>
                                        <p className="text-xs text-orange-700">Borra datos temporales para liberar espacio</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            // Guardar datos importantes antes de limpiar
                                            const tema = localStorage.getItem('tema');
                                            const idioma = localStorage.getItem('idioma');
                                            const token = localStorage.getItem('token');
                                            
                                            // Limpiar todo
                                            localStorage.clear();
                                            
                                            // Restaurar datos importantes
                                            if (tema) localStorage.setItem('tema', tema);
                                            if (idioma) localStorage.setItem('idioma', idioma);
                                            if (token) localStorage.setItem('token', token);
                                            
                                            setModalConfig({
                                                isOpen: true,
                                                title: '✓ Caché Limpiado',
                                                message: 'Se han eliminado los datos temporales',
                                                type: 'success'
                                            });
                                        }}
                                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                                    >
                                        🗑️ Limpiar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Configuración del Sistema (Solo Admin) */}
                    {usuario?.role === 'admin' && (
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <h3 className="text-lg font-semibold text-[#0E2B5C] mb-4">🏫 Configuración del Sistema</h3>
                            <form onSubmit={handleActualizarSistema} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#374151] mb-1">
                                        Nombre de la Institución
                                    </label>
                                    <input
                                        type="text"
                                        value={configSistema.nombre_institucion}
                                        onChange={(e) => setConfigSistema({
                                            ...configSistema,
                                            nombre_institucion: e.target.value
                                        })}
                                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#374151] mb-1">
                                        Año Académico
                                    </label>
                                    <input
                                        type="number"
                                        value={configSistema.anio_academico}
                                        onChange={(e) => setConfigSistema({
                                            ...configSistema,
                                            anio_academico: parseInt(e.target.value)
                                        })}
                                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#374151] mb-1">
                                        Período de Evaluación
                                    </label>
                                    <select
                                        value={configSistema.periodo_evaluacion}
                                        onChange={(e) => setConfigSistema({
                                            ...configSistema,
                                            periodo_evaluacion: e.target.value
                                        })}
                                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="bimestral">Bimestral</option>
                                        <option value="trimestral">Trimestral</option>
                                        <option value="semestral">Semestral</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between py-3 px-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div>
                                        <p className="text-sm font-medium text-[#92400E]">Modo Mantenimiento</p>
                                        <p className="text-xs text-[#B45309]">Desactiva el acceso al sistema temporalmente</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={configSistema.modo_mantenimiento}
                                            onChange={(e) => setConfigSistema({
                                                ...configSistema,
                                                modo_mantenimiento: e.target.checked
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                                    </label>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                                    >
                                        Actualizar Configuración
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Modal */}
                <Modal
                    isOpen={modalConfig.isOpen}
                    onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    type={modalConfig.type}
                />
            </div>
        </Layout>
    );
};
