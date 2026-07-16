import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { getDashboardPath } from '../utils/dashboardPath';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);
  const [blockedByMaintenance, setBlockedByMaintenance] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verifyMaintenance = async () => {
      if (!isAuthenticated || user?.role === 'admin') {
        if (!cancelled) {
          setCheckingMaintenance(false);
        }
        return;
      }

      try {
        const response = await api.get('/health/mantenimiento');
        const activo = response.data?.data?.modo_mantenimiento === true;

        if (!cancelled && activo) {
          setBlockedByMaintenance(true);
          setCheckingMaintenance(false);
          logout({ redirect: false });
          return;
        }
      } catch {
        // Si falla la verificación, el guard del backend bloqueará en la siguiente petición.
      }

      if (!cancelled) {
        setCheckingMaintenance(false);
      }
    };

    verifyMaintenance();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.role, logout]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (checkingMaintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Verificando acceso...
      </div>
    );
  }

  if (blockedByMaintenance) {
    return <Navigate to="/mantenimiento" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <>{children}</>;
};
