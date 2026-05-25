import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getFavoritos, toggleFavorito } from '../api/favoritos'
import Topbar from '../components/Topbar'
import Breadcrumb from '../components/ui/Breadcrumb'

const CLIENT_NAVIGATION_LINKS = [
  { label: 'Explorar', path: '/dashboard/cliente' },
  { label: 'Mis reservas', path: '/dashboard/cliente/reservas' },
  { label: 'Mis favoritos', path: '/dashboard/cliente/favoritos' },
  { label: 'Mis reseñas', path: '/dashboard/cliente/resenas' },
]

export default function MisFavoritosPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [favoritos, setFavoritos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (usuario?.id) cargarFavoritos()
  }, [usuario])

  async function cargarFavoritos() {
    try {
      const data = await getFavoritos(usuario.id)
      setFavoritos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  async function handleQuitarFavorito(localId) {
    try {
      await toggleFavorito(usuario.id, localId)
      setFavoritos(favoritos.filter(f => f.local !== localId))
      setMensaje('✕ Eliminado de favoritos')
      setTimeout(() => setMensaje(''), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  if (cargando) {
    return (
      <div className="goalpad-app">
        <main className="goalpad-main">
          <Topbar navigationLinks={CLIENT_NAVIGATION_LINKS} />
          <div className="goalpad-content" style={{ paddingTop: '24px' }}>
            <div className="goalpad-canchas-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="cancha-card-premium">
                  <div className="skeleton-image skeleton-pulse" />
                  <div className="ccp-content">
                    <div className="skeleton-text-lg skeleton-pulse" />
                    <div className="skeleton-text-sm skeleton-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="goalpad-app">
      <main className="goalpad-main">
        <Topbar navigationLinks={CLIENT_NAVIGATION_LINKS} />
        
        <div className="goalpad-content">
          <Breadcrumb items={[
            { label: 'Inicio', href: `/dashboard/${usuario?.rol || 'cliente'}` },
            { label: 'Mis Favoritos', active: true },
          ]} />

          <div className="page-header">
            <h1>❤️ Mis Favoritos</h1>
            <p>Locales que has marcado como favoritos</p>
          </div>

          {mensaje && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--accent-red)', padding: '12px 16px', borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem', marginBottom: '24px'
            }}>
              {mensaje}
            </div>
          )}

          {favoritos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💔</div>
              <p>Aún no tienes locales favoritos. Guarda tus canchas preferidas para volver más rápido.</p>
              <button className="btn-neon mt-2" onClick={() => navigate('/dashboard/cliente')}>
                Explorar canchas
              </button>
            </div>
          ) : (
            <div className="goalpad-canchas-grid">
              {favoritos.map((fav) => (
                <div key={fav.id} className="cancha-card-premium fade-in">
                  <div className="ccp-image-container" onClick={() => navigate(`/local/${fav.local}`)} style={{ cursor: 'pointer' }}>
                    {fav.local_imagen ? (
                      <img src={fav.local_imagen} alt={fav.local_nombre} className="ccp-image" />
                    ) : (
                      <div className="ccp-image" style={{ background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>🏟️</div>
                    )}
                    <div className="ccp-heart" style={{ background: 'var(--accent-red)' }}>♥</div>
                  </div>

                  <div className="ccp-content">
                    <div onClick={() => navigate(`/local/${fav.local}`)} style={{ cursor: 'pointer', flex: 1 }}>
                      <h3 className="ccp-title">{fav.local_nombre}</h3>
                      <div className="ccp-subtitle">📍 {fav.local_direccion}</div>
                    </div>

                    <button 
                      className="btn-neon-block" 
                      style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--accent-red)' }}
                      onClick={() => handleQuitarFavorito(fav.local)}
                    >
                      ✕ Quitar de favoritos
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}