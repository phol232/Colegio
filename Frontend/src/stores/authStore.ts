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
        } catch (error: any) {
            console.error('Login error:', error);
            throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
        }
    },

    register: async (name: string, email: string, password: string, role: string) => {
        try {
            console.log('Registering user...', { name, email, role });
            const response = await api.post('/auth/register', {
                name,
                email,
                password,
                password_confirmation: password,
                role
            });
            console.log('Register response:', response.data);
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
            console.log('Registration successful!');
        } catch (error: any) {
            console.error('Registration error:', error);
            throw new Error(error.response?.data?.message || 'Error al registrarse');
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
        window.location.href = '/login';
    },

    setUser: (user: User, token: string) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
    },
}));
