'use client';

import type { CSSProperties } from 'react';
import { Check, RotateCcw, Shield, Trash2 } from 'lucide-react';
import type {
  DiscardPrompt,
  IncomingActionPrompt,
  PaymentPrompt,
  PlayerTargetPrompt,
  RentTargetPrompt,
  SetTargetPrompt,
  StreetSwapPrompt,
  TableCard,
  UpgradePrompt,
  WildcardPrompt
} from '@/components/home/types';
import { districtSets } from '@/lib/game/deck';
import { getPaymentKey, getTableCardKey } from '@/lib/game/engine';
import type { GameCard } from '@/lib/game/types';

export function DiscardPromptDialog({
  prompt,
  hand,
  maxHandSize,
  onToggleCard,
  onClose,
  onConfirm
}: {
  prompt: DiscardPrompt;
  hand: GameCard[];
  maxHandSize: number;
  onToggleCard: (cardId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Discard extra cards">
      <div className="confirm-sheet discard-sheet">
        <div className="section-kicker">Hand limit</div>
        <h2>Discard {prompt.count} card{prompt.count === 1 ? '' : 's'}</h2>
        <p>
          You can only keep {maxHandSize} cards at the end of your turn. Choose what to throw into the
          discard pile.
        </p>
        <div className="discard-counter">
          <span>Selected</span>
          <strong>{prompt.selectedIds.length}/{prompt.count}</strong>
        </div>
        <div className="discard-card-grid">
          {hand.map((card) => {
            const isSelected = prompt.selectedIds.includes(card.id);
            const isLocked = !isSelected && prompt.selectedIds.length >= prompt.count;

            return (
              <button
                className={`discard-choice-card ${isSelected ? 'selected' : ''}`}
                disabled={isLocked}
                key={card.id}
                onClick={() => onToggleCard(card.id)}
                style={{ '--accent': card.accent } as CSSProperties}
              >
                {isSelected && (
                  <span className="discard-selected-mark">
                    <Check size={16} />
                  </span>
                )}
                <small>{card.type}</small>
                <strong>{card.name}</strong>
                {card.district && card.district !== 'Wildcard' && <em>{card.district}</em>}
                <span>{card.value}M</span>
              </button>
            );
          })}
        </div>
        <div className="confirm-actions">
          <button className="ghost-button" onClick={onClose}>
            Keep choosing
          </button>
          <button
            className="primary-button"
            disabled={prompt.selectedIds.length !== prompt.count}
            onClick={onConfirm}
          >
            <Trash2 size={18} />
            Discard selected
          </button>
        </div>
      </div>
    </div>
  );
}

export function RentTargetPromptDialog({
  prompt,
  tableCards,
  onToggleDouble,
  onResolve
}: {
  prompt: RentTargetPrompt;
  tableCards: TableCard[];
  onToggleDouble: () => void;
  onResolve: (owner: string) => void;
}) {
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Choose rent target">
      <div className="confirm-sheet action-choice-sheet">
        <div className="section-kicker">Rent Rush</div>
        <h2>Choose who pays</h2>
        <p>Bank money is paid first. Properties are only used if the bank cannot cover the bill.</p>
        {prompt.doubleRentCardId && (
          <button
            className={`double-rent-toggle ${prompt.useDoubleRent ? 'active' : ''}`}
            onClick={onToggleDouble}
            type="button"
          >
            <span>
              <strong>Double Up</strong>
              <small>Use 1 extra play to charge {prompt.action.value * 2}M.</small>
            </span>
            <b>{prompt.useDoubleRent ? 'On' : 'Off'}</b>
          </button>
        )}
        <div className="action-target-grid">
          {prompt.targetOwners.map((owner) => {
            const ownerBank = tableCards
              .filter((item) => item.owner === owner && item.zone === 'bank')
              .reduce((total, item) => total + item.card.value, 0);
            const ownerProperty = tableCards
              .filter((item) => item.owner === owner && item.zone === 'property')
              .reduce((total, item) => total + item.card.value, 0);
            return (
              <button
                className="action-target-card"
                key={owner}
                onClick={() => onResolve(owner)}
                style={{ '--accent': prompt.action.accent } as CSSProperties}
              >
                <small>Rival</small>
                <strong>{owner}</strong>
                <span>{ownerBank}M bank - {ownerProperty}M property</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PlayerTargetPromptDialog({
  prompt,
  tableCards,
  onResolve
}: {
  prompt: PlayerTargetPrompt;
  tableCards: TableCard[];
  onResolve: (key: string) => void;
}) {
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Choose a property">
      <div className="confirm-sheet action-choice-sheet">
        <div className="section-kicker">Plot Grab</div>
        <h2>Choose a property to take</h2>
        <p>Select any loose property currently owned by a rival.</p>
        <div className="action-target-grid">
          {tableCards
            .filter((item) => prompt.targetKeys.includes(getTableCardKey(item)))
            .map((item) => (
              <button
                className="action-target-card"
                key={getTableCardKey(item)}
                onClick={() => onResolve(getTableCardKey(item))}
                style={{ '--accent': item.card.accent } as CSSProperties}
              >
                <small>{item.owner}</small>
                <strong>{item.card.name}</strong>
                <span>{item.card.value}M</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

export function StreetSwapPromptDialog({
  prompt,
  tableCards,
  onSelectRival,
  onSelectOwn,
  onClose,
  onResolve
}: {
  prompt: StreetSwapPrompt;
  tableCards: TableCard[];
  onSelectRival: (key: string) => void;
  onSelectOwn: (key: string) => void;
  onClose: () => void;
  onResolve: () => void;
}) {
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Choose properties to swap">
      <div className="confirm-sheet action-choice-sheet street-swap-sheet">
        <div className="section-kicker">Street Swap</div>
        <h2>Choose the trade</h2>
        <p>Pick one loose rival property to take, then pick one loose property of yours to give back.</p>
        <div className="street-swap-columns">
          <section>
            <h3>Take from rival</h3>
            <div className="action-target-grid">
              {tableCards
                .filter((item) => prompt.rivalKeys.includes(getTableCardKey(item)))
                .map((item) => {
                  const key = getTableCardKey(item);
                  return (
                    <button
                      className={`action-target-card ${prompt.selectedRivalKey === key ? 'selected' : ''}`}
                      key={key}
                      onClick={() => onSelectRival(key)}
                      style={{ '--accent': item.card.accent } as CSSProperties}
                    >
                      <small>{item.owner}</small>
                      <strong>{item.card.name}</strong>
                      {item.card.district && <em>{item.card.district}</em>}
                      <span>{item.card.value}M</span>
                    </button>
                  );
                })}
            </div>
          </section>
          <section>
            <h3>Give from yours</h3>
            <div className="action-target-grid">
              {tableCards
                .filter((item) => prompt.ownKeys.includes(getTableCardKey(item)))
                .map((item) => {
                  const key = getTableCardKey(item);
                  return (
                    <button
                      className={`action-target-card ${prompt.selectedOwnKey === key ? 'selected' : ''}`}
                      key={key}
                      onClick={() => onSelectOwn(key)}
                      style={{ '--accent': item.card.accent } as CSSProperties}
                    >
                      <small>Your property</small>
                      <strong>{item.card.name}</strong>
                      {item.card.district && <em>{item.card.district}</em>}
                      <span>{item.card.value}M</span>
                    </button>
                  );
                })}
            </div>
          </section>
        </div>
        <div className="confirm-actions">
          <button className="ghost-button" onClick={onClose}>
            Keep card played
          </button>
          <button
            className="primary-button"
            disabled={!prompt.selectedRivalKey || !prompt.selectedOwnKey}
            onClick={onResolve}
          >
            <RotateCcw size={18} />
            Swap selected
          </button>
        </div>
      </div>
    </div>
  );
}

export function SetTargetPromptDialog({
  prompt,
  onResolve
}: {
  prompt: SetTargetPrompt;
  onResolve: (key: string) => void;
}) {
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Choose a complete set">
      <div className="confirm-sheet action-choice-sheet">
        <div className="section-kicker">Deal Breaker</div>
        <h2>Choose a complete district</h2>
        <p>Select which rival set you want to take. Any Block Works or Skyline Landmark on that set comes with it.</p>
        <div className="action-target-grid">
          {prompt.targets.map((target) => (
            <button
              className="action-target-card set-target-card"
              key={target.key}
              onClick={() => onResolve(target.key)}
              style={{ '--accent': target.accent } as CSSProperties}
            >
              <small>{target.owner}</small>
              <strong>{target.district}</strong>
              <span>{target.count} cards - {target.value}M</span>
              {(target.hasHouse || target.hasHotel) && (
                <em>
                  {target.hasHouse ? 'Block Works' : ''}
                  {target.hasHouse && target.hasHotel ? ' + ' : ''}
                  {target.hasHotel ? 'Skyline Landmark' : ''}
                </em>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WildcardPromptDialog({
  prompt,
  propertyCards,
  onAssign
}: {
  prompt: WildcardPrompt;
  propertyCards: TableCard[];
  onAssign: (districtName: string) => void;
}) {
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Choose wildcard color">
      <div className="confirm-sheet wildcard-choice-sheet">
        <div className="section-kicker">Wildcard Lease</div>
        <h2>Choose a district color</h2>
        <p>The wildcard will count toward the selected property set.</p>
        <div className="wildcard-district-grid">
          {districtSets
            .filter((district) =>
              prompt.card.wildDistricts?.length
                ? prompt.card.wildDistricts.includes(district.name)
                : true
            )
            .map((district) => {
              const currentCount = propertyCards.filter(
                (item) =>
                  item.owner === prompt.owner &&
                  item.card.district === district.name
              ).length;
              return (
                <button
                  className="wildcard-district-button"
                  key={district.name}
                  onClick={() => onAssign(district.name)}
                  style={{ '--accent': district.accent } as CSSProperties}
                >
                  <span className="wildcard-color-swatch" />
                  <strong>{district.name}</strong>
                  <small>{currentCount}/{district.size} played</small>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export function UpgradePromptDialog({
  prompt,
  onAssign
}: {
  prompt: UpgradePrompt;
  onAssign: (districtName: string) => void;
}) {
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Choose a district to upgrade">
      <div className="confirm-sheet wildcard-choice-sheet">
        <div className="section-kicker">
          {prompt.kind === 'house' ? 'District development' : 'District landmark'}
        </div>
        <h2>Choose a complete district</h2>
        <p>
          {prompt.kind === 'house'
            ? 'Block Works can only be added to a complete district.'
            : 'Skyline Landmark requires a complete district that already has Block Works.'}
        </p>
        <div className="wildcard-district-grid">
          {districtSets
            .filter((district) => prompt.districtNames.includes(district.name))
            .map((district) => (
              <button
                className="wildcard-district-button"
                key={district.name}
                onClick={() => onAssign(district.name)}
                style={{ '--accent': district.accent } as CSSProperties}
              >
                <span className="wildcard-color-swatch" />
                <strong>{district.name}</strong>
                <small>
                  {prompt.kind === 'house' ? '+3M development' : '+4M landmark'}
                </small>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

export function PaymentPromptDialog({
  prompt,
  tableCards,
  hand,
  canPlayBlock,
  onToggleCard,
  onPlayBlock,
  onConfirm
}: {
  prompt: PaymentPrompt;
  tableCards: TableCard[];
  hand: GameCard[];
  canPlayBlock: boolean;
  onToggleCard: (key: string) => void;
  onPlayBlock: () => void;
  onConfirm: () => void;
}) {
  const availableAssets = tableCards.filter(
    (item) =>
      item.owner === prompt.payer &&
      (item.zone === 'bank' || item.zone === 'property') &&
      item.card.value > 0
  );
  const bankAssets = availableAssets.filter((item) => item.zone === 'bank');
  const propertyAssets = availableAssets.filter((item) => item.zone === 'property');
  const bankTotal = availableAssets
    .filter((item) => item.zone === 'bank')
    .reduce((total, item) => total + item.card.value, 0);
  const bankCoversPayment = bankTotal >= prompt.amount;
  const visibleAssets =
    bankAssets.length === 0
      ? propertyAssets
      : bankCoversPayment
        ? bankAssets
        : availableAssets;
  const selectedTotal = availableAssets
    .filter((item) => prompt.selectedKeys.includes(getPaymentKey(item)))
    .reduce((total, item) => total + item.card.value, 0);
  const totalAssets = availableAssets.reduce((total, item) => total + item.card.value, 0);

  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Choose payment cards">
      <div className="confirm-sheet payment-sheet">
        <div className="section-kicker">Payment required</div>
        <h2>Pay {prompt.amount}M</h2>
        <p>
          Choose bank cards or properties to give {prompt.payee}. No change is returned.
        </p>
        <div className="payment-total">
          <span>Selected</span>
          <strong>{selectedTotal}M / {prompt.amount}M</strong>
        </div>
        <div className="payment-card-grid">
          {visibleAssets.map((item) => {
            const paymentKey = getPaymentKey(item);
            const selected = prompt.selectedKeys.includes(paymentKey);
            const forced = prompt.forcedKeys.includes(paymentKey);
            const disabled = forced;
            return (
              <button
                className={`payment-card ${selected ? 'selected' : ''} ${forced ? 'forced' : ''}`}
                key={paymentKey}
                onClick={() => onToggleCard(paymentKey)}
                disabled={disabled}
                style={{ '--accent': item.card.accent } as CSSProperties}
              >
                {selected && (
                  <span className="payment-selected-mark" aria-hidden="true">
                    <Check size={16} />
                  </span>
                )}
                <small>
                  {selected ? 'selected' : forced ? 'money first' : item.zone}
                </small>
                <strong>{item.card.name}</strong>
                <span>{item.card.value}M</span>
              </button>
            );
          })}
        </div>
        <div className="confirm-actions">
          {canPlayBlock && hand.some((card) => card.actionKind === 'block') && (
            <button className="ghost-button" onClick={onPlayBlock}>
              <Shield size={18} />
              Play Just Say No instead
            </button>
          )}
          <button
            className="primary-button"
            onClick={onConfirm}
            disabled={selectedTotal < prompt.amount && selectedTotal < totalAssets}
          >
            Pay {selectedTotal}M
          </button>
        </div>
      </div>
    </div>
  );
}

export function IncomingActionPromptDialog({
  prompt,
  hand,
  onResolve
}: {
  prompt: IncomingActionPrompt;
  hand: GameCard[];
  onResolve: (blocked: boolean) => void;
}) {
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Incoming action">
      <div className="confirm-sheet incoming-action-sheet">
        <div className="section-kicker">Action against you</div>
        <div
          className="incoming-action-card"
          style={{ '--accent': prompt.action.accent } as CSSProperties}
        >
          <small>{prompt.actor} played</small>
          <strong>{prompt.action.name}</strong>
          <p>{prompt.action.text}</p>
          <span>{prompt.action.value}M</span>
        </div>
        <div className="confirm-actions">
          {hand.some((card) => card.actionKind === 'block') && (
            <button className="ghost-button" onClick={() => onResolve(true)}>
              <Shield size={18} />
              Play Just Say No
            </button>
          )}
          <button className="primary-button" onClick={() => onResolve(false)}>
            Accept action
          </button>
        </div>
      </div>
    </div>
  );
}
