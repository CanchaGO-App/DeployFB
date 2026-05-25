import { useEffect } from 'react'

export default function ModalWrapper({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  showCloseButton = true,
  theme = 'default',
  maxWidth,
}) {
  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeWidths = {
    sm: '420px',
    md: '560px',
    lg: '840px',
    fullscreen: 'min(96vw, 1280px)',
  }

  const themeClass = theme !== 'default' ? `modal-theme-${theme}` : ''
  const width = maxWidth || sizeWidths[size] || sizeWidths.md

  return (
    <div className="modal-overlay" onClick={closeOnOverlay ? onClose : undefined}>
      <div
        className={`modal-content modal-shell ${themeClass}`.trim()}
        style={{ maxWidth: width }}
        onClick={(event) => event.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="modal-shell__header">
            {title ? <h2 className="modal-shell__title">{title}</h2> : <span />}
            {showCloseButton && (
              <button type="button" className="modal-shell__close" onClick={onClose} aria-label="Cerrar modal">
                ×
              </button>
            )}
          </div>
        )}

        <div className="modal-shell__body">{children}</div>

        {footer && <div className="modal-shell__footer">{footer}</div>}
      </div>
    </div>
  )
}
