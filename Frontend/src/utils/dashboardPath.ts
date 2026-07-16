import type { User } from '../types';

/** Ruta del dashboard real según el rol (no el Dashboard simulado). */
export function getDashboardPath(role: User['role'] | string | undefined | null): string {
    switch (role) {
        case 'admin':
            return '/admin/dashboard';
        case 'docente':
            return '/docente/dashboard';
        case 'estudiante':
            return '/estudiante/dashboard';
        case 'padre':
            // Aún no hay dashboard de padre; perfil es el landing seguro
            return '/perfil';
        default:
            return '/login';
    }
}
