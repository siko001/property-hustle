import type { PlayStyle, RoomRules } from './types';

export const defaultRules: RoomRules = {
  playStyle: 'anyThree',
  allowTeamDefense: false,
  chainBlocks: true,
  actionCardsAsMoney: true,
  rentMultiplier: true,
  wildCardsMoveFreely: true,
  turnSeconds: 90,
  reminderEverySeconds: 20,
  autoSkip: false
};

export const playStyleCopy: Record<PlayStyle, string> = {
  anyThree: 'Any 3 cards each turn.',
  oneEach: '1 property, 1 money, and 1 action.',
  rush: '2 cards each turn for short matches.',
  draft: 'Draw 3, play 2, discard 1.'
};

export const playStyleLabels: Record<PlayStyle, string> = {
  anyThree: 'Any 3',
  oneEach: 'One each',
  rush: 'Rush',
  draft: 'Draft'
};
