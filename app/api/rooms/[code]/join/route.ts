import { NextResponse } from 'next/server';
import { joinRoom } from '@/lib/rooms/registry';

export const runtime = 'nodejs';

type JoinRoomBody = {
  clientId?: string;
  playerName?: string;
  secret?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const body = (await request.json()) as JoinRoomBody;
  if (!body.clientId) {
    return NextResponse.json({ message: 'Missing player identity.' }, { status: 400 });
  }

  const result = joinRoom(code, body.clientId, body.playerName, body.secret);
  if (!result) {
    return NextResponse.json({ message: 'Room not found.' }, { status: 404 });
  }

  return NextResponse.json(result, { status: result.joined ? 200 : 409 });
}
