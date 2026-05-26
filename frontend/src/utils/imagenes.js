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
  return CANCHA_IMAGENES_POR_TIPO[cancha.tipo] || null
}
