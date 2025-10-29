import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Perfil } from './pages/Perfil';
import { ProtectedRoute } from './components/ProtectedRoute';
import { GradosYSecciones } from './pages/admin/GradosYSecciones';
import { AsignacionCursos } from './pages/admin/AsignacionCursos';
import { AsignacionEstudiantes } from './pages/admin/AsignacionEstudiantes';
import { CatalogoCursos } from './pages/admin/CatalogoCursos';
import { RegistroAsistencia } from './pages/docente/RegistroAsistencia';
import { NotasIndex } from './pages/docente/NotasIndex';
import { NotasEditor } from './pages/docente/NotasEditor';
import { DocenteDashboard } from './pages/docente/DocenteDashboard';
import { EstudianteDashboard } from './pages/estudiante/EstudianteDashboard';
import { MisNotas } from './pages/estudiante/MisNotas';
import { MisAsistencias } from './pages/estudiante/MisAsistencias';
import { useAuthStore } from './stores/authStore';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
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
          path="/perfil"
          element={
            <ProtectedRoute>
              <Perfil />
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
