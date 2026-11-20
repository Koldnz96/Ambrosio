// One recipe in a "pick a recipe" list on the Week page (+ Adicionar receita and 🔄 Trocar).
// A small card, like on Discover: photo on the left, the name big, who cooked it, price per person
// and allergy chips. The whole card is the button.
import { Image, Pressable, StyleSheet } from 'react-native';

import { RecipeHeading } from '@/components/recipe-heading';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WarningChips } from '@/components/warning-chips';
import { Spacing } from '@/constants/theme';
import { compareShops, formatEuros, type PricesFile } from '@/data/prices';
import { recipeWarnings, type Profile } from '@/data/warnings';
import { useLanguage } from '@/i18n/language';

type Props = {
  recipe: {
    name: string;
    photo: string;
    servings: number;
    authorName: string;
    ingredients: { productId: string | null; amount: number | null; unit: string }[];
  };
  profile: Profile;
  prices: PricesFile | null;
  onPress: () => void;
};

export function RecipePickCard({ recipe, profile, prices, onPress }: Props) {
  const { t } = useLanguage();
  // Price per person (the same for any number of people, so we use the recipe as written).
  const best = compareShops(recipe.ingredients, prices).ranking[0];
  const perPerson = best && recipe.servings > 0 ? t('perPerson', { price: formatEuros(best.total / recipe.servings) }) : '';
  const hasPhoto = recipe.photo.startsWith('data:image/');

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [pressed && styles.pressed]}>
      <ThemedView type="backgroundElement" style={styles.card}>
        {hasPhoto ? (
          <Image source={{ uri: recipe.photo }} resizeMode="cover" style={styles.photo} />
        ) : (
          <ThemedView type="backgroundSelected" style={[styles.photo, styles.noPhoto]}>
            <ThemedText style={styles.plate}>🍽️</ThemedText>
          </ThemedView>
        )}
        <ThemedView type="backgroundElement" style={styles.text}>
          <RecipeHeading name={recipe.name} author={recipe.authorName.trim() || undefined} />
          {perPerson ? (
            <ThemedText type="small" themeColor="textSecondary">
              {perPerson}
            </ThemedText>
          ) : null}
          <WarningChips warnings={recipeWarnings(recipe.ingredients, profile)} />
        </ThemedView>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.two, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(127,90,60,0.25)', alignItems: 'center' },
  pressed: { opacity: 0.7 },
  photo: { width: 64, height: 64, borderRadius: 12 },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  plate: { fontSize: 24, lineHeight: 30, opacity: 0.6 },
  text: { flex: 1, gap: 2 },
});
