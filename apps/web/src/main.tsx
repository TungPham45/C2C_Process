import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';

// Global Fetch Interceptor to automatically attach Authorization Bearer token
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const token = localStorage.getItem('c2c_token');
  if (token) {
    init = init || {};
    
    // Normalize headers to check for existing Authorization header case-insensitively
    let hasAuthHeader = false;
    if (init.headers) {
      if (init.headers instanceof Headers) {
        hasAuthHeader = init.headers.has('Authorization');
      } else if (Array.isArray(init.headers)) {
        hasAuthHeader = init.headers.some(([key]) => key.toLowerCase() === 'authorization');
      } else {
        hasAuthHeader = Object.keys(init.headers).some((key) => key.toLowerCase() === 'authorization');
      }
    }

    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input && typeof input === 'object' && 'url' in input) {
      url = (input as any).url || '';
    }

    const isApiCall = url.startsWith('/api') || url.includes('/api/');

    if (isApiCall && !hasAuthHeader) {
      if (!init.headers) {
        init.headers = {};
      }
      
      if (init.headers instanceof Headers) {
        init.headers.set('Authorization', `Bearer ${token}`);
      } else if (Array.isArray(init.headers)) {
        init.headers.push(['Authorization', `Bearer ${token}`]);
      } else {
        (init.headers as any)['Authorization'] = `Bearer ${token}`;
      }
    }
  }
  return originalFetch(input, init);
};

const SESSION_BOOTSTRAP_KEY = 'c2c_session_bootstrapped';
const AUTH_STORAGE_KEYS = ['c2c_token', 'c2c_user', 'c2c_user_id', 'c2c_shop_id'];

if (!sessionStorage.getItem(SESSION_BOOTSTRAP_KEY)) {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  sessionStorage.setItem(SESSION_BOOTSTRAP_KEY, 'true');
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
