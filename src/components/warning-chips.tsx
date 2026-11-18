import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ALLERGEN_ICONS, ingredientWarnings, warningKey, type Level, type Profile, type Warning } from '@/data/warnings';
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

type Props = {
  warnings: Warning[];
  // Optional: the recipe's ingredients and the profile used. When given, hovering a tag (or tapping it
  // on a phone) shows WHICH ingredients cause that warning.
  ingredients?: { name: string; productId: string | null }[];
  profile?: Profile;
};

// Small coloured tags (labels, not buttons). Warnings only inform, they never block anything.
export function WarningChips({ warnings, ingredients, profile }: Props) {
  const { t, allergenShortName, ingredient: ingredientLabel } = useLanguage();
  const [openKey, setOpenKey] = useState<string | null>(null); // the tag whose ingredients are shown
  if (warnings.length === 0) return null;
  const explain = Boolean(ingredients && profile);

  function label(w: Warning): string {
    if (w.kind === 'vegan') return w.level === 'contains' ? t('warnNotVegan') : t('warnMayNotVegan');
    if (w.kind === 'unchecked') return t('warnCantCheck');
    const name = allergenShortName(w.allergen).toLowerCase();
    return w.level === 'contains' ? t('warnContains', { name }) : t('warnMayContain', { name });
  }

  // The ingredients that give this warning (no repeats).
  function causes(key: string): string[] {
    if (!ingredients || !profile) return [];
    const names = ingredients
      .filter((ing) => ingredientWarnings(ing.productId, profile).some((w) => warningKey(w) === key))
      .map((ing) => ingredientLabel(ing));
    return [...new Set(names)];
  }

  const open = openKey ? warnings.find((w) => warningKey(w) === openKey) : undefined;

  return (
    <ThemedView style={styles.box}>
      <ThemedView style={styles.wrap}>
        {warnings.map((w) => {
          const colors = LEVEL_COLORS[w.level];
          const key = warningKey(w);
          const tagStyle = [styles.tag, { borderLeftColor: colors.border, backgroundColor: colors.tint }];
          const text = (
            <ThemedText type="small">
              {warningIcon(w)} {label(w)}
            </ThemedText>
          );
          return explain ? (
            <Pressable
              key={key}
              accessibilityLabel={`${label(w)}: ${causes(key).join(', ')}`}
              onHoverIn={() => setOpenKey(key)}
              onHoverOut={() => setOpenKey((old) => (old === key ? null : old))}
              onPress={() => setOpenKey((old) => (old === key ? null : key))}
              style={tagStyle}>
              {text}
            </Pressable>
          ) : (
            <ThemedView key={key} style={tagStyle}>
              {text}
            </ThemedView>
          );
        })}
      </ThemedView>
      {open ? (
        <ThemedText type="small" themeColor="textSecondary">
          {warningIcon(open)} {t('warnCausedBy', { names: causes(warningKey(open)).join(', ') })}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.one, backgroundColor: 'transparent' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, backgroundColor: 'transparent' },
  // A flat label: a coloured bar on the left and a soft tint, no outline, so it does not look like a button.
  tag: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: 4,
    borderLeftWidth: 3,
  },
});
