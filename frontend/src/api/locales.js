import { fetchAPI } from './client'

export async function getLocales(duenoId = null, filtros = {}) {
  const params = new URLSearchParams()
  if (duenoId) params.append('dueno', duenoId)
  if (filtros.buscar) params.append('buscar', filtros.buscar)
  if (filtros.tipo) params.append('tipo', filtros.tipo)
  if (filtros.precio_min) params.append('precio_min', filtros.precio_min)
  if (filtros.precio_max) params.append('precio_max', filtros.precio_max)
  if (filtros.lat_min) params.append('lat_min', filtros.lat_min)
  if (filtros.lat_max) params.append('lat_max', filtros.lat_max)
  if (filtros.lng_min) params.append('lng_min', filtros.lng_min)
  if (filtros.lng_max) params.append('lng_max', filtros.lng_max)
  const query = params.toString() ? `?${params.toString()}` : ''
  return fetchAPI(`/locales/${query}`)
}

export async function getLocal(id) {
  return fetchAPI(`/locales/${id}/`)
}

export async function crearLocal(formData) {
  return fetchAPI('/locales/', { method: 'POST', body: formData })
}

export async function getDisponibilidadLocal(localId, fecha = null) {
  const params = fecha ? `?fecha=${fecha}` : ''
  return fetchAPI(`/locales/${localId}/disponibilidad/${params}`)
}

export async function editarLocal(localId, formData) {
  return fetchAPI(`/locales/${localId}/`, { method: 'PUT', body: formData })
}

export async function eliminarLocal(localId) {
  return fetchAPI(`/locales/${localId}/`, {
    method: 'DELETE',
  })
}
