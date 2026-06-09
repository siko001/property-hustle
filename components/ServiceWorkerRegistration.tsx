'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    const canRegister =
      'serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost');

    if (!canRegister) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support should never block the game UI.
    });
  }, []);

  return null;
}
