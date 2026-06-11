import { districtSets, starterDeck, starterDeckCounts } from '@/lib/game/deck';
import type { CardRect, CardType, Difficulty, GameCard, TableCard, TableZone } from '@/lib/game/types';
import { makeCode } from '@/lib/util/id';

export function toCardRect(rect: DOMRect): CardRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
}

export function getZoneForCard(card: GameCard): TableZone {
  if (card.type === 'money') return 'bank';
  if (card.type === 'property' || card.type === 'wild') return 'property';
  if (card.actionKind === 'house' || card.actionKind === 'hotel') return 'property';
  if (card.type === 'rent') return 'action';
  return 'action';
}

export function normalizePlayType(card: GameCard): CardType {
  return card.type === 'wild' ? 'property' : card.type;
}

export function getCompletedDistricts(cards: TableCard[], owner: string) {
  return districtSets.filter((district) => {
    const ownedCards = cards.filter(
      (item) =>
        item.zone === 'property' &&
        item.owner === owner &&
        item.card.district === district.name &&
        item.playedAs === 'property'
    );
    return ownedCards.length >= district.size;
  });
}

export function getCompletedSetCount(cards: TableCard[], owner: string) {
  return districtSets.reduce((total, district) => {
    const ownedCards = cards.filter(
      (item) =>
        item.zone === 'property' &&
        item.owner === owner &&
        item.card.district === district.name &&
        item.playedAs === 'property'
    );
    return total + Math.floor(ownedCards.length / district.size);
  }, 0);
}

export function getDistrictUpgrade(cards: TableCard[], owner: string, district: string, kind: 'house' | 'hotel') {
  return cards.find(
    (item) =>
      item.owner === owner &&
      item.zone === 'property' &&
      item.card.district === district &&
      item.card.actionKind === kind
  );
}

export function getEligibleUpgradeDistricts(
  cards: TableCard[],
  owner: string,
  kind: 'house' | 'hotel'
) {
  return getCompletedDistricts(cards, owner).filter((district) => {
    const hasHouse = Boolean(getDistrictUpgrade(cards, owner, district.name, 'house'));
    const hasHotel = Boolean(getDistrictUpgrade(cards, owner, district.name, 'hotel'));
    return kind === 'house' ? !hasHouse : hasHouse && !hasHotel;
  });
}

export function getCompleteSetTargets(cards: TableCard[], owner: string) {
  const propertyCards = cards.filter((item) => item.zone === 'property');
  const rivalDistricts = new Map<string, TableCard[]>();

  propertyCards.forEach((item) => {
    if (
      item.owner === owner ||
      item.playedAs !== 'property' ||
      !item.card.district ||
      item.card.district === 'Wildcard'
    ) return;
    const key = `${item.owner}:${item.card.district}`;
    rivalDistricts.set(key, [...(rivalDistricts.get(key) ?? []), item]);
  });

  return Array.from(rivalDistricts.entries())
    .filter(([, setCards]) => setCards.length >= (setCards[0]?.card.setSize ?? Number.POSITIVE_INFINITY))
    .map(([key, setCards]) => {
      const ownerName = setCards[0]?.owner ?? '';
      const district = setCards[0]?.card.district ?? '';
      const districtCards = propertyCards.filter(
        (item) => item.owner === ownerName && item.card.district === district
      );
      return {
        key,
        owner: ownerName,
        district,
        count: setCards.length,
        value: districtCards.reduce((sum, item) => sum + item.card.value, 0),
        accent: setCards[0]?.card.accent ?? '#17212b',
        hasHouse: Boolean(getDistrictUpgrade(cards, ownerName, district, 'house')),
        hasHotel: Boolean(getDistrictUpgrade(cards, ownerName, district, 'hotel'))
      };
    });
}

export function shuffleCards(cards: GameCard[]) {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function makeDrawPile(cycle = makeCode(5)) {
  return starterDeck.flatMap((card, cardIndex) =>
    Array.from({ length: starterDeckCounts[card.id] ?? 1 }, (_, copyIndex) => ({
      ...card,
      id: `${card.id}-${cycle}-${copyIndex + 1}-${cardIndex + 1}`
    }))
  );
}

export function drawWithRecycledPile({
  pile,
  count,
  discardPile
}: {
  pile: GameCard[];
  count: number;
  discardPile: TableCard[];
}) {
  if (pile.length >= count) {
    return {
      drawn: pile.slice(0, count),
      remaining: pile.slice(count),
      discardPile,
      recycled: false
    };
  }

  const recycledCards = shuffleCards(discardPile.map((item) => item.card));
  const replenishedPile = [...pile, ...recycledCards];

  return {
    drawn: replenishedPile.slice(0, count),
    remaining: replenishedPile.slice(count),
    discardPile: [],
    recycled: recycledCards.length > 0
  };
}

export function chooseBestCover(cards: TableCard[], amount: number) {
  if (amount <= 0) return { chosen: [] as TableCard[], total: 0 };

  const choices = cards.reduce(
    (totals, item) => {
      const currentEntries = Array.from(totals.entries());
      currentEntries.forEach(([total, chosen]) => {
        const nextTotal = total + item.card.value;
        const existing = totals.get(nextTotal);
        const nextChosen = [...chosen, item];
        if (!existing || nextChosen.length < existing.length) {
          totals.set(nextTotal, nextChosen);
        }
      });
      return totals;
    },
    new Map<number, TableCard[]>([[0, []]])
  );

  const best = Array.from(choices.entries())
    .filter(([total]) => total >= amount)
    .sort((left, right) => left[0] - right[0] || left[1].length - right[1].length)[0];

  if (best) return { chosen: best[1], total: best[0] };

  return {
    chosen: cards,
    total: cards.reduce((sum, item) => sum + item.card.value, 0)
  };
}

export function choosePaymentCards(cards: TableCard[], owner: string, amount: number) {
  const bankCards = cards
    .filter((item) => item.owner === owner && item.zone === 'bank' && item.card.value > 0)
    .sort((left, right) => left.card.value - right.card.value);
  const propertyCards = cards
    .filter((item) => item.owner === owner && item.zone === 'property' && item.card.value > 0)
    .sort((left, right) => left.card.value - right.card.value);

  const bankTotal = bankCards.reduce((sum, item) => sum + item.card.value, 0);
  if (bankTotal >= amount) {
    return chooseBestCover(bankCards, amount);
  }

  const propertyPayment = chooseBestCover(propertyCards, amount - bankTotal);
  return {
    chosen: [...bankCards, ...propertyPayment.chosen],
    total: bankTotal + propertyPayment.total
  };
}

export function getRivalOwnersWithPayableAssets(cards: TableCard[], owner: string) {
  return Array.from(
    new Set(
      cards
        .filter(
          (item) =>
            item.owner !== owner &&
            (item.zone === 'bank' || item.zone === 'property') &&
            item.card.value > 0
        )
        .map((item) => item.owner)
    )
  );
}

export function getPayableAssetTotal(cards: TableCard[], owner: string) {
  return cards
    .filter(
      (item) =>
        item.owner === owner &&
        (item.zone === 'bank' || item.zone === 'property') &&
        item.card.value > 0
    )
    .reduce((total, item) => total + item.card.value, 0);
}

export function chooseBotPayableTarget(cards: TableCard[], botOwner: string, difficulty: Difficulty = 'medium') {
  const owners = getRivalOwnersWithPayableAssets(cards, botOwner);
  if (owners.length === 0) return undefined;

  const candidates = owners.map((owner) => ({
    owner,
    total: getPayableAssetTotal(cards, owner)
  }));

  const nonHumanCandidates = candidates.filter((candidate) => candidate.owner !== 'You');
  const pool =
    nonHumanCandidates.length > 0 && Math.random() < 0.6
      ? nonHumanCandidates
      : candidates;

  if (difficulty === 'hard') {
    const topTargets = [...pool]
      .sort((left, right) => right.total - left.total)
      .slice(0, Math.min(2, pool.length));
    return topTargets[Math.floor(Math.random() * topTargets.length)]?.owner;
  }

  return pool[Math.floor(Math.random() * pool.length)]?.owner;
}

export function canChargeRent(cards: TableCard[], owner: string) {
  const ownsProperty = cards.some((item) => item.owner === owner && item.zone === 'property');
  return ownsProperty && getRivalOwnersWithPayableAssets(cards, owner).length > 0;
}

export function getLoosePropertiesForOwner(cards: TableCard[], owner: string) {
  const propertyCards = cards.filter((item) => item.zone === 'property');
  return propertyCards.filter((item) => {
    if (
      item.owner !== owner ||
      item.playedAs !== 'property' ||
      !item.card.district ||
      item.card.district === 'Wildcard'
    ) return false;

    const districtCount = propertyCards.filter(
      (candidate) =>
        candidate.owner === item.owner &&
        candidate.playedAs === 'property' &&
        candidate.card.district === item.card.district
    ).length;
    return districtCount < (item.card.setSize ?? Number.POSITIVE_INFINITY);
  });
}

export function getLoosePropertyTargets(cards: TableCard[], owner: string) {
  return Array.from(new Set(cards.map((item) => item.owner)))
    .filter((candidateOwner) => candidateOwner !== owner)
    .flatMap((candidateOwner) => getLoosePropertiesForOwner(cards, candidateOwner));
}

export function getTableCardKey(item: TableCard) {
  return `${item.owner}:${item.card.id}`;
}

export function getPaymentKey(item: TableCard) {
  return `${item.owner}:${item.card.id}`;
}

export function makeDiscardCard(card: GameCard, owner: string): TableCard {
  return {
    card,
    zone: getZoneForCard(card),
    playedAs: normalizePlayType(card),
    owner
  };
}
