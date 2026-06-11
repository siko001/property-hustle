'use client';

import { useCallback, useState } from 'react';
import QRCode from 'qrcode';

/** Owns the room QR-code data URL and how it is generated. */
export function useQrCode() {
  const [qr, setQr] = useState('');

  const createQr = useCallback(async (payload: string) => {
    const nextQr = await QRCode.toDataURL(payload, {
      margin: 1,
      width: 320,
      color: { dark: '#17212b', light: '#ffffff' }
    });
    setQr(nextQr);
  }, []);

  return { qr, createQr };
}
