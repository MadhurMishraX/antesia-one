import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// ✅ Capture install prompt BEFORE React mounts
(window as any).__installPromptEvent = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).__installPromptEvent = e;
  // Notify React if it's already mounted
  window.dispatchEvent(new Event('pwa-install-ready'));
});

// Register service worker for PWA
registerSW({
  immediate: true,
  onRegistered(r) {
    console.log('SW registered:', r);
  },
  onRegisterError(error) {
    console.error('SW registration error:', error);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
