import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toast } from './components/Toast';
import { Login } from './pages/Login';
import { DashboardRedirect } from './pages/DashboardRedirect';
import { Perfil } from './pages/Perfil';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { GradosYSecciones } from './pages/admin/GradosYSecciones';
import { SeccionesGrado } from './pages/admin/SeccionesGrado';
import { AsignacionCursos } from './pages/admin/AsignacionCursos';
import { AsignacionEstudiantes } from './pages/admin/AsignacionEstudiantes';
import { CatalogoCursos } from './pages/admin/CatalogoCursos';
import { Usuarios } from './pages/admin/Usuarios';
import { RegistroAsistencia } from './pages/docente/RegistroAsistencia';
import { NotasIndex } from './pages/docente/NotasIndex';
import { NotasEditor } from './pages/docente/NotasEditor';
import { DocenteDashboard } from './pages/docente/DocenteDashboard';
import { EstudianteDashboard } from './pages/estudiante/EstudianteDashboard';
import { MisNotas } from './pages/estudiante/MisNotas';
import { MisAsistencias } from './pages/estudiante/MisAsistencias';
import { Matricula } from './pages/estudiante/Matricula';
import { Analisis } from './pages/Analisis';
import { Configuracion } from './pages/Configuracion';
import { Mantenimiento } from './pages/Mantenimiento';
import { useAuthStore } from './stores/authStore';
import { getDashboardPath } from './utils/dashboardPath';

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const homePath = getDashboardPath(user?.role);

  return (
    <BrowserRouter>
      <Toast />
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
    </BrowserRouter>
  );
}

export default App;
