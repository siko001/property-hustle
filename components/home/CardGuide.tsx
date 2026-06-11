'use client';

import type { CSSProperties } from 'react';
import { X } from 'lucide-react';
import { districtSets, starterDeck, starterDeckCounts } from '@/lib/game/deck';
import type { GameCard } from '@/lib/game/types';
import { getCardStyle, getWildcardBand } from '@/lib/game/card-style';

export function CardGuide({ onClose }: { onClose: () => void }) {
  const countForCard = (card: GameCard) => starterDeckCounts[card.id] ?? 1;
  const propertyGroups = districtSets.map((district) => ({
    district,
    cards: starterDeck.filter((card) => card.type === 'property' && card.district === district.name)
  }));
  const wildCards = starterDeck.filter((card) => card.type === 'wild');
  const moneyCards = starterDeck.filter((card) => card.type === 'money');
  const actionCards = starterDeck.filter(
    (card, index, cards) =>
      (card.type === 'action' || card.type === 'rent' || card.type === 'defense') &&
      cards.findIndex((candidate) => candidate.name === card.name) === index
  );

  return (
    <div className="confirm-backdrop rules-guide-backdrop" role="dialog" aria-modal="true" aria-label="Card list">
      <section className="rules-guide card-guide">
        <header className="rules-guide-header">
          <div>
            <div className="section-kicker">Card list</div>
            <h2>Cards in this deck</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close card list">
            <X size={20} />
          </button>
        </header>

        <div className="rules-guide-scroll">
          <section className="card-guide-section">
            <div className="rules-section-heading">
              <div className="section-kicker">Property districts</div>
              <h3>Set sizes</h3>
            </div>
            <div className="card-guide-set-grid">
              {propertyGroups.map(({ district, cards }) => (
                <article
                  className="card-guide-set"
                  key={district.name}
                  style={{ '--accent': district.accent } as CSSProperties}
                >
                  <div className="card-guide-set-head">
                    <span className="district-color-dot" />
                    <strong>{district.name}</strong>
                    <b>{district.size} needed</b>
                  </div>
                  <p>{cards.length} property cards in the deck</p>
                  <ul aria-label={`${district.name} property cards`}>
                    {cards.map((card) => (
                      <li key={card.id}>
                        <span>{card.name}</span>
                        <b>{card.value}M</b>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <CardGuideSection title="Property wildcards" kicker="Wild cards" cards={wildCards} countForCard={countForCard} />
          <CardGuideSection title="Action, rent, and defense cards" kicker="Action cards" cards={actionCards} countForCard={countForCard} />
          <CardGuideSection title="Money cards" kicker="Bank cards" cards={moneyCards} countForCard={countForCard} />
        </div>
      </section>
    </div>
  );
}

function CardGuideSection({
  title,
  kicker,
  cards,
  countForCard
}: {
  title: string;
  kicker: string;
  cards: GameCard[];
  countForCard: (card: GameCard) => number;
}) {
  return (
    <section className="card-guide-section">
      <div className="rules-section-heading">
        <div className="section-kicker">{kicker}</div>
        <h3>{title}</h3>
      </div>
      <div className="card-guide-card-grid">
        {cards.map((card) => (
          <CardGuideCard card={card} count={countForCard(card)} key={card.id} />
        ))}
      </div>
    </section>
  );
}

function CardGuideCard({ card, count }: { card: GameCard; count: number }) {
  const copy =
    card.type === 'wild' && card.wildDistricts?.length
      ? `Can play as ${card.wildDistricts.join(' or ')}.`
      : card.text;

  return (
    <article
      className={`card-guide-card ${getWildcardBand(card) ? 'wild-choice' : ''}`}
      style={getCardStyle(card)}
    >
      <div className="card-guide-card-band">
        <span>{card.type}</span>
        <em>x{count}</em>
      </div>
      <strong>{card.name}</strong>
      <p>{copy}</p>
      <b>{card.value}M</b>
    </article>
  );
}
