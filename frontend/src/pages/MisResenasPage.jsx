import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMisResenas } from '../api/favoritos'
import { editarResena, eliminarResena } from '../api/social'
import Topbar from '../components/Topbar'
import CustomAlertModal from '../components/CustomAlertModal'
import Breadcrumb from '../components/ui/Breadcrumb'

const CLIENT_NAVIGATION_LINKS = [
  { label: 'Explorar', path: '/dashboard/cliente' },
  { label: 'Mis reservas', path: '/dashboard/cliente/reservas' },
  { label: 'Mis favoritos', path: '/dashboard/cliente/favoritos' },
  { label: 'Mis reseñas', path: '/dashboard/cliente/resenas' },
]

function Estrellas({ calificacion }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            color: i <= calificacion ? '#f59e0b' : '#4B5563',
            fontSize: '1rem',
          }}
        >
          ★
        </span>
      ))}
    </span>
  )
}

function StarSelector({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'inline-flex', gap: 6, margin: '4px 0' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{
            cursor: 'pointer',
            fontSize: '1.4rem',
            color: star <= (hover || value) ? '#f59e0b' : '#4B5563',
            transition: 'color 0.15s ease, transform 0.1s ease',
            transform: star <= hover ? 'scale(1.15)' : 'none',
          }}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export default function MisResenasPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [resenas, setResenas] = useState([])
  const [cargando, setCargando] = useState(true)

  // Estados para edición inline y eliminación
  const [editingId, setEditingId] = useState(null)
  const [editCalificacion, setEditCalificacion] = useState(5)
  const [editComentario, setEditComentario] = useState('')
  const [cargandoAccion, setCargandoAccion] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    if (usuario?.id) cargarResenas()
  }, [usuario])

  async function cargarResenas() {
    try {
      const data = await getMisResenas(usuario.id)
      setResenas(data)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  async function handleGuardarEdicion(rId) {
    if (editCalificacion < 1 || editCalificacion > 5) return
    try {
      setCargandoAccion(true)
      await editarResena(rId, {
        calificacion: editCalificacion,
        comentario: editComentario,
      })
      setEditingId(null)
      await cargarResenas()
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoAccion(false)
    }
  }

  async function handleConfirmarEliminar() {
    if (!confirmDeleteId) return
    try {
      setCargandoAccion(true)
      await eliminarResena(confirmDeleteId)
      setConfirmDeleteId(null)
      await cargarResenas()
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoAccion(false)
    }
  }

  if (cargando) {
    return (
      <div className="goalpad-app">
        <main className="goalpad-main">
          <Topbar navigationLinks={CLIENT_NAVIGATION_LINKS} />
          <div className="goalpad-content" style={{ paddingTop: '24px' }}>
            <div className="card">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-pulse" style={{ height: 72, marginBottom: 12, borderRadius: '12px' }} />
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
            { label: 'Mis Reseñas', active: true },
          ]} />

          <div className="page-header">
            <h1>⭐ Mis Reseñas</h1>
            <p>Reseñas que has dejado en canchas</p>
          </div>

          {resenas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⭐</div>
              <p>Aún no has dejado reseñas. Explora las canchas disponibles y comparte tu experiencia.</p>
              <button className="btn-neon mt-2" onClick={() => navigate('/dashboard/cliente')}>
                Explorar canchas
              </button>
            </div>
          ) : (
            <div className="card" style={{ maxWidth: '800px', padding: 0 }}>
              {resenas.map((r) => {
                const isEditing = editingId === r.id

                if (isEditing) {
                  return (
                    <div 
                      key={r.id}
                      style={{
                        padding: '20px',
                        borderBottom: '1px solid var(--border-light)',
                        background: 'rgba(255, 255, 255, 0.01)',
                      }}
                    >
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-pure)', marginBottom: '8px' }}>
                        🏟️ {r.cancha_nombre} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({r.local_nombre})</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Calificación:</label>
                        <StarSelector value={editCalificacion} onChange={setEditCalificacion} />
                        
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Comentario:</label>
                        <textarea
                          className="form-input"
                          value={editComentario}
                          onChange={(e) => setEditComentario(e.target.value)}
                          placeholder="Comparte tu opinión sobre la cancha..."
                          rows={3}
                          style={{
                            width: '100%',
                            resize: 'vertical',
                            background: 'rgba(22, 26, 34, 0.6)',
                            color: 'var(--text-pure)',
                            borderColor: 'var(--border-subtle)',
                            padding: '10px',
                            fontSize: '0.9rem',
                          }}
                        />

                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => handleGuardarEdicion(r.id)}
                            disabled={cargandoAccion}
                            style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                          >
                            {cargandoAccion ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditingId(null)}
                            disabled={cargandoAccion}
                            style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div 
                    key={r.id}
                    style={{
                      padding: '20px',
                      borderBottom: '1px solid var(--border-light)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-pure)' }}>
                          🏟️ {r.cancha_nombre}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          📍 {r.local_nombre}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Estrellas calificacion={r.calificacion} />
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {r.comentario && (
                      <div style={{ 
                        fontSize: '0.9rem', 
                        color: 'var(--text-secondary)',
                        background: 'rgba(255,255,255,0.02)',
                        padding: '12px',
                        borderRadius: '8px',
                        marginTop: '4px',
                        lineHeight: '1.4',
                      }}>
                        "{r.comentario}"
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ 
                          padding: '4px 10px', 
                          fontSize: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderColor: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-secondary)'
                        }}
                        onClick={() => {
                          setEditingId(r.id)
                          setEditCalificacion(r.calificacion)
                          setEditComentario(r.comentario || '')
                        }}
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ 
                          padding: '4px 10px', 
                          fontSize: '0.75rem',
                          background: 'rgba(239, 68, 68, 0.08)',
                          borderColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444'
                        }}
                        onClick={() => setConfirmDeleteId(r.id)}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <CustomAlertModal
        isOpen={!!confirmDeleteId}
        title="¿Eliminar valoración?"
        message="¿Estás seguro de que deseas eliminar permanentemente esta reseña? Esta acción no se puede deshacer."
        type="confirm"
        theme="red"
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        onConfirm={handleConfirmarEliminar}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}