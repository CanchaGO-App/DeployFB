import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', padding: 24,
          textAlign: 'center', background: '#0f0f0f', color: '#e0e0e0',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ fontSize: 48, marginBottom: 8, color: '#f44336' }}>Oops</h1>
          <p style={{ fontSize: 18, marginBottom: 24, color: '#aaa' }}>
            Algo sali&oacute; mal. Recarg&aacute; la p&aacute;gina o intent&aacute; de nuevo.
          </p>
          <button onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px', fontSize: 16, borderRadius: 8,
              border: 'none', background: '#7c3aed', color: '#fff',
              cursor: 'pointer'
            }}>
            Recargar
          </button>
          {this.state.error && (
            <details style={{ marginTop: 32, maxWidth: 600, textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#888' }}>Detalle t&eacute;cnico</summary>
              <pre style={{ fontSize: 12, color: '#666', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
