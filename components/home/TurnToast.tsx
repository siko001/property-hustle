'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Toast } from '@/components/home/types';

export function TurnToast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [drag, setDrag] = useState({ active: false, startX: 0, startY: 0, x: 0, y: 0 });
  const [exiting, setExiting] = useState(false);
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  const resetDrag = () => setDrag({ active: false, startX: 0, startY: 0, x: 0, y: 0 });
  const dismiss = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(() => dismissRef.current(), 260);
  }, [exiting]);

  useEffect(() => {
    let dismissTimeout: number | undefined;
    const timeout = window.setTimeout(() => {
      setExiting(true);
      dismissTimeout = window.setTimeout(() => dismissRef.current(), 260);
    }, 6000);

    return () => {
      window.clearTimeout(timeout);
      if (dismissTimeout) window.clearTimeout(dismissTimeout);
    };
  }, [toast.id]);

  return (
    <div
      className={`turn-toast ${exiting ? 'is-exiting' : ''}`}
      data-dragging={drag.active ? 'true' : 'false'}
      onDoubleClick={dismiss}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ active: true, startX: event.clientX, startY: event.clientY, x: 0, y: 0 });
      }}
      onPointerMove={(event) => {
        if (!drag.active) return;
        setDrag((current) => ({
          ...current,
          x: event.clientX - current.startX,
          y: event.clientY - current.startY
        }));
      }}
      onPointerUp={() => {
        if (Math.abs(drag.x) > 120 || Math.abs(drag.y) > 90) {
          dismiss();
          return;
        }
        resetDrag();
      }}
      style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}
      role="status"
    >
      <button
        onClick={(event) => {
          event.stopPropagation();
          dismiss();
        }}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
      <strong>{toast.title}</strong>
      <p>{toast.body}</p>
    </div>
  );
}
