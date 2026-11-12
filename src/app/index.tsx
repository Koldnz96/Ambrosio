import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { auth, db } from '@/firebase';

type Ingredient = { name: string; amount: number | null; unit: string };
type Recipe = {
  id: string;
  name: string;
  visibility: 'private' | 'public';
  ingredients: Ingredient[];
  createdAtMs: number;
};

export default function MyRecipesScreen() {
  const theme = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState('');

  // The form
  const [name, setName] = useState('');
  const [ingredientName, setIngredientName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');
  const [saving, setSaving] = useState(false);

  // Which recipe is waiting for "Yes, delete" (null = none)
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Know who is signed in.
  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setReady(true);
    });
  }, []);

  // Listen to this user's recipes. The list updates by itself when something is saved.
  useEffect(() => {
    if (!user) {
      setRecipes([]);
      return;
    }
    const q = query(collection(db, 'recipes'), where('ownerId', '==', user.uid));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Recipe[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name ?? '',
            visibility: data.visibility ?? 'private',
            ingredients: data.ingredients ?? [],
            createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
          };
        });
        list.sort((a, b) => b.createdAtMs - a.createdAtMs); // newest first
        setRecipes(list);
      },
      (err) => setError(`Could not load recipes: ${err.message}`),
    );
  }, [user]);

  async function saveRecipe() {
    if (!user) return;
    if (!name.trim()) {
      setError('Please give the recipe a name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const parsedAmount = amount.trim() === '' ? null : Number(amount.replace(',', '.'));
      if (parsedAmount !== null && Number.isNaN(parsedAmount)) {
        setError('The amount must be a number, like 200 or 1.5.');
        return;
      }
      const ingredients: Ingredient[] = ingredientName.trim()
        ? [{ name: ingredientName.trim(), amount: parsedAmount, unit: unit.trim() }]
        : [];
      await addDoc(collection(db, 'recipes'), {
        ownerId: user.uid,
        name: name.trim(),
        visibility: 'private',
        ingredients,
        createdAt: serverTimestamp(),
      });
      setName('');
      setIngredientName('');
      setAmount('');
      setUnit('');
    } catch (err) {
      setError(`Could not save: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecipe(id: string) {
    setError('');
    try {
      await deleteDoc(doc(db, 'recipes', id));
    } catch (err) {
      setError(`Could not delete: ${(err as Error).message}`);
    } finally {
      setConfirmingId(null);
    }
  }

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.backgroundSelected }];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">My recipes</ThemedText>

          {!ready ? (
            <ThemedText themeColor="textSecondary">Checking if you are signed in...</ThemedText>
          ) : !user ? (
            <ThemedText themeColor="textSecondary">
              Sign in on the Profile tab to see and save your recipes.
            </ThemedText>
          ) : (
            <>
              <ThemedView type="backgroundElement" style={styles.form}>
                <ThemedText type="smallBold">New recipe</ThemedText>
                <TextInput
                  style={inputStyle}
                  placeholder="Recipe name"
                  placeholderTextColor={theme.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  One ingredient for now (more later):
                </ThemedText>
                <TextInput
                  style={inputStyle}
                  placeholder="Ingredient, for example rice"
                  placeholderTextColor={theme.textSecondary}
                  value={ingredientName}
                  onChangeText={setIngredientName}
                />
                <ThemedView type="backgroundElement" style={styles.row}>
                  <TextInput
                    style={[inputStyle, styles.amount]}
                    placeholder="Amount"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                  />
                  <TextInput
                    style={[inputStyle, styles.unit]}
                    placeholder="Unit (g, ml, unit)"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    value={unit}
                    onChangeText={setUnit}
                  />
                </ThemedView>
                <Pressable style={styles.button} disabled={saving} onPress={saveRecipe}>
                  <ThemedText type="smallBold">{saving ? 'Saving...' : 'Save recipe'}</ThemedText>
                </Pressable>
                {error ? <ThemedText type="small">{error}</ThemedText> : null}
              </ThemedView>

              {recipes.length === 0 ? (
                <ThemedText themeColor="textSecondary">
                  No recipes yet. Write your first one above.
                </ThemedText>
              ) : (
                recipes.map((recipe) => (
                  <ThemedView key={recipe.id} type="backgroundElement" style={styles.card}>
                    <ThemedText type="smallBold">{recipe.name}</ThemedText>
                    {recipe.ingredients.map((ing, index) => (
                      <ThemedText key={index} type="small" themeColor="textSecondary">
                        {ing.amount ?? ''} {ing.unit} {ing.name}
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
                      <Pressable style={styles.smallButton} onPress={() => setConfirmingId(recipe.id)}>
                        <ThemedText type="smallBold">Delete</ThemedText>
                      </Pressable>
                    )}
                  </ThemedView>
                ))
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
  form: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two, maxWidth: 520 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: Spacing.two },
  amount: { flex: 1 },
  unit: { flex: 2 },
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  smallButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one, maxWidth: 520 },
});
