import { useEffect, useState } from 'react'
import { getResenas, crearResena, editarResena, eliminarResena } from '../api/social'
import { getReservas } from '../api/reservas'
import CustomAlertModal from './CustomAlertModal'
import ModalWrapper from './ui/ModalWrapper'

function Estrellas({ calificacion, onSelect, interactive = false }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          onClick={interactive ? () => onSelect(i) : undefined}
          style={{
            color: i <= calificacion ? '#f59e0b' : '#4B5563',
            fontSize: interactive ? '1.5rem' : '1rem',
            cursor: interactive ? 'pointer' : 'default',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={interactive ? (e) => { e.target.style.transform = 'scale(1.2)' } : undefined}
          onMouseLeave={interactive ? (e) => { e.target.style.transform = 'scale(1)' } : undefined}
        >
          ★
        </span>
      ))}
    </span>
  )
}

export default function ResenasModal({ cancha, usuarioId, usuarioRol, localDuenoId, onClose }) {
  const [resenas, setResenas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [calificacion, setCalificacion] = useState(0)
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [yaReseno, setYaReseno] = useState(false)
  const [tieneReserva, setTieneReserva] = useState(false)

  // Estados de edición de reseña
  const [editandoResenaId, setEditandoResenaId] = useState(null)
  const [editCalificacion, setEditCalificacion] = useState(0)
  const [editComentario, setEditComentario] = useState('')
  const [editError, setEditError] = useState('')
  const [editando, setEditando] = useState(false)
  const [resenaIdAEliminar, setResenaIdAEliminar] = useState(null)

  // Alerta personalizada
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMsg, setAlertMsg] = useState('')
  const [alertTheme, setAlertTheme] = useState('red')

  function mostrarAlerta(title, msg, theme = 'red') {
    setAlertTitle(title)
    setAlertMsg(msg)
    setAlertTheme(theme)
    setAlertOpen(true)
  }

  useEffect(() => {
    cargar()
  }, [cancha.id])

  async function cargar() {
    try {
      const data = await getResenas(cancha.id)
      const lista = data.results || data
      setResenas(lista)
      // Verificar si el usuario ya reseñó
      if (usuarioId && lista.some((r) => r.cliente === usuarioId)) {
        setYaReseno(true)
      }

      // Verificar si el usuario tiene reservas para esta cancha
      if (usuarioId) {
        const reservasData = await getReservas(usuarioId)
        const listaReservas = reservasData.results || reservasData
        const haReservado = listaReservas.some(
          (r) => r.cancha === cancha.id && r.estado === 'confirmada'
        )
        setTieneReserva(haReservado)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  async function handleEnviar(e) {
    e.preventDefault()
    setError('')

    if (calificacion === 0) {
      setError('Selecciona una calificación')
      return
    }

    setEnviando(true)
    try {
      await crearResena({
        cliente: usuarioId,
        cancha: cancha.id,
        calificacion,
        comentario,
      })
      setComentario('')
      setCalificacion(0)
      setYaReseno(true)
      cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  function handleEliminar(resenaId) {
    setResenaIdAEliminar(resenaId)
  }

  async function procederEliminar(resenaId) {
    try {
      await eliminarResena(resenaId)
      const resenaEliminada = resenas.find(r => r.id === resenaId)
      if (resenaEliminada && resenaEliminada.cliente === usuarioId) {
        setYaReseno(false)
      }
      setResenaIdAEliminar(null)
      cargar()
    } catch (err) {
      mostrarAlerta('Error', 'No se pudo eliminar la reseña: ' + err.message, 'red')
    }
  }

  async function handleGuardarEdicion(e, resenaId) {
    e.preventDefault()
    setEditError('')
    if (editCalificacion === 0) {
      setEditError('Selecciona una calificación')
      return
    }

    setEditando(true)
    try {
      await editarResena(resenaId, {
        calificacion: editCalificacion,
        comentario: editComentario,
      })
      setEditandoResenaId(null)
      cargar()
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditando(false)
    }
  }

  const miResena = resenas.find((r) => r.cliente === usuarioId)
  const otrasResenas = resenas.filter((r) => r.cliente !== usuarioId)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
        <h2>⭐ Reseñas — {cancha.nombre}</h2>
        <p className="modal-subtitle">
          {cancha.calificacion_promedio
            ? `${cancha.calificacion_promedio} ⭐ · ${cancha.total_resenas} reseña${cancha.total_resenas > 1 ? 's' : ''}`
            : 'Sin reseñas aún'}
        </p>

        {/* Estado de la reseña del usuario */}
        {usuarioId && (
          <div style={{ marginBottom: 20 }}>
            {usuarioRol === 'dueno' ? (
              <div className="card" style={{ padding: 14, textAlign: 'center', background: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-yellow)', fontWeight: 600 }}>
                  ⚠️ Los dueños de cancha no pueden realizar valoraciones.
                </p>
              </div>
            ) : yaReseno && miResena ? (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '0.95rem', margin: 0, color: 'var(--text-pure)' }}>Tu reseña</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn-link"
                      style={{ color: 'var(--accent-green)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '4px 8px' }}
                      onClick={() => {
                        setEditandoResenaId(miResena.id)
                        setEditCalificacion(miResena.calificacion)
                        setEditComentario(miResena.comentario || '')
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      className="btn-link"
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '4px 8px' }}
                      onClick={() => handleEliminar(miResena.id)}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
                {editandoResenaId === miResena.id ? (
                  <form onSubmit={(e) => handleGuardarEdicion(e, miResena.id)}>
                    {editError && <div className="auth-error" style={{ marginBottom: 8 }}>{editError}</div>}
                    <div style={{ marginBottom: 8 }}>
                      <Estrellas calificacion={editCalificacion} onSelect={setEditCalificacion} interactive />
                    </div>
                    <div className="form-group">
                      <textarea
                        className="form-input"
                        rows={3}
                        value={editComentario}
                        onChange={(e) => setEditComentario(e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={editando}>
                        {editando ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditandoResenaId(null)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div style={{ marginBottom: 4 }}>
                      <Estrellas calificacion={miResena.calificacion} />
                    </div>
                    {miResena.comentario && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0', lineHeight: '1.4' }}>{miResena.comentario}</p>
                    )}
                  </div>
                )}
              </div>
            ) : !tieneReserva ? (
              <div className="card" style={{ padding: 14, textAlign: 'center', background: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-yellow)', fontWeight: 600 }}>
                  ⚠️ Solo puedes calificar esta cancha si tienes una reserva previa
                </p>
              </div>
            ) : (
              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: 12, color: 'var(--text-pure)' }}>Dejar mi reseña</h3>
                {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}
                <form onSubmit={handleEnviar}>
                  <div style={{ marginBottom: 12 }}>
                    <Estrellas calificacion={calificacion} onSelect={setCalificacion} interactive />
                  </div>
                  <div className="form-group">
                    <textarea
                      className="form-input"
                      placeholder="Escribe tu crítica, opinión o mensaje de apoyo..."
                      rows={3}
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={enviando}>
                    {enviando ? 'Enviando...' : 'Publicar Reseña'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Lista de reseñas */}
        <h3 style={{ fontSize: '1rem', marginTop: 20, marginBottom: 12, color: 'var(--text-pure)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
          Opiniones de la comunidad
        </h3>
        {cargando ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-pulse" style={{ height: 72, borderRadius: 12 }} />
            ))}
          </div>
        ) : otrasResenas.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0', background: 'rgba(255,255,255,0.01)', borderRadius: 8 }}>
            <div className="empty-icon" style={{ fontSize: '1.5rem', marginBottom: 8 }}>👥</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No hay otras opiniones de la comunidad aún</p>
          </div>
        ) : (
          <div style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 6 }}>
            {otrasResenas.map((r) => {
              const esDuenoLocal = localDuenoId && usuarioId === localDuenoId

              return (
                <div
                  key={r.id}
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(31,143,122,0.1)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: '0.85rem' }}>{r.cliente_nombre}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Estrellas calificacion={r.calificacion} />
                      {esDuenoLocal && (
                        <button
                          className="btn-link"
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
                          onClick={() => handleEliminar(r.id)}
                          title="Eliminar reseña"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  {r.comentario && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0', lineHeight: '1.4' }}>
                      {r.comentario}
                    </p>
                  )}
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>

      {/* Modal de confirmación personalizado para eliminar */}
      {resenaIdAEliminar && (
        <ModalWrapper
          isOpen={Boolean(resenaIdAEliminar)}
          onClose={() => setResenaIdAEliminar(null)}
          title="¿Eliminar reseña?"
          theme="red"
          size="sm"
          maxWidth="400px"
        >
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: 24, lineHeight: '1.5' }}>
              Esta acción no se puede deshacer y borrará permanentemente esta calificación y comentario.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
                onClick={() => procederEliminar(resenaIdAEliminar)}
              >
                Sí, eliminar
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setResenaIdAEliminar(null)}
              >
                Cancelar
              </button>
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
    </div>
  )
}
