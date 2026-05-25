import { fetchAPI, setTokens, clearTokens } from './client'

export async function login(correo, contrasena) {
  clearTokens() // Prevenir envío de token expirado
  const data = await fetchAPI('/login/', {
    method: 'POST',
    body: JSON.stringify({ correo, contrasena }),
  })

  setTokens(data.tokens.access, data.tokens.refresh)
  localStorage.setItem('usuario', JSON.stringify(data.usuario))
  return data
}

export async function registro(nombre, correo, contrasena, rol) {
  clearTokens() // Prevenir envío de token expirado
  const data = await fetchAPI('/registro/', {
    method: 'POST',
    body: JSON.stringify({ nombre, correo, contrasena, rol }),
  })

  setTokens(data.tokens.access, data.tokens.refresh)
  localStorage.setItem('usuario', JSON.stringify(data.usuario))
  return data
}

export async function getMe() {
  return fetchAPI('/me/')
}

export async function updatePerfil(data) {
  const isFormData = data instanceof FormData;
  const result = await fetchAPI('/me/', {
    method: 'PATCH',
    body: isFormData ? data : JSON.stringify(data),
  })
  // Actualizar el usuario en localStorage
  localStorage.setItem('usuario', JSON.stringify(result))
  return result
}

export async function eliminarCuenta() {
  return fetchAPI('/me/', {
    method: 'DELETE',
  })
}
