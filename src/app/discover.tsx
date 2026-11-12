import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WarningChips } from '@/components/warning-chips';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { recipeWarnings } from '@/data/warnings';
import { db } from '@/firebase';
import { useAuthUser } from '@/hooks/use-auth-user';
import { usePublicRecipes, type PublicRecipe } from '@/hooks/use-public-recipes';
import { useUserData } from '@/hooks/use-user-data';
import { useLanguage } from '@/i18n/language';

export default function DiscoverScreen() {
  const { t, ingredient: ingredientLabel } = useLanguage();
  const { user, ready } = useAuthUser();
  const { recipes, loaded, error: loadError } = usePublicRecipes(user !== null);
  const { profile } = useUserData(user?.uid ?? null);
  const [copied, setCopied] = useState<Set<string>>(new Set()); // recipes copied in this visit
  const [error, setError] = useState('');

  // A copy is a new private recipe of your own. Changing it never changes the original.
  async function saveCopy(recipe: PublicRecipe) {
    if (!user) return;
    setError('');
    try {
      await addDoc(collection(db, 'recipes'), {
        ownerId: user.uid,
        name: recipe.name,
        visibility: 'private',
        ingredients: recipe.ingredients,
        copiedFrom: recipe.id,
        createdAt: serverTimestamp(),
      });
      setCopied((old) => new Set(old).add(recipe.id));
    } catch (err) {
      setError(t('errCopy', { message: (err as Error).message }));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">{t('discoverTitle')}</ThemedText>

          {!ready ? (
            <ThemedText themeColor="textSecondary">{t('checkingSignIn')}</ThemedText>
          ) : !user ? (
            <ThemedText themeColor="textSecondary">{t('discoverSignIn')}</ThemedText>
          ) : (
            <>
              <ThemedText themeColor="textSecondary">{t('discoverHelp')}</ThemedText>
              {loadError ? <ThemedText type="small">{t('errLoadPublic', { message: loadError })}</ThemedText> : null}
              {error ? <ThemedText type="small">{error}</ThemedText> : null}
              {loaded && recipes.length === 0 ? (
                <ThemedText themeColor="textSecondary">{t('discoverEmpty')}</ThemedText>
              ) : null}

              {recipes.map((recipe) => {
                const mine = recipe.ownerId === user.uid;
                return (
                  <ThemedView key={recipe.id} type="backgroundElement" style={styles.card}>
                    <ThemedText type="smallBold">{recipe.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {mine ? t('yourRecipe') : t('byAuthor', { name: recipe.authorName || t('anonymousCook') })}
                    </ThemedText>
                    <WarningChips warnings={recipeWarnings(recipe.ingredients, profile)} />
                    {recipe.ingredients.map((ing, index) => (
                      <ThemedText key={index} type="small" themeColor="textSecondary">
                        {[ing.amount ?? '', ing.unit, ingredientLabel(ing)].filter((part) => part !== '').join(' ')}
                      </ThemedText>
                    ))}
                    <StarRating recipeId={recipe.id} uid={user.uid} canRate={!mine} />
                    {mine ? null : copied.has(recipe.id) ? (
                      <ThemedText type="small">{t('copySaved')}</ThemedText>
                    ) : (
                      <Pressable style={styles.smallButton} onPress={() => saveCopy(recipe)}>
                        <ThemedText type="smallBold">{t('saveCopy')}</ThemedText>
                      </Pressable>
                    )}
                  </ThemedView>
                );
              })}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? 96 : Spacing.five,
  },
  content: { gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.five },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one, maxWidth: 520 },
  smallButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: Spacing.one,
  },
});
