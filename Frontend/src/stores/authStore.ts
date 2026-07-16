import { create } from 'zustand';
import api from '../services/api';
import { AuthState, User } from '../types';

// Helper function to safely parse user from localStorage
const getUserFromStorage = (): User | null => {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr || userStr === 'undefined' || userStr === 'null') {
            return null;
        }
        return JSON.parse(userStr);
    } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        return null;
    }
};

export const useAuthStore = create<AuthState>((set) => ({
    user: getUserFromStorage(),
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),

    login: async (email: string, password: string) => {
        try {
            console.log('Logging in...', { email });
            const response = await api.post('/auth/login', { email, password });
            console.log('Login response:', response.data);
            const data = response.data.data;

            // Construir objeto user desde la respuesta del backend
            const user: User = {
                id: data.usuario_id,
                email: data.email,
                name: data.name,
                role: data.role
            };
            const token = data.token;

            console.log('Setting user and token...', { user, token });
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            set({ user, token, isAuthenticated: true });
            console.log('Login successful!');
        } catch (error: unknown) {
            const axiosError = error as {
                response?: { data?: { message?: string; code?: string } };
                message?: string;
            };
            const data = axiosError.response?.data;
            const authError = new Error(
                data?.message || axiosError.message || 'Error al iniciar sesión',
            ) as Error & { code?: string };
            authError.code = data?.code;
            throw authError;
        }
    },

    logout: (options?: { redirect?: string | false }) => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
        if (options?.redirect !== false) {
            window.location.href = options?.redirect ?? '/login';
        }
    },

    setUser: (user: User, token: string) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
    },
}));
