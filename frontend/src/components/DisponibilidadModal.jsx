import { useEffect, useState } from 'react'
import { getDisponibilidad } from '../api/canchas'

const HORAS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 7 // 7:00 a 21:00
  return `${h.toString().padStart(2, '0')}:00`
})

function isOcupado(hora, slots) {
  for (const slot of slots) {
    if (hora >= slot.hora_inicio && hora < slot.hora_fin) {
      return slot.estado
    }
  }
  return null
}

export default function DisponibilidadModal({ cancha, onClose }) {
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        const res = await getDisponibilidad(cancha.id)
        setData(res.disponibilidad)
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [cancha.id])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <h2>📅 Disponibilidad — {cancha.nombre}</h2>
        <p className="modal-subtitle">Próximos 7 días</p>

        {cargando ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-pulse" style={{ height: 54, borderRadius: 12 }} />
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th>Hora</th>
                  {data?.map((d) => (
                    <th key={d.fecha} style={{ textAlign: 'center', minWidth: 60 }}>
                      <div>{d.dia_semana}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {d.fecha.slice(5)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HORAS.map((hora) => (
                  <tr key={hora}>
                    <td style={{ fontWeight: 600 }}>{hora}</td>
                    {data?.map((d) => {
                      const estado = isOcupado(hora, d.slots_ocupados)
                      let bg = 'rgba(16, 185, 129, 0.15)'
                      let color = 'var(--accent-green)'
                      let text = '✓'

                      if (estado === 'confirmada') {
                        bg = 'rgba(239, 68, 68, 0.15)'
                        color = 'var(--accent-red)'
                        text = '✕'
                      }

                      return (
                        <td
                          key={d.fecha}
                          style={{
                            textAlign: 'center',
                            background: bg,
                            color: color,
                            fontWeight: 700,
                            borderRadius: 4,
                          }}
                        >
                          {text}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: '0.75rem', justifyContent: 'center' }}>
              <span><span style={{ color: 'var(--accent-green)' }}>✓</span> Disponible</span>
              <span><span style={{ color: 'var(--accent-red)' }}>✕</span> Ocupado</span>
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
