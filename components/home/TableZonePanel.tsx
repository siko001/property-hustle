'use client';

import type { CSSProperties, RefObject } from 'react';
import type { TableCard } from '@/components/home/types';

export function TableZonePanel({
  zoneRef,
  title,
  cards,
  empty
}: {
  zoneRef?: RefObject<HTMLDivElement | null>;
  title: string;
  cards: TableCard[];
  empty: string;
}) {
  const ownerGroups = Array.from(new Set(cards.map((item) => item.owner))).map((owner) => {
    const ownerCards = cards.filter((item) => item.owner === owner);
    const stacks = Array.from(
      new Set(
        ownerCards.map((item) =>
          item.zone === 'property'
            ? item.card.district ?? 'Properties'
            : item.zone === 'bank'
              ? 'Bank'
              : 'Actions'
        )
      )
    ).map((label) => ({
      label,
      cards: ownerCards.filter((item) => {
        const itemLabel =
          item.zone === 'property'
            ? item.card.district ?? 'Properties'
            : item.zone === 'bank'
              ? 'Bank'
              : 'Actions';
        return itemLabel === label;
      })
    }));

    return { owner, stacks };
  });

  return (
    <div className="zone-panel" ref={zoneRef}>
      <div className="zone-title">
        <span>{title}</span>
        {cards.length > 0 && <span className="zone-card-count">{cards.length}</span>}
      </div>
      {cards.length === 0 ? (
        <p className="empty-zone">{empty}</p>
      ) : (
        <div className="player-board-grid">
          {ownerGroups.map((group) => (
            <section className="player-board" key={`${title}-${group.owner}`}>
              <header>
                <strong>{group.owner}</strong>
                <span>{group.stacks.reduce((total, stack) => total + stack.cards.length, 0)} cards</span>
              </header>
              <div className="player-board-stacks">
                {group.stacks.map((stack) => (
                  <div className="solitaire-column" key={`${group.owner}-${stack.label}`}>
                    <span className="solitaire-label">{stack.label}</span>
                    <div
                      className="solitaire-stack"
                      style={{ '--stack-size': stack.cards.length } as CSSProperties}
                    >
                      {stack.cards.map((item, index) => (
                        <article
                          className="mini-card"
                          key={`${group.owner}-${stack.label}-${item.card.id}-${index}`}
                          style={{ '--accent': item.card.accent, '--stack-index': index } as CSSProperties}
                        >
                          <span>{item.card.type}</span>
                          {item.zone === 'property' && item.playedAs === 'property' && item.card.setSize && (
                            <span
                              className="card-set-progress"
                              title={`${stack.cards.filter((card) => card.playedAs === 'property').length} of ${item.card.setSize} played`}
                            >
                              {stack.cards.filter((card) => card.playedAs === 'property').length}/{item.card.setSize}
                            </span>
                          )}
                          <strong>{item.card.name}</strong>
                          <small>{item.card.value}M</small>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
