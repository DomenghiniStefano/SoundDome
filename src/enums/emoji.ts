import emojiData from 'unicode-emoji-json';
import _ from 'lodash';

export interface EmojiItem {
  emoji: string;
  name: string;
}

export const EmojiCategory = {
  SMILEYS: 'Smileys & Emotion',
  PEOPLE: 'People & Body',
  ANIMALS: 'Animals & Nature',
  FOOD: 'Food & Drink',
  TRAVEL: 'Travel & Places',
  ACTIVITIES: 'Activities',
  OBJECTS: 'Objects',
  SYMBOLS: 'Symbols',
  FLAGS: 'Flags',
} as const;

export type EmojiCategoryValue = (typeof EmojiCategory)[keyof typeof EmojiCategory];

export const EMOJI_CATEGORIES: readonly EmojiCategoryValue[] = [
  EmojiCategory.SMILEYS,
  EmojiCategory.PEOPLE,
  EmojiCategory.ANIMALS,
  EmojiCategory.FOOD,
  EmojiCategory.TRAVEL,
  EmojiCategory.ACTIVITIES,
  EmojiCategory.OBJECTS,
  EmojiCategory.SYMBOLS,
  EmojiCategory.FLAGS,
];

export const CATEGORY_ICONS: Record<EmojiCategoryValue, string> = {
  [EmojiCategory.SMILEYS]: '😀',
  [EmojiCategory.PEOPLE]: '👋',
  [EmojiCategory.ANIMALS]: '🐻',
  [EmojiCategory.FOOD]: '🍔',
  [EmojiCategory.TRAVEL]: '✈️',
  [EmojiCategory.ACTIVITIES]: '⚽',
  [EmojiCategory.OBJECTS]: '💡',
  [EmojiCategory.SYMBOLS]: '❤️',
  [EmojiCategory.FLAGS]: '🏁',
};

const entries: EmojiItem[] = _.map(
  Object.entries(emojiData),
  ([emoji, data]) => ({ emoji, name: data.name }),
);

const grouped = _.groupBy(
  Object.entries(emojiData).map(([emoji, data]) => ({
    emoji,
    name: data.name,
    group: data.group,
  })),
  'group',
);

export const EMOJI_BY_CATEGORY: Record<EmojiCategoryValue, EmojiItem[]> = _.fromPairs(
  EMOJI_CATEGORIES.map((cat) => [
    cat,
    _.map(grouped[cat] || [], (item) => ({ emoji: item.emoji, name: item.name })),
  ]),
) as Record<EmojiCategoryValue, EmojiItem[]>;

export const ALL_EMOJIS: readonly EmojiItem[] = entries;
