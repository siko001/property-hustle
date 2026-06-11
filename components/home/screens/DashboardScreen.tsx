'use client';

import { BookOpen, Bot, Layers, Wifi, WifiOff } from 'lucide-react';
import { ActiveRoomsPanel } from '@/components/home/ActiveRoomsPanel';
import { ModeTile } from '@/components/home/primitives';
import { RoomComposer } from '@/components/home/RoomComposer';
import type { ActiveRoom } from '@/components/home/types';
import type { Difficulty, RoomRules } from '@/lib/game/types';

export function DashboardScreen({
  roomsCollapsed,
  activeRooms,
  localMaintenance,
  players,
  bots,
  difficulty,
  rules,
  onOpenRules,
  onOpenCards,
  onPlayOffline,
  onPlayBots,
  onPlayOnline,
  onRoomsCollapsedChange,
  onDeleteRoom,
  onJoinRoom,
  onPlayers,
  onBots,
  onDifficulty,
  onRules,
  onCreate,
  onClose
}: {
  roomsCollapsed: boolean;
  activeRooms: ActiveRoom[];
  localMaintenance: boolean;
  players: number;
  bots: number;
  difficulty: Difficulty;
  rules: RoomRules;
  onOpenRules: () => void;
  onOpenCards: () => void;
  onPlayOffline: () => void;
  onPlayBots: () => void;
  onPlayOnline: () => void;
  onRoomsCollapsedChange: (collapsed: boolean) => void;
  onDeleteRoom: (room: ActiveRoom) => Promise<void>;
  onJoinRoom: (room: ActiveRoom) => void;
  onPlayers: (value: number) => void;
  onBots: (value: number) => void;
  onDifficulty: (value: Difficulty) => void;
  onRules: (value: RoomRules) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  return (
    <section className={`dashboard-grid ${roomsCollapsed ? '' : 'rooms-expanded'}`}>
      <div className="dashboard-main">
        <div className="surface command-center">
          <div className="command-guide-actions">
            <button
              className="command-rules-button"
              onClick={onOpenRules}
              aria-label="Open game rules"
              title="Game rules"
            >
              <BookOpen size={21} />
            </button>
            <button
              className="command-rules-button"
              onClick={onOpenCards}
              aria-label="Open card list"
              title="Card list"
            >
              <Layers size={21} />
            </button>
          </div>
          <div className="section-kicker">Table launcher</div>
          <h1>Property Hustle</h1>
          <p className="lead">
            A fast private card battler with original property, cash, action, defense, and
            wildcard cards.
          </p>

          <div className="mode-grid">

            <ModeTile
              icon={<WifiOff size={22} />}
              title="Play Offline"
              body="Connect devices via hotspot"
              onClick={onPlayOffline}
            />

            <ModeTile
              icon={<Bot size={22} />}
              title="Play against bots"
              body="Easy, medium, hard opponents"
              onClick={onPlayBots}
            />

            <ModeTile
              icon={<Wifi size={22} />}
              title="Play online"
              body="Create a private room"
              onClick={onPlayOnline}
            />

          </div>
        </div>

        <ActiveRoomsPanel
          rooms={activeRooms}
          collapsed={roomsCollapsed}
          onCollapsedChange={onRoomsCollapsedChange}
          allowDelete={localMaintenance}
          onDelete={onDeleteRoom}
          onJoin={onJoinRoom}
        />
      </div>

      <RoomComposer
        players={players}
        bots={bots}
        difficulty={difficulty}
        rules={rules}
        onPlayers={onPlayers}
        onBots={onBots}
        onDifficulty={onDifficulty}
        onRules={onRules}
        onCreate={onCreate}
        onClose={onClose}
        editingRoom={false}
      />
    </section>
  );
}
