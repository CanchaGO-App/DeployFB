import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { BsRobot } from 'react-icons/bs'
import { MdClose, MdSend, MdRefresh } from 'react-icons/md'
import { fetchAPI } from '../api/client'

export default function ChatBot({ abierto, onClose }) {
  const { usuario } = useAuth()
  const [mensajes, setMensajes] = useState([])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const endRef = useRef(null)
  const controllerRef = useRef(null)

  // Reinicia la conversación: limpia todo el historial de mensajes
  // para empezar una nueva sesión desde cero
  function reiniciar() {
    setMensajes([])
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando])

  useEffect(() => {
    if (!abierto) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      controllerRef.current?.abort()
    }
  }, [abierto, onClose])

  const sugerencias = {
    dueno: [
      { text: '📊 Ver mis reservas de hoy', prompt: 'Ver reservas de hoy' },
      { text: '💰 Ver mis ingresos', prompt: 'Ver mis ingresos' },
      { text: '🏆 Canchas más reservadas', prompt: '¿Cuáles son mis canchas más reservadas?' },
      { text: '📈 Tasa de reservas', prompt: 'Ver tasa de confirmación de reservas' },
    ],
    cliente: [
      { text: '💵 ¿Cuánto he gastado?', prompt: '¿Cuánto he gastado en reservas?' },
      { text: '🗓️ Ver mis reservas', prompt: 'Ver mis reservas recientes' },
      { text: '❤️ Locales favoritos', prompt: 'Mostrar mis locales favoritos' },
      { text: '🔔 Nuevas notificaciones', prompt: '¿Tengo notificaciones nuevas?' },
      { text: '🏟️ Canchas recomendadas', prompt: '¿Qué canchas me recomiendas?' },
    ],
    anonimo: [
      { text: '🏢 Locales registrados', prompt: '¿Qué locales deportivos están registrados?' },
      { text: '🏟️ Canchas de fútbol', prompt: '¿Qué canchas de fútbol me recomiendas?' },
      { text: '❓ ¿Cómo reservar?', prompt: '¿Cómo puedo reservar una cancha?' },
      { text: '📅 Disponibilidad hoy', prompt: 'Buscar canchas disponibles hoy' },
    ],
  }

  function getSugerencias() {
    if (!usuario) return sugerencias.anonimo
    if (usuario.rol === 'dueno') return sugerencias.dueno
    return sugerencias.cliente
  }

  async function enviarMensaje(texto) {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    setMensajes((prev) => [...prev, { rol: 'user', contenido: texto }])
    setCargando(true)

    try {
      const data = await fetchAPI('/chatbot/', {
        method: 'POST',
        body: JSON.stringify({
          mensaje: texto,
          // Envía el historial de los últimos 10 mensajes para que Groq
          // mantenga contexto entre preguntas del usuario
          historial: mensajes.slice(-10).map(m => ({
            rol: m.rol,
            contenido: m.contenido,
          })),
        }),
        signal: controller.signal,
      })
      setMensajes((prev) => [...prev, { rol: 'assistant', contenido: data.respuesta }])
    } catch (err) {
      const msg =
        err.name === 'AbortError'
          ? 'La respuesta tardó demasiado. Por favor intenta de nuevo.'
          : err.message || 'No se pudo conectar con el asistente. Verifica tu conexión.'
      setMensajes((prev) => [...prev, { rol: 'assistant', contenido: msg, error: true }])
    } finally {
      clearTimeout(timeoutId)
      setCargando(false)
    }
  }

  async function enviar(e) {
    e.preventDefault()
    const texto = input.trim()
    if (!texto || cargando) return
    setInput('')
    await enviarMensaje(texto)
  }

  async function clickSugerencia(prompt) {
    if (cargando) return
    await enviarMensaje(prompt)
  }

  if (!abierto) return null

  return (
    <>
      <div className="chatbot-backdrop" onClick={() => onClose?.()} />
      <div className="chatbot-panel">
        <div className="chatbot-header">
          <span className="chatbot-header-title">
            <BsRobot size={20} /> CanchaBot
          </span>
          {/* Botón para reiniciar la conversación y empezar desde cero */}
          <button className="chatbot-reset" onClick={reiniciar} aria-label="Nueva conversación" title="Nueva conversación">
            <MdRefresh size={18} />
          </button>
          <button className="chatbot-close" onClick={() => onClose?.()} aria-label="Cerrar chat">
            <MdClose size={20} />
          </button>
        </div>

        <div className="chatbot-body">
          {mensajes.length === 0 && (
            <div className="chatbot-welcome">
              <p className="chatbot-welcome-title">
                <strong>¡Hola{usuario ? `, ${usuario.nombre}` : ''}!</strong>
              </p>
              <p className="chatbot-welcome-sub">
                Pregúntame sobre canchas, precios, disponibilidad o estadísticas de reservas.
              </p>
              <div className="chatbot-suggestions">
                <p className="chatbot-suggestions-title">Preguntas sugeridas:</p>
                <div className="chatbot-suggestions-grid">
                  {getSugerencias().map((s, idx) => (
                    <button
                      key={idx}
                      className="chatbot-suggestion-pill"
                      onClick={() => clickSugerencia(s.prompt)}
                      disabled={cargando}
                    >
                      {s.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mensajes.map((m, i) => (
            <div key={i} className={`chatbot-msg ${m.rol}`}>
              <div className={`chatbot-bubble${m.error ? ' chatbot-bubble--error' : ''}`}>
                {m.contenido}
              </div>
            </div>
          ))}

          {cargando && (
            <div className="chatbot-msg assistant">
              <div className="chatbot-bubble typing">Escribiendo...</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="chatbot-input" onSubmit={enviar}>
          <input
            className="chatbot-input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            disabled={cargando}
          />
          <button type="submit" disabled={cargando || !input.trim()} aria-label="Enviar mensaje">
            <MdSend size={20} />
          </button>
        </form>
      </div>
    </>
  )
}
