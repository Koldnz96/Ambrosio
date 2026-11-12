import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { RecipeForm, type IngredientInput, type RecipeInput } from '@/components/recipe-form';
import { ThemedText } from '@/components/themed-text';
import { WarningChips } from '@/components/warning-chips';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { recipeWarnings } from '@/data/warnings';
import { db } from '@/firebase';
import { useAuthUser } from '@/hooks/use-auth-user';
import { useRecipes } from '@/hooks/use-recipes';
import { useUserData } from '@/hooks/use-user-data';
import { useLanguage } from '@/i18n/language';

export default function MyRecipesScreen() {
  const { t, ingredient: ingredientLabel } = useLanguage();
  const { user, ready } = useAuthUser();
  const { recipes, error: recipesError } = useRecipes(user?.uid ?? null);
  const { profile, displayName } = useUserData(user?.uid ?? null);
  const [actionError, setActionError] = useState('');
  const error = actionError || (recipesError ? t('errLoadRecipes', { message: recipesError }) : '');

  const [editingId, setEditingId] = useState<string | null>(null); // recipe being edited
  const [confirmingId, setConfirmingId] = useState<string | null>(null); // recipe waiting for "Yes, delete"

  async function createRecipe(input: RecipeInput) {
    if (!user) return;
    await addDoc(collection(db, 'recipes'), {
      ownerId: user.uid,
      name: input.name,
      visibility: 'private',
      ingredients: input.ingredients,
      createdAt: serverTimestamp(),
    });
  }

  async function updateRecipe(id: string, input: RecipeInput) {
    await updateDoc(doc(db, 'recipes', id), {
      name: input.name,
      ingredients: input.ingredients,
      updatedAt: serverTimestamp(),
    });
    setEditingId(null);
  }

  // Public recipes show up on the Discover tab for everyone. The display name is copied
  // onto the recipe at that moment, because other people cannot read your profile.
  async function setVisibility(id: string, visibility: 'private' | 'public') {
    setActionError('');
    try {
      await updateDoc(doc(db, 'recipes', id), { visibility, authorName: displayName, updatedAt: serverTimestamp() });
    } catch (err) {
      setActionError(t('errPublish', { message: (err as Error).message }));
    }
  }

  async function deleteRecipe(id: string) {
    setActionError('');
    try {
      await deleteDoc(doc(db, 'recipes', id));
    } catch (err) {
      setActionError(t('errDelete', { message: (err as Error).message }));
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">{t('recipesTitle')}</ThemedText>

          {!ready ? (
            <ThemedText themeColor="textSecondary">{t('checkingSignIn')}</ThemedText>
          ) : !user ? (
            <ThemedText themeColor="textSecondary">
              {t('recipesSignIn')}
            </ThemedText>
          ) : (
            <>
              <RecipeForm title={t('newRecipe')} submitLabel={t('saveRecipe')} clearOnSave profile={profile} onSubmit={createRecipe} />

              {error ? <ThemedText type="small">{error}</ThemedText> : null}

              {recipes.length === 0 ? (
                <ThemedText themeColor="textSecondary">
                  {t('noRecipes')}
                </ThemedText>
              ) : (
                recipes.map((recipe) =>
                  editingId === recipe.id ? (
                    <RecipeForm
                      key={recipe.id}
                      title={t('editRecipe')}
                      submitLabel={t('saveChanges')}
                      initial={{ name: recipe.name, ingredients: recipe.ingredients }}
                      profile={profile}
                      onSubmit={(input) => updateRecipe(recipe.id, input)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <ThemedView key={recipe.id} type="backgroundElement" style={styles.card}>
                      <ThemedText type="smallBold">{recipe.name}</ThemedText>
                      <WarningChips warnings={recipeWarnings(recipe.ingredients, profile)} />
                      {recipe.ingredients.map((ing, index) => (
                        <ThemedText key={index} type="small" themeColor="textSecondary">
                          {[ing.amount ?? '', ing.unit, ingredientLabel(ing)].filter((part) => part !== '').join(' ')}
                        </ThemedText>
                      ))}
                      <ThemedText type="small" themeColor="textSecondary">
                        {recipe.visibility === 'public' ? `🌍 ${t('public')}` : `🔒 ${t('private')}`}
                      </ThemedText>
                      {confirmingId === recipe.id ? (
                        <ThemedView type="backgroundElement" style={styles.row}>
                          <ThemedText type="small">{t('deleteAsk')}</ThemedText>
                          <Pressable style={styles.smallButton} onPress={() => deleteRecipe(recipe.id)}>
                            <ThemedText type="smallBold">{t('deleteYes')}</ThemedText>
                          </Pressable>
                          <Pressable style={styles.smallButton} onPress={() => setConfirmingId(null)}>
                            <ThemedText type="smallBold">{t('cancel')}</ThemedText>
                          </Pressable>
                        </ThemedView>
                      ) : (
                        <ThemedView type="backgroundElement" style={styles.row}>
                          <Pressable
                            style={styles.smallButton}
                            onPress={() => {
                              setEditingId(recipe.id);
                              setConfirmingId(null);
                            }}>
                            <ThemedText type="smallBold">{t('edit')}</ThemedText>
                          </Pressable>
                          <Pressable
                            style={styles.smallButton}
                            onPress={() => setVisibility(recipe.id, recipe.visibility === 'public' ? 'private' : 'public')}>
                            <ThemedText type="smallBold">
                              {recipe.visibility === 'public' ? t('makePrivate') : t('makePublic')}
                            </ThemedText>
                          </Pressable>
                          <Pressable style={styles.smallButton} onPress={() => setConfirmingId(recipe.id)}>
                            <ThemedText type="smallBold">{t('delete')}</ThemedText>
                          </Pressable>
                        </ThemedView>
                      )}
                    </ThemedView>
                  ),
                )
              )}
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
  smallButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one, maxWidth: 520 },
});
