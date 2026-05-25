import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { usuario, cargando, isAuthenticated } = useAuth()

  if (cargando) {
    return (
      <div className="auth-container">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="skeleton-avatar skeleton-pulse" style={{ width: 56, height: 56 }} />
          <div className="skeleton-pulse" style={{ width: 180, height: 16 }} />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(usuario.rol)) {
    // Redirigir al dashboard correcto según el rol
    const dashboardRoutes = {
      cliente: '/dashboard/cliente',
      dueno: '/dashboard/dueno',
      admin: '/dashboard/admin',
    }
    return <Navigate to={dashboardRoutes[usuario.rol] || '/login'} replace />
  }

  return children
}
