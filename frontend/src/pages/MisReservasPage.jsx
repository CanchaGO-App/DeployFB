import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getReservas } from '../api/reservas'
import Topbar from '../components/Topbar'
import Breadcrumb from '../components/ui/Breadcrumb'

const CLIENT_NAVIGATION_LINKS = [
  { label: 'Explorar', path: '/dashboard/cliente' },
  { label: 'Mis reservas', path: '/dashboard/cliente/reservas' },
  { label: 'Mis favoritos', path: '/dashboard/cliente/favoritos' },
  { label: 'Mis reseñas', path: '/dashboard/cliente/resenas' },
]

export default function MisReservasPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const data = await getReservas(usuario.id)
      setReservas(data.results || data)
    } catch (err) {
      console.error('Error cargando reservas:', err)
    } finally {
      setCargando(false)
    }
  }

  const estadoBadge = (estado) => {
    const clases = {
      confirmada: 'badge badge-confirmada',
      cancelada: 'badge badge-cancelada',
    }
    return <span className={clases[estado] || 'badge'}>{estado}</span>
  }

  if (cargando) {
    return (
      <div className="goalpad-app">
        <div className="goalpad-main">
          <Topbar navigationLinks={CLIENT_NAVIGATION_LINKS} />
          <div className="goalpad-content" style={{ paddingTop: '24px' }}>
            <div className="card" style={{ padding: 16 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton-pulse" style={{ height: 56, marginBottom: 12, borderRadius: '12px' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="goalpad-app">
      <main className="goalpad-main">
        <Topbar navigationLinks={CLIENT_NAVIGATION_LINKS} />

        <div className="goalpad-content">
          <Breadcrumb items={[
            { label: 'Inicio', href: '/dashboard/cliente' },
            { label: 'Mis Reservas', active: true },
          ]} />
          <div className="page-header">
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Mis Reservas</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Consulta el historial y estado de tus reservas de canchas.</p>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            {reservas.length > 0 ? (
              <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Local</th>
                      <th>Cancha</th>
                      <th>Fecha</th>
                      <th>Horario</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservas.map((reserva) => (
                      <tr key={reserva.id}>
                        <td style={{ fontWeight: 600 }}>{reserva.local_nombre}</td>
                        <td>{reserva.cancha_nombre}</td>
                        <td>{reserva.fecha}</td>
                        <td>{reserva.hora_inicio.slice(0,5)} — {reserva.hora_fin.slice(0,5)}</td>
                        <td>{estadoBadge(reserva.estado)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn-secondary btn-sm" 
                              onClick={() => navigate(`/local/${reserva.local}`)}
                            >
                              Ver Local
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>Aún no tienes reservas. Explora las canchas disponibles y reserva tu primer turno.</p>
                <button 
                  className="btn-neon mt-2" 
                  onClick={() => navigate('/dashboard/cliente')}
                  style={{ display: 'inline-flex', marginTop: '16px' }}
                >
                  Explorar canchas
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
