import { useState } from 'react'

export default function ReservaModal({ cancha, onConfirm, onClose }) {
  const [fecha, setFecha] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  // Fecha mínima: hoy
  const hoy = new Date().toISOString().split('T')[0]

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!fecha || !horaInicio || !horaFin) {
      setError('Todos los campos son obligatorios')
      return
    }

    if (horaFin <= horaInicio) {
      setError('La hora de fin debe ser posterior a la hora de inicio')
      return
    }

    setCargando(true)
    try {
      await onConfirm({ fecha, hora_inicio: horaInicio, hora_fin: horaFin })
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Reservar Cancha</h2>
        <p className="modal-subtitle">
          {cancha.nombre} — Bs. {cancha.precio_por_hora}/hora
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input
              type="date"
              className="form-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              min={hoy}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Hora de inicio</label>
            <input
              type="time"
              className="form-input"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Hora de fin</label>
            <input
              type="time"
              className="form-input"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={cargando}
            >
              {cargando ? 'Reservando...' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
