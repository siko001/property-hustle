'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Bot, ChevronRight, Trash2, Users } from 'lucide-react';
import type { TableCard } from '@/components/home/types';
import { districtSets } from '@/lib/game/deck';
import { getCompletedSetCount } from '@/lib/game/engine';
import type { Player } from '@/lib/game/types';

export function SeatList({
  players,
  activeIndex,
  compact = false,
  tableCards = [],
  onRemove,
  canRemove
}: {
  players: Player[];
  activeIndex: number;
  compact?: boolean;
  tableCards?: TableCard[];
  onRemove?: (player: Player) => void;
  canRemove?: (player: Player) => boolean;
}) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(compact);

  return (
    <div className={`surface seat-list ${compact ? 'compact' : ''} ${collapsed ? 'collapsed' : ''}`}>
      <div className="seat-list-heading">
        <div>
          <div className="section-kicker">{compact ? 'Players' : 'Seats'}</div>
          {compact && (
            <strong>{players[activeIndex]?.name ?? 'Player'} is playing</strong>
          )}
        </div>
        {compact && (
          <button
            className="seat-list-toggle"
            onClick={() => setCollapsed((current) => !current)}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} player panel`}
          >
            <ChevronRight size={18} />
            <span>{collapsed ? 'Show' : 'Hide'}</span>
          </button>
        )}
      </div>
      {!collapsed && players.map((player, index) => {
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
        const expanded = expandedPlayerId === player.id;
        const hasTableSummary = propertyCount > 0 || bankTotal > 0;

        return (
          <div
            className={`seat-row ${index === activeIndex ? 'active' : ''} ${
              onRemove && canRemove?.(player) ? 'removable' : ''
            } ${propertyCount > 0 ? 'has-played-cards' : ''}`}
            key={player.id}
          >
            <span className="seat-avatar">{player.isBot ? <Bot size={18} /> : <Users size={18} />}</span>
            <span className="seat-details">
              <strong>{player.name}</strong>
              <small>{player.ready ? 'Ready' : 'Waiting'} - {player.cards} cards</small>
              {compact && hasTableSummary && (
                <span className="seat-table-summary">
                  <span>{propertyCount} properties</span>
                  <span>{completedSetCount}/3 sets</span>
                  <span>{bankTotal}M bank</span>
                </span>
              )}
            </span>
            {compact && propertyCount > 0 && (
              <button
                className={`seat-card-stack ${expanded ? 'expanded' : ''}`}
                onClick={() => setExpandedPlayerId(expanded ? null : player.id)}
                aria-expanded={expanded}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${player.name}'s property cards`}
              >
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
              </button>
            )}
            {expanded && (
              <div className="seat-expanded-cards">
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
                {playedCardStacks.map(([groupKey, stack]) => (
                  <div
                    className="seat-expanded-stack"
                    key={`${player.id}-${groupKey}`}
                    style={{ '--seat-stack-count': stack.length } as CSSProperties}
                  >
                    {stack.map((item, cardIndex) => (
                      <div
                        className="seat-expanded-card"
                        key={`${player.id}-expanded-${item.card.id}-${item.owner}-${cardIndex}`}
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
            )}
            {onRemove && canRemove?.(player) && (
              <button
                className="seat-remove-button"
                onClick={() => onRemove(player)}
                aria-label={`Remove ${player.name}`}
                title={`Remove ${player.name}`}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
