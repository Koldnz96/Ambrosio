import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { NicknameForm } from '@/components/nickname-form';
import { Photo } from '@/components/photo';
import { RecipeSteps } from '@/components/recipe-steps';
import { RecipeHeading } from '@/components/recipe-heading';
import { RecipeForm, type IngredientInput, type RecipeInput } from '@/components/recipe-form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { WelcomeCard } from '@/components/welcome-card';
import { WarningChips } from '@/components/warning-chips';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Layout, fullRow } from '@/constants/layout';
import { repostOf } from '@/data/repost';
import { sameAsOriginalPhoto } from '@/data/same-photo';
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
  const { profile, displayName, needsNickname, isGuest, saveDisplayName } = useUserData(user?.uid ?? null);
  useSyncAuthorName(recipes, displayName);
  const [actionError, setActionError] = useState('');
  const error = actionError || (recipesError ? t('errLoadRecipes', { message: recipesError }) : '');

  const [editingId, setEditingId] = useState<string | null>(null); // recipe being edited
  const [confirmingId, setConfirmingId] = useState<string | null>(null); // recipe waiting for "Yes, delete"
  const [photoAskId, setPhotoAskId] = useState<string | null>(null); // copy whose photo is the original's

  async function createRecipe(input: RecipeInput) {
    if (!user) return;
    await addDoc(collection(db, 'recipes'), {
      ownerId: user.uid,
      name: input.name,
      visibility: 'private',
      ingredients: input.ingredients,
      steps: input.steps,
      servings: input.servings,
      createdAt: serverTimestamp(),
    });
  }

  async function updateRecipe(id: string, input: RecipeInput) {
    await updateDoc(doc(db, 'recipes', id), {
      name: input.name,
      ingredients: input.ingredients,
      steps: input.steps,
      servings: input.servings,
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

  // Making a recipe public. A copy must not reuse the photo of the recipe it was copied from:
  // then the person is asked to add their own photo, or to publish without one.
  async function publish(recipe: { id: string; copiedFrom: string; photo: string }, photo = recipe.photo) {
    setActionError('');
    if (recipe.copiedFrom && photo && (await sameAsOriginalPhoto(recipe.copiedFrom, photo))) {
      setPhotoAskId(recipe.id);
      return;
    }
    setPhotoAskId(null);
    await setVisibility(recipe.id, 'public');
  }

  async function addOwnPhotoAndPublish(recipe: { id: string; copiedFrom: string; photo: string }) {
    const photo = await changePhoto(recipe.id, false);
    if (photo !== null) await publish(recipe, photo);
  }

  async function publishWithoutPhoto(recipe: { id: string; copiedFrom: string; photo: string }) {
    await changePhoto(recipe.id, true);
    setPhotoAskId(null);
    await setVisibility(recipe.id, 'public');
  }

  // Choose a picture, shrink it, and save it on the recipe. An empty photo removes it.
  // Returns the new photo text ('' when removed), or null when nothing was saved.
  async function changePhoto(id: string, remove: boolean): Promise<string | null> {
    setActionError('');
    let photo = '';
    if (!remove) {
      const result = await pickPhoto();
      if (!result.ok) {
        if (result.reason !== 'cancelled') setActionError(t(result.reason === 'too-big' ? 'errPhotoBig' : 'errPhoto'));
        return null;
      }
      photo = result.photo;
    }
    try {
      await updateDoc(doc(db, 'recipes', id), { photo, updatedAt: serverTimestamp() });
      return photo;
    } catch (err) {
      setActionError(t('errSavePhoto', { message: (err as Error).message }));
      return null;
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
    <Screen title={t('recipesTitle')}>
      {!ready ? (
        <ThemedText themeColor="textSecondary">{t('checkingSignIn')}</ThemedText>
      ) : !user ? (
        <>
          <ThemedText themeColor="textSecondary">{t('recipesSignIn')}</ThemedText>
          <WelcomeCard />
        </>
      ) : isGuest ? (
        <ThemedText themeColor="textSecondary">{t('guestRecipes')}</ThemedText>
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
            <ThemedView style={Layout.grid}>
            {recipes.map((recipe) =>
              editingId === recipe.id ? (
                <ThemedView key={recipe.id} style={fullRow}>
                  <RecipeForm
                    title={t('editRecipe')}
                    submitLabel={t('saveChanges')}
                    initial={{ name: recipe.name, ingredients: recipe.ingredients, steps: recipe.steps, servings: recipe.servings }}
                    profile={profile}
                    onSubmit={(input) => updateRecipe(recipe.id, input)}
                    onCancel={() => setEditingId(null)}
                  />
                </ThemedView>
              ) : (
                <ThemedView key={recipe.id} type="backgroundElement" style={Layout.card}>
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
                  <RecipeSteps steps={recipe.steps} />
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
                  {photoAskId === recipe.id ? (
                    <ThemedView type="backgroundElement" style={styles.row}>
                      <ThemedText type="small">{t('photoSameAsk')}</ThemedText>
                      <Pressable style={Layout.smallButton} onPress={() => addOwnPhotoAndPublish(recipe)}>
                        <ThemedText type="smallBold">📷 {t('photoAddOwn')}</ThemedText>
                      </Pressable>
                      <Pressable style={Layout.smallButton} onPress={() => publishWithoutPhoto(recipe)}>
                        <ThemedText type="smallBold">{t('photoPublishWithout')}</ThemedText>
                      </Pressable>
                      <Pressable style={Layout.smallButton} onPress={() => setPhotoAskId(null)}>
                        <ThemedText type="smallBold">{t('cancel')}</ThemedText>
                      </Pressable>
                    </ThemedView>
                  ) : null}
                  {confirmingId === recipe.id ? (
                    <ThemedView type="backgroundElement" style={styles.row}>
                      <ThemedText type="small">{t('deleteAsk')}</ThemedText>
                      <Pressable style={Layout.smallButton} onPress={() => deleteRecipe(recipe.id)}>
                        <ThemedText type="smallBold">{t('deleteYes')}</ThemedText>
                      </Pressable>
                      <Pressable style={Layout.smallButton} onPress={() => setConfirmingId(null)}>
                        <ThemedText type="smallBold">{t('cancel')}</ThemedText>
                      </Pressable>
                    </ThemedView>
                  ) : (
                    <ThemedView type="backgroundElement" style={styles.row}>
                      <Pressable
                        style={Layout.smallButton}
                        onPress={() => {
                          setEditingId(recipe.id);
                          setConfirmingId(null);
                        }}>
                        <ThemedText type="smallBold">{t('edit')}</ThemedText>
                      </Pressable>
                      <Pressable style={Layout.smallButton} onPress={() => changePhoto(recipe.id, false)}>
                        <ThemedText type="smallBold">📷 {recipe.photo ? t('changePhoto') : t('addPhoto')}</ThemedText>
                      </Pressable>
                      {recipe.photo ? (
                        <Pressable style={Layout.smallButton} onPress={() => changePhoto(recipe.id, true)}>
                          <ThemedText type="smallBold">{t('removePhoto')}</ThemedText>
                        </Pressable>
                      ) : null}
                      <Pressable
                        style={Layout.smallButton}
                        onPress={() =>
                          recipe.visibility === 'public' ? setVisibility(recipe.id, 'private') : publish(recipe)
                        }>
                        <ThemedText type="smallBold">
                          {recipe.visibility === 'public' ? t('makePrivate') : t('makePublic')}
                        </ThemedText>
                      </Pressable>
                      <Pressable style={Layout.smallButton} onPress={() => setConfirmingId(recipe.id)}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
});
