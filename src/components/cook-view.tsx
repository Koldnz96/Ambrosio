// "Cook now": one recipe on its own, with just what you need at the stove: photo, name, allergy
// warnings, ingredients and steps. It saves nothing and changes nothing in the database.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Photo } from '@/components/photo';
import { RecipeHeading } from '@/components/recipe-heading';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WarningChips } from '@/components/warning-chips';
import { Layout } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import type { Warning } from '@/data/warnings';
import type { PublicRecipe } from '@/hooks/use-public-recipes';
import { useLanguage } from '@/i18n/language';

type Props = {
  recipe: PublicRecipe;
  author: string; // the cook's nickname
  original?: string; // set when it is a repost: the original cook
  warnings: Warning[]; // allergy warnings, already worked out for this search
  extra?: ReactNode; // shown under the name, for example the servings and the price
  onClose: () => void;
};

export function CookView({ recipe, author, original, warnings, extra, onClose }: Props) {
  const { t, ingredient: ingredientLabel } = useLanguage();

  function ingredientLine(ing: PublicRecipe['ingredients'][number]): string {
    return [ing.amount ?? '', ing.unit === 'unit' ? '' : ing.unit, ingredientLabel(ing)].filter((part) => part !== '').join(' ');
  }

  const closeButton = (
    <Pressable accessibilityRole="button" style={Layout.button} onPress={onClose}>
      <ThemedText type="smallBold">{t('cookBack')}</ThemedText>
    </Pressable>
  );

  return (
    <ThemedView type="backgroundElement" style={[Layout.card, styles.page]}>
      {closeButton}
      {recipe.photo ? <Photo photo={recipe.photo} /> : null}
      <RecipeHeading name={recipe.name} author={author} original={original} />
      <WarningChips warnings={warnings} />
      {extra}

      <ThemedText type="smallBold">{t('cookIngredients')}</ThemedText>
      {recipe.ingredients.map((ing, index) => (
        <ThemedText key={index} style={styles.line}>
          • {ingredientLine(ing)}
        </ThemedText>
      ))}

      {recipe.steps.length > 0 ? (
        <>
          <ThemedText type="smallBold">{t('stepsTitle')}</ThemedText>
          {recipe.steps.map((step, index) => (
            <ThemedText key={index} style={styles.line}>
              {index + 1}. {step}
            </ThemedText>
          ))}
        </>
      ) : null}
      {closeButton}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 760, gap: Spacing.three },
  line: { lineHeight: 26 },
});
