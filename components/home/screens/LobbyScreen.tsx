'use client';

import { Bot, Copy, Play, QrCode, ScanLine, Settings2, Timer, Users } from 'lucide-react';
import { MetaPill } from '@/components/home/primitives';
import { SeatList } from '@/components/home/SeatList';
import { modeCopy } from '@/components/home/constants';
import { playStyleLabels } from '@/lib/game/rules';
import type { Player, RoomMode, RoomRules } from '@/lib/game/types';
import { buildJoinUrl } from '@/lib/rooms/utils';

export function LobbyScreen({
  roomMode,
  code,
  roomJoinMessage,
  roomRole,
  isSpectator,
  roomHasStarted,
  canStartGame,
  hasMinimumPlayers,
  roomIsFull,
  occupiedSeats,
  players,
  bots,
  rules,
  qr,
  localKey,
  joinLink,
  lobbyPlayers,
  onPrimaryAction,
  onCopyInvite,
  onOpenScanner,
  onRemovePlayer,
  canRemovePlayer
}: {
  roomMode: RoomMode;
  code: string;
  roomJoinMessage: string;
  roomRole: 'host' | 'member' | 'viewer';
  isSpectator: boolean;
  roomHasStarted: boolean;
  canStartGame: boolean;
  hasMinimumPlayers: boolean;
  roomIsFull: boolean;
  occupiedSeats: number;
  players: number;
  bots: number;
  rules: RoomRules;
  qr: string;
  localKey: string;
  joinLink: string;
  lobbyPlayers: Player[];
  onPrimaryAction: () => void;
  onCopyInvite: () => void;
  onOpenScanner: () => void;
  onRemovePlayer?: (player: Player) => void;
  canRemovePlayer: (player: Player) => boolean;
}) {
  const primaryDisabled = !roomHasStarted && (!canStartGame || (canStartGame && !hasMinimumPlayers));

  return (
    <section className="lobby-layout">
      <div className="surface invite-panel">
        <div className="section-kicker">{modeCopy[roomMode].title}</div>
        <div className="room-code">{code}</div>
        <p className="lead compact">{modeCopy[roomMode].body}</p>

        {(roomJoinMessage || roomRole === 'member' || isSpectator) && (
          <div className={`lobby-notice ${roomJoinMessage || isSpectator ? 'blocked' : ''}`}>
            <strong>
              {isSpectator ? 'Spectator access' : roomJoinMessage ? 'No seat added' : 'Joined as a player'}
            </strong>
            <span>
              {isSpectator
                ? 'This game is already underway. You can watch, but cannot play cards.'
                : roomJoinMessage || 'Your seat is reserved. The host controls when the game starts.'}
            </span>
          </div>
        )}

        <div className="invite-actions">
          <button
            className="primary-button"
            onClick={onPrimaryAction}
            disabled={primaryDisabled}
          >
            <Play size={18} />
            {roomHasStarted
              ? isSpectator
                ? 'Watch game'
                : 'Continue game'
              : canStartGame
                ? hasMinimumPlayers
                  ? 'Start game'
                  : 'Need 2 players'
                : roomIsFull
                  ? 'Room full'
                  : 'Waiting for host'}
          </button>
          <button className="ghost-button" onClick={onCopyInvite}>
            <Copy size={18} />
            Copy invite
          </button>
        </div>

        <div className="room-meta">
          <MetaPill icon={<Users size={16} />} label={`${occupiedSeats}/${players} seats`} />
          <MetaPill icon={<Bot size={16} />} label={`${bots} bots`} />
          <MetaPill icon={<Settings2 size={16} />} label={playStyleLabels[rules.playStyle]} />
          <MetaPill icon={<Timer size={16} />} label={`${rules.turnSeconds}s turns`} />
        </div>
      </div>

      <div className="surface qr-panel">
        <div className="qr-card">{qr ? <img src={qr} alt="Room QR code" /> : <QrCode size={132} />}</div>
        <button className="scanner-button" onClick={onOpenScanner}>
          <ScanLine size={18} />
          Open scanner
        </button>
        <div>
          <div className="section-kicker">{roomMode === 'offline' ? 'LAN secret key' : 'Join link'}</div>
          <p className="secret-key">{roomMode === 'offline' ? localKey : joinLink || buildJoinUrl(code)}</p>
        </div>
      </div>

      <SeatList
        players={lobbyPlayers}
        activeIndex={-1}
        onRemove={onRemovePlayer}
        canRemove={canRemovePlayer}
      />
    </section>
  );
}
