import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ALLERGEN_ICONS, type Level, type Warning } from '@/data/warnings';
import { useLanguage } from '@/i18n/language';

// red = contains, orange = may contain, yellow = cannot check
export const LEVEL_COLORS: Record<Level, { border: string; tint: string }> = {
  contains: { border: '#D93025', tint: 'rgba(217,48,37,0.16)' },
  may: { border: '#F28C28', tint: 'rgba(242,140,40,0.16)' },
  unchecked: { border: '#E0B400', tint: 'rgba(224,180,0,0.16)' },
};

function warningIcon(w: Warning): string {
  if (w.kind === 'vegan') return '🌱';
  if (w.kind === 'unchecked') return '❔';
  return ALLERGEN_ICONS[w.allergen];
}

// Small coloured tags. Warnings only inform, they never block anything.
export function WarningChips({ warnings }: { warnings: Warning[] }) {
  const { t, allergenShortName } = useLanguage();
  if (warnings.length === 0) return null;

  function label(w: Warning): string {
    if (w.kind === 'vegan') return w.level === 'contains' ? t('warnNotVegan') : t('warnMayNotVegan');
    if (w.kind === 'unchecked') return t('warnCantCheck');
    const name = allergenShortName(w.allergen).toLowerCase();
    return w.level === 'contains' ? t('warnContains', { name }) : t('warnMayContain', { name });
  }

  return (
    <ThemedView style={styles.wrap}>
      {warnings.map((w) => {
        const colors = LEVEL_COLORS[w.level];
        return (
          <ThemedView
            key={w.kind === 'allergen' ? w.allergen : w.kind}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.tint }]}>
            <ThemedText type="small">
              {warningIcon(w)} {label(w)}
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
