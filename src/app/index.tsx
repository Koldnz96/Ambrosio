import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { NicknameForm } from '@/components/nickname-form';
import { Photo } from '@/components/photo';
import { RecipeHeading } from '@/components/recipe-heading';
import { RecipeForm, type IngredientInput, type RecipeInput } from '@/components/recipe-form';
import { ThemedText } from '@/components/themed-text';
import { WarningChips } from '@/components/warning-chips';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { repostOf } from '@/data/repost';
import { recipeWarnings } from '@/data/warnings';
import { pickPhoto } from '@/lib/pick-photo';
import { db } from '@/firebase';
import { useAuthUser } from '@/hooks/use-auth-user';
import { useRecipes } from '@/hooks/use-recipes';
import { useSyncAuthorName } from '@/hooks/use-sync-author-name';
import { useUserData } from '@/hooks/use-user-data';
import { useLanguage } from '@/i18n/language';

export default function MyRecipesScreen() {
  const { t, ingredient: ingredientLabel } = useLanguage();
  const { user, ready } = useAuthUser();
  const { recipes, error: recipesError } = useRecipes(user?.uid ?? null);
  const { profile, displayName, needsNickname, saveDisplayName } = useUserData(user?.uid ?? null);
  useSyncAuthorName(recipes, displayName);
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

  // Choose a picture, shrink it, and save it on the recipe. An empty photo removes it.
  async function changePhoto(id: string, remove: boolean) {
    setActionError('');
    let photo = '';
    if (!remove) {
      const result = await pickPhoto();
      if (!result.ok) {
        if (result.reason !== 'cancelled') setActionError(t(result.reason === 'too-big' ? 'errPhotoBig' : 'errPhoto'));
        return;
      }
      photo = result.photo;
    }
    try {
      await updateDoc(doc(db, 'recipes', id), { photo, updatedAt: serverTimestamp() });
    } catch (err) {
      setActionError(t('errSavePhoto', { message: (err as Error).message }));
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
          ) : needsNickname ? (
            <NicknameForm onSave={saveDisplayName} />
          ) : (
            <>
              <RecipeForm title={t('newRecipe')} submitLabel={t('saveRecipe')} clearOnSave profile={profile} onSubmit={createRecipe} />

              {error ? <ThemedText type="small">{error}</ThemedText> : null}

              {recipes.length === 0 ? (
                <ThemedText themeColor="textSecondary">
                  {t('noRecipes')}
                </ThemedText>
              ) : (
                <ThemedView style={styles.grid}>
                {recipes.map((recipe) =>
                  editingId === recipe.id ? (
                    <ThemedView key={recipe.id} style={styles.fullRow}>
                      <RecipeForm
                        title={t('editRecipe')}
                        submitLabel={t('saveChanges')}
                        initial={{ name: recipe.name, ingredients: recipe.ingredients }}
                        profile={profile}
                        onSubmit={(input) => updateRecipe(recipe.id, input)}
                        onCancel={() => setEditingId(null)}
                      />
                    </ThemedView>
                  ) : (
                    <ThemedView key={recipe.id} type="backgroundElement" style={styles.card}>
                      {recipe.photo ? <Photo photo={recipe.photo} /> : null}
                      <RecipeHeading
                        name={recipe.name}
                        author={recipe.visibility === 'public' ? displayName : undefined}
                        original={repostOf(recipe) || undefined}
                        note={recipe.visibility === 'public' ? `🌍 ${t('public')}` : undefined}
                      />
                      <WarningChips warnings={recipeWarnings(recipe.ingredients, profile)} />
                      {recipe.ingredients.map((ing, index) => (
                        <ThemedText key={index} type="small" themeColor="textSecondary">
                          {[ing.amount ?? '', ing.unit, ingredientLabel(ing)].filter((part) => part !== '').join(' ')}
                        </ThemedText>
                      ))}
                      {recipe.originalAuthor ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {t(repostOf(recipe) ? 'copyUnchanged' : 'copyChanged', { original: recipe.originalAuthor })}
                        </ThemedText>
                      ) : null}
                      {recipe.visibility === 'public' ? null : (
                        <ThemedText type="small" themeColor="textSecondary">
                          🔒 {t('private')}
                        </ThemedText>
                      )}
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
                          <Pressable style={styles.smallButton} onPress={() => changePhoto(recipe.id, false)}>
                            <ThemedText type="smallBold">📷 {recipe.photo ? t('changePhoto') : t('addPhoto')}</ThemedText>
                          </Pressable>
                          {recipe.photo ? (
                            <Pressable style={styles.smallButton} onPress={() => changePhoto(recipe.id, true)}>
                              <ThemedText type="smallBold">{t('removePhoto')}</ThemedText>
                            </Pressable>
                          ) : null}
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
                )}
                </ThemedView>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, alignItems: 'flex-start' },
  fullRow: { width: '100%' },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one, flexGrow: 1, flexBasis: 320, maxWidth: 520 },
});
