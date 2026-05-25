import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import { getLocales } from '../api/locales'
import Topbar from '../components/Topbar'
import SearchBar from '../components/SearchBar'
import Breadcrumb from '../components/ui/Breadcrumb'
import { useAuth } from '../context/AuthContext'

// Fix default Leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Component to recenter map
function RecenterMap({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, 13)
  }, [center])
  return null
}

// Custom Marker Icon
const customIcon = new L.divIcon({
  className: 'custom-leaflet-marker',
  html: `<div style="
    background: var(--accent-green);
    width: 36px;
    height: 36px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid var(--bg-base);
    box-shadow: 0 4px 15px rgba(16,185,129,0.5);
  "><span style="transform: rotate(45deg); font-size: 1.1rem; padding-bottom: 2px;">🏟️</span></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
})

export default function ExplorarMapa() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [locales, setLocales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [centro, setCentro] = useState([-17.7833, -63.1821]) // Santa Cruz de la Sierra, Bolivia por defecto
  const [localSeleccionado, setLocalSeleccionado] = useState(null)

  useEffect(() => {
    cargarLocales()
  }, [])

  async function cargarLocales(filtros = {}) {
    setCargando(true)
    try {
      const data = await getLocales(null, filtros)
      setLocales(data.results || data)
    } catch (err) {
      console.error('Error cargando locales:', err)
    } finally {
      setCargando(false)
    }
  }

  function handleSearch(filtros) {
    cargarLocales(filtros)
  }

  const localesConCoordenadas = locales.filter(
    (l) => l.latitud && l.longitud
  )

  return (
    <>
      <Topbar />
      <div className="page">
        <Breadcrumb items={[
          { label: 'Inicio', href: `/dashboard/${usuario?.rol || 'cliente'}` },
          { label: 'Explorar Mapa', active: true },
        ]} />
        <div className="page-header">
          <h1>🗺️ Explorar Locales</h1>
          <p>Encuentra complejos deportivos cerca de ti</p>
        </div>

        <SearchBar onSearch={handleSearch} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          {/* Mapa */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 500 }}>
            <MapContainer
              center={centro}
              zoom={13}
              minZoom={12}
              maxBounds={[[-18.5, -64.0], [-17.0, -62.0]]}
              maxBoundsViscosity={1.0}
              style={{ height: '100%', minHeight: 500, borderRadius: 'var(--radius-lg)' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RecenterMap center={centro} />

              {localesConCoordenadas.map((local) => (
                <Marker
                  key={local.id}
                  position={[parseFloat(local.latitud), parseFloat(local.longitud)]}
                  icon={customIcon}
                  eventHandlers={{
                    click: () => setLocalSeleccionado(local),
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 200 }}>
                      <strong style={{ fontSize: '0.95rem' }}>{local.nombre}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#666', margin: '4px 0' }}>
                        📍 {local.direccion}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>
                        🏟️ {local.total_canchas || 0} canchas · 🕐 {local.hora_apertura?.slice(0,5)} — {local.hora_cierre?.slice(0,5)}
                      </div>
                      <button
                        onClick={() => navigate(`/local/${local.id}`)}
                        style={{
                          marginTop: 8,
                          padding: '6px 14px',
                          background: 'var(--accent-green)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        Ver Local
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Panel lateral: listado de locales */}
          <div className="card" style={{ maxHeight: 600, overflowY: 'auto' }}>
            <div className="card-header">
              <h3>📍 Locales ({locales.length})</h3>
            </div>

            {cargando ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="skeleton-avatar skeleton-pulse" style={{ width: 52, height: 52 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton-pulse" style={{ height: 14, width: '70%', marginBottom: 8 }} />
                      <div className="skeleton-pulse" style={{ height: 12, width: '92%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : locales.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <p>No encontramos locales con ese criterio. Intenta con otro filtro.</p>
              </div>
            ) : (
              locales.map((local) => (
                <div
                  key={local.id}
                  onClick={() => {
                    setLocalSeleccionado(local)
                    if (local.latitud && local.longitud) {
                      setCentro([parseFloat(local.latitud), parseFloat(local.longitud)])
                    }
                  }}
                  style={{
                    padding: '14px',
                    borderBottom: '1px solid rgba(31,143,122,0.15)',
                    cursor: 'pointer',
                    background: localSeleccionado?.id === local.id
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'transparent',
                    transition: 'background 0.2s',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  {local.imagen_portada_url ? (
                    <img
                      src={local.imagen_portada_url}
                      alt={local.nombre}
                      style={{
                        width: 52, height: 52, objectFit: 'cover',
                        borderRadius: 8, flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 52, height: 52,
                      background: 'var(--gradient-button)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.3rem',
                      flexShrink: 0,
                    }}>
                      🏟️
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '0.9rem' }}>{local.nombre}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      📍 {local.direccion}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      🏟️ {local.total_canchas || 0} canchas
                      {local.calificacion_promedio && ` · ⭐ ${local.calificacion_promedio}`}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={(e) => { e.stopPropagation(); navigate(`/local/${local.id}`) }}
                  >
                    Ver
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
