import type { CSSProperties } from 'react';
import { districtSets } from '@/lib/game/deck';
import type { GameCard } from '@/lib/game/types';

export function getDistrictAccent(districtName: string) {
  return districtSets.find((district) => district.name === districtName)?.accent ?? '#7b61ff';
}

export function getWildcardBand(card: GameCard) {
  if (card.type !== 'wild' || card.district !== 'Wildcard' || !card.wildDistricts?.length) {
    return null;
  }

  const accents = card.wildDistricts.map(getDistrictAccent);
  if (accents.length === 2) {
    return `linear-gradient(90deg, ${accents[0]} 0 50%, ${accents[1]} 50% 100%)`;
  }

  const step = 100 / accents.length;
  const stops = accents
    .map((accent, index) => `${accent} ${index * step}% ${(index + 1) * step}%`)
    .join(', ');

  return `linear-gradient(90deg, ${stops})`;
}

export function getCardStyle(card: GameCard, extra?: CSSProperties) {
  const wildcardBand = getWildcardBand(card);

  return {
    ...extra,
    '--accent': card.accent,
    ...(wildcardBand ? { '--wild-band': wildcardBand } : {})
  } as CSSProperties;
}
