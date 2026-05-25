import { fetchAPI } from './client'

export async function getCanchas(duenoId = null, filtros = {}) {
  const params = new URLSearchParams()
  if (duenoId) params.append('dueno', duenoId)
  if (filtros.local) params.append('local', filtros.local)
  if (filtros.buscar) params.append('buscar', filtros.buscar)
  if (filtros.tipo) params.append('tipo', filtros.tipo)
  if (filtros.precio_min) params.append('precio_min', filtros.precio_min)
  if (filtros.precio_max) params.append('precio_max', filtros.precio_max)
  if (filtros.ordenar) params.append('ordenar', filtros.ordenar)
  const query = params.toString() ? `?${params.toString()}` : ''
  return fetchAPI(`/canchas/${query}`)
}

export async function crearCancha(formData) {
  return fetchAPI('/canchas/', { method: 'POST', body: formData })
}

export async function getDisponibilidad(canchaId, fecha = null) {
  const params = fecha ? `?fecha=${fecha}` : ''
  return fetchAPI(`/disponibilidad/${canchaId}/${params}`)
}

export async function editarCancha(canchaId, formData) {
  return fetchAPI(`/canchas/${canchaId}/`, { method: 'PUT', body: formData })
}

export async function eliminarCancha(canchaId) {
  return fetchAPI(`/canchas/${canchaId}/`, {
    method: 'DELETE',
  })
}
