import { Suspense, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { getDashboardPath } from '../utils/dashboardPath';
import { Layout } from './Layout';

const contentFallback = (
  <div className="flex flex-1 items-center justify-center py-24 text-sm text-slate-500">
    Cargando…
  </div>
);

/**
 * Ruta padre persistente para las secciones autenticadas.
 *
 * Renderiza el `Layout` (sidebar + header) una sola vez y deja que solo el
 * `<Outlet/>` cambie al navegar. El `<Suspense>` envuelve únicamente el
 * contenido, por lo que el sidebar nunca se desmonta y el fallback de carga
 * de los chunks lazy solo aparece en el área de contenido (sin recargar toda
 * la pantalla).
 */
export const AppShell = () => {
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

  return (
    <Layout>
      <Suspense fallback={contentFallback}>
        <Outlet />
      </Suspense>
    </Layout>
  );
};

/**
 * Autorización por rol para grupos de rutas anidadas.
 * Renderiza el `<Outlet/>` si el rol del usuario está permitido; de lo
 * contrario redirige a su dashboard.
 */
export const RoleGuard = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const user = useAuthStore((s) => s.user);

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Outlet />;
};
