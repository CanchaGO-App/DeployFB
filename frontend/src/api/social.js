import { fetchAPI } from './client'

export async function getResenas(canchaId) {
  return fetchAPI(`/resenas/?cancha=${canchaId}`)
}

export async function crearResena(data) {
  return fetchAPI('/resenas/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function editarResena(id, data) {
  return fetchAPI(`/resenas/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function eliminarResena(id) {
  return fetchAPI(`/resenas/${id}/`, {
    method: 'DELETE',
  })
}

export async function getNotificaciones(usuarioId) {
  return fetchAPI(`/notificaciones/${usuarioId}/`)
}

export async function marcarLeidas(usuarioId) {
  return fetchAPI(`/notificaciones/${usuarioId}/leer/`, {
    method: 'POST',
  })
}


