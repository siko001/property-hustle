import { NextResponse } from 'next/server';
import { deleteRoom, getRoom } from '@/lib/rooms/registry';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const room = getRoom(code);
  if (!room) {
    return NextResponse.json({ message: 'Room not found.' }, { status: 404 });
  }

  return NextResponse.json({ room });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const hostname = new URL(request.url).hostname;
  if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) {
    return NextResponse.json(
      { message: 'Room deletion is only available on the local app.' },
      { status: 403 }
    );
  }

  const { code } = await context.params;
  const deleted = deleteRoom(code);
  return NextResponse.json({ deleted, code: code.toUpperCase() });
}
