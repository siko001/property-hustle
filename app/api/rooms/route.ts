import { NextResponse } from 'next/server';
import { createRoom, listRooms } from '@/lib/rooms/registry';
import type { Difficulty, RoomRules } from '@/lib/game/types';
import type { SharedRoomMode } from '@/lib/rooms/types';

export const runtime = 'nodejs';

type CreateRoomBody = {
  code?: string;
  title?: string;
  mode?: SharedRoomMode;
  maxPlayers?: number;
  bots?: number;
  difficulty?: Difficulty;
  rules?: RoomRules;
  clientId?: string;
  playerName?: string;
  secret?: string;
};

export async function GET() {
  return NextResponse.json({ rooms: listRooms() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateRoomBody;
  if (!body.code || !body.mode || !body.rules || !body.clientId) {
    return NextResponse.json({ message: 'Missing room details.' }, { status: 400 });
  }

  const room = createRoom({
    code: body.code,
    title: body.title,
    mode: body.mode,
    maxPlayers: body.maxPlayers ?? 4,
    bots: body.bots ?? 0,
    difficulty: body.difficulty ?? 'medium',
    rules: body.rules,
    hostClientId: body.clientId,
    hostName: body.playerName,
    secret: body.secret
  });

  return NextResponse.json({ room, joined: true, role: 'host' }, { status: 201 });
}
