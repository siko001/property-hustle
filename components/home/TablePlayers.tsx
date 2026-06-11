'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MutableRefObject } from 'react';
import { Bot, Users } from 'lucide-react';
import type { TableCard } from '@/components/home/types';
import { districtSets } from '@/lib/game/deck';
import { getCompletedSetCount } from '@/lib/game/engine';
import type { Player } from '@/lib/game/types';

export function TablePlayerLayout({
  players,
  activeIndex,
  tableCards,
  playerRefs
}: {
  players: Player[];
  activeIndex: number;
  tableCards: TableCard[];
  playerRefs: MutableRefObject<Map<string, HTMLElement>>;
}) {
  const [autoExpandedPlayerId, setAutoExpandedPlayerId] = useState<string | null>(null);
  const [suppressedAutoPlayerId, setSuppressedAutoPlayerId] = useState<string | null>(null);
  const [manualExpandedPlayerIds, setManualExpandedPlayerIds] = useState<string[]>([]);
  const previousAutoPlayerIdRef = useRef<string | null>(null);
  const opponents = players.slice(1);
  const activeAutoPlayerId = activeIndex > 0 ? players[activeIndex]?.id ?? null : null;
  const playerIdsKey = players.map((player) => player.id).join('|');

  useEffect(() => {
    const previousAutoPlayerId = previousAutoPlayerIdRef.current;

    if (previousAutoPlayerId && previousAutoPlayerId !== activeAutoPlayerId) {
      setManualExpandedPlayerIds((current) => current.filter((id) => id !== previousAutoPlayerId));
    }

    setAutoExpandedPlayerId(activeAutoPlayerId);
    setSuppressedAutoPlayerId(null);
    previousAutoPlayerIdRef.current = activeAutoPlayerId;
  }, [activeAutoPlayerId]);

  useEffect(() => {
    const validPlayerIds = new Set(players.map((player) => player.id));
    setManualExpandedPlayerIds((current) => current.filter((id) => validPlayerIds.has(id)));
  }, [playerIdsKey, players]);

  if (opponents.length === 0) {
    return null;
  }

  const opponentColumns = opponents.reduce<Array<Array<{ player: Player; index: number }>>>(
    (columns, player, index) => {
      columns[index % 2].push({ player, index });
      return columns;
    },
    [[], []]
  ).filter((column) => column.length > 0);

  return (
    <div className={`table-player-layout opponents-${opponents.length}`}>
      <div className="table-opponents" style={{ '--opponent-count': opponents.length } as CSSProperties}>
        {opponentColumns.map((column, columnIndex) => (
          <div className="table-opponent-column" key={`opponent-column-${columnIndex}`}>
            {column.map(({ player, index }) => {
              const isManuallyExpanded = manualExpandedPlayerIds.includes(player.id);
              const isAutoExpanded = autoExpandedPlayerId === player.id && suppressedAutoPlayerId !== player.id;
              const expanded = isManuallyExpanded || isAutoExpanded;

              return (
                <TablePlayerCard
                  key={player.id}
                  player={player}
                  isActive={players.indexOf(player) === activeIndex}
                  tableCards={tableCards}
                  expanded={expanded}
                  onToggle={() => {
                    if (isManuallyExpanded) {
                      setManualExpandedPlayerIds((current) => current.filter((id) => id !== player.id));
                      return;
                    }

                    if (isAutoExpanded) {
                      setSuppressedAutoPlayerId(player.id);
                      return;
                    }

                    setSuppressedAutoPlayerId((current) => (current === player.id ? null : current));
                    setManualExpandedPlayerIds((current) => (
                      current.includes(player.id) ? current : [...current, player.id]
                    ));
                  }}
                  slotIndex={index}
                  playerRefs={playerRefs}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TablePlayerCard({
  player,
  isActive,
  tableCards,
  expanded,
  onToggle,
  slotIndex,
  playerRefs
}: {
  player: Player;
  isActive: boolean;
  tableCards: TableCard[];
  expanded: boolean;
  onToggle: () => void;
  slotIndex: number;
  playerRefs: MutableRefObject<Map<string, HTMLElement>>;
}) {
  const playedCards = tableCards.filter((item) => item.owner === player.name);
  const propertyCards = playedCards.filter((item) => item.zone === 'property');
  const propertyCount = propertyCards.length;
  const completedSetCount = getCompletedSetCount(tableCards, player.name);
  const bankTotal = playedCards
    .filter((item) => item.zone === 'bank')
    .reduce((total, item) => total + item.card.value, 0);
  const playedCardStacks = Array.from(
    propertyCards.reduce((groups, item) => {
      const groupKey = `property-${item.card.district ?? 'other'}`;
      groups.set(groupKey, [...(groups.get(groupKey) ?? []), item]);
      return groups;
    }, new Map<string, TableCard[]>()).entries()
  );
  const districtProgress = districtSets
    .map((district) => ({
      ...district,
      owned: propertyCards.filter((item) => item.card.district === district.name).length
    }))
    .filter((district) => district.owned > 0);

  return (
    <article
      className={`table-player-card ${isActive ? 'active' : ''}`}
      ref={(node) => {
        if (node) {
          playerRefs.current.set(player.id, node);
        } else {
          playerRefs.current.delete(player.id);
        }
      }}
      style={{ '--slot-index': slotIndex } as CSSProperties}
    >
      <button
        className="table-player-summary"
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${player.name}'s table cards`}
      >
        <span className="seat-avatar">{player.isBot ? <Bot size={18} /> : <Users size={18} />}</span>
        <span className="seat-details">
          <strong>{player.name}</strong>
          <small>{player.ready ? 'Ready' : 'Waiting'} - {player.cards} cards</small>
          <span className="seat-table-summary">
            <span>{propertyCount} properties</span>
            <span>{completedSetCount}/3 sets</span>
            <span>{bankTotal}M bank</span>
          </span>
        </span>
        {propertyCount > 0 && (
          <span className={`seat-card-stack ${expanded ? 'expanded' : ''}`}>
            <span className="seat-card-miniatures">
              {propertyCards.slice(0, 4).map((item, cardIndex) => (
                <span
                  className="seat-card-mini"
                  key={`${player.id}-${item.card.id}-${cardIndex}`}
                  style={{ '--accent': item.card.accent, '--seat-card-index': cardIndex } as CSSProperties}
                />
              ))}
            </span>
            <span>{propertyCount}</span>
          </span>
        )}
      </button>

      {expanded && (
        <div className="table-player-expanded">
          {districtProgress.length > 0 && (
            <div className="seat-district-progress" aria-label={`${player.name}'s district progress`}>
              {districtProgress.map((district) => (
                <span
                  className="seat-district-chip"
                  key={`${player.id}-${district.name}`}
                  style={{ '--accent': district.accent } as CSSProperties}
                >
                  <span>{district.name}</span>
                  <strong>{district.owned}/{district.size}</strong>
                </span>
              ))}
            </div>
          )}
          <div className="table-player-stacks">
            {playedCardStacks.map(([groupKey, stack]) => (
              <div
                className="seat-expanded-stack"
                key={`${player.id}-${groupKey}`}
                style={{ '--seat-stack-count': stack.length } as CSSProperties}
              >
                {stack.map((item, cardIndex) => (
                  <div
                    className="seat-expanded-card"
                    key={`${player.id}-table-${item.card.id}-${item.owner}-${cardIndex}`}
                    style={{
                      '--accent': item.card.accent,
                      '--seat-expanded-index': cardIndex
                    } as CSSProperties}
                  >
                    <small>{item.card.type}</small>
                    <strong>{item.card.name}</strong>
                    <span>{item.card.value}M</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
