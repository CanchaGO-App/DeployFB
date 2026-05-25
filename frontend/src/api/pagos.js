import { fetchAPI } from './client'

export async function reservarYPagar({ cliente_id, cancha_id, fecha, hora_inicio, hora_fin, comprobante }) {
  const formData = new FormData()
  formData.append('cliente_id', cliente_id)
  formData.append('cancha_id', cancha_id)
  formData.append('fecha', fecha)
  formData.append('hora_inicio', hora_inicio)
  formData.append('hora_fin', hora_fin)
  formData.append('comprobante', comprobante)
  return fetchAPI('/pagos/reservar-y-pagar/', {
    method: 'POST',
    body: formData,
  })
}

export async function getPagosPendientes(duenoId) {
  return fetchAPI(`/pagos/pendientes/${duenoId}/`)
}

export async function confirmarPago(pagoId) {
  return fetchAPI(`/pagos/${pagoId}/confirmar/`, {
    method: 'POST',
  })
}

export async function rechazarPago(pagoId) {
  return fetchAPI(`/pagos/${pagoId}/rechazar/`, {
    method: 'POST',
  })
}
