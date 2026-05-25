import { fetchAPI } from './client'

export async function getFavoritos(clienteId) {
  return fetchAPI(`/favoritos/${clienteId}/`)
}

export async function toggleFavorito(clienteId, localId) {
  return fetchAPI(`/favoritos/${clienteId}/`, {
    method: 'POST',
    body: JSON.stringify({ cliente: clienteId, local: localId }),
  })
}

export async function esFavorito(clienteId, localId) {
  return fetchAPI(`/favoritos/${clienteId}/${localId}/verificar/`)
}

export async function getMisResenas(clienteId) {
  return fetchAPI(`/resenas/cliente/${clienteId}/`)
}