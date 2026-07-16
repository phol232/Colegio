import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toast } from './components/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './stores/authStore';
import { getDashboardPath } from './utils/dashboardPath';

const Login = lazy(() => import('./pages/Login').then(({ Login }) => ({ default: Login })));
const DashboardRedirect = lazy(() => import('./pages/DashboardRedirect').then(({ DashboardRedirect }) => ({ default: DashboardRedirect })));
const Perfil = lazy(() => import('./pages/Perfil').then(({ Perfil }) => ({ default: Perfil })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(({ AdminDashboard }) => ({ default: AdminDashboard })));
const GradosYSecciones = lazy(() => import('./pages/admin/GradosYSecciones').then(({ GradosYSecciones }) => ({ default: GradosYSecciones })));
const SeccionesGrado = lazy(() => import('./pages/admin/SeccionesGrado').then(({ SeccionesGrado }) => ({ default: SeccionesGrado })));
const AsignacionCursos = lazy(() => import('./pages/admin/AsignacionCursos').then(({ AsignacionCursos }) => ({ default: AsignacionCursos })));
const AsignacionEstudiantes = lazy(() => import('./pages/admin/AsignacionEstudiantes').then(({ AsignacionEstudiantes }) => ({ default: AsignacionEstudiantes })));
const CatalogoCursos = lazy(() => import('./pages/admin/CatalogoCursos').then(({ CatalogoCursos }) => ({ default: CatalogoCursos })));
const Usuarios = lazy(() => import('./pages/admin/Usuarios').then(({ Usuarios }) => ({ default: Usuarios })));
const RegistroAsistencia = lazy(() => import('./pages/docente/RegistroAsistencia').then(({ RegistroAsistencia }) => ({ default: RegistroAsistencia })));
const NotasIndex = lazy(() => import('./pages/docente/NotasIndex').then(({ NotasIndex }) => ({ default: NotasIndex })));
const NotasEditor = lazy(() => import('./pages/docente/NotasEditor').then(({ NotasEditor }) => ({ default: NotasEditor })));
const DocenteDashboard = lazy(() => import('./pages/docente/DocenteDashboard').then(({ DocenteDashboard }) => ({ default: DocenteDashboard })));
const EstudianteDashboard = lazy(() => import('./pages/estudiante/EstudianteDashboard').then(({ EstudianteDashboard }) => ({ default: EstudianteDashboard })));
const MisNotas = lazy(() => import('./pages/estudiante/MisNotas').then(({ MisNotas }) => ({ default: MisNotas })));
const MisAsistencias = lazy(() => import('./pages/estudiante/MisAsistencias').then(({ MisAsistencias }) => ({ default: MisAsistencias })));
const Matricula = lazy(() => import('./pages/estudiante/Matricula').then(({ Matricula }) => ({ default: Matricula })));
const Analisis = lazy(() => import('./pages/Analisis').then(({ Analisis }) => ({ default: Analisis })));
const Configuracion = lazy(() => import('./pages/Configuracion').then(({ Configuracion }) => ({ default: Configuracion })));
const Mantenimiento = lazy(() => import('./pages/Mantenimiento').then(({ Mantenimiento }) => ({ default: Mantenimiento })));

const pageFallback = (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
    Cargando…
  </div>
);

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const homePath = getDashboardPath(user?.role);

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
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/grados/:gradoId/secciones"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SeccionesGrado />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/grados-secciones"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <GradosYSecciones />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/grados"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <GradosYSecciones />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Usuarios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/catalogo"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CatalogoCursos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cursos"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AsignacionCursos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/estudiantes"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AsignacionEstudiantes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docente/dashboard"
          element={
            <ProtectedRoute allowedRoles={['docente']}>
              <DocenteDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docente/asistencia"
          element={
            <ProtectedRoute allowedRoles={['docente']}>
              <RegistroAsistencia />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docente/notas"
          element={
            <ProtectedRoute allowedRoles={['docente']}>
              <NotasIndex />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docente/notas/curso/:cursoId/mes/:mes"
          element={
            <ProtectedRoute allowedRoles={['docente']}>
              <NotasEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiante/dashboard"
          element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <EstudianteDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiante/notas"
          element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <MisNotas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiante/asistencias"
          element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <MisAsistencias />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiante/matricula"
          element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <Matricula />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analisis"
          element={
            <ProtectedRoute allowedRoles={['docente', 'admin']}>
              <Analisis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Perfil />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracion"
          element={
            <ProtectedRoute>
              <Configuracion />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
