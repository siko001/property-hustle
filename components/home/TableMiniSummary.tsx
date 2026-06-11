'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { TableCard } from '@/components/home/types';

export function TableMiniSummary({
  icon,
  label,
  cards,
  total,
  collapsed,
  onToggle
}: {
  icon: ReactNode;
  label: string;
  cards: TableCard[];
  total: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const cardGroups =
    label === 'Board'
      ? Array.from(new Set(cards.map((item) => item.card.district ?? 'Properties'))).map(
          (district) => ({
            label: district,
            cards: cards.filter((item) => (item.card.district ?? 'Properties') === district)
          })
        )
      : cards.map((item) => ({ label: item.card.name, cards: [item] }));

  return (
    <div className={`table-mini-summary ${collapsed ? 'collapsed' : ''}`}>
      <div className="table-mini-heading">
        {icon}
        <span>{label}</span>
        <strong>{total}</strong>
        <button
          className="mini-summary-toggle"
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Show' : 'Hide'} ${label.toLowerCase()} cards`}
        >
          <ChevronRight size={14} />
        </button>
      </div>
      {!collapsed && (
        <div className="table-mini-cards">
          {cards.length === 0 ? (
            <span className="table-mini-empty">No cards</span>
          ) : (
            <>
              {cardGroups.map((group, groupIndex) => (
                <div className="table-mini-set" key={`${label}-${group.label}-${groupIndex}`}>
                  {group.cards.map((item, index) => (
                    <div
                      className="table-mini-card"
                      key={`${label}-${group.label}-${item.owner}-${item.card.id}-${index}`}
                      style={{ '--accent': item.card.accent, '--mini-stack-index': index } as CSSProperties}
                      title={`${item.card.name} - ${item.card.value}M`}
                    >
                      <small>{item.card.type}</small>
                      <b>{item.card.name}</b>
                      <em>{item.card.value}M</em>
                    </div>
                  ))}
                  {label === 'Board' && group.cards.length > 1 && (
                    <span className="table-mini-set-count">{group.cards.length}</span>
                  )}
                </div>
              ))}
              {cardGroups.length > 4 && (
                <span className="table-mini-more" title={`${cardGroups.length - 4} more stacks`}>
                  +{cardGroups.length - 4}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
