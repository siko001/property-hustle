import type { CardType, GameCard } from '@/lib/game/types';

export type Screen = 'dashboard' | 'settings' | 'lobby' | 'offline' | 'game';
export type RoomMode = 'online' | 'offline' | 'bots';
export type TableZone = 'property' | 'bank' | 'action';
export type TableCard = { card: GameCard; zone: TableZone; playedAs: CardType; owner: string };

export type CardRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CardFlight = {
  id: string;
  card: GameCard;
  faceDown: boolean;
  from: CardRect;
  x: number;
  y: number;
  delay: number;
};
