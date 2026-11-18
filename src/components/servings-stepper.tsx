// "−  2 people  +": how many people you cook for. The ingredient amounts and the price follow it.
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/i18n/language';

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 20;

export function ServingsStepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const { t } = useLanguage();
  const label = t(value === 1 ? 'peopleOne' : 'peopleMany', { count: value });
  return (
    <ThemedView style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('servingsLess')}
        disabled={value <= MIN_SERVINGS}
        style={[Layout.smallButton, styles.button, value <= MIN_SERVINGS && styles.off]}
        onPress={() => onChange(Math.max(MIN_SERVINGS, value - 1))}>
        <ThemedText type="smallBold">−</ThemedText>
      </Pressable>
      <ThemedText type="smallBold" style={styles.label}>
        👥 {label}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('servingsMore')}
        disabled={value >= MAX_SERVINGS}
        style={[Layout.smallButton, styles.button, value >= MAX_SERVINGS && styles.off]}
        onPress={() => onChange(Math.min(MAX_SERVINGS, value + 1))}>
        <ThemedText type="smallBold">+</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: 'transparent' },
  button: { minWidth: 40, alignItems: 'center' },
  label: { minWidth: 96, textAlign: 'center' }, // fixed width, so the buttons do not move
  off: { opacity: 0.4 },
});
