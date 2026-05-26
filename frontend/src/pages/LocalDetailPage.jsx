import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getLocal, getDisponibilidadLocal } from '../api/locales'
import { getReservas, actualizarEstadoReserva } from '../api/reservas'
import { reservarYPagar } from '../api/pagos'
import Topbar from '../components/Topbar'
import { getLocalImg, getCanchaImg } from '../utils/imagenes'
import ResenasModal from '../components/ResenasModal'
import CustomAlertModal from '../components/CustomAlertModal'
import ModalWrapper from '../components/ui/ModalWrapper'
import Breadcrumb from '../components/ui/Breadcrumb'
import { 
  MdErrorOutline, 
  MdBusiness, 
  MdStar, 
  MdLocationOn, 
  MdSportsSoccer, 
  MdOutlineNotes, 
  MdEventAvailable, 
  MdReceipt 
} from 'react-icons/md'

const CLIENT_NAVIGATION_LINKS = [
  { label: 'Explorar', path: '/dashboard/cliente' },
  { label: 'Mis reservas', path: '/dashboard/cliente/reservas' },
  { label: 'Mis favoritos', path: '/dashboard/cliente/favoritos' },
  { label: 'Mis reseñas', path: '/dashboard/cliente/resenas' },
]

export default function LocalDetailPage() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [local, setLocal] = useState(null)
  const [disponibilidad, setDisponibilidad] = useState(null)
  const [misReservas, setMisReservas] = useState([])
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const hoy = new Date()
    return hoy.toISOString().split('T')[0]
  })
  const [cargando, setCargando] = useState(true)
  const [reservando, setReservando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [resenaCanchaSeleccionada, setResenaCanchaSeleccionada] = useState(null)
  const [reservaConfirmar, setReservaConfirmar] = useState(null)
  const [pagoModal, setPagoModal] = useState(null) // { canchaId, hora, canchaInfo }
  const [comprobanteFile, setComprobanteFile] = useState(null)
  const [pagando, setPagando] = useState(false)
  const [qrZoom, setQrZoom] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMsg, setConfirmMsg] = useState('')
  const [confirmButtonText, setConfirmButtonText] = useState('Sí, cancelar')
  const [confirmTheme, setConfirmTheme] = useState('red')
  const [reservaIdACancelar, setReservaIdACancelar] = useState(null)

  useEffect(() => {
    cargarLocal()
  }, [id])

  useEffect(() => {
    if (local) {
      cargarDisponibilidad()
      if (usuario?.id) cargarMisReservas()
    }
  }, [fechaSeleccionada, local, usuario])

  async function cargarLocal() {
    try {
      const data = await getLocal(id)
      setLocal(data)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  async function cargarMisReservas() {
    try {
      const data = await getReservas(usuario.id)
      const misRes = (data.results || data).filter(r => 
        r.local === parseInt(id) && 
        r.fecha === fechaSeleccionada &&
        r.estado !== 'cancelada'
      )
      setMisReservas(misRes)
    } catch (err) {
      console.error(err)
    }
  }

  async function cargarDisponibilidad() {
    try {
      const data = await getDisponibilidadLocal(id, fechaSeleccionada)
      setDisponibilidad(data)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleReservar(canchaId, hora) {
    if (!usuario) {
      navigate('/login')
      return
    }
    const slotDate = new Date(`${fechaSeleccionada}T${hora}`)
    const now = new Date()
    if (slotDate < now) {
      setError('No se pueden reservar turnos en fechas u horarios pasados.')
      return
    }
    setError('')
    setMensaje('')
    const canchaInfo = disponibilidad.canchas.find(c => c.cancha_id === canchaId)
    setReservaConfirmar(null)
    setPagoModal({ canchaId, hora, canchaInfo })
  }

  async function handlePagar() {
    if (!comprobanteFile) {
      setError('Es obligatorio llenar ese campo para poder realizar la reserva')
      return
    }
    setError('')
    setPagando(true)
    try {
      const horaFin = `${String(parseInt(pagoModal.hora.split(':')[0]) + 1).padStart(2, '0')}:00`
      await reservarYPagar({
        cliente_id: usuario.id,
        cancha_id: pagoModal.canchaId,
        fecha: fechaSeleccionada,
        hora_inicio: pagoModal.hora,
        hora_fin: horaFin,
        comprobante: comprobanteFile,
      })
      setPagoModal(null)
      setComprobanteFile(null)
      setMensaje('✅ Solicitud de reserva enviada. Espera a que el dueño confirme el pago.')
      cargarDisponibilidad()
      cargarMisReservas()
    } catch (err) {
      setError(err.message)
    } finally {
      setPagando(false)
    }
  }

  function handleCancelarReserva(reservaId) {
    setReservaIdACancelar(reservaId)
    setConfirmTitle('¿Cancelar reserva?')
    setConfirmMsg('Esta acción cancelará tu reserva y liberará el horario para otros usuarios.')
    setConfirmButtonText('Sí, cancelar')
    setConfirmTheme('red')
    setConfirmOpen(true)
  }

  async function procederCancelar() {
    if (!reservaIdACancelar) return
    try {
      await actualizarEstadoReserva(reservaIdACancelar, 'cancelada')
      setMensaje('❌ Reserva cancelada')
      cargarDisponibilidad()
      cargarMisReservas()
      setTimeout(() => setMensaje(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirmOpen(false)
      setReservaIdACancelar(null)
    }
  }

  async function handleToggleReserva(canchaId, hora, slotOcupado) {
    if (!usuario) {
      navigate('/login')
      return
    }
    const slotDate = new Date(`${fechaSeleccionada}T${hora}`)
    const now = new Date()
    if (slotDate < now) {
      setError('No se pueden reservar turnos en fechas u horarios pasados.')
      return
    }
    if (slotOcupado) {
      return
    }
    const canchaInfo = disponibilidad.canchas.find(c => c.cancha_id === canchaId)
    setReservaConfirmar({ canchaId, hora, canchaInfo })
  }

  async function handleCancelarReservaSinConfirmar(reservaId) {
    setError('')
    setMensaje('')
    setReservando(true)
    try {
      await actualizarEstadoReserva(reservaId, 'cancelada')
      setMensaje('❌ Reserva cancelada')
      cargarDisponibilidad()
      cargarMisReservas()
      setTimeout(() => setMensaje(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setReservando(false)
    }
  }

  function getMiReserva(canchaId, hora) {
    return misReservas.find(r => 
      r.cancha ===canchaId && 
      r.hora_inicio === hora &&
      r.estado !== 'cancelada'
    )
  }

  if (cargando) {
    return (
      <div className="goalpad-app">
        <main className="goalpad-main">
          <Topbar navigationLinks={CLIENT_NAVIGATION_LINKS} />
          <div className="goalpad-content" style={{ paddingTop: '24px' }}>
            <div className="skeleton-pulse skeleton-image" style={{ maxWidth: '350px', height: '250px', marginBottom: '24px' }} />
            <div className="skeleton-pulse skeleton-text-lg" style={{ height: '40px', maxWidth: '520px', marginBottom: '12px' }} />
            <div className="skeleton-pulse skeleton-text" style={{ maxWidth: '320px', marginBottom: '24px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div className="card" style={{ padding: '16px' }}><div className="skeleton-pulse skeleton-card" style={{ height: '150px' }} /></div>
              <div className="card" style={{ padding: '16px' }}><div className="skeleton-pulse skeleton-card" style={{ height: '150px' }} /></div>
            </div>
            <div className="card" style={{ padding: '16px' }}>
              <div className="skeleton-pulse" style={{ height: '22px', width: '240px', marginBottom: '16px' }} />
              <div className="availability-mobile-scroll">
                {[1, 2, 3].map((row) => (
                  <div key={row} className="skeleton-pulse" style={{ height: '56px', marginBottom: '12px', borderRadius: '12px' }} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!local) {
    return (
      <div className="goalpad-app">
        <main className="goalpad-main">
          <Topbar navigationLinks={CLIENT_NAVIGATION_LINKS} />
          <div className="goalpad-content">
            <div className="empty-state">
              <div className="empty-icon"><MdErrorOutline /></div>
              <p>Local no encontrado</p>
              <button className="btn-neon mt-2" onClick={() => navigate('/dashboard/cliente')}>Volver</button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Generar horas basadas en apertura/cierre del local
  const horaApertura = disponibilidad ? parseInt(disponibilidad.hora_apertura.split(':')[0]) : 7
  const horaCierre = disponibilidad ? parseInt(disponibilidad.hora_cierre.split(':')[0]) : 22
  const HORAS = Array.from({ length: horaCierre - horaApertura }, (_, i) => {
    const h = i + horaApertura
    return `${h.toString().padStart(2, '0')}:00`
  })

  function getSlotOcupado(hora, slots) {
    for (const slot of slots) {
      if (hora >= slot.hora_inicio && hora < slot.hora_fin) {
        return slot
      }
    }
    return null
  }

  // Navegación de fechas
  function cambiarFecha(dias) {
    const fecha = new Date(fechaSeleccionada)
    fecha.setDate(fecha.getDate() + dias)
    setFechaSeleccionada(fecha.toISOString().split('T')[0])
  }

  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const fechaObj = new Date(fechaSeleccionada + 'T12:00:00')
  const nombreDia = diasSemana[fechaObj.getDay()]

  const rating = local.calificacion_promedio !== null && local.calificacion_promedio !== undefined ? local.calificacion_promedio : '--'
  const reviews = local.total_resenas || 0

  return (
    <div className="goalpad-app">
      <main className="goalpad-main">
        <Topbar navigationLinks={CLIENT_NAVIGATION_LINKS} />
        
        <div className="goalpad-content">
          <Breadcrumb items={[
            { label: 'Inicio', href: `/dashboard/${usuario?.rol || 'cliente'}` },
            { label: local.nombre, active: true },
          ]} />

          {usuario?.rol === 'dueno' && (
            <div style={{
              background: 'rgba(31, 143, 122, 0.1)',
              border: '1px solid rgba(31, 143, 122, 0.3)',
              color: '#e8fff5',
              padding: '16px 24px',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 20px rgba(31, 143, 122, 0.08)'
            }}>
              <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>🏢</span>
              <div>
                <strong style={{ display: 'block', fontSize: '1.05rem', color: 'var(--accent-green)', marginBottom: '4px' }}>
                  Vista de Competencia (Solo Lectura)
                </strong>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Como dueño de cancha, puedes explorar los detalles de este local, sus características, valoraciones e historial de opiniones. La reserva de turnos y calificación está inhabilitada.
                </span>
              </div>
            </div>
          )}

          {/* Hero del Local */}
          <div style={{ display: 'flex', gap: '32px', marginBottom: '48px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ position: 'relative', width: '350px', height: '250px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', flexShrink: 0, boxShadow: 'var(--shadow-card)' }}>
              {getLocalImg(local) ? (
                // API (fallback): local.imagen_portada_url ? (
                <img src={getLocalImg(local)} alt={local.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                // API (fallback): src={local.imagen_portada_url}
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--gradient-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', color: '#fff' }}>
                  <MdBusiness />
                </div>
              )}
              <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(11, 14, 20, 0.8)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: '20px', color: '#fff', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MdStar style={{ color: 'var(--accent-yellow)' }} /> {rating} ({reviews})
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '300px' }}>
              <h1 style={{ fontSize: '2.5rem', margin: '0 0 16px 0', color: 'var(--text-pure)' }}>{local.nombre}</h1>
              <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MdLocationOn style={{ fontSize: '1.3rem' }} /> {local.direccion}
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px', fontSize: '0.95rem' }}>
                {local.descripcion || 'El mejor lugar para disfrutar de tu deporte favorito con instalaciones de primer nivel. Haz tu reserva online y asegura tu lugar en la cancha.'}
              </p>

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', flex: 1, minWidth: '150px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Horario de Atención</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-pure)' }}>
                    {local.hora_apertura?.slice(0,5)} — {local.hora_cierre?.slice(0,5)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', flex: 1, minWidth: '150px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Canchas Totales</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-pure)' }}>
                    {local.canchas?.length || 0} disponibles
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Listado de Canchas */}
          {local.canchas && local.canchas.length > 0 && (
            <div style={{ marginBottom: '48px' }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', color: 'var(--text-pure)' }}>Nuestras Canchas</h2>
              <div className="canchas-grid">
                {local.canchas.map((cancha) => {
                  const canchaRating = cancha.calificacion_promedio !== null && cancha.calificacion_promedio !== undefined ? cancha.calificacion_promedio : '--'
                  const canchaReviews = cancha.total_resenas || 0

                  return (
                    <div key={cancha.id} style={{ 
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', 
                      borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column',
                      transition: 'all 0.3s ease'
                    }}>
                      {getCanchaImg(cancha) ? (
                        // API (fallback): cancha.imagen_url ? (
                        <img src={getCanchaImg(cancha)} alt={cancha.nombre} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '16px' }} />
                        // API (fallback): src={cancha.imagen_url}
                      ) : (
                        <div style={{ width: '100%', height: '160px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#fff' }}>
                          <MdSportsSoccer />
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-pure)' }}>{cancha.nombre}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                          <MdStar style={{ color: 'var(--accent-yellow)' }} /> {canchaRating} ({canchaReviews})
                        </div>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase' }}>
                        {cancha.tipo}
                      </div>
                      
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px', flex: 1 }}>
                        {cancha.descripcion && <div style={{ marginBottom: '8px', display: 'flex', gap: '6px' }}><MdOutlineNotes style={{ marginTop: '2px' }} /> {cancha.descripcion}</div>}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '16px', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Precio por hora</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-pure)' }}>Bs. {cancha.precio_por_hora}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                            onClick={() => setResenaCanchaSeleccionada(cancha)}
                            title="Ver calificaciones y opiniones de esta cancha"
                          >
                            <MdStar style={{ verticalAlign: 'middle', marginBottom: '2px' }} /> Reseñas
                          </button>
                          <button 
                            className="btn-neon" 
                            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                            onClick={() => {
                              // Scroll smooth to calendar
                              document.getElementById('seccion-reservas').scrollIntoView({ behavior: 'smooth' })
                            }}
                          >
                            Horarios
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Selector de fecha y Grilla */}
          <div id="seccion-reservas" style={{ scrollMarginTop: '100px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border-light)' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', color: 'var(--text-pure)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MdEventAvailable style={{ color: 'var(--accent-green)' }} /> Disponibilidad y Reservas</span>
              
              {/* Controles de Fecha integrados al header de la sección */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', padding: '6px', borderRadius: '30px', border: '1px solid var(--border-light)' }}>
                <button className="btn-secondary" style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', border: 'none', background: 'transparent' }} onClick={() => cambiarFecha(-1)}>
                  ←
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <input
                    type="date"
                    className="search-value"
                    value={fechaSeleccionada}
                    onChange={(e) => setFechaSeleccionada(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-pure)', padding: '0 8px', fontSize: '0.95rem', fontWeight: 600, outline: 'none' }}
                  />
                </div>
                <button className="btn-secondary" style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', border: 'none', background: 'transparent' }} onClick={() => cambiarFecha(1)}>
                  →
                </button>
              </div>
            </h2>

            {mensaje && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--accent-green)', padding: '12px 16px', borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                {mensaje}
              </div>
            )}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--accent-red)', padding: '12px 16px', borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem', marginBottom: '24px'
              }}>
                {error}
              </div>
            )}

            {!disponibilidad || !disponibilidad.canchas?.length ? (
              <div className="empty-state" style={{ background: 'transparent', border: '1px dashed var(--border-light)' }}>
                <div className="empty-icon"><MdBusiness /></div>
                <p>Este local aún no tiene canchas registradas</p>
              </div>
            ) : (
              <div className="availability-mobile-scroll" style={{ paddingBottom: '16px' }}>
                <table className="data-table" style={{ fontSize: '0.8rem', minWidth: '100%', background: 'transparent', border: 'none' }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, background: 'var(--bg-elevated)', zIndex: 2, minWidth: '180px', borderBottom: '2px solid var(--border-light)' }}>
                        Cancha
                      </th>
                      {HORAS.map((h) => (
                        <th key={h} style={{ textAlign: 'center', minWidth: '80px', borderBottom: '2px solid var(--border-light)', padding: '12px 8px' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {disponibilidad.canchas.map((cancha) => (
                      <tr key={cancha.cancha_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td data-label="Cancha" style={{
                          position: 'sticky', left: 0, background: 'var(--bg-elevated)', zIndex: 1, padding: '16px'
                        }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-pure)', marginBottom: '4px', fontSize: '0.9rem' }}>{cancha.cancha_nombre}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>
                            Bs. {cancha.precio_por_hora}/h
                          </div>
                        </td>
                        {HORAS.map((hora) => {
                          const slotOcupado = getSlotOcupado(hora, cancha.slots_ocupados)
                          const estado = slotOcupado ? slotOcupado.estado : null
                          const esMia = slotOcupado && slotOcupado.cliente_id === usuario?.id

                          const slotDate = new Date(`${fechaSeleccionada}T${hora}`)
                          const now = new Date()
                          const esPasado = slotDate < now

                          let bg = 'transparent'
                          let color = 'var(--text-muted)'
                          let border = '1px solid var(--border-light)'
                          let text = 'Libre'
                          let clickable = !esPasado
                          if (estado === 'confirmada') {
                            if (esMia) {
                              bg = 'rgba(16, 185, 129, 0.15)'
                              color = '#FFFFFF'
                              border = '1px solid var(--accent-green)'
                              text = 'Confirmada'
                              clickable = false
                            } else {
                              bg = 'rgba(239, 68, 68, 0.1)'
                              color = 'var(--accent-red)'
                              border = '1px solid rgba(239, 68, 68, 0.2)'
                              text = 'Ocupado'
                              clickable = false
                            }
                          } else if (estado === 'pendiente_pago') {
                            if (esMia) {
                              bg = 'rgba(250, 204, 21, 0.12)'
                              color = '#eab308'
                              border = '1px solid rgba(250, 204, 21, 0.3)'
                              text = 'Pendiente pago'
                              clickable = true
                            } else {
                              bg = 'rgba(239, 68, 68, 0.1)'
                              color = 'var(--accent-red)'
                              border = '1px solid rgba(239, 68, 68, 0.2)'
                              text = 'Ocupado'
                              clickable = false
                            }
                          } else if (esPasado) {
                            bg = 'rgba(255, 255, 255, 0.02)'
                            color = 'rgba(255, 255, 255, 0.15)'
                            border = '1px dashed rgba(255, 255, 255, 0.08)'
                            text = 'No disponible'
                            clickable = false
                          }

                          return (
                            <td
                              key={hora}
                              data-label={hora}
                              onClick={clickable && usuario?.rol === 'cliente' && !reservando ? () => handleToggleReserva(cancha.cancha_id, hora, slotOcupado) : undefined}
                              style={{
                                textAlign: 'center', padding: '8px', cursor: clickable && usuario?.rol === 'cliente' ? 'pointer' : 'default',
                              }}
                                  title={
                                    clickable && usuario?.rol === 'cliente'
                                      ? `Reservar ${cancha.cancha_nombre} a las ${hora} por Bs. ${cancha.precio_por_hora}`
                                      : estado === 'confirmada' && esMia
                                        ? 'Tu reserva está confirmada'
                                        : estado === 'pendiente_pago' && esMia
                                          ? 'Pago pendiente de validación'
                                          : 'Horario no disponible'
                                  }
                            >
                              <div
                                className="slot-text"
                                style={{
                                  background: bg, color: color, border: border, borderRadius: '6px',
                                  padding: '8px', fontWeight: 600, transition: 'all 0.2s ease',
                                  opacity: reservando ? 0.5 : 1
                                }}
                                onMouseOver={(e) => {
                                  if (clickable && usuario?.rol === 'cliente' && !reservando) {
                                    e.currentTarget.style.background = 'var(--accent-green)'
                                    e.currentTarget.style.color = '#FFFFFF'
                                    e.currentTarget.style.border = '1px solid var(--accent-green)'
                                  }
                                }}
                                onMouseOut={(e) => {
                                  if (clickable && usuario?.rol === 'cliente' && !reservando) {
                                    e.currentTarget.style.background = bg
                                    e.currentTarget.style.color = color
                                    e.currentTarget.style.border = border
                                  }
                                }}
                              >
                                {text}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
        </div>
      </main>

      {resenaCanchaSeleccionada && (
        <ResenasModal
          cancha={resenaCanchaSeleccionada}
          usuarioId={usuario?.id}
          usuarioRol={usuario?.rol}
          localDuenoId={local?.dueno}
          onClose={() => {
            setResenaCanchaSeleccionada(null)
            cargarLocal()
          }}
        />
      )}

      {reservaConfirmar && (
        <ModalWrapper
          isOpen={Boolean(reservaConfirmar)}
          onClose={() => setReservaConfirmar(null)}
          title="Recibo de Reserva"
          theme="green"
          size="sm"
          maxWidth="400px"
        >
          <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Local:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-pure)' }}>{local.nombre}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Cancha:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-pure)' }}>{reservaConfirmar.canchaInfo.cancha_nombre}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Fecha:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-pure)' }}>{fechaSeleccionada}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Horario:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-pure)' }}>
                {reservaConfirmar.hora} — {String(parseInt(reservaConfirmar.hora.split(':')[0]) + 1).padStart(2, '0')}:00
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Precio a pagar:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: '1.2rem' }}>
                Bs. {reservaConfirmar.canchaInfo.precio_por_hora}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-secondary" 
              style={{ flex: 1 }} 
              onClick={() => setReservaConfirmar(null)}
              disabled={reservando}
            >
              Cancelar
            </button>
            <button 
              className="btn-neon" 
              style={{ flex: 1 }} 
              onClick={async () => {
                await handleReservar(reservaConfirmar.canchaId, reservaConfirmar.hora)
                setReservaConfirmar(null)
              }}
              disabled={reservando}
              title="Confirmar la reserva y continuar con el pago"
            >
              {reservando ? 'Confirmando...' : 'Confirmar Reserva'}
            </button>
          </div>
        </ModalWrapper>
      )}

      {pagoModal && (
        <ModalWrapper
          isOpen={Boolean(pagoModal)}
          onClose={() => { setPagoModal(null); setComprobanteFile(null); setQrZoom(false) }}
          title="Pago con QR"
          theme="blue"
          size="md"
          maxWidth="420px"
        >
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Escanea el código QR y realiza el pago, luego sube el comprobante.
          </p>
          {local.qr_code_url && (
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img
                src={local.qr_code_url}
                alt="QR de pago"
                onClick={() => setQrZoom(true)}
                style={{ width: 280, height: 280, objectFit: 'contain', borderRadius: 8, cursor: 'pointer' }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Haz clic en el QR para ampliarlo
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Comprobante de pago</label>
            <input
              type="file"
              accept="image/*"
              className="form-input"
              style={{ padding: 8 }}
              onChange={(e) => setComprobanteFile(e.target.files[0])}
            />
          </div>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--accent-red)', padding: '12px 16px', borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem', marginTop: '8px', marginBottom: '16px', textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          {pagoModal.canchaInfo && (
            <p style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent-green)' }}>
              Monto: Bs. {pagoModal.canchaInfo.precio_por_hora}
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => { setPagoModal(null); setComprobanteFile(null); setQrZoom(false); setError(''); }}
            >
              Cancelar
            </button>
            <button
              className="btn-neon"
              style={{ flex: 1 }}
              onClick={handlePagar}
              disabled={pagando}
              title="Enviar el comprobante para que el dueño confirme tu reserva"
            >
              {pagando ? 'Enviando...' : 'Pago Realizado'}
            </button>
          </div>
        </ModalWrapper>
      )}

      {qrZoom && local.qr_code_url && (
        <ModalWrapper
          isOpen={qrZoom}
          onClose={() => setQrZoom(false)}
          showCloseButton
          closeOnOverlay
          size="fullscreen"
          theme="default"
          maxWidth="min(92vw, 900px)"
        >
          <div style={{ textAlign: 'center' }}>
            <img
              src={local.qr_code_url}
              alt="QR ampliado"
              style={{ maxWidth: '90vw', maxHeight: '75vh', borderRadius: 12, objectFit: 'contain' }}
            />
            <div style={{ marginTop: 16, color: 'var(--text-pure)', fontSize: '0.9rem' }}>
              Toca fuera o presiona Escape para volver
            </div>
          </div>
        </ModalWrapper>
      )}
      <CustomAlertModal
        isOpen={confirmOpen}
        title={confirmTitle}
        message={confirmMsg}
        type="confirm"
        confirmText={confirmButtonText}
        cancelText="Volver"
        theme={confirmTheme}
        onConfirm={procederCancelar}
        onCancel={() => { setConfirmOpen(false); setReservaIdACancelar(null) }}
      />
    </div>
  )
}
