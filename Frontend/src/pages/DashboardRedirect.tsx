import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getDashboardPath } from '../utils/dashboardPath';

/** Redirige al dashboard real del rol autenticado. */
export const DashboardRedirect = () => {
    const user = useAuthStore((s) => s.user);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Navigate to={getDashboardPath(user.role)} replace />;
};
