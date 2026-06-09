import { Difficulty, GameCard } from './types';

function randomCard(cards: GameCard[]) {
  return cards[Math.floor(Math.random() * cards.length)];
}

export function chooseBotMove(difficulty: Difficulty, hand: GameCard[]) {
  if (hand.length === 0) return undefined;
  if (difficulty === 'easy') return randomCard(hand);

  const scored = hand.map((card) => {
    const typeScore =
      card.type === 'action' || card.type === 'rent' || card.type === 'defense'
        ? difficulty === 'hard' ? 5 : 2
        : card.type === 'property' || card.type === 'wild'
          ? 4
          : 3;
    return { card, score: typeScore + card.value + Math.random() * (difficulty === 'hard' ? 1 : 4) };
  });

  return scored.sort((left, right) => right.score - left.score)[0].card;
}
