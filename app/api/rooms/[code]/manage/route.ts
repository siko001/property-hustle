import { NextResponse } from 'next/server';
import { acceptReplay, removeRoomSeat, requestReplay, startReplay, startRoom, updateRoom } from '@/lib/rooms/registry';
import type { Difficulty, RoomRules } from '@/lib/game/types';

export const runtime = 'nodejs';

type ManageRoomBody =
  | { action?: 'start'; clientId?: string }
  | { action?: 'request-replay'; clientId?: string }
  | { action?: 'accept-replay'; clientId?: string }
  | { action?: 'start-replay'; clientId?: string }
  | { action?: 'remove-bot'; clientId?: string }
  | { action?: 'remove-member'; clientId?: string; memberId?: string }
  | {
      action?: 'update';
      clientId?: string;
      maxPlayers?: number;
      bots?: number;
      difficulty?: Difficulty;
      rules?: RoomRules;
    };

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const body = (await request.json()) as ManageRoomBody;
  if (!body.clientId) {
    return NextResponse.json({ message: 'Missing room owner identity.' }, { status: 400 });
  }

  const result =
    body.action === 'start'
      ? startRoom(code, body.clientId)
      : body.action === 'request-replay'
        ? requestReplay(code, body.clientId)
      : body.action === 'accept-replay'
        ? acceptReplay(code, body.clientId)
      : body.action === 'start-replay'
        ? startReplay(code, body.clientId)
      : body.action === 'remove-bot'
        ? removeRoomSeat(code, body.clientId, { type: 'bot' })
      : body.action === 'remove-member' && body.memberId
          ? removeRoomSeat(code, body.clientId, { type: 'member', memberId: body.memberId })
          : body.action === 'update' &&
              body.maxPlayers !== undefined &&
              body.bots !== undefined &&
              body.difficulty &&
              body.rules
            ? updateRoom(code, body.clientId, {
                maxPlayers: body.maxPlayers,
                bots: body.bots,
                difficulty: body.difficulty,
                rules: body.rules
              })
          : { error: 'Unknown room action.' };

  if ('error' in result) {
    const status = result.error === 'Room not found.' ? 404 : 409;
    return NextResponse.json({ message: result.error }, { status });
  }

  return NextResponse.json({ room: result.room });
}
