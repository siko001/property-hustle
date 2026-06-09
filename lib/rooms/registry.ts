import type { Difficulty, RoomRules } from '@/lib/game/types';
import { defaultRules } from '@/lib/game/rules';
import type {
  RoomJoinResult,
  SharedRoom,
  SharedRoomMember,
  SharedRoomMode,
  SharedRoomStatus
} from '@/lib/rooms/types';

type StoredRoom = {
  code: string;
  title: string;
  mode: SharedRoomMode;
  maxPlayers: number;
  bots: number;
  difficulty: Difficulty;
  rules: RoomRules;
  members: SharedRoomMember[];
  status: SharedRoomStatus;
  replay?: {
    requestedBy: string;
    acceptedIds: string[];
  };
  secret?: string;
  createdAt: string;
  updatedAt: string;
};

type RoomRegistryGlobal = typeof globalThis & {
  propertyHustleRooms?: Map<string, StoredRoom>;
};

const registryGlobal = globalThis as RoomRegistryGlobal;
const rooms = registryGlobal.propertyHustleRooms ?? new Map<string, StoredRoom>();
registryGlobal.propertyHustleRooms = rooms;

function seedRoom(room: StoredRoom) {
  if (!rooms.has(room.code)) rooms.set(room.code, room);
}

const seedTime = new Date().toISOString();
seedRoom({
  code: 'BAZAAR',
  title: 'Bazaar rush',
  mode: 'online',
  maxPlayers: 5,
  bots: 0,
  difficulty: 'medium',
  rules: { ...defaultRules, playStyle: 'rush' },
  members: [
    { id: 'bazaar-host', name: 'Maya', isHost: true },
    { id: 'bazaar-guest-1', name: 'Guest 2', isHost: false },
    { id: 'bazaar-guest-2', name: 'Guest 3', isHost: false }
  ],
  status: 'lobby',
  createdAt: seedTime,
  updatedAt: seedTime
});
seedRoom({
  code: 'MINT7',
  title: 'Mint bot table',
  mode: 'bots',
  maxPlayers: 4,
  bots: 2,
  difficulty: 'medium',
  rules: { ...defaultRules, playStyle: 'anyThree' },
  members: [{ id: 'mint-host', name: 'Theo', isHost: true }],
  status: 'lobby',
  createdAt: seedTime,
  updatedAt: seedTime
});
seedRoom({
  code: 'LAN9',
  title: 'Hotspot nearby',
  mode: 'offline',
  maxPlayers: 6,
  bots: 0,
  difficulty: 'medium',
  rules: { ...defaultRules, playStyle: 'oneEach' },
  members: [
    { id: 'lan-host', name: 'Local host', isHost: true },
    { id: 'lan-guest-1', name: 'Guest 2', isHost: false },
    { id: 'lan-guest-2', name: 'Guest 3', isHost: false },
    { id: 'lan-guest-3', name: 'Guest 4', isHost: false }
  ],
  status: 'lobby',
  secret: 'LAN9-ROOM-KEY',
  createdAt: seedTime,
  updatedAt: seedTime
});
seedRoom({
  code: 'VAULT',
  title: 'Late game table',
  mode: 'online',
  maxPlayers: 6,
  bots: 0,
  difficulty: 'hard',
  rules: { ...defaultRules, playStyle: 'draft' },
  members: Array.from({ length: 6 }, (_, index) => ({
    id: index === 0 ? 'vault-host' : `vault-guest-${index}`,
    name: index === 0 ? 'Nico' : `Guest ${index + 1}`,
    isHost: index === 0
  })),
  status: 'playing',
  createdAt: seedTime,
  updatedAt: seedTime
});

function normalizeCode(code: string) {
  return code.trim().replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function publicRoom(room: StoredRoom): SharedRoom {
  const occupiedSeats = room.members.length + room.bots;
  return {
    ...room,
    members: room.members.map((member) => ({ ...member })),
    occupiedSeats,
    full: occupiedSeats >= room.maxPlayers
  };
}

export function createRoom(input: {
  code: string;
  title?: string;
  mode: SharedRoomMode;
  maxPlayers: number;
  bots: number;
  difficulty: Difficulty;
  rules: RoomRules;
  hostClientId: string;
  hostName?: string;
  secret?: string;
}) {
  const code = normalizeCode(input.code);
  const maxPlayers = Math.max(2, Math.min(5, input.maxPlayers));
  const bots = Math.max(0, Math.min(4, maxPlayers - 1, input.bots));
  const now = new Date().toISOString();
  const room: StoredRoom = {
    code,
    title: input.title?.trim() || 'My table',
    mode: input.mode,
    maxPlayers,
    bots,
    difficulty: input.difficulty,
    rules: input.rules,
    members: [
      {
        id: input.hostClientId,
        name: input.hostName?.trim() || 'Host',
        isHost: true
      }
    ],
    status: 'lobby',
    secret: input.secret,
    createdAt: now,
    updatedAt: now
  };

  rooms.set(code, room);
  return publicRoom(room);
}

export function getRoom(code: string) {
  const room = rooms.get(normalizeCode(code));
  return room ? publicRoom(room) : null;
}

export function listRooms() {
  return Array.from(rooms.values())
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(publicRoom);
}

export function deleteRoom(code: string) {
  return rooms.delete(normalizeCode(code));
}

function getHostRoom(code: string, clientId: string) {
  const room = rooms.get(normalizeCode(code));
  if (!room) return { error: 'Room not found.' } as const;
  const host = room.members.find((member) => member.isHost);
  if (host?.id !== clientId) return { error: 'Only the room owner can manage seats.' } as const;
  return { room } as const;
}

export function removeRoomSeat(
  code: string,
  clientId: string,
  target: { type: 'member'; memberId: string } | { type: 'bot' }
) {
  const result = getHostRoom(code, clientId);
  if ('error' in result) return result;
  const { room } = result;
  if (room.status !== 'lobby') return { error: 'Players cannot be removed after the game starts.' } as const;

  if (target.type === 'bot') {
    if (room.bots < 1) return { error: 'There are no bots to remove.' } as const;
    room.bots -= 1;
  } else {
    const member = room.members.find((item) => item.id === target.memberId);
    if (!member) return { error: 'Player not found.' } as const;
    if (member.isHost) return { error: 'The room owner cannot remove themselves.' } as const;
    room.members = room.members.filter((item) => item.id !== target.memberId);
  }

  room.updatedAt = new Date().toISOString();
  return { room: publicRoom(room) } as const;
}

export function startRoom(code: string, clientId: string) {
  const result = getHostRoom(code, clientId);
  if ('error' in result) return result;
  const { room } = result;
  if (room.status !== 'lobby') return { error: 'This game has already started.' } as const;
  if (room.members.length + room.bots < 2) {
    return { error: 'At least 2 players are required to start the game.' } as const;
  }

  room.status = 'playing';
  room.replay = undefined;
  room.updatedAt = new Date().toISOString();
  return { room: publicRoom(room) } as const;
}

export function requestReplay(code: string, clientId: string) {
  const room = rooms.get(normalizeCode(code));
  if (!room) return { error: 'Room not found.' } as const;
  const member = room.members.find((item) => item.id === clientId);
  if (!member) return { error: 'Only players in this room can request a replay.' } as const;
  if (room.status !== 'playing') return { error: 'Replay is only available after a started game.' } as const;

  room.replay = {
    requestedBy: clientId,
    acceptedIds: Array.from(new Set([clientId]))
  };
  room.updatedAt = new Date().toISOString();
  return { room: publicRoom(room) } as const;
}

export function acceptReplay(code: string, clientId: string) {
  const room = rooms.get(normalizeCode(code));
  if (!room) return { error: 'Room not found.' } as const;
  const member = room.members.find((item) => item.id === clientId);
  if (!member) return { error: 'Only players in this room can accept a replay.' } as const;
  if (!room.replay) return { error: 'No replay request is active.' } as const;

  room.replay.acceptedIds = Array.from(new Set([...room.replay.acceptedIds, clientId]));
  room.updatedAt = new Date().toISOString();
  return { room: publicRoom(room) } as const;
}

export function startReplay(code: string, clientId: string) {
  const result = getHostRoom(code, clientId);
  if ('error' in result) return result;
  const { room } = result;
  if (room.status !== 'playing') return { error: 'This room is not in a started game.' } as const;
  if (room.mode === 'online') {
    const acceptedIds = new Set(room.replay?.acceptedIds ?? []);
    const allAccepted = room.members.every((member) => acceptedIds.has(member.id));
    if (!allAccepted) return { error: 'Every online player must accept the replay first.' } as const;
  }

  room.replay = undefined;
  room.updatedAt = new Date().toISOString();
  return { room: publicRoom(room) } as const;
}

export function updateRoom(
  code: string,
  clientId: string,
  updates: {
    maxPlayers: number;
    bots: number;
    difficulty: Difficulty;
    rules: RoomRules;
  }
) {
  const result = getHostRoom(code, clientId);
  if ('error' in result) return result;
  const { room } = result;
  if (room.status !== 'lobby') return { error: 'Room settings are locked after the game starts.' } as const;

  const maxPlayers = Math.max(2, Math.min(5, updates.maxPlayers));
  if (maxPlayers < room.members.length) {
    return { error: 'Remove players before reducing the room below its occupied seats.' } as const;
  }

  room.maxPlayers = maxPlayers;
  room.bots = Math.max(0, Math.min(4, maxPlayers - room.members.length, updates.bots));
  room.difficulty = updates.difficulty;
  room.rules = updates.rules;
  room.updatedAt = new Date().toISOString();
  return { room: publicRoom(room) } as const;
}

export function joinRoom(code: string, clientId: string, name?: string, secret?: string): RoomJoinResult | null {
  const room = rooms.get(normalizeCode(code));
  if (!room) return null;

  const existingMember = room.members.find((member) => member.id === clientId);
  if (existingMember) {
    return {
      room: publicRoom(room),
      joined: true,
      role: existingMember.isHost ? 'host' : 'member'
    };
  }

  if (room.mode === 'offline' && room.secret?.toUpperCase() !== secret?.trim().toUpperCase()) {
    return {
      room: publicRoom(room),
      joined: false,
      role: 'viewer',
      message: 'The local table secret key is incorrect.'
    };
  }

  const occupiedSeats = room.members.length + room.bots;
  if (room.status !== 'lobby' || occupiedSeats >= room.maxPlayers) {
    return {
      room: publicRoom(room),
      joined: false,
      role: 'viewer',
      message: room.status !== 'lobby' ? 'This game has already started.' : 'This room is full.'
    };
  }

  room.members.push({
    id: clientId,
    name: name?.trim() || `Guest ${room.members.length + 1}`,
    isHost: false
  });
  room.updatedAt = new Date().toISOString();

  return {
    room: publicRoom(room),
    joined: true,
    role: 'member'
  };
}
