import type { RoomFilter } from '@/components/home/types';
import type { RoomMode } from '@/lib/game/types';

export const INITIAL_ROOM_CODE = 'ROOM42';
export const INITIAL_LOCAL_KEY = 'HOST-0000-KEYS';
export const HAND_PANEL_MIN_HEIGHT = 188;
export const HAND_PANEL_MAX_HEIGHT = 450;
export const DELETED_LOCAL_ROOMS_KEY = 'property-hustle-deleted-local-rooms';

export const roomFilters: Array<{ id: RoomFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'joinable', label: 'Joinable' },
  { id: 'mine', label: 'Mine' },
  { id: 'online', label: 'Online' },
  { id: 'offline', label: 'LAN' },
  { id: 'bots', label: 'Bots' }
];

export const modeCopy: Record<RoomMode, { title: string; body: string }> = {
  bots: {
    title: 'Bot table',
    body: 'Fill seats with easy, medium, or hard computer opponents.'
  },

  offline: {
    title: 'Local hotspot',
    body: 'One host device creates a secret LAN key for nearby players.'
  },

  online: {
    title: 'Online room',
    body: 'Private room for 2 to 5 players with optional bot seats.'
  },

};
