export type Difficulty = 'easy' | 'medium' | 'hard';
export type CardType = 'property' | 'money' | 'action' | 'rent' | 'defense' | 'wild';
export type ActionKind =
  | 'rent'
  | 'stealProperty'
  | 'swapProperty'
  | 'draw'
  | 'block'
  | 'stealSet'
  | 'birthday'
  | 'doubleRent'
  | 'house'
  | 'hotel';
export type PlayStyle = 'anyThree' | 'oneEach' | 'rush' | 'draft';
export type RoomRules = {
  playStyle: PlayStyle;
  allowTeamDefense: boolean;
  chainBlocks: boolean;
  actionCardsAsMoney: boolean;
  rentMultiplier: boolean;
  wildCardsMoveFreely: boolean;
  turnSeconds: number;
  reminderEverySeconds: number;
  autoSkip: boolean;
};
export type Player = { id:string; name:string; isBot?:boolean; difficulty?:Difficulty; score:number; cards:number; ready?:boolean };
export type GameCard = {
  id:string;
  name:string;
  type:CardType;
  value:number;
  text:string;
  accent:string;
  district?:string;
  setSize?:number;
  wildDistricts?:string[];
  actionKind?:ActionKind;
};
export type Room = { code:string; mode:'online'|'offline'|'bots'; players:Player[]; rules:RoomRules; status:'lobby'|'playing'|'paused'; round:number; currentPlayer:number; };

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
