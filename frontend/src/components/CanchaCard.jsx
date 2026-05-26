const TIPO_LABELS = {
  futbol5: '⚽ Fútbol 5',
  futbol7: '⚽ Fútbol 7',
  futbol11: '⚽ Fútbol 11',
  basquet: '🏀 Básquetbol',
  tenis: '🎾 Tenis',
  padel: '🏓 Pádel',
  voley: '🏐 Voleibol',
  otro: '🏟️ Otro',
}

import { getCanchaImg } from '../utils/imagenes'

function Estrellas({ calificacion }) {
  if (!calificacion) return <span className="text-muted" style={{ fontSize: '0.8rem' }}>Sin reseñas</span>
  const llenas = Math.floor(calificacion)
  const media = calificacion - llenas >= 0.5

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[...Array(5)].map((_, i) => (
        <span key={i} style={{ color: i < llenas ? '#f59e0b' : (i === llenas && media ? '#f59e0b' : '#4B5563'), fontSize: '0.9rem' }}>
          {i < llenas ? '★' : (i === llenas && media ? '★' : '☆')}
        </span>
      ))}
      <span style={{ fontSize: '0.8rem', marginLeft: 4, color: 'var(--text-secondary)' }}>
        {calificacion}
      </span>
    </span>
  )
}

export default function CanchaCard({ cancha, onReservar, onVerDisponibilidad, onVerResenas, showReservar = true }) {
  return (
    <div className="cancha-card fade-in">
      {getCanchaImg(cancha) && (
        // API (fallback): cancha.imagen_url && (
        <img
          src={getCanchaImg(cancha)}
          // API (fallback): src={cancha.imagen_url}
          alt={cancha.nombre}
          style={{
            width: '100%',
            height: 160,
            objectFit: 'cover',
            borderRadius: 'var(--radius-md)',
            marginBottom: 14,
          }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{cancha.nombre}</h3>
        <span className="badge badge-confirmada" style={{ fontSize: '0.65rem' }}>
          {TIPO_LABELS[cancha.tipo] || cancha.tipo}
        </span>
      </div>

      <div style={{ marginBottom: 8 }}>
        <Estrellas calificacion={cancha.calificacion_promedio} />
        {cancha.total_resenas > 0 && (
          <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: 6 }}>
            ({cancha.total_resenas} reseña{cancha.total_resenas > 1 ? 's' : ''})
          </span>
        )}
      </div>

      <div className="cancha-info">
        <span>📍 {cancha.local_direccion}</span>
        {cancha.local_nombre && <span>🏟️ {cancha.local_nombre}</span>}
        {cancha.descripcion && <span>📝 {cancha.descripcion}</span>}
        {cancha.dueno_nombre && <span>👤 {cancha.dueno_nombre}</span>}
      </div>

      <div className="cancha-price">Bs. {cancha.precio_por_hora}/hora</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {showReservar && onReservar && (
          <button className="btn btn-primary" onClick={() => onReservar(cancha)}>
            Reservar
          </button>
        )}
        {onVerDisponibilidad && (
          <button className="btn btn-secondary btn-sm" onClick={() => onVerDisponibilidad(cancha)}>
            📅 Disponibilidad
          </button>
        )}
        {onVerResenas && (
          <button className="btn btn-secondary btn-sm" onClick={() => onVerResenas(cancha)}>
            ⭐ Reseñas
          </button>
        )}
      </div>
    </div>
  )
}
