// The shared looks used by every tab. Change a value here and the whole app follows.
import { Platform, StyleSheet, type ViewStyle } from 'react-native';

import { BorderColor, Spacing } from '@/constants/theme';

// On the web we use a real CSS grid: every column is the same width, every card in a row is the
// same height, and the cards of a last, shorter row keep the same size as the others.
// (The grid properties are not in React Native's types, so the style is cast.)
const webGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: Spacing.three,
} as unknown as ViewStyle;

const nativeGrid: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three };

// A card that stretches over the whole row of the grid (for example the recipe edit form).
export const fullRow = (Platform.OS === 'web'
  ? { gridColumn: '1 / -1' }
  : { width: '100%' }) as unknown as ViewStyle;

export const Layout = StyleSheet.create({
  // A grid of cards: 3 per row on a wide screen, fewer on a narrow one.
  grid: Platform.OS === 'web' ? webGrid : nativeGrid,
  // A card. Use it ON a ThemedView with type="backgroundElement", inside a grid.
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: BorderColor,
    gap: Spacing.two,
    ...(Platform.OS === 'web' ? { minWidth: 0 } : { flexGrow: 1, flexBasis: 320, maxWidth: 520 }),
  },
  // A row of buttons or items inside a card. Transparent, so the card color shows through.
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  // Buttons: "smallButton" for actions inside cards, "button" for main actions.
  smallButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BorderColor,
  },
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BorderColor,
  },
});
