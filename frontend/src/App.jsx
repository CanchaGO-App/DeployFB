import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ClienteDashboard from './pages/ClienteDashboard'
import DuenoDashboard from './pages/DuenoDashboard'
import AdminDashboard from './pages/AdminDashboard'
import PerfilPage from './pages/PerfilPage'
import ExplorarMapa from './pages/ExplorarMapa'
import LocalDetailPage from './pages/LocalDetailPage'
import MisReservasPage from './pages/MisReservasPage'
import MisFavoritosPage from './pages/MisFavoritosPage'
import MisResenasPage from './pages/MisResenasPage'


function DashboardRedirect() {
  const { usuario } = useAuth()
  const rutas = {
    cliente: '/dashboard/cliente',
    dueno: '/dashboard/dueno',
    admin: '/dashboard/admin',
  }
  return <Navigate to={rutas[usuario?.rol] || '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />

        {/* Redirect al dashboard correcto */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />

        {/* Dashboards protegidos por rol */}
        <Route
          path="/dashboard/cliente"
          element={
            <ProtectedRoute allowedRoles={['cliente']}>
              <ClienteDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/cliente/reservas"
          element={
            <ProtectedRoute allowedRoles={['cliente']}>
              <MisReservasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/cliente/favoritos"
          element={
            <ProtectedRoute allowedRoles={['cliente']}>
              <MisFavoritosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/cliente/resenas"
          element={
            <ProtectedRoute allowedRoles={['cliente']}>
              <MisResenasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/dueno"
          element={
            <ProtectedRoute allowedRoles={['dueno']}>
              <DuenoDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Perfil — accesible para cualquier usuario autenticado */}
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <PerfilPage />
            </ProtectedRoute>
          }
        />

        {/* Explorar mapa — accesible para clientes y dueños */}
        <Route
          path="/explorar"
          element={
            <ProtectedRoute allowedRoles={['cliente', 'dueno']}>
              <ExplorarMapa />
            </ProtectedRoute>
          }
        />

        {/* Detalle de Local — accesible para clientes y dueños */}
        <Route
          path="/local/:id"
          element={
            <ProtectedRoute allowedRoles={['cliente', 'dueno']}>
              <LocalDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}