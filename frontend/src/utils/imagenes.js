// Imágenes hardcodeadas (temporal mientras el backend no sirve media)
export const LOCAL_IMAGENES = {
  17: '/images/locales/Padel_sport_SC.webp',
  16: '/images/locales/Padel_Sur.webp',
  15: '/images/locales/Central_padel_clb.webp',
  14: '/images/locales/Padel_House.webp',
  7:  '/images/locales/Sea_ed.jpg',
  6:  '/images/locales/Panenka_ed.jpg',
  5:  '/images/locales/Golazo_ed.jpg',
  3:  '/images/locales/La_bombonera_escudo.png',
  2:  '/images/locales/unnamed_MfQD05Z.webp',
}

export const CANCHA_IMAGENES = {
  28: '/images/canchas/Padel_Sur_C1.webp',
  27: '/images/canchas/Padel_Sur_C1.webp',
  25: '/images/canchas/Padel_Sur_C1.webp',
  24: '/images/canchas/C1_sc_padel.webp',
  23: '/images/canchas/C1_sc_padel.webp',
  22: '/images/canchas/Cancha_1_padel_house.webp',
  21: '/images/canchas/Cancha_1_padel_house_4bgDVUU.webp',
  20: '/images/canchas/Cancha_1_padel_house_MQaZTm5.webp',
  12: '/images/canchas/SEA_1_y_2.jpg',
  11: '/images/canchas/SEA_1.jpg',
  9:  '/images/canchas/Cancha_1_y_2.jpg',
  8:  '/images/canchas/golazo_c3.jpg',
  7:  '/images/canchas/Golazo_c2.jpg',
  6:  '/images/canchas/Golazo_c1.jpg',
  4:  '/images/canchas/La_bombonera.jpg',
  3:  '/images/canchas/cancha_1_9BertEr.webp',
}

export const CANCHA_IMAGENES_POR_TIPO = {
  futbol5: '/images/futbolicon.png',
  futbol7: '/images/futbolicon.png',
  futbol11: '/images/futbolicon.png',
  padel: '/images/padelicon.webp',
}

export const AVATAR_DEFAULT = '/images/usergeneric1.webp'

export function getLocalImg(local) {
  if (!local) return null
  return LOCAL_IMAGENES[local.id] || null
}

export function getCanchaImg(cancha) {
  if (!cancha) return null
  // API (fallback): vendría de cancha.imagen_url
  return CANCHA_IMAGENES[cancha.id] || CANCHA_IMAGENES_POR_TIPO[cancha.tipo] || null
}
