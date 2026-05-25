import { useState, useEffect } from 'react'
import ModalWrapper from './ui/ModalWrapper'

/**
 * CustomAlertModal
 * Un modal interactivo elegante con Glassmorphism para reemplazar alert(), confirm() y prompt().
 */
export default function CustomAlertModal({
  isOpen,
  title,
  message,
  type = 'alert', // 'alert' | 'confirm' | 'prompt'
  placeholder = 'Escribe aquí...',
  defaultValue = '',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  theme = 'green', // 'green' | 'red' | 'blue' | 'amber'
}) {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === 'prompt') {
      onConfirm(inputValue);
    } else {
      onConfirm();
    }
  };

  const getThemeColor = () => {
    switch (theme) {
      case 'red': return 'var(--accent-red)';
      case 'blue': return 'var(--accent-blue)';
      case 'amber': return 'var(--accent-amber)';
      default: return 'var(--accent-green)';
    }
  };

  const getThemeIcon = () => {
    if (theme === 'red') return '🚨';
    if (theme === 'amber') return '⚠️';
    if (theme === 'blue') return 'ℹ️';
    return '⚡';
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onCancel}
      title={null}
      size="sm"
      theme={theme}
      showCloseButton={false}
      closeOnOverlay={type !== 'prompt'}
      maxWidth="420px"
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
          {getThemeIcon()}
        </div>

        {title && (
          <h2 style={{ fontSize: '1.4rem', marginBottom: '12px', fontWeight: '800' }}>
            {title}
          </h2>
        )}

        {message && (
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.5' }}>
            {message}
          </p>
        )}

        {type === 'prompt' && (
          <div className="form-group" style={{ marginBottom: '24px', textAlign: 'left' }}>
            <input
              type="text"
              className="form-input"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
              style={{
                borderColor: getThemeColor(),
                textAlign: 'center',
                fontSize: '1rem',
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {type !== 'alert' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onCancel}
              style={{ flex: 1, padding: '10px' }}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleConfirm}
            style={{
              flex: 1,
              background: theme === 'red' ? 'rgba(239, 68, 68, 0.2)' : (theme === 'blue' ? 'rgba(59, 130, 246, 0.2)' : 'var(--gradient-button)'),
              color: theme === 'red' ? 'var(--accent-red)' : (theme === 'blue' ? 'var(--accent-blue)' : '#FFFFFF'),
              border: theme === 'red' ? '1px solid rgba(239, 68, 68, 0.4)' : (theme === 'blue' ? '1px solid rgba(59, 130, 246, 0.4)' : 'none'),
              boxShadow: theme === 'green' ? 'var(--shadow-btn)' : 'none',
              padding: '10px',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </ModalWrapper>
  )
}
