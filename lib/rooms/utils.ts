import type { Difficulty, RoomMode, RoomRules } from '@/lib/game/types';
import { GAME_STATE_STORAGE_PREFIX } from '@/lib/game/constants';

export type ParsedInvite = {
  code: string;
  mode: RoomMode;
  secret?: string;
};

export function cleanRoomCode(value: string) {
  return value.trim().replace(/[^a-z0-9]/gi, '').toUpperCase();
}

export function getGameStateStorageKey(roomCode: string, playerId: string) {
  return `${GAME_STATE_STORAGE_PREFIX}:${cleanRoomCode(roomCode)}:${playerId}`;
}

export function buildJoinUrl(code: string) {
  if (typeof window === 'undefined') return `property-hustle://join/${code}`;
  return `${window.location.origin}/${cleanRoomCode(code)}`;
}

export function buildLocalJoinUrl(code: string, secret: string) {
  if (typeof window === 'undefined') {
    return `/offline?room=${encodeURIComponent(cleanRoomCode(code))}&secret=${encodeURIComponent(secret)}`;
  }
  const url = new URL('/offline', window.location.origin);
  url.searchParams.set('room', cleanRoomCode(code));
  url.searchParams.set('secret', secret);
  return url.toString();
}

export function roomSettingsSignature({
  players,
  bots,
  difficulty,
  rules
}: {
  players: number;
  bots: number;
  difficulty: Difficulty;
  rules: RoomRules;
}) {
  return JSON.stringify({ players, bots, difficulty, rules });
}

export function parseInvitePayload(value: string): ParsedInvite | null {
  const rawValue = value.trim();
  if (!rawValue) return null;

  const lanMatch = rawValue.match(/^PH-LAN:([^:]+)(?::(.+))?$/i);
  if (lanMatch) {
    const code = cleanRoomCode(lanMatch[1]);
    if (!code) return null;
    return { code, mode: 'offline', secret: lanMatch[2]?.trim() };
  }

  try {
    const base = typeof window === 'undefined' ? 'https://property-hustle.local' : window.location.origin;
    const url = new URL(rawValue, base);
    const queryCode = url.searchParams.get('room');
    const queryMode = url.searchParams.get('mode')?.toLowerCase();
    const querySecret = url.searchParams.get('secret')?.trim();

    if (queryCode) {
      const code = cleanRoomCode(queryCode);
      if (!code) return null;
      return {
        code,
        mode: queryMode === 'offline' || queryMode === 'lan' ? 'offline' : 'online',
        secret: querySecret || undefined
      };
    }

    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length === 1) {
      if (pathParts[0].toLowerCase() === 'offline') return null;
      const code = cleanRoomCode(pathParts[0]);
      if (code.length >= 4 && code.length <= 16) {
        return { code, mode: 'online' };
      }
    }

    if (url.protocol === 'property-hustle:' && url.hostname.toLowerCase() === 'join') {
      const code = cleanRoomCode(url.pathname);
      if (!code) return null;
      return { code, mode: 'online' };
    }
  } catch {
    // Fall back to bare room-code parsing below.
  }

  const bareCode = cleanRoomCode(rawValue);
  if (bareCode.length >= 4 && bareCode.length <= 16) {
    return { code: bareCode, mode: 'online' };
  }

  return null;
}
