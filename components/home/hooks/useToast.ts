'use client';

import { useCallback, useState } from 'react';
import type { Toast } from '@/components/home/types';

/** Owns the transient turn-toast notification state. */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((title: string, body: string) => {
    setToast({ id: Date.now(), title, body });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, showToast, dismissToast };
}
