import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getLocales } from '../api/locales'
import { getReservas } from '../api/reservas'
import { getFavoritos, toggleFavorito, esFavorito } from '../api/favoritos'
import Topbar from '../components/Topbar'
// import { getLocalImg } from '../utils/imagenes'
import {
  MdOutlineEmojiEvents,
  MdApps,
  MdSportsSoccer,
  MdMap,
  MdSearch,
  MdStar,
  MdFavorite,
  MdFavoriteBorder,
  MdDirectionsCar,
  MdLocalParking,
  MdShower,
  MdWifi,
  MdLocalCafe,
  MdFlashOn,
  MdBusiness,
  MdSportsVolleyball,
  MdSportsTennis
} from 'react-icons/md'

const CLIENT_NAVIGATION_LINKS = [
  { label: 'Explorar', path: '/dashboard/cliente' },
  { label: 'Mis reservas', path: '/dashboard/cliente/reservas' },
  { label: 'Mis favoritos', path: '/dashboard/cliente/favoritos' },
  { label: 'Mis reseñas', path: '/dashboard/cliente/resenas' },
]

export default function ClienteDashboard() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const debounceRef = useRef(null)
  const skipDebounceRef = useRef(false)
  const [locales, setLocales] = useState([])
  const [favoritos, setFavoritos] = useState(new Set())
  const [cargando, setCargando] = useState(true)
  const [mensajeToast, setMensajeToast] = useState('')

  // Filtros
  const [filtroActivo, setFiltroActivo] = useState('Todos')
  const [buscarText, setBuscarText] = useState('')
  const [deporte, setDeporte] = useState('')

  const localesFiltrados = locales.filter(local =>
    local.nombre.toLowerCase().includes(buscarText.toLowerCase())
  )

  useEffect(() => {
    cargarDatos()
    if (usuario?.id) cargarFavoritos()
  }, [])

  async function cargarFavoritos() {
    try {
      const data = await getFavoritos(usuario.id)
      const ids = new Set(data.map(f => f.local))
      setFavoritos(ids)
    } catch (err) {
      console.error('Error cargando favoritos:', err)
    }
  }

  async function cargarDatos(filtros = {}) {
    try {
      const localesData = await getLocales(null, filtros)
      setLocales(localesData.results || localesData)
    } catch (err) {
      console.error('Error cargando datos:', err)
    } finally {
      setCargando(false)
    }
  }

  async function handleToggleFavorito(e, localId) {
    e.stopPropagation()
    if (!usuario) {
      navigate('/login')
      return
    }
    try {
      console.log('Toggle favorito:', usuario.id, localId)
      const result = await toggleFavorito(usuario.id, localId)
      console.log('Resultado:', result)
      if (result.es_favorito) {
        setFavoritos(new Set([...favoritos, localId]))
        setMensajeToast('❤️ Guardado en favoritos. Lo tendrás más a mano la próxima vez.')
      } else {
        const newFavoritos = new Set(favoritos)
        newFavoritos.delete(localId)
        setFavoritos(newFavoritos)
        setMensajeToast('💔 Quitado de favoritos. Puedes volver a guardarlo cuando quieras.')
      }
      setTimeout(() => setMensajeToast(''), 2500)
    } catch (err) {
      console.error('Error toggling favorito:', err)
      setMensajeToast('Error: ' + err.message)
      setTimeout(() => setMensajeToast(''), 3000)
    }
  }

  function handleBuscar() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    skipDebounceRef.current = true
    setCargando(true)
    cargarDatos({ buscar: buscarText, tipo: deporte })
  }

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false
      return
    }

    if (!buscarText && deporte === '') return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setCargando(true)
      cargarDatos({ buscar: buscarText, tipo: deporte })
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [buscarText, deporte])

  function handlePillClick(pill) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    skipDebounceRef.current = true
    setFiltroActivo(pill)
    if (pill === 'Todos') {
      setDeporte('')
      setCargando(true)
      cargarDatos({ buscar: buscarText, tipo: '' })
    } else {
      // Mapear el nombre visual al value que espera el backend
      const tipoMapping = {
        'Fútbol 5': 'futbol5',
        'Fútbol 7': 'futbol7',
        'Fútbol 11': 'futbol11',
        'Wally': 'wally',
        'Pádel': 'padel'
      }
      const tipoBackend = tipoMapping[pill] || ''
      setDeporte(tipoBackend)
      setCargando(true)
      cargarDatos({ buscar: buscarText, tipo: tipoBackend })
    }
  }

  if (cargando) {
    return (
      <div className="goalpad-app">
        <div className="goalpad-main">
          <Topbar navigationLinks={CLIENT_NAVIGATION_LINKS} />
          <div className="goalpad-content" style={{ paddingTop: '24px' }}>
            <div className="goalpad-canchas-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
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
        </div>
      </div>
    )
  }

  const pills = ['Todos', 'Fútbol 5', 'Fútbol 7', 'Fútbol 11', 'Wally', 'Pádel']

  return (
    <div className="goalpad-app">
      <main className="goalpad-main">
        <Topbar navigationLinks={CLIENT_NAVIGATION_LINKS} />

        <div className="goalpad-content">
          {/* Main Filters Section in place of old Hero Search Box */}
          <div style={{ 
            background: 'var(--bg-elevated)', 
            borderRadius: 'var(--radius-xl)', 
            padding: '32px', 
            marginBottom: '32px', 
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
              <h2 style={{ 
                fontSize: '1.4rem', 
                fontWeight: 700, 
                color: 'var(--text-pure)', 
                margin: 0,
                textAlign: 'center',
                letterSpacing: '-0.02em',
                maxWidth: '80%'
              }}>
                ¿Qué deporte quieres jugar hoy? <MdOutlineEmojiEvents style={{ verticalAlign: 'middle', color: 'var(--accent-yellow)' }} />
              </h2>
            </div>

            <div className="mobile-pill-container" style={{ 
              display: 'flex', 
              gap: '16px', 
              flexWrap: 'wrap', 
              justifyContent: 'center',
              width: '100%'
            }}>
              {pills.map(pill => {
                const isActive = filtroActivo === pill
                const Icon = pill === 'Todos' ? MdApps : pill.includes('Fútbol') ? MdSportsSoccer : pill === 'Wally' ? MdSportsVolleyball : pill === 'Pádel' ? MdSportsTennis : MdSportsSoccer // fallback
                return (
                  <div 
                    key={pill} 
                    onClick={() => handlePillClick(pill)}
                    style={{
                      background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: isActive ? '2px solid var(--accent-green)' : '1px solid var(--border-light)',
                      color: isActive ? 'var(--accent-green)' : 'var(--text-secondary)',
                      padding: '14px 28px',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 4px 20px rgba(16, 185, 129, 0.15)' : 'none',
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                        e.currentTarget.style.color = 'var(--text-pure)'
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'var(--border-light)'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                      }
                    }}
                  >
                    <Icon style={{ fontSize: '1.4rem' }} /> {pill}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Controls Bar (Search & Map View) */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '8px 16px', minWidth: '300px' }}>
              <MdSearch style={{ color: 'var(--text-muted)', fontSize: '1.3rem' }} />
              <input
                type="text"
                placeholder="Buscar complejo por nombre..."
                value={buscarText}
                onChange={(e) => setBuscarText(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-pure)',
                  width: '100%',
                  fontSize: '0.95rem'
                }}
              />
              {cargando && (
                <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--accent-green)', animation: 'spin 0.8s linear infinite' }} />
              )}
            </div>

            <button 
              className="btn-secondary" 
              onClick={() => navigate('/explorar')}
              style={{ 
                padding: '10px 20px', 
                borderRadius: 'var(--radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              <MdMap style={{ fontSize: '1.2rem' }} /> Ver en Mapa
            </button>
          </div>

          {/* Canchas Grid */}
          {mensajeToast && (
            <div style={{
              position: 'fixed', top: '100px', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--accent-green-dark)', color: '#FFFFFF',
              padding: '12px 24px', borderRadius: '30px', fontWeight: 600,
              zIndex: 1000, boxShadow: 'var(--shadow-btn)'
            }}>
              {mensajeToast}
            </div>
          )}

          {localesFiltrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><MdSearch /></div>
              <p>No encontramos locales con ese criterio. Intenta con otro filtro.</p>
            </div>
          ) : (
            <div className="goalpad-canchas-grid">
              {localesFiltrados.map((local, index) => {
                const rating = local.calificacion_promedio !== null && local.calificacion_promedio !== undefined ? local.calificacion_promedio : '--'
                const reviews = local.total_resenas || 0
                const distance = (Math.random() * 10 + 1).toFixed(1)
                const esFav = favoritos.has(local.id)

                return (
                  <div key={local.id} className="cancha-card-premium fade-in">
                    <div className="ccp-image-container" onClick={() => navigate(`/local/${local.id}`)} style={{ cursor: 'pointer' }}>
                      {/* HARDCODED: getLocalImg(local) ? ( */}
                      {local.imagen_portada_url ? (
                        {/* HARDCODED: src={getLocalImg(local)} */}
                        <img src={local.imagen_portada_url} alt={local.nombre} className="ccp-image" />
                      ) : (
                        <div className="ccp-image" style={{ background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', color: '#fff' }}><MdBusiness /></div>
                      )}
                      
                      <div className="ccp-badge">
                        <div className="ccp-rating"><span><MdStar style={{ color: 'var(--accent-yellow)', verticalAlign: 'middle', marginBottom: '2px' }} /></span> {rating}</div>
                        <div className="ccp-reviews">{reviews} {reviews === 1 ? 'reseña' : 'reseñas'}</div>
                      </div>

                      <div 
                        className="ccp-heart" 
                        style={{ 
                          background: esFav ? 'var(--accent-red)' : 'rgba(0,0,0,0.5)',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => handleToggleFavorito(e, local.id)}
                      >
                        {esFav ? <MdFavorite /> : <MdFavoriteBorder />}
                      </div>

                    </div>

                    <div className="ccp-content">
                      <div onClick={() => navigate(`/local/${local.id}`)} style={{ cursor: 'pointer', flex: 1, marginBottom: '20px' }}>
                        <h3 className="ccp-title" style={{ margin: 0 }}>{local.nombre}</h3>
                      </div>

                      <button className="btn-neon-block" onClick={() => navigate(`/local/${local.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <MdFlashOn style={{ fontSize: '1.2rem' }} /> Reservar ahora
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
