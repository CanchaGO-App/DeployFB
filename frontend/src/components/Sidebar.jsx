import { useNavigate } from 'react-router-dom'

export default function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="goalpad-sidebar">
      {/* Logo Placeholder */}
      <div className="sidebar-logo">
        <span style={{ fontWeight: 800 }}>C</span>
      </div>

      {/* Navegación Principal */}
      <nav className="sidebar-nav">
        <div className="sidebar-icon" onClick={() => navigate('/dashboard/cliente')} title="Inicio">
          🏠
        </div>
        <div className="sidebar-icon active" title="Explorar">
          🔍
        </div>
        <div className="sidebar-icon" title="Calendario">
          📅
        </div>
        <div className="sidebar-icon" title="Tickets/Reservas">
          🎫
        </div>
        <div className="sidebar-icon" title="Favoritos">
          ❤️
        </div>
        <div className="sidebar-icon" title="Mensajes">
          💬
        </div>
      </nav>

      {/* Bottom Area */}
      <div className="sidebar-bottom">
        <div style={{ display: 'flex', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <span>📷</span> <span>🐦</span> <span>▶️</span>
        </div>
        <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px', lineHeight: 1.2 }}>
          © 2026 CanchaGo<br/>Todos los derechos<br/>reservados.
        </p>
      </div>
    </aside>
  )
}
