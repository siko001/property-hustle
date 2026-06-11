'use client';

import type { CSSProperties } from 'react';
import { Gamepad2 } from 'lucide-react';
import type { CardFlight } from '@/components/home/types';
import { getCardStyle, getWildcardBand } from '@/lib/game/card-style';

export function FlyingCard({ flight }: { flight: CardFlight }) {
  const style = getCardStyle(flight.card, {
    left: flight.from.left,
    top: flight.from.top,
    width: flight.from.width,
    height: flight.from.height,
    animationDelay: `${flight.delay}ms`,
    '--fly-x': `${flight.x}px`,
    '--fly-y': `${flight.y}px`,
    '--fly-mid-x': `${flight.x * 0.48}px`,
    '--fly-mid-y': `${flight.y * 0.42 - 32}px`
  } as CSSProperties);

  return (
    <div
      className={`flying-card ${getWildcardBand(flight.card) ? 'wild-choice' : ''} ${flight.faceDown ? 'face-down' : ''}`}
      style={style}
      aria-hidden="true"
    >
      {flight.faceDown ? (
        <div className="card-back-mark">
          <Gamepad2 size={24} />
          <span>Property Hustle</span>
        </div>
      ) : (
        <>
          <span>{flight.card.type}</span>
          <strong>{flight.card.name}</strong>
          <small>{flight.card.text}</small>
          <b>{flight.card.value}M</b>
        </>
      )}
    </div>
  );
}
