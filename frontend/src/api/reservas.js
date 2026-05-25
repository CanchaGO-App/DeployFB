import { fetchAPI } from './client'

export async function crearReserva(reservaData) {
  return fetchAPI('/reservas/', {
    method: 'POST',
    body: JSON.stringify(reservaData),
  })
}

export async function getReservas(clienteId = null, duenoId = null) {
  const params = new URLSearchParams()
  if (clienteId) params.append('cliente', clienteId)
  if (duenoId) params.append('dueno', duenoId)
  const query = params.toString() ? `?${params.toString()}` : ''
  return fetchAPI(`/reservas/${query}`)
}

export async function actualizarEstadoReserva(id, estado) {
  return fetchAPI(`/reservas/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  })
}

export async function reembolsarReserva(id, duenoId = null) {
  const body = duenoId != null ? JSON.stringify({ dueno_id: duenoId }) : undefined
  return fetchAPI(`/reservas/${id}/reembolsar/`, {
    method: 'POST',
    body,
  })
}
