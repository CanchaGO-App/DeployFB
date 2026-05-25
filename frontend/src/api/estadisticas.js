import { fetchAPI } from './client'

export async function getDuenoEstadisticas(duenoId) {
  return fetchAPI(`/estadisticas/dueno/${duenoId}/`)
}

export async function getAdminEstadisticas() {
  return fetchAPI('/estadisticas/admin/')
}
