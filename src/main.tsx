import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './core/auth/AuthProvider';
import { ErrorBoundary } from './core/components/ErrorBoundary';
import { ToastProvider } from './core/components/Toast';
import { initI18n } from './core/i18n';
import './index.css';

initI18n
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </StrictMode>
    );
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[main] i18n 初始化失敗，無法啟動 App', err);
    document.getElementById('root')!.innerHTML = `
      <div style="padding:2rem;color:#fff;font-family:sans-serif">
        <h1>啟動失敗</h1>
        <p>i18n 初始化錯誤。請清除瀏覽器快取後重試。</p>
        <pre style="background:#222;padding:1rem;border-radius:8px;overflow:auto">${String(err)}</pre>
      </div>
    `;
  });
