import { useState } from 'react'

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'futbol5', label: '⚽ Fútbol 5' },
  { value: 'futbol7', label: '⚽ Fútbol 7' },
  { value: 'futbol11', label: '⚽ Fútbol 11' },
  { value: 'basquet', label: '🏀 Básquetbol' },
  { value: 'tenis', label: '🎾 Tenis' },
  { value: 'padel', label: '🏓 Pádel' },
  { value: 'voley', label: '🏐 Voleibol' },
]

export default function SearchBar({ onSearch }) {
  const [buscar, setBuscar] = useState('')
  const [tipo, setTipo] = useState('')

  function handleSearch() {
    onSearch({ buscar, tipo })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSearch()
  }

  function handleClear() {
    setBuscar('')
    setTipo('')
    onSearch({})
  }

  return (
    <div className="card mb-3" style={{ padding: 16 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 12,
        alignItems: 'end',
      }}>
        <div>
          <label className="form-label">Buscar</label>
          <input className="form-input" placeholder="Buscar por nombre..."
            value={buscar} onChange={(e) => setBuscar(e.target.value)} onKeyDown={handleKeyDown} />
        </div>

        <div>
          <label className="form-label">Tipo de cancha</label>
          <select className="form-input" value={tipo}
            onChange={(e) => { setTipo(e.target.value); onSearch({ buscar, tipo: e.target.value }) }}>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleSearch}>🔍</button>
          {(buscar || tipo) && (
            <button className="btn btn-secondary" onClick={handleClear}>✕</button>
          )}
        </div>
      </div>
    </div>
  )
}
