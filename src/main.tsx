import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import './index.css';

function showError(msg: string) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:2rem;max-width:600px;margin:2rem auto;background:#1a1d24;color:#e2e8f0;font-family:system-ui;border-radius:8px;border:1px solid #2a2f3a"><h1 style="color:#f87171">Error al cargar</h1><pre style="background:#0f1117;padding:1rem;overflow:auto;font-size:14px;white-space:pre-wrap">${msg.replace(/</g, '&lt;').replace(/&/g, '&amp;')}</pre></div>`;
  }
}

const root = document.getElementById('root');
if (!root) {
  document.body.innerHTML = '<p style="padding:2rem;color:red;">No se encontró #root</p>';
} else {
  import('./App')
    .then(({ default: App }) => {
      ReactDOM.createRoot(root).render(
        <React.StrictMode>
          <ErrorBoundary>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ErrorBoundary>
        </React.StrictMode>
      );
    })
    .catch((e) => {
      const message = e instanceof Error ? e.message + '\n\n' + (e.stack ?? '') : String(e);
      console.error(message);
      showError(message);
    });
}
