'use client';

import { useEffect } from 'react';

export default function PwaServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    let refreshing = false;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        // Check each time the app opens, so the next deployment update is discovered promptly.
        registration.update().catch(() => undefined);
        const activateUpdate = () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        if (registration.waiting) activateUpdate();
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) activateUpdate();
          });
        });
      } catch {
        // PWA enhancements must never block private app access.
      }
    };
    const onControllerChange = () => {
      // The fresh worker is active; its policy intentionally keeps private app data network-only.
      refreshing = true;
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    register();
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      void refreshing;
    };
  }, []);
  return null;
}
