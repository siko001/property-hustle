'use client';

import type { CSSProperties } from 'react';
import { X } from 'lucide-react';
import { starterDeck } from '@/lib/game/deck';
import { playStyleLabels } from '@/lib/game/rules';
import type { RoomRules } from '@/lib/game/types';

export function RulesGuide({ rules, onClose }: { rules: RoomRules; onClose: () => void }) {
  const actionCards = starterDeck.filter(
    (card, index, cards) =>
      Boolean(card.actionKind) &&
      cards.findIndex((candidate) => candidate.name === card.name) === index
  );
  const playsPerTurn = rules.playStyle === 'rush' || rules.playStyle === 'draft' ? 2 : 3;

  return (
    <div className="confirm-backdrop rules-guide-backdrop" role="dialog" aria-modal="true" aria-label="Game rules">
      <section className="rules-guide">
        <header className="rules-guide-header">
          <div>
            <div className="section-kicker">How to play</div>
            <h2>Property Hustle rules</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close rules">
            <X size={20} />
          </button>
        </header>

        <div className="rules-guide-scroll">
          <div className="rules-overview">
            <article>
              <span>1</span>
              <div>
                <strong>Draw cards</strong>
                <p>Draw 2 at the beginning of your turn. If your hand becomes empty, immediately draw 5.</p>
              </div>
            </article>
            <article>
              <span>2</span>
              <div>
                <strong>Play your turn</strong>
                <p>Play or bank up to {playsPerTurn} cards under this room&apos;s {playStyleLabels[rules.playStyle]} rules.</p>
              </div>
            </article>
            <article>
              <span>3</span>
              <div>
                <strong>Build three sets</strong>
                <p>Complete 3 property districts before your rivals to win the game.</p>
              </div>
            </article>
          </div>

          <div className="rules-detail-grid">
            <article>
              <h3>Properties and wildcards</h3>
              <p>Place properties into matching colored districts. Wildcards may join a district and count toward its required size.</p>
            </article>
            <article>
              <h3>Money and payments</h3>
              <p>Money cards are stored in your bank. Payments are made from banked cards, and no change is returned.</p>
            </article>
            <article>
              <h3>Actions and defense</h3>
              <p>Actions count as plays. Just Say No can cancel an action aimed at you when the response prompt appears.</p>
            </article>
            <article>
              <h3>Draw pile</h3>
              <p>When the draw pile runs out, the discard pile is shuffled to create a fresh draw pile. Cards still in hands, banks, property districts, or active table areas stay out.</p>
            </article>
            <article>
              <h3>Developments and landmarks</h3>
              <p>Block Works may only develop a complete district. Skyline Landmark may only follow Block Works on that district. A Deal Breaker takes the complete district and both upgrades.</p>
            </article>
            <article>
              <h3>Payments</h3>
              <p>The payer chooses cards already on their table. Bank cards and properties may be used, no change is returned, and cards in hand cannot pay a debt.</p>
            </article>
          </div>

          <div className="rules-section-heading">
            <div className="section-kicker">Card reference</div>
            <h3>Action and defense cards</h3>
          </div>
          <div className="rules-action-grid">
            {actionCards.map((card) => (
              <article
                className="rules-action-card"
                key={card.name}
                style={{ '--accent': card.accent } as CSSProperties}
              >
                <span>{card.type}</span>
                <span className="rules-card-title">
                  <strong>{card.name}</strong>
                </span>
                <p>{card.text}</p>
                <b>{card.value}M</b>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
