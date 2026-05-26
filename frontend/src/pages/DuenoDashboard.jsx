import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useLocation, useNavigate } from 'react-router-dom'

// Fix default Leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})
import { useAuth } from '../context/AuthContext'
import { getDuenoEstadisticas } from '../api/estadisticas'
import { getLocales, crearLocal, editarLocal, eliminarLocal } from '../api/locales'
import { getCanchas, crearCancha, editarCancha, eliminarCancha } from '../api/canchas'
import { getReservas, reembolsarReserva } from '../api/reservas'
import { getPagosPendientes, confirmarPago, rechazarPago } from '../api/pagos'
import Topbar from '../components/Topbar'
import StatCard from '../components/StatCard'
import CustomAlertModal from '../components/CustomAlertModal'
import { getLocalImg, getCanchaImg } from '../utils/imagenes'
import ModalWrapper from '../components/ui/ModalWrapper'
import { 
  MdBarChart, 
  MdBusiness, 
  MdSportsSoccer, 
  MdListAlt, 
  MdCalendarToday, 
  MdDateRange, 
  MdAttachMoney, 
  MdAccountBalanceWallet,
  MdEmojiEvents, 
  MdTrendingUp, 
  MdPieChart, 
  MdStar, 
  MdEdit, 
  MdAdd, 
  MdPayment,
  MdDelete, 
  MdWarning, 
  MdLocationOn, 
  MdAccessTime, 
  MdSearch, 
  MdClear,
} from 'react-icons/md'

const PIE_COLORS = ['var(--accent-green)', '#f97316']

const DUENO_NAVIGATION_LINKS = [
  { label: 'Panel de Gestión', path: '/dashboard/dueno' },
  { label: 'Explorar Mapa', path: '/explorar' },
  { label: 'Mi Perfil', path: '/perfil' },
]

const DUENO_SECTIONS = new Set(['resumen', 'locales', 'canchas', 'reservas', 'pagos'])

const TIPOS_CANCHA = [
  { value: 'futbol5', label: 'Fútbol 5' },
  { value: 'futbol7', label: 'Fútbol 7' },
  { value: 'futbol11', label: 'Fútbol 11' },
  { value: 'wally', label: 'Wally' },
  { value: 'padel', label: 'Pádel' },
]

function LocationMarker({ formLocal, setFormLocal }) {
  useMapEvents({
    click(e) {
      setFormLocal(prev => ({
        ...prev,
        latitud: e.latlng.lat,
        longitud: e.latlng.lng
      }))
    },
  })

  return formLocal.latitud && formLocal.longitud ? (
    <Marker position={[formLocal.latitud, formLocal.longitud]}></Marker>
  ) : null
}

export default function DuenoDashboard() {
  const { usuario } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [locales, setLocales] = useState([])
  const [todosLosLocales, setTodosLosLocales] = useState([])
  const [buscarDuenoText, setBuscarDuenoText] = useState('')
  
  const todosLosLocalesFiltrados = todosLosLocales.filter(local =>
    local.nombre.toLowerCase().includes(buscarDuenoText.toLowerCase())
  )
  const [canchas, setCanchas] = useState([])
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [tab, setTab] = useState('resumen')

  useEffect(() => {
    const section = new URLSearchParams(location.search).get('section')
    if (section && DUENO_SECTIONS.has(section) && section !== tab) {
      setTab(section)
    }
  }, [location.search, tab])

  // Formulario Local
  const [formLocal, setFormLocal] = useState({
    nombre: '', direccion: '', descripcion: '',
    hora_apertura: '07:00', hora_cierre: '22:00',
    latitud: '-17.7833', longitud: '-63.1821',
    telefonos: [''],
  })
  const [imgLocal, setImgLocal] = useState(null)
  const [imgLocalPreview, setImgLocalPreview] = useState(null)
  const [qrFile, setQrFile] = useState(null)
  const [qrFilePreview, setQrFilePreview] = useState(null)

  // Formulario Cancha
  const [formCancha, setFormCancha] = useState({
    nombre: '', descripcion: '', precio_por_hora: '',
    tipo: 'futbol5', capacidad: '10', local: '',
  })
  const [imagenFile, setImagenFile] = useState(null)
  const [imagenPreview, setImagenPreview] = useState(null)

  // Estados de Alerta Personalizada
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMsg, setAlertMsg] = useState('')
  const [alertTheme, setAlertTheme] = useState('green')

  // Estados para Edición
  const [editingLocalId, setEditingLocalId] = useState(null)
  const [editingCanchaId, setEditingCanchaId] = useState(null)

  // Estados para Filtrar Reservas
  const [filtroLocal, setFiltroLocal] = useState('')
  const [filtroCancha, setFiltroCancha] = useState('')
  const [filtroLocalCanchas, setFiltroLocalCanchas] = useState('')

  // Estados de Confirmación Personalizada
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMsg, setConfirmMsg] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmButtonText, setConfirmButtonText] = useState('Eliminar')

  // Pagos pendientes
  const [pagosPendientes, setPagosPendientes] = useState([])
  const [pagosCargando, setPagosCargando] = useState(false)
  const [zoomComprobante, setZoomComprobante] = useState(null)

  function solicitarConfirmacion(title, msg, action, confirmText = 'Eliminar') {
    setConfirmTitle(title)
    setConfirmMsg(msg)
    setConfirmAction(() => action)
    setConfirmButtonText(confirmText)
    setConfirmOpen(true)
  }

  function mostrarAlerta(title, msg, theme = 'green') {
    setAlertTitle(title)
    setAlertMsg(msg)
    setAlertTheme(theme)
    setAlertOpen(true)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const [statsData, localesData, canchasData, reservasData, todosLocalesData, pagosData] = await Promise.all([
        getDuenoEstadisticas(usuario.id),
        getLocales(usuario.id),
        getCanchas(usuario.id),
        getReservas(null, usuario.id),
        getLocales(null),
        getPagosPendientes(usuario.id),
      ])
      setStats(statsData)
      setLocales(localesData.results || localesData)
      setCanchas(canchasData.results || canchasData)
      setReservas(reservasData.results || reservasData)
      setTodosLosLocales(todosLocalesData.results || todosLocalesData)
      setPagosPendientes(pagosData)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setCargando(false)
    }
  }

  // ---- Handlers Local ----
  function handleImgLocalChange(e) {
    const file = e.target.files[0]
    if (file) {
      setImgLocal(file)
      setImgLocalPreview(URL.createObjectURL(file))
    }
  }

  function handleIniciarEditLocal(local) {
    setEditingLocalId(local.id)
    setFormLocal({
      nombre: local.nombre,
      direccion: local.direccion,
      descripcion: local.descripcion || '',
      hora_apertura: local.hora_apertura || '07:00',
      hora_cierre: local.hora_cierre || '22:00',
      latitud: local.latitud ? String(local.latitud) : '-17.7833',
      longitud: local.longitud ? String(local.longitud) : '-63.1821',
      telefonos: local.telefonos?.length ? local.telefonos : [''],
      qr_expiry: local.qr_expiry || '',
    })
    setImgLocal(null)
    setImgLocalPreview(local.imagen_portada_url || null)
    setQrFile(null)
    setQrFilePreview(local.qr_code_url || null)
    setTab('locales')
  }

  function handleCancelarEditLocal() {
    setEditingLocalId(null)
    setFormLocal({ nombre: '', direccion: '', descripcion: '', hora_apertura: '07:00', hora_cierre: '22:00', latitud: '-17.7833', longitud: '-63.1821', telefonos: [''] })
    setImgLocal(null)
    setImgLocalPreview(null)
    setQrFile(null)
    setQrFilePreview(null)
  }

  async function handleEliminarLocal(localId) {
    try {
      await eliminarLocal(localId)
      mostrarAlerta('¡Éxito!', 'Local eliminado correctamente', 'green')
      if (editingLocalId === localId) {
        handleCancelarEditLocal()
      }
      cargarDatos()
    } catch (err) {
      mostrarAlerta('Error', err.message, 'red')
    }
  }

  function handleTelefonoChange(index, value) {
    const nuevos = [...formLocal.telefonos]
    nuevos[index] = value
    setFormLocal({ ...formLocal, telefonos: nuevos })
  }

  function agregarTelefono() {
    setFormLocal({ ...formLocal, telefonos: [...formLocal.telefonos, ''] })
  }

  function quitarTelefono(index) {
    const nuevos = formLocal.telefonos.filter((_, i) => i !== index)
    setFormLocal({ ...formLocal, telefonos: nuevos.length ? nuevos : [''] })
  }

  function handleQrChange(e) {
    const file = e.target.files[0]
    if (file) {
      setQrFile(file)
      setQrFilePreview(URL.createObjectURL(file))
    }
  }

  async function handleCrearLocal(e) {
    e.preventDefault()
    try {
      const formData = new FormData()
      formData.append('nombre', formLocal.nombre)
      formData.append('direccion', formLocal.direccion)
      formData.append('descripcion', formLocal.descripcion)
      formData.append('hora_apertura', formLocal.hora_apertura)
      formData.append('hora_cierre', formLocal.hora_cierre)
      formData.append('dueno', usuario.id)
      
      formData.append('latitud', parseFloat(formLocal.latitud).toFixed(6))
      formData.append('longitud', parseFloat(formLocal.longitud).toFixed(6))
      formData.append('telefonos', JSON.stringify(formLocal.telefonos.filter(t => t.trim())))
      if (imgLocal) formData.append('imagen_portada', imgLocal)
      if (qrFile) formData.append('qr_code', qrFile)
      if (formLocal.qr_expiry) formData.append('qr_expiry', formLocal.qr_expiry)

      if (editingLocalId) {
        await editarLocal(editingLocalId, formData)
        mostrarAlerta('¡Éxito!', 'Local actualizado correctamente', 'green')
      } else {
        await crearLocal(formData)
        mostrarAlerta('¡Éxito!', 'Local creado correctamente', 'green')
      }
      
      handleCancelarEditLocal()
      cargarDatos()
    } catch (err) {
      mostrarAlerta('Error', err.message, 'red')
    }
  }

  // ---- Handlers Cancha ----
  function handleImagenChange(e) {
    const file = e.target.files[0]
    if (file) {
      setImagenFile(file)
      setImagenPreview(URL.createObjectURL(file))
    }
  }

  function handleIniciarEditCancha(cancha) {
    setEditingCanchaId(cancha.id)
    setFormCancha({
      nombre: cancha.nombre,
      descripcion: cancha.descripcion || '',
      precio_por_hora: cancha.precio_por_hora,
      tipo: cancha.tipo,
      capacidad: String(cancha.capacidad),
      local: cancha.local,
    })
    setImagenFile(null)
    setImagenPreview(cancha.imagen_url || null)
    setTab('canchas')
  }

  function handleCancelarEditCancha() {
    setEditingCanchaId(null)
    setFormCancha({ nombre: '', descripcion: '', precio_por_hora: '', tipo: 'futbol5', capacidad: '10', local: '' })
    setImagenFile(null)
    setImagenPreview(null)
  }

  async function handleEliminarCancha(canchaId) {
    try {
      await eliminarCancha(canchaId)
      mostrarAlerta('¡Éxito!', 'Cancha eliminada correctamente', 'green')
      if (editingCanchaId === canchaId) {
        handleCancelarEditCancha()
      }
      cargarDatos()
    } catch (err) {
      mostrarAlerta('Error', err.message, 'red')
    }
  }

  async function handleCrearCancha(e) {
    e.preventDefault()
    if (!formCancha.local) {
      mostrarAlerta('Advertencia', 'Selecciona un Local primero', 'amber')
      return
    }
    try {
      const formData = new FormData()
      formData.append('nombre', formCancha.nombre)
      formData.append('descripcion', formCancha.descripcion)
      formData.append('precio_por_hora', formCancha.precio_por_hora)
      formData.append('tipo', formCancha.tipo)
      formData.append('capacidad', formCancha.capacidad)
      formData.append('local', formCancha.local)
      if (imagenFile) formData.append('imagen', imagenFile)

      if (editingCanchaId) {
        await editarCancha(editingCanchaId, formData)
        mostrarAlerta('¡Éxito!', 'Cancha actualizada correctamente', 'green')
      } else {
        await crearCancha(formData)
        mostrarAlerta('¡Éxito!', 'Cancha creada correctamente', 'green')
      }

      handleCancelarEditCancha()
      cargarDatos()
    } catch (err) {
      mostrarAlerta('Error', err.message, 'red')
    }
  }

  function horasReserva(horaInicio, horaFin) {
    const parse = (h) => {
      const [hh, mm] = String(h).slice(0, 5).split(':').map(Number)
      return hh + (mm || 0) / 60
    }
    return Math.max(parse(horaFin) - parse(horaInicio), 0)
  }

  function esReservaReembolsable(reserva) {
    if (reserva.estado !== 'confirmada') return false
    const inicio = new Date(`${reserva.fecha}T${String(reserva.hora_inicio).slice(0, 5)}`)
    return inicio > new Date()
  }

  function solicitarReembolso(reserva) {
    const cancha = canchas.find((c) => c.id === reserva.cancha)
    const precio = parseFloat(cancha?.precio_por_hora || 0)
    const horas = horasReserva(reserva.hora_inicio, reserva.hora_fin)
    const monto = precio * horas

    solicitarConfirmacion(
      '¿Reembolsar reserva?',
      `Se cancelará la reserva de ${reserva.cliente_nombre} en ${reserva.cancha_nombre} (${reserva.fecha}, ${String(reserva.hora_inicio).slice(0, 5)} – ${String(reserva.hora_fin).slice(0, 5)}). Monto a reembolsar: Bs. ${monto.toFixed(2)}. El horario quedará disponible.`,
      () => handleReembolsar(reserva.id),
      'Reembolsar',
    )
  }

  async function handleReembolsar(id) {
    try {
      await reembolsarReserva(id, usuario.id)
      mostrarAlerta('¡Éxito!', 'Reserva reembolsada correctamente', 'green')
      cargarDatos()
    } catch (err) {
      mostrarAlerta('Error', err.message, 'red')
    }
  }

  const estadoBadge = (estado) => {
    const clases = {
      confirmada: 'badge badge-confirmada',
      cancelada: 'badge badge-cancelada',
    }
    return <span className={clases[estado] || 'badge'}>{estado}</span>
  }

  if (cargando || !stats) {
    return (
      <>
        <Topbar navigationLinks={DUENO_NAVIGATION_LINKS} />
        <div className="page" style={{ paddingTop: 24 }}>
          <div className="stats-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card">
                <div className="skeleton-avatar skeleton-pulse" />
                <div style={{ flex: 1 }}>
                  <div className="skeleton-pulse" style={{ height: 16, width: '55%', marginBottom: 10 }} />
                  <div className="skeleton-pulse" style={{ height: 30, width: '80%' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="dashboard-grid">
            <div className="card"><div className="skeleton-pulse" style={{ height: 260, width: '100%' }} /></div>
            <div className="card"><div className="skeleton-pulse" style={{ height: 260, width: '100%' }} /></div>
          </div>
          <div className="card"><div className="skeleton-pulse" style={{ height: 320, width: '100%' }} /></div>
        </div>
      </>
    )
  }

  // Filtrar reservas por Cancha y por Local
  const reservasFiltradas = reservas.filter(r => {
    const canchaDeReserva = canchas.find(c => c.id === r.cancha)
    const coincideLocal = !filtroLocal || (canchaDeReserva && String(canchaDeReserva.local) === String(filtroLocal))
    const coincideCancha = !filtroCancha || String(r.cancha) === String(filtroCancha)
    return coincideLocal && coincideCancha
  })

  const pieData = [
    { name: 'Confirmadas', value: stats.por_estado.confirmada },
    { name: 'Canceladas', value: stats.por_estado.cancelada },
  ].filter(d => d.value > 0)

  const tabs = [
    { key: 'resumen', label: <><MdBarChart style={{ verticalAlign: 'middle' }} /> Resumen</> },
    { key: 'locales', label: <><MdBusiness style={{ verticalAlign: 'middle' }} /> Mis Locales</> },
    { key: 'canchas', label: <><MdSportsSoccer style={{ verticalAlign: 'middle' }} /> Canchas</> },
    { key: 'reservas', label: <><MdListAlt style={{ verticalAlign: 'middle' }} /> Reservas</> },
    { key: 'pagos', label: <><MdPayment style={{ verticalAlign: 'middle' }} /> Pagos Pendientes</> },
  ]

  return (
    <>
      <Topbar navigationLinks={DUENO_NAVIGATION_LINKS} />
      <div className="page">
        <div className="page-header">
          <h1><MdBarChart /> Panel de Gestión</h1>
          <p>Gestiona tus locales, canchas y visualiza el rendimiento</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => navigate(`/dashboard/dueno?section=${t.key}`)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ===== TAB: RESUMEN ===== */}
        {tab === 'resumen' && (
          <>
            <h2 className="mb-2">Reservas</h2>
            <div className="stats-grid">
              <StatCard icon={<MdListAlt />} value={stats.reservas.hoy} label="Hoy" color="green" />
              <StatCard icon={<MdListAlt />} value={stats.reservas.semana} label="Esta semana" color="blue" />
              <StatCard icon={<MdListAlt />} value={stats.reservas.mes} label="Este mes" color="yellow" />
              <StatCard icon={<MdListAlt />} value={stats.reservas.ano} label="Este año" color="purple" />
            </div>

            <h2 className="mb-2">Ingresos (Bs.)</h2>
            <div className="stats-grid">
              <StatCard icon={<MdAttachMoney />} value={stats.ingresos.hoy.toLocaleString()} label="Hoy" color="green" />
              <StatCard icon={<MdAttachMoney />} value={stats.ingresos.semana.toLocaleString()} label="Esta semana" color="blue" />
              <StatCard icon={<MdAttachMoney />} value={stats.ingresos.mes.toLocaleString()} label="Este mes" color="yellow" />
              <StatCard icon={<MdAttachMoney />} value={stats.ingresos.ano.toLocaleString()} label="Este año" color="purple" />
            </div>

            <div className="dashboard-grid">
              <div className="card">
                <div className="card-header"><h3><MdTrendingUp /> Reservas — Últimos 30 días</h3></div>
                {stats.reservas_por_dia.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.reservas_por_dia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                      <XAxis dataKey="fecha" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8 }} labelStyle={{ color: 'var(--text-pure)' }} />
                      <Bar dataKey="total" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-green)" />
                          <stop offset="100%" stopColor="var(--accent-blue)" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state"><p>Sin datos aún</p></div>
                )}
              </div>

              <div className="card">
                <div className="card-header"><h3><MdPieChart /> Estado de Reservas</h3></div>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={5} dataKey="value">
                        {pieData.map((_, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0a1f33', border: '1px solid #1f8f7a', borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#9cb8b0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state"><p>Sin reservas aún</p></div>
                )}
              </div>
            </div>

            {/* Sección de Locales Registrados */}
            <div className="card mt-4 mb-4">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><MdBusiness /> Locales Registrados</h3>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => navigate('/explorar')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title="Explorar todos los locales del sistema en el mapa"
                >
                  🗺️ Ver en Mapa
                </button>
              </div>
              
              {todosLosLocales.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏢</div>
                  <p>No hay locales registrados en el sistema</p>
                </div>
              ) : (
                <>
                  <div style={{ padding: '16px 20px 0 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '8px 16px', maxWidth: '350px' }}>
                      <MdSearch style={{ color: 'var(--text-muted)', fontSize: '1.3rem' }} />
                      <input
                        type="text"
                        placeholder="Buscar local por nombre..."
                        value={buscarDuenoText}
                        onChange={(e) => setBuscarDuenoText(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: 'var(--text-pure)',
                          width: '100%',
                          fontSize: '0.95rem'
                        }}
                      />
                    </div>
                  </div>

                  {todosLosLocalesFiltrados.length === 0 ? (
                    <div className="empty-state" style={{ margin: '24px 20px' }}>
                      <div className="empty-icon"><MdSearch /></div>
                      <p>No encontramos locales con ese criterio. Intenta con otro filtro.</p>
                    </div>
                  ) : (
                    <div className="goalpad-canchas-grid mt-3" style={{ padding: '0 20px 20px 20px' }}>
                      {todosLosLocalesFiltrados.map((local) => {
                        const rating = local.calificacion_promedio !== null && local.calificacion_promedio !== undefined ? local.calificacion_promedio : '--'
                        const reviews = local.total_resenas || 0
                        const esPropio = local.dueno === usuario.id

                        return (
                          <div key={local.id} className="cancha-card-premium fade-in">
                            <div className="ccp-image-container" onClick={() => navigate(`/local/${local.id}`)} style={{ cursor: 'pointer' }}>
                              {getLocalImg(local) ? (
                                // API (fallback): local.imagen_portada_url ? (
                                <img src={getLocalImg(local)} alt={local.nombre} className="ccp-image" />
                                // API (fallback): src={local.imagen_portada_url}
                              ) : (
                                <div className="ccp-image" style={{ background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>🏟️</div>
                              )}
                              
                              <div className="ccp-badge">
                                <div className="ccp-rating"><span>★</span> {rating}</div>
                                <div className="ccp-reviews">{reviews} {reviews === 1 ? 'reseña' : 'reseñas'}</div>
                              </div>

                              {esPropio && (
                                <div style={{
                                  position: 'absolute',
                                  top: '12px',
                                  left: '12px',
                                  background: 'var(--accent-green-dark)',
                                  color: '#fff',
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                }}>
                                  Propio
                                </div>
                              )}
                            </div>

                            <div className="ccp-content">
                              <div onClick={() => navigate(`/local/${local.id}`)} style={{ cursor: 'pointer', flex: 1, marginBottom: '20px' }}>
                                <h3 className="ccp-title" style={{ margin: 0 }}>{local.nombre}</h3>
                                <div className="ccp-subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 {local.direccion}</div>
                              </div>

                              <button 
                                className="btn-neon-block" 
                                onClick={() => navigate(`/local/${local.id}`)} 
                                style={{ 
                                  background: 'var(--bg-secondary)', 
                                  border: '1px solid var(--border-primary)', 
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer'
                                }}
                              >
                                👁️ Ver Detalles y Valoraciones
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ===== TAB: LOCALES ===== */}
        {tab === 'locales' && (
          <div className="dashboard-grid">
            <div className="card">
              <div className="card-header">
                <h3>{editingLocalId ? <><MdEdit /> Editar Local</> : <><MdAdd /> Registrar Nuevo Local</>}</h3>
              </div>
              <form onSubmit={handleCrearLocal}>
                <div className="form-group">
                  <label className="form-label">Nombre del Complejo</label>
                  <input className="form-input" placeholder='Ej: "Complejo La Bombonera"' value={formLocal.nombre}
                    onChange={(e) => setFormLocal({ ...formLocal, nombre: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <input className="form-input" placeholder="Av. Principal 123, Ciudad" value={formLocal.direccion}
                    onChange={(e) => setFormLocal({ ...formLocal, direccion: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <input className="form-input" placeholder="Complejo deportivo con estacionamiento y cafetería" value={formLocal.descripcion}
                    onChange={(e) => setFormLocal({ ...formLocal, descripcion: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono(s) del local</label>
                  {formLocal.telefonos.map((tel, index) => (
                    <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <input
                        className="form-input"
                        type="tel"
                        placeholder="Ej: 591-722-123-456"
                        value={tel}
                        onChange={(e) => handleTelefonoChange(index, e.target.value)}
                        style={{ flex: 1 }}
                      />
                      {formLocal.telefonos.length > 1 && (
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => quitarTelefono(index)}>✕</button>
                      )}
                      {index === formLocal.telefonos.length - 1 && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={agregarTelefono}>+</button>
                      )}
                    </div>
                  ))}
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Opcional</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Hora Apertura</label>
                    <input type="time" className="form-input" value={formLocal.hora_apertura}
                      onChange={(e) => setFormLocal({ ...formLocal, hora_apertura: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hora Cierre</label>
                    <input type="time" className="form-input" value={formLocal.hora_cierre}
                      onChange={(e) => setFormLocal({ ...formLocal, hora_cierre: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ubicación en el Mapa</label>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '8px' }}>
                    Haz clic en el mapa para marcar la ubicación exacta de tu complejo deportivo.
                  </p>
                  <div style={{ height: '300px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-light)', zIndex: 1 }}>
                    <MapContainer
                      center={[formLocal.latitud, formLocal.longitud]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationMarker formLocal={formLocal} setFormLocal={setFormLocal} />
                    </MapContainer>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Imagen de portada</label>
                  <input type="file" accept="image/*" className="form-input" onChange={handleImgLocalChange}
                    style={{ padding: 8 }} />
                  {imgLocalPreview && (
                    <img src={imgLocalPreview} alt="Preview"
                      style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Subir Código QR</label>
                  <input type="file" accept="image/*" className="form-input" onChange={handleQrChange}
                    style={{ padding: 8 }} required />
                  {qrFilePreview && (
                    <img src={qrFilePreview} alt="QR Preview"
                      style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 8, marginTop: 8 }} />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha de expiración del QR</label>
                  <input type="date" className="form-input" value={formLocal.qr_expiry || ''}
                    onChange={(e) => setFormLocal({ ...formLocal, qr_expiry: e.target.value })} required />
                </div>

                <button type="submit" className="btn btn-primary btn-block">
                  {editingLocalId ? 'Guardar Cambios' : 'Registrar Local'}
                </button>
                {editingLocalId && (
                  <button type="button" className="btn btn-secondary btn-block mt-2" onClick={handleCancelarEditLocal}>
                    Cancelar Edición
                  </button>
                )}
              </form>
            </div>

            <div className="card">
              <div className="card-header"><h3><MdBusiness /> Mis Locales ({locales.length})</h3></div>
              {locales.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><MdBusiness /></div>
                  <p>Aún no has registrado locales</p>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
                    Registra un complejo deportivo para empezar a agregar canchas
                  </p>
                </div>
              ) : (
                locales.map((l) => (
                  <div key={l.id} style={{
                    padding: '14px',
                    borderBottom: '1px solid rgba(31,143,122,0.15)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                  }}>
                    {getLocalImg(l) && (
                      // API (fallback): l.imagen_portada_url && (
                      <img src={getLocalImg(l)} alt={l.nombre}
                        // API (fallback): src={l.imagen_portada_url}
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <strong>{l.nombre}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}><MdLocationOn /> {l.direccion}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        <MdAccessTime /> {l.hora_apertura?.slice(0,5)} — {l.hora_cierre?.slice(0,5)} · {l.total_canchas || 0} canchas
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        onClick={() => handleIniciarEditLocal(l)}
                      >
                        <MdEdit /> Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        onClick={() => solicitarConfirmacion(
                          '¿Eliminar Complejo?',
                          `¿Estás seguro de que deseas eliminar permanentemente el local "${l.nombre}"? Se perderán todas sus canchas y reservas asociadas.`,
                          () => handleEliminarLocal(l.id)
                        )}
                      >
                        <MdDelete /> Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ===== TAB: CANCHAS ===== */}
        {tab === 'canchas' && (
          <div className="dashboard-grid">
            <div className="card">
              <div className="card-header">
                <h3>{editingCanchaId ? <><MdEdit /> Editar Cancha</> : <><MdAdd /> Agregar Cancha a un Local</>}</h3>
              </div>
              {locales.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><MdWarning /></div>
                  <p>Primero registra un Local</p>
                  <button className="btn btn-primary btn-sm mt-2" onClick={() => setTab('locales')}>
                    Ir a Locales
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCrearCancha}>
                  <div className="form-group">
                    <label className="form-label">Local</label>
                    <select className="form-input" value={formCancha.local}
                      onChange={(e) => setFormCancha({ ...formCancha, local: e.target.value })} required>
                      <option value="">Seleccionar local...</option>
                      {locales.map((l) => (
                        <option key={l.id} value={l.id}>{l.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre de la Cancha</label>
                    <input className="form-input" placeholder='Ej: "Cancha 1 — Fútbol 5"' value={formCancha.nombre}
                      onChange={(e) => setFormCancha({ ...formCancha, nombre: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Descripción</label>
                    <input className="form-input" placeholder="Césped sintético, iluminación LED" value={formCancha.descripcion}
                      onChange={(e) => setFormCancha({ ...formCancha, descripcion: e.target.value })} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Tipo</label>
                      <select className="form-input" value={formCancha.tipo}
                        onChange={(e) => setFormCancha({ ...formCancha, tipo: e.target.value })}>
                        {TIPOS_CANCHA.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Precio por hora (Bs.)</label>
                      <input className="form-input" type="number" step="0.01" placeholder="150.00" value={formCancha.precio_por_hora}
                        onChange={(e) => setFormCancha({ ...formCancha, precio_por_hora: e.target.value })} required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Imagen de la cancha</label>
                    <input type="file" accept="image/*" className="form-input" onChange={handleImagenChange}
                      style={{ padding: 8 }} />
                    {imagenPreview && (
                      <img src={imagenPreview} alt="Preview"
                        style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
                    )}
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    {editingCanchaId ? 'Guardar Cambios' : 'Agregar Cancha'}
                  </button>
                  {editingCanchaId && (
                    <button type="button" className="btn btn-secondary btn-block mt-2" onClick={handleCancelarEditCancha}>
                      Cancelar Edición
                    </button>
                  )}
                </form>
              )}
            </div>

            <div className="card">
              <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ margin: 0 }}><MdSportsSoccer /> Mis Canchas</h3>
                
                {/* Selector de Local para ver canchas */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <MdBusiness /> Selecciona un Complejo para ver sus canchas:
                  </label>
                  <select
                    className="form-input"
                    value={filtroLocalCanchas}
                    onChange={(e) => setFiltroLocalCanchas(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '8px 12px' }}
                  >
                    <option value=""><MdBusiness /> Seleccionar un local...</option>
                    {locales.map((l) => (
                      <option key={l.id} value={l.id}>{l.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!filtroLocalCanchas ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-icon" style={{ fontSize: '2.5rem', marginBottom: '12px' }}><MdBusiness /></div>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Visualización por Local</p>
                  <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 4, maxWidth: '280px', margin: '4px auto 0' }}>
                    Por favor, selecciona un establecimiento arriba para ver las canchas registradas en él.
                  </p>
                </div>
              ) : (
                <>
                  {(() => {
                    const canchasDelLocal = canchas.filter(c => String(c.local) === String(filtroLocalCanchas))
                    
                    if (canchasDelLocal.length === 0) {
                      return (
                        <div className="empty-state" style={{ padding: '40px 20px' }}>
                          <div className="empty-icon"><MdSportsSoccer /></div>
                          <p>No hay canchas registradas en este local</p>
                          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                            Usa el formulario de la izquierda para agregar canchas a este local.
                          </p>
                        </div>
                      )
                    }

                    return canchasDelLocal.map((c) => (
                      <div key={c.id} style={{
                        padding: '14px',
                        borderBottom: '1px solid rgba(31,143,122,0.15)',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                      }}>
                        {getCanchaImg(c) && (
                          // API (fallback): c.imagen_url && (
                          <img src={getCanchaImg(c)} alt={c.nombre}
                            // API (fallback): src={c.imagen_url}
                            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <strong>{c.nombre}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}><MdBusiness /> {c.local_nombre}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{c.tipo}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                          <span className="text-success" style={{ fontWeight: 700, marginRight: 8 }}>
                            Bs. {c.precio_por_hora}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            onClick={() => handleIniciarEditCancha(c)}
                          >
                            <MdEdit /> Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            onClick={() => solicitarConfirmacion(
                              '¿Eliminar Cancha?',
                              `¿Estás seguro de que deseas eliminar permanentemente la cancha "${c.nombre}"?`,
                              () => handleEliminarCancha(c.id)
                            )}
                          >
                            <MdDelete /> Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  })()}
                </>
              )}
            </div>
          </div>
        )}

        {/* ===== TAB: RESERVAS ===== */}
        {tab === 'reservas' && (
          <>
            {reservas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><MdListAlt /></div>
                <p>Aún no tienes reservas. Explora las canchas disponibles y reserva tu primer turno.</p>
              </div>
            ) : (
              <>
                {/* Contenedor de Filtros Premium */}
                <div className="card mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)' }}>
                  <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <MdSearch /> Filtrar Reservas
                    </h3>
                  </div>
                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}><MdBusiness /> Establecimiento (Local)</label>
                      <select
                        className="form-input"
                        value={filtroLocal}
                        onChange={(e) => {
                          const newLocal = e.target.value
                          setFiltroLocal(newLocal)
                          if (newLocal && filtroCancha) {
                            const canchaActual = canchas.find(c => String(c.id) === String(filtroCancha))
                            if (!canchaActual || String(canchaActual.local) !== String(newLocal)) {
                              setFiltroCancha('')
                            }
                          }
                        }}
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
                      >
                        <option value="">🏢 Todos los locales</option>
                        {locales.map(l => (
                          <option key={l.id} value={l.id}>{l.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}><MdSportsSoccer /> Cancha</label>
                      <select
                        className="form-input"
                        value={filtroCancha}
                        onChange={(e) => setFiltroCancha(e.target.value)}
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
                      >
                        <option value="">🏟️ Todas las canchas</option>
                        {canchas
                          .filter(c => !filtroLocal || String(c.local) === String(filtroLocal))
                          .map(c => (
                            <option key={c.id} value={c.id}>
                              {c.nombre} {!filtroLocal && `(${c.local_nombre})`}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {reservasFiltradas.length > 0 ? (
                  <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3><MdListAlt /> Reservas Recientes ({reservasFiltradas.length})</h3>
                      {(filtroLocal || filtroCancha) && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setFiltroLocal('')
                            setFiltroCancha('')
                          }}
                          style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                        >
                          <MdClear style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Limpiar Filtros
                        </button>
                      )}
                    </div>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Cliente</th>
                            <th>Local</th>
                            <th>Cancha</th>
                            <th>Fecha</th>
                            <th>Horario</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reservasFiltradas.map((r) => (
                            <tr key={r.id}>
                              <td>{r.cliente_nombre}</td>
                              <td>{r.local_nombre}</td>
                              <td>{r.cancha_nombre}</td>
                              <td>{r.fecha}</td>
                              <td>{r.hora_inicio} — {r.hora_fin}</td>
                              <td>{estadoBadge(r.estado)}</td>
                              <td>
                                {esReservaReembolsable(r) ? (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                    onClick={() => solicitarReembolso(r)}
                                    title="Reembolsar esta reserva. El horario quedará disponible para nuevos clientes."
                                  >
                                    <MdPayment style={{ verticalAlign: 'middle' }} /> Reembolsar
                                  </button>
                                ) : r.estado === 'confirmada' ? (
                                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>No reembolsable</span>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon"><MdListAlt /></div>
                    {filtroLocal || filtroCancha ? (
                      <>
                        <p>No se encontraron reservas con los filtros seleccionados.</p>
                        <button
                          className="btn btn-primary btn-sm mt-3"
                          onClick={() => { setFiltroLocal(''); setFiltroCancha('') }}
                        >
                          Mostrar todas las reservas
                        </button>
                      </>
                    ) : (
                      <p>Aún no hay reservas registradas en tus canchas. Las nuevas reservas aparecerán aquí.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ===== TAB: PAGOS PENDIENTES ===== */}
        {tab === 'pagos' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}><MdPayment /> Pagos Pendientes</h2>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                setPagosCargando(true)
                try {
                  const data = await getPagosPendientes(usuario.id)
                  setPagosPendientes(data)
                } catch (e) {
                  console.error(e)
                } finally {
                  setPagosCargando(false)
                }
              }} disabled={pagosCargando} title="Actualizar la lista de comprobantes pendientes">
                {pagosCargando ? 'Actualizando...' : '🔄 Refrescar'}
              </button>
            </div>
            {pagosPendientes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><MdPayment /></div>
                <p>No tienes pagos pendientes por revisar. Todo está al día.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pagosPendientes.map(pago => (
                  <div key={pago.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      {pago.reserva_detalle?.cliente_nombre && (
                        <div style={{ flex: 1 }}>
                          <strong>{pago.reserva_detalle.cliente_nombre}</strong>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {pago.reserva_detalle.cancha_nombre} · {pago.reserva_detalle.fecha}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {pago.reserva_detalle.hora_inicio?.slice(0,5)} — {pago.reserva_detalle.hora_fin?.slice(0,5)}
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--accent-green)', marginTop: 4 }}>
                            Bs. {pago.monto}
                          </div>
                        </div>
                      )}
                      {pago.comprobante_url && (
                        <img src={pago.comprobante_url} alt="Comprobante"
                          onClick={() => setZoomComprobante(pago.comprobante_url)}
                          style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-light)', cursor: 'pointer' }} />
                      )}
                      <button className="btn btn-primary btn-sm" style={{ alignSelf: 'center' }}
                        title="Confirmar pago y activar la reserva. Se notificará al cliente por correo."
                        onClick={async () => {
                          try {
                            await confirmarPago(pago.id)
                            setPagosPendientes(prev => prev.filter(p => p.id !== pago.id))
                            mostrarAlerta('¡Éxito!', 'Pago confirmado. Reserva activada.', 'green')
                            cargarDatos()
                          } catch (err) {
                            mostrarAlerta('Error', err.message, 'red')
                          }
                        }}>
                        ✅ Confirmar
                      </button>
                      <button className="btn btn-danger btn-sm" style={{ alignSelf: 'center' }}
                        title="Rechazar el comprobante. La reserva se cancelará y el cliente podrá subir otro."
                        onClick={async () => {
                          try {
                            await rechazarPago(pago.id)
                            setPagosPendientes(prev => prev.filter(p => p.id !== pago.id))
                            mostrarAlerta('Rechazado', 'Pago rechazado. El cliente puede subir otro comprobante.', 'red')
                            cargarDatos()
                          } catch (err) {
                            mostrarAlerta('Error', err.message, 'red')
                          }
                        }}>
                        ❌ Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {zoomComprobante && (
        <ModalWrapper
          isOpen={Boolean(zoomComprobante)}
          onClose={() => setZoomComprobante(null)}
          title="Comprobante ampliado"
          size="fullscreen"
          maxWidth="min(92vw, 900px)"
          theme="default"
        >
          <div style={{ textAlign: 'center' }}>
            <img src={zoomComprobante} alt="Comprobante ampliado"
              style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain' }} />
          </div>
        </ModalWrapper>
      )}

      <CustomAlertModal
        isOpen={alertOpen}
        title={alertTitle}
        message={alertMsg}
        theme={alertTheme}
        onConfirm={() => setAlertOpen(false)}
      />
      <CustomAlertModal
        isOpen={confirmOpen}
        title={confirmTitle}
        message={confirmMsg}
        type="confirm"
        theme="red"
        confirmText={confirmButtonText}
        cancelText="Cancelar"
        onConfirm={() => {
          if (confirmAction) confirmAction()
          setConfirmOpen(false)
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
