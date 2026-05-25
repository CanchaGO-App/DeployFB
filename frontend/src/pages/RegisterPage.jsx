import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registro } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'

export default function RegisterPage() {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [rol, setRol] = useState('cliente')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const { loginUsuario } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    // Validar formato de correo y que termine en .com
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(correo) || !correo.toLowerCase().endsWith('.com')) {
      setError('Por favor, ingresa un correo electrónico válido que termine en .com')
      return
    }

    setCargando(true)

    try {
      const data = await registro(nombre, correo, contrasena, rol)
      loginUsuario(data)

      const rutas = {
        cliente: '/dashboard/cliente',
        dueno: '/dashboard/dueno',
        admin: '/dashboard/admin',
      }
      navigate(rutas[data.usuario.rol] || '/dashboard/cliente')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '16px 32px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <img src={logo} alt="CanchaGO Logo" style={{ height: '140px', objectFit: 'contain' }} />
          </div>
        </div>
        <p className="auth-subtitle">Crea tu cuenta para comenzar</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-nombre">Nombre completo</label>
            <input
              id="reg-nombre"
              type="text"
              className="form-input"
              placeholder="Juan Pérez"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-correo">Correo electrónico</label>
            <input
              id="reg-correo"
              type="email"
              className="form-input"
              placeholder="tu@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-pass">Contraseña</label>
            <input
              id="reg-pass"
              type="password"
              className="form-input"
              placeholder="Mínimo 6 caracteres"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-rol">Tipo de cuenta</label>
            <select
              id="reg-rol"
              className="form-input"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
            >
              <option value="cliente">Cliente — Quiero reservar canchas</option>
              <option value="dueno">Dueño — Tengo canchas para alquilar</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={cargando}
          >
            {cargando ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="auth-footer">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login">Iniciar sesión</Link>
        </div>
      </div>
    </div>
  )
}
