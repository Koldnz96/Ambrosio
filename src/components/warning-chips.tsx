import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ALLERGEN_ICONS, type Level, type Warning } from '@/data/warnings';
import { ALLERGEN_LABELS } from '@/data/products';

// red = contains, orange = may contain, yellow = cannot check
export const LEVEL_COLORS: Record<Level, { border: string; tint: string }> = {
  contains: { border: '#D93025', tint: 'rgba(217,48,37,0.16)' },
  may: { border: '#F28C28', tint: 'rgba(242,140,40,0.16)' },
  unchecked: { border: '#E0B400', tint: 'rgba(224,180,0,0.16)' },
};

function shortName(label: string): string {
  return label.split(' (')[0];
}

export function warningLabel(w: Warning): string {
  if (w.kind === 'vegan') return w.level === 'contains' ? 'Not vegan' : 'May not be vegan';
  if (w.kind === 'unchecked') return "Can't check";
  const name = shortName(ALLERGEN_LABELS[w.allergen]);
  return w.level === 'contains' ? `Contains ${name.toLowerCase()}` : `May contain ${name.toLowerCase()}`;
}

function warningIcon(w: Warning): string {
  if (w.kind === 'vegan') return '🌱';
  if (w.kind === 'unchecked') return '❔';
  return ALLERGEN_ICONS[w.allergen];
}

// Small coloured tags. Warnings only inform, they never block anything.
export function WarningChips({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null;
  return (
    <ThemedView style={styles.wrap}>
      {warnings.map((w) => {
        const colors = LEVEL_COLORS[w.level];
        return (
          <ThemedView
            key={w.kind === 'allergen' ? w.allergen : w.kind}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.tint }]}>
            <ThemedText type="small">
              {warningIcon(w)} {warningLabel(w)}
            </ThemedText>
          </ThemedView>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, backgroundColor: 'transparent' },
  chip: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
  },
});
