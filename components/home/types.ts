import type {
  CardFlight,
  CardRect,
  CardType,
  GameCard,
  PlayStyle,
  RoomMode,
  TableCard,
  TableZone
} from '@/lib/game/types';
import type { ParsedInvite } from '@/lib/rooms/utils';

// Re-exported so existing `@/components/home/types` imports keep working.
export type { CardFlight, CardRect, ParsedInvite, RoomMode, TableCard, TableZone };

export type Screen = 'dashboard' | 'settings' | 'lobby' | 'offline' | 'game';

export type Toast = { id: number; title: string; body: string };
export type RoomFilter = 'all' | 'joinable' | 'mine' | 'online' | 'offline' | 'bots';
export type ActiveRoom = {
  code: string;
  title: string;
  host: string;
  mode: RoomMode;
  playerCount: number;
  maxPlayers: number;
  bots: number;
  playStyle: PlayStyle;
  status: 'lobby' | 'playing';
  myRoom?: boolean;
  secret?: string;
  updated: string;
};
export type BarcodeDetectorShape = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};
export type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorShape;
export type RoomRole = 'host' | 'member' | 'viewer';
export type RoomNavigation = 'push' | 'replace' | 'none';
export type PlayerTargetPrompt = {
  action: GameCard;
  targetKeys: string[];
};
export type StreetSwapPrompt = {
  action: GameCard;
  actor: string;
  rivalKeys: string[];
  ownKeys: string[];
  selectedRivalKey?: string;
  selectedOwnKey?: string;
};
export type RentTargetPrompt = {
  action: GameCard;
  actor: string;
  targetOwners: string[];
  doubleRentCardId?: string;
  useDoubleRent: boolean;
};
export type SetTargetPrompt = {
  action: GameCard;
  targets: Array<{
    key: string;
    owner: string;
    district: string;
    count: number;
    value: number;
    accent: string;
    hasHouse: boolean;
    hasHotel: boolean;
  }>;
};
export type IncomingActionPrompt = {
  actor: string;
  action: GameCard;
};
export type WildcardPrompt = {
  card: GameCard;
  owner: string;
};
export type UpgradePrompt = {
  card: GameCard;
  owner: string;
  kind: 'house' | 'hotel';
  districtNames: string[];
};
export type PaymentPrompt = {
  payer: string;
  payee: string;
  amount: number;
  actionName: string;
  selectedKeys: string[];
  forcedKeys: string[];
};
export type DiscardPrompt = {
  count: number;
  selectedIds: string[];
};
export type PersistedGameState = {
  hand: GameCard[];
  drawPile: GameCard[];
  tableCards: TableCard[];
  discardPile: TableCard[];
  turnPlays: CardType[];
  actionsPlayed: number;
  currentPlayerIndex: number;
  turnSerial: number;
  turnActivitySerial: number;
  drawnTurnSerial: number;
  round: number;
  turnLog: string[];
  activeCardId: string | null;
  defendedOwners: string[];
  winner: string | null;
  botHands: Record<string, GameCard[]>;
};
