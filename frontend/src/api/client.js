/**
 * Cliente HTTP configurado para la API de CanchaGo.
 * Maneja headers de autenticación y errores centralizados.
 */

const DEFAULT_API_URL = 'https://deployfb.onrender.com/api'

function getApiUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  if (typeof window !== 'undefined') {
    const { hostname } = window.location

    if (hostname.includes('onrender.com') || hostname.includes('vercel.app')) {
      return DEFAULT_API_URL
    }
  }

  return '/api'
}

const API_URL = getApiUrl()

export function getToken() {
  return localStorage.getItem('access_token')
}

export function setTokens(access, refresh) {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('usuario')
}

export async function fetchAPI(endpoint, options = {}) {
  const token = getToken()

  const isFormData = options.body instanceof FormData

  const config = {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }

  const response = await fetch(`${API_URL}${endpoint}`, config)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const firstValue = Object.values(errorData)?.[0]
    const errorMessage =
      errorData.detail ||
      errorData.error ||
      errorData.non_field_errors?.[0] ||
      (Array.isArray(firstValue) ? firstValue[0] : typeof firstValue === 'string' ? firstValue : null) ||
      'Error en la solicitud'
    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return { success: true }
  }

  return response.json()
}
