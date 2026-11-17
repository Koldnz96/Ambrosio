// The cooking steps of a recipe, as a numbered list. Shows nothing when there are no steps.
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/i18n/language';

export function RecipeSteps({ steps }: { steps: string[] }) {
  const { t } = useLanguage();
  if (steps.length === 0) return null;
  return (
    <ThemedView style={styles.box}>
      <ThemedText type="smallBold">{t('stepsTitle')}</ThemedText>
      {steps.map((step, index) => (
        <ThemedText key={index} type="small" themeColor="textSecondary">
          {index + 1}. {step}
        </ThemedText>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.one, backgroundColor: 'transparent' },
});
