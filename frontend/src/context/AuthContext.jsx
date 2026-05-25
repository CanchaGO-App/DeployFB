import { createContext, useContext, useState, useEffect } from 'react'
import { clearTokens, getToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    // Verificar si hay una sesión guardada al cargar la app
    const token = getToken()
    const usuarioGuardado = localStorage.getItem('usuario')

    if (token && usuarioGuardado) {
      try {
        setUsuario(JSON.parse(usuarioGuardado))
      } catch {
        clearTokens()
      }
    }
    setCargando(false)
  }, [])

  function loginUsuario(data) {
    setUsuario(data.usuario)
  }

  function logout() {
    clearTokens()
    setUsuario(null)
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        isAuthenticated: !!usuario,
        loginUsuario,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
