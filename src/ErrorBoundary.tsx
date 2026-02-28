import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{
          padding: '2rem',
          maxWidth: '600px',
          margin: '2rem auto',
          background: '#1a1d24',
          color: '#e2e8f0',
          fontFamily: 'system-ui',
          borderRadius: '8px',
          border: '1px solid #2a2f3a',
        }}>
          <h1 style={{ color: '#f87171', marginTop: 0 }}>Error al cargar</h1>
          <pre style={{
            background: '#0f1117',
            padding: '1rem',
            overflow: 'auto',
            fontSize: '14px',
            borderRadius: '4px',
          }}>
            {this.state.error.message}
          </pre>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Revisa la consola del navegador (F12) para más detalles.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
