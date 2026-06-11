'use client';

import { useEffect, useState } from 'react';
import { Bot, ChevronRight, Filter, Radio, Search, Trash2, Wifi } from 'lucide-react';
import { roomFilters } from '@/components/home/constants';
import type { ActiveRoom, RoomFilter } from '@/components/home/types';
import { playStyleLabels } from '@/lib/game/rules';

export function ActiveRoomsPanel({
  rooms,
  collapsed,
  onCollapsedChange,
  allowDelete,
  onDelete,
  onJoin
}: {
  rooms: ActiveRoom[];
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  allowDelete: boolean;
  onDelete: (room: ActiveRoom) => Promise<void>;
  onJoin: (room: ActiveRoom) => void;
}) {
  const [filter, setFilter] = useState<RoomFilter>('all');
  const [search, setSearch] = useState('');
  const [pendingDeleteRoom, setPendingDeleteRoom] = useState<ActiveRoom | null>(null);
  const joinableCount = rooms.filter((room) => room.status === 'lobby' && room.playerCount < room.maxPlayers).length;

  useEffect(() => {
    if (rooms.length === 0 && !collapsed) {
      onCollapsedChange(true);
    }
  }, [collapsed, onCollapsedChange, rooms.length]);

  const filteredRooms = rooms.filter((room) => {
    const joinable = room.status === 'lobby' && room.playerCount < room.maxPlayers;
    const matchesFilter =
      filter === 'all' ||
      (filter === 'joinable' && joinable) ||
      (filter === 'mine' && room.myRoom) ||
      room.mode === filter;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      room.code.toLowerCase().includes(query) ||
      room.title.toLowerCase().includes(query) ||
      room.host.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  return (
    <section className={`surface active-rooms-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="active-rooms-header">
        <div>
          <div className="section-kicker">Active rooms</div>
          <h2>Join a table</h2>
          <p className="active-rooms-summary">
            {joinableCount} joinable - {rooms.length} active
          </p>
        </div>
        <div className="active-rooms-controls">
          {!collapsed && (
            <label className="room-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Code, host, room"
              />
            </label>
          )}
          <button
            className="collapse-button"
            onClick={() => rooms.length > 0 && onCollapsedChange(!collapsed)}
            disabled={rooms.length === 0}
            aria-expanded={!collapsed}
            aria-controls="active-rooms-body"
          >
            <ChevronRight size={18} />
            <span>{rooms.length === 0 ? 'No rooms' : collapsed ? 'Show' : 'Hide'}</span>
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="active-rooms-body" id="active-rooms-body">
          <div className="room-filter-row" aria-label="Room filters">
            <Filter size={16} />
            {roomFilters.map((item) => (
              <button
                className={filter === item.id ? 'active' : ''}
                key={item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="active-room-list">
            {filteredRooms.length === 0 ? (
              <p className="empty-rooms">No rooms match that filter.</p>
            ) : (
              filteredRooms.map((room) => {
                const joinable = room.status === 'lobby' && room.playerCount < room.maxPlayers;
                const actionLabel = room.myRoom ? 'Open' : joinable ? 'Join' : 'View';

                return (
                  <article
                    className="active-room-card"
                    key={`${room.myRoom ? 'mine' : room.host}-${room.code}-${room.title}`}
                  >
                    <div className={`room-mode-mark ${room.mode}`}>
                      {room.mode === 'online' && <Wifi size={18} />}
                      {room.mode === 'offline' && <Radio size={18} />}
                      {room.mode === 'bots' && <Bot size={18} />}
                    </div>
                    <div className="room-card-main">
                      <div className="room-card-title">
                        <strong>{room.title}</strong>
                        <span>{room.code}</span>
                      </div>
                      <div className="room-card-meta">
                        <span>{room.host}</span>
                        <span>{room.playerCount}/{room.maxPlayers} seats</span>
                        <span>{playStyleLabels[room.playStyle]}</span>
                        {room.bots > 0 && <span>{room.bots} bots</span>}
                      </div>
                    </div>
                    <div className="room-card-side">
                      <span className={`room-status ${joinable ? 'joinable' : room.status}`}>
                        {joinable ? 'Joinable' : room.status}
                      </span>
                      <div className="room-card-buttons">
                        <button className="ghost-button" onClick={() => onJoin(room)}>
                          {actionLabel}
                        </button>
                        {allowDelete && (
                          <button
                            className="room-delete-button"
                            onClick={() => setPendingDeleteRoom(room)}
                            aria-label={`Delete ${room.title}`}
                            title={`Delete ${room.title}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}
      {pendingDeleteRoom && (
        <ConfirmDeleteRoom
          room={pendingDeleteRoom}
          onCancel={() => setPendingDeleteRoom(null)}
          onConfirm={() => {
            const room = pendingDeleteRoom;
            setPendingDeleteRoom(null);
            void onDelete(room);
          }}
        />
      )}
    </section>
  );
}

function ConfirmDeleteRoom({
  room,
  onCancel,
  onConfirm
}: {
  room: ActiveRoom;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, onConfirm]);

  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Delete room confirmation">
      <div className="confirm-sheet">
        <div className="section-kicker">Local maintenance</div>
        <h2>Delete {room.code}?</h2>
        <p>
          This removes <strong>{room.title}</strong> from the local room list. Other devices will no
          longer be able to join a registered room after it is deleted.
        </p>
        <div className="confirm-actions">
          <button className="ghost-button" onClick={onCancel}>
            Keep room
          </button>
          <button className="danger-button" onClick={onConfirm}>
            <Trash2 size={18} />
            Delete room
          </button>
        </div>
      </div>
    </div>
  );
}
