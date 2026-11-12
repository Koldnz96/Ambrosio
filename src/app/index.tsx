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

function describeIngredient(ing: IngredientInput): string {
  return [ing.amount ?? '', ing.unit, ing.name].filter((part) => part !== '').join(' ');
}

export default function MyRecipesScreen() {
  const { user, ready } = useAuthUser();
  const { recipes, error: recipesError } = useRecipes(user?.uid ?? null);
  const { profile } = useUserData(user?.uid ?? null);
  const [actionError, setActionError] = useState('');
  const error = actionError || recipesError;

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

  async function deleteRecipe(id: string) {
    setActionError('');
    try {
      await deleteDoc(doc(db, 'recipes', id));
    } catch (err) {
      setActionError(`Could not delete: ${(err as Error).message}`);
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">My recipes</ThemedText>

          {!ready ? (
            <ThemedText themeColor="textSecondary">Checking if you are signed in...</ThemedText>
          ) : !user ? (
            <ThemedText themeColor="textSecondary">
              Sign in on the Profile tab to see and save your recipes.
            </ThemedText>
          ) : (
            <>
              <RecipeForm title="New recipe" submitLabel="Save recipe" clearOnSave profile={profile} onSubmit={createRecipe} />

              {error ? <ThemedText type="small">{error}</ThemedText> : null}

              {recipes.length === 0 ? (
                <ThemedText themeColor="textSecondary">
                  No recipes yet. Write your first one above.
                </ThemedText>
              ) : (
                recipes.map((recipe) =>
                  editingId === recipe.id ? (
                    <RecipeForm
                      key={recipe.id}
                      title="Edit recipe"
                      submitLabel="Save changes"
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
                          {describeIngredient(ing)}
                        </ThemedText>
                      ))}
                      <ThemedText type="small" themeColor="textSecondary">
                        {recipe.visibility === 'public' ? 'Public' : 'Private'}
                      </ThemedText>
                      {confirmingId === recipe.id ? (
                        <ThemedView type="backgroundElement" style={styles.row}>
                          <ThemedText type="small">Delete this recipe for good?</ThemedText>
                          <Pressable style={styles.smallButton} onPress={() => deleteRecipe(recipe.id)}>
                            <ThemedText type="smallBold">Yes, delete</ThemedText>
                          </Pressable>
                          <Pressable style={styles.smallButton} onPress={() => setConfirmingId(null)}>
                            <ThemedText type="smallBold">Cancel</ThemedText>
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
                            <ThemedText type="smallBold">Edit</ThemedText>
                          </Pressable>
                          <Pressable style={styles.smallButton} onPress={() => setConfirmingId(recipe.id)}>
                            <ThemedText type="smallBold">Delete</ThemedText>
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
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  smallButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one, maxWidth: 520 },
});
