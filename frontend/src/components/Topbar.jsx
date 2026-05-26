import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getNotificaciones, marcarLeidas } from '../api/social'
import logo from '../assets/logo.png'
import { MdNotifications, MdPerson, MdLogout, MdMenu, MdClose } from 'react-icons/md'
import { BsRobot } from 'react-icons/bs'
import ChatBot from './ChatBot'

export default function Topbar({ navigationLinks = [] }) {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [notificaciones, setNotificaciones] = useState([])
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const notifRef = useRef(null)
  const profileRef = useRef(null)

  function handleToggleMenu() {
    setShowMobileMenu(prev => !prev)
  }

  useEffect(() => {
    if (usuario?.id) {
      cargarNotificaciones()
    }

    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('toggleMobileMenu', handleToggleMenu)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('toggleMobileMenu', handleToggleMenu)
    }
  }, [usuario])

  useEffect(() => {
    setShowMobileMenu(false)
  }, [location.pathname])

  useEffect(() => {
    if (!showMobileMenu) return undefined

    const handleResize = () => {
      if (window.innerWidth > 900) {
        setShowMobileMenu(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [showMobileMenu])

  async function cargarNotificaciones() {
    try {
      const data = await getNotificaciones(usuario.id)
      setNotificaciones(data.notificaciones || [])
    } catch (err) {
      console.error('Error cargando notificaciones:', err)
    }
  }

  async function handleNotifClick() {
    const abriendo = !showNotifMenu
    setShowNotifMenu(abriendo)
    if (!abriendo) return

    try {
      const data = await getNotificaciones(usuario.id)
      const list = data.notificaciones || []
      setNotificaciones(list)
      if (list.some((n) => !n.leida)) {
        await marcarLeidas(usuario.id)
        setNotificaciones(list.map((n) => ({ ...n, leida: true })))
      }
    } catch (err) {
      console.error('Error cargando notificaciones:', err)
    }
  }

  function handleNavigation(path) {
    navigate(path)
    setShowMobileMenu(false)
  }

  function isActiveLink(path) {
    const currentRoute = `${location.pathname}${location.search}`
    return currentRoute === path || currentRoute.startsWith(`${path}/`)
  }

  const safeNotificaciones = Array.isArray(notificaciones) ? notificaciones : []
  const unreadCount = safeNotificaciones.filter((n) => !n.leida).length
  const hasNavigation = navigationLinks.length > 0

  return (
    <>
    <header className="goalpad-topbar" style={{ position: 'relative' }}>
      <div className="topbar-brand" onClick={() => navigate(usuario ? `/dashboard/${usuario.rol}` : '/')}>
        <div className="topbar-logo-wrap">
          <img src={logo} alt="CanchaGO" className="topbar-logo" />
        </div>
        <span className="topbar-slogan">Reserva tu cancha, vive el juego.</span>
      </div>

      {hasNavigation && (
        <nav className="topbar-links" aria-label="Navegación principal">
          {navigationLinks.map((link) => (
            <button
              key={link.path}
              type="button"
              className={`topbar-link ${isActiveLink(link.path) ? 'active' : ''}`}
              onClick={() => handleNavigation(link.path)}
            >
              {link.label}
            </button>
          ))}
        </nav>
      )}

      <div className="topbar-profile">
        {hasNavigation && (
          <button
            type="button"
            className="topbar-menu-button"
            onClick={() => setShowMobileMenu(true)}
            aria-label="Abrir menú de navegación"
            title="Menú"
          >
            <MdMenu size={20} />
          </button>
        )}

        <button
          className="chatbot-trigger"
          onClick={() => setShowChat((current) => !current)}
          title="CanchaBot IA"
          type="button"
        >
          <BsRobot style={{ fontSize: '1.4rem', color: 'var(--accent-green)' }} />
        </button>

        <div className="bell-icon" onClick={handleNotifClick} ref={notifRef} role="button" tabIndex={0}>
          <MdNotifications style={{ fontSize: '1.4rem', color: '#fff' }} />
          {unreadCount > 0 && <div className="bell-badge">{unreadCount}</div>}

          {showNotifMenu && (
            <div className="topbar-popover topbar-popover--notifications">
              <h4>Notificaciones</h4>
              {safeNotificaciones.length === 0 ? (
                <p className="topbar-popover-empty">Sin notificaciones</p>
              ) : (
                <div className="topbar-popover-list">
                  {safeNotificaciones.map((n) => (
                    <div key={n.id} className={`topbar-notification ${n.leida ? 'read' : 'unread'}`}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-pure)' }}>{n.titulo}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{n.mensaje}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }} ref={profileRef}>
          <div className="profile-info" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className="profile-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              {usuario?.foto_perfil_url ? (
                <>
                  <img
                    src={usuario.foto_perfil_url}
                    alt={usuario.nombre}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none'
                      if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex'
                    }}
                  />
                  <span style={{ display: 'none', fontSize: '1.2rem', color: 'var(--text-secondary)', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}><MdPerson /></span>
                </>
              ) : (
                <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}><MdPerson /></span>
              )}
            </div>
            <div className="profile-text">
              <span className="profile-name">Hola, {usuario?.nombre?.split(' ')[0] || 'Usuario'}</span>
              <span className="profile-sub">Ver perfil ˅</span>
            </div>
          </div>

          {showProfileMenu && (
            <div className="topbar-popover topbar-popover--profile">
              <button
                onClick={() => { setShowProfileMenu(false); navigate('/perfil') }}
                className="topbar-popover-action"
                type="button"
              >
                <MdPerson style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Mi Perfil
              </button>
              <div className="topbar-popover-divider" />
              <button
                onClick={logout}
                className="topbar-popover-action topbar-popover-action--danger"
                type="button"
              >
                <MdLogout style={{ fontSize: '1.1rem' }} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {hasNavigation && showMobileMenu && (
        <>
          <div className="topbar-mobile-backdrop" onClick={() => setShowMobileMenu(false)} />
          <aside className="topbar-mobile-drawer">
            <div className="topbar-mobile-drawer__header">
              <span>Navegación</span>
              <button type="button" className="topbar-mobile-drawer__close" onClick={() => setShowMobileMenu(false)} aria-label="Cerrar menú">
                <MdClose size={20} />
              </button>
            </div>
            <div className="topbar-mobile-drawer__links">
              {navigationLinks.map((link) => (
                <button
                  key={link.path}
                  type="button"
                  className={`topbar-mobile-drawer__link ${isActiveLink(link.path) ? 'active' : ''}`}
                  onClick={() => handleNavigation(link.path)}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </aside>
        </>
      )}

    </header>
    <ChatBot abierto={showChat} onClose={() => setShowChat(false)} />
    </>
  )
}
