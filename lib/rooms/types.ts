import type { Difficulty, RoomRules } from '@/lib/game/types';

export type SharedRoomMode = 'online' | 'offline' | 'bots';
export type SharedRoomStatus = 'lobby' | 'playing';

export type SharedRoomMember = {
  id: string;
  name: string;
  isHost: boolean;
};

export type SharedRoom = {
  code: string;
  title: string;
  mode: SharedRoomMode;
  maxPlayers: number;
  bots: number;
  difficulty: Difficulty;
  rules: RoomRules;
  members: SharedRoomMember[];
  occupiedSeats: number;
  full: boolean;
  status: SharedRoomStatus;
  replay?: {
    requestedBy: string;
    acceptedIds: string[];
  };
  secret?: string;
  createdAt: string;
  updatedAt: string;
};

export type RoomJoinResult = {
  room: SharedRoom;
  joined: boolean;
  role: 'host' | 'member' | 'viewer';
  message?: string;
};
