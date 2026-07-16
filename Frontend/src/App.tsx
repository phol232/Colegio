import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toast } from './components/Toast';
import { AppShell, RoleGuard } from './components/AppShell';
import { useAuthStore } from './stores/authStore';
import { getDashboardPath } from './utils/dashboardPath';

// Loaders de cada ruta. Se reutilizan tanto para `lazy` como para el prefetch,
// de modo que los chunks queden en caché antes del primer clic en el sidebar
// y `Suspense` no reemplace toda la pantalla (sidebar incluido) al navegar.
const routeLoaders = {
  Login: () => import('./pages/Login').then(({ Login }) => ({ default: Login })),
  DashboardRedirect: () => import('./pages/DashboardRedirect').then(({ DashboardRedirect }) => ({ default: DashboardRedirect })),
  Perfil: () => import('./pages/Perfil').then(({ Perfil }) => ({ default: Perfil })),
  AdminDashboard: () => import('./pages/admin/AdminDashboard').then(({ AdminDashboard }) => ({ default: AdminDashboard })),
  GradosYSecciones: () => import('./pages/admin/GradosYSecciones').then(({ GradosYSecciones }) => ({ default: GradosYSecciones })),
  SeccionesGrado: () => import('./pages/admin/SeccionesGrado').then(({ SeccionesGrado }) => ({ default: SeccionesGrado })),
  AsignacionCursos: () => import('./pages/admin/AsignacionCursos').then(({ AsignacionCursos }) => ({ default: AsignacionCursos })),
  AsignacionEstudiantes: () => import('./pages/admin/AsignacionEstudiantes').then(({ AsignacionEstudiantes }) => ({ default: AsignacionEstudiantes })),
  CatalogoCursos: () => import('./pages/admin/CatalogoCursos').then(({ CatalogoCursos }) => ({ default: CatalogoCursos })),
  Usuarios: () => import('./pages/admin/Usuarios').then(({ Usuarios }) => ({ default: Usuarios })),
  RegistroAsistencia: () => import('./pages/docente/RegistroAsistencia').then(({ RegistroAsistencia }) => ({ default: RegistroAsistencia })),
  NotasIndex: () => import('./pages/docente/NotasIndex').then(({ NotasIndex }) => ({ default: NotasIndex })),
  NotasEditor: () => import('./pages/docente/NotasEditor').then(({ NotasEditor }) => ({ default: NotasEditor })),
  DocenteDashboard: () => import('./pages/docente/DocenteDashboard').then(({ DocenteDashboard }) => ({ default: DocenteDashboard })),
  EstudianteDashboard: () => import('./pages/estudiante/EstudianteDashboard').then(({ EstudianteDashboard }) => ({ default: EstudianteDashboard })),
  MisNotas: () => import('./pages/estudiante/MisNotas').then(({ MisNotas }) => ({ default: MisNotas })),
  MisAsistencias: () => import('./pages/estudiante/MisAsistencias').then(({ MisAsistencias }) => ({ default: MisAsistencias })),
  Matricula: () => import('./pages/estudiante/Matricula').then(({ Matricula }) => ({ default: Matricula })),
  Analisis: () => import('./pages/Analisis').then(({ Analisis }) => ({ default: Analisis })),
  Configuracion: () => import('./pages/Configuracion').then(({ Configuracion }) => ({ default: Configuracion })),
  Mantenimiento: () => import('./pages/Mantenimiento').then(({ Mantenimiento }) => ({ default: Mantenimiento })),
} as const;

const Login = lazy(routeLoaders.Login);
const DashboardRedirect = lazy(routeLoaders.DashboardRedirect);
const Perfil = lazy(routeLoaders.Perfil);
const AdminDashboard = lazy(routeLoaders.AdminDashboard);
const GradosYSecciones = lazy(routeLoaders.GradosYSecciones);
const SeccionesGrado = lazy(routeLoaders.SeccionesGrado);
const AsignacionCursos = lazy(routeLoaders.AsignacionCursos);
const AsignacionEstudiantes = lazy(routeLoaders.AsignacionEstudiantes);
const CatalogoCursos = lazy(routeLoaders.CatalogoCursos);
const Usuarios = lazy(routeLoaders.Usuarios);
const RegistroAsistencia = lazy(routeLoaders.RegistroAsistencia);
const NotasIndex = lazy(routeLoaders.NotasIndex);
const NotasEditor = lazy(routeLoaders.NotasEditor);
const DocenteDashboard = lazy(routeLoaders.DocenteDashboard);
const EstudianteDashboard = lazy(routeLoaders.EstudianteDashboard);
const MisNotas = lazy(routeLoaders.MisNotas);
const MisAsistencias = lazy(routeLoaders.MisAsistencias);
const Matricula = lazy(routeLoaders.Matricula);
const Analisis = lazy(routeLoaders.Analisis);
const Configuracion = lazy(routeLoaders.Configuracion);
const Mantenimiento = lazy(routeLoaders.Mantenimiento);

const prefetchRoutes = () => {
  Object.values(routeLoaders).forEach((load) => {
    // Ignoramos errores de red aquí; la navegación real volverá a intentarlo.
    load().catch(() => {});
  });
};

const pageFallback = (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
    Cargando…
  </div>
);

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const homePath = getDashboardPath(user?.role);

  useEffect(() => {
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void) => number;
    };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(prefetchRoutes);
    } else {
      const timer = setTimeout(prefetchRoutes, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <BrowserRouter>
      <Toast />
      <Suspense fallback={pageFallback}>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to={homePath} replace /> : <Login />}
          />
          <Route path="/mantenimiento" element={<Mantenimiento />} />

          {/* Rutas autenticadas: el sidebar (Layout) se monta una sola vez
              en AppShell y solo cambia el contenido del <Outlet/>. */}
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/configuracion" element={<Configuracion />} />

            <Route element={<RoleGuard allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/grados/:gradoId/secciones" element={<SeccionesGrado />} />
              <Route path="/admin/grados-secciones" element={<GradosYSecciones />} />
              <Route path="/admin/grados" element={<GradosYSecciones />} />
              <Route path="/admin/usuarios" element={<Usuarios />} />
              <Route path="/admin/catalogo" element={<CatalogoCursos />} />
              <Route path="/admin/cursos" element={<AsignacionCursos />} />
              <Route path="/admin/estudiantes" element={<AsignacionEstudiantes />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['docente']} />}>
              <Route path="/docente/dashboard" element={<DocenteDashboard />} />
              <Route path="/docente/asistencia" element={<RegistroAsistencia />} />
              <Route path="/docente/notas" element={<NotasIndex />} />
              <Route path="/docente/notas/curso/:cursoId/mes/:mes" element={<NotasEditor />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['estudiante']} />}>
              <Route path="/estudiante/dashboard" element={<EstudianteDashboard />} />
              <Route path="/estudiante/notas" element={<MisNotas />} />
              <Route path="/estudiante/asistencias" element={<MisAsistencias />} />
              <Route path="/estudiante/matricula" element={<Matricula />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['docente', 'admin']} />}>
              <Route path="/analisis" element={<Analisis />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
