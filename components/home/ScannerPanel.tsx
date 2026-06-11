'use client';

import { useEffect, useRef, useState } from 'react';
import { ScanLine, X } from 'lucide-react';
import type { BarcodeDetectorConstructor } from '@/components/home/types';

export function ScannerPanel({
  onClose,
  onJoin
}: {
  onClose: () => void;
  onJoin: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [scanValue, setScanValue] = useState('');
  const [cameraState, setCameraState] = useState<'requesting' | 'live' | 'detected' | 'blocked' | 'unsupported'>('requesting');
  const [cameraMessage, setCameraMessage] = useState('Requesting camera access...');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let cancelled = false;

    const stopCamera = () => {
      if (frame) cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unsupported');
        setCameraMessage('Camera scanning is not supported in this browser. Type the code below.');
        return;
      }

      try {
        setCameraState('requesting');
        setCameraMessage('Requesting camera access...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });

        if (cancelled) {
          stopCamera();
          return;
        }

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }

        setCameraState('live');
        setCameraMessage('Camera is live. Hold a room QR in view.');

        const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
        if (!Detector) {
          setCameraMessage('Camera is live. QR auto-detect is not available here, so type the code if needed.');
          return;
        }

        const detector = new Detector({ formats: ['qr_code'] });
        const scanFrame = async () => {
          if (cancelled) return;

          const liveVideo = videoRef.current;
          if (liveVideo && liveVideo.readyState >= 2) {
            try {
              const results = await detector.detect(liveVideo);
              const rawValue = results[0]?.rawValue;
              if (rawValue) {
                setScanValue(rawValue);
                setCameraState('detected');
                setCameraMessage('QR detected. Use the scanned code to join.');
                return;
              }
            } catch {
              setCameraMessage('Camera is live. Type the code if QR detection does not lock on.');
            }
          }

          frame = requestAnimationFrame(scanFrame);
        };

        frame = requestAnimationFrame(scanFrame);
      } catch {
        setCameraState('blocked');
        setCameraMessage('Camera permission was blocked or unavailable. Type the code below.');
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, []);

  return (
    <div className="scanner-backdrop" role="dialog" aria-modal="true" aria-label="QR scanner">
      <div className="scanner-sheet">
        <button className="scanner-close" onClick={onClose} aria-label="Close scanner">
          <X size={18} />
        </button>
        <div className="section-kicker">QR scanner</div>
        <div className={`scanner-frame ${cameraState === 'live' || cameraState === 'detected' ? 'camera-live' : ''}`}>
          <video ref={videoRef} autoPlay muted playsInline aria-label="Camera preview" />
          <div className="scanner-target">
            {cameraState === 'blocked' || cameraState === 'unsupported' ? <X size={42} /> : <ScanLine size={46} />}
            <span>{cameraState === 'detected' ? 'QR detected' : 'Point at room QR'}</span>
          </div>
        </div>
        <p className="scanner-status">{cameraMessage}</p>
        <label className="text-field">
          <span>Code or secret key</span>
          <input
            value={scanValue}
            onChange={(event) => setScanValue(event.target.value)}
            placeholder="ROOM42 or HOST-0000-KEYS"
          />
        </label>
        <button className="primary-button wide" onClick={() => onJoin(scanValue)}>
          <ScanLine size={18} />
          Use scanned code
        </button>
      </div>
    </div>
  );
}
