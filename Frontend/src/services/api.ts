import axios from 'axios';

const ACCOUNT_BLOCKED_STORAGE_KEY = 'show_account_blocked_toast';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

function isLoginPage(): boolean {
  const path = window.location.pathname;
  return path === '/login' || path.endsWith('/login');
}

function isLoginRequest(url?: string): boolean {
  return typeof url === 'string' && url.includes('/auth/login');
}

// Interceptor para agregar el token a todas las requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const maintenanceBlocked =
      error.response?.status === 403 &&
      error.response?.data?.code === 'MAINTENANCE_MODE';

    const accountBlocked = error.response?.data?.code === 'ACCOUNT_BLOCKED';
    const loginRequest = isLoginRequest(error.config?.url);

    if (error.response?.status === 401 || maintenanceBlocked) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // El login maneja sus propios errores (toast / mensajes) sin recargar la página
      if (loginRequest || (isLoginPage() && accountBlocked)) {
        return Promise.reject(error);
      }

      if (maintenanceBlocked && !window.location.pathname.startsWith('/mantenimiento')) {
        window.location.href = '/mantenimiento';
      } else if (accountBlocked) {
        sessionStorage.setItem(ACCOUNT_BLOCKED_STORAGE_KEY, '1');
        window.location.href = '/login';
      } else if (!isLoginPage()) {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 429) {
      console.error('Demasiadas solicitudes. Por favor, intenta más tarde.');
    }
    return Promise.reject(error);
  }
);

export default api;
export { ACCOUNT_BLOCKED_STORAGE_KEY };
