import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { ACCOUNT_BLOCKED_STORAGE_KEY } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { ACCOUNT_BLOCKED_MESSAGE, useToastStore } from '../stores/toastStore';
import { getDashboardPath } from '../utils/dashboardPath';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [maintenanceActive, setMaintenanceActive] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuthStore();
    const showToast = useToastStore((state) => state.show);

    const showAccountBlockedToast = () => {
        showToast(ACCOUNT_BLOCKED_MESSAGE, 'error', 2500);
    };

    useEffect(() => {
        if (sessionStorage.getItem(ACCOUNT_BLOCKED_STORAGE_KEY)) {
            sessionStorage.removeItem(ACCOUNT_BLOCKED_STORAGE_KEY);
            showAccountBlockedToast();
        }
    }, []);

    useEffect(() => {
        api.get('/health/mantenimiento')
            .then((response) => {
                setMaintenanceActive(response.data?.data?.modo_mantenimiento === true);
            })
            .catch(() => {
                setMaintenanceActive(false);
            });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            const role = useAuthStore.getState().user?.role;
            navigate(getDashboardPath(role), { replace: true });
        } catch (err: unknown) {
            const error = err as Error & { code?: string };
            const isBlocked =
                error.code === 'ACCOUNT_BLOCKED' ||
                error.message.toLowerCase().includes('bloqueada');

            if (isBlocked) {
                setError('');
                showAccountBlockedToast();
            } else {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Lado izquierdo - Imagen */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <img
                    src="/imagenes/WhatsApp Image 2025-10-22 at 10.42.20.jpeg"
                    alt="Colegio"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Lado derecho - Formulario */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-[#F4F6F8]">
                <div className="w-full max-w-md rounded-2xl border-2 border-sidebar-bg bg-white p-8 sm:p-10 shadow-lg shadow-sidebar-bg/10">
                    <div className="text-center mb-8">
                        {/* Logo */}
                        <div className="flex justify-center mb-6">
                            <img
                                src="/imagenes/WhatsApp Image 2025-10-22 at 10.42.20 (1).jpeg"
                                alt="Logo Colegio"
                                className="w-24 h-24 object-contain"
                            />
                        </div>
                        <h2 className="text-3xl font-bold text-sidebar-bg mb-2">
                            Iniciar Sesión
                        </h2>
                        <p className="text-[#6B7280]">
                            Bienvenido de vuelta! Ingresa con tus credenciales
                        </p>
                    </div>

                    {maintenanceActive && (
                        <div className="mb-4 p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-sm">
                            El sistema está en mantenimiento. Solo los administradores pueden iniciar sesión.
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-[#DC2626] text-[#DC2626] rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field pl-10"
                                    placeholder="correo@ejemplo.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pl-10 pr-10"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showPassword ? (
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Remember me y Forgot password */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                    Recordarme
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    showToast(
                                        'La recuperación de contraseña estará disponible próximamente.',
                                        'info',
                                        3500,
                                    )
                                }
                                className="text-sm text-[#17A2E5] hover:underline"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#C62828] hover:bg-[#B71C1C] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:bg-[#EAB0B0] disabled:cursor-not-allowed"
                        >
                            {loading ? 'Iniciando sesión...' : 'INICIAR SESIÓN'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
