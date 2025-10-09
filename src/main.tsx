import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setSessionFromDeepLink } from './lib/auth';

if (window.deeplink) {
  window.deeplink.onUrl(async (url) => {
    await setSessionFromDeepLink(url);
    // Tu peux déclencher un rafraîchissement d’état global ici si besoin
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
