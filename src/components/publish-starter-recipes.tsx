// TEMPORARY: publishes the starter recipes as public, under the signed-in "Ambrosio" account.
// It skips any recipe the account already has, so a second click cannot make duplicates.
// Remove this file (and its line in profile.tsx) after the recipes are published.
import { useState } from 'react';
import { Pressable } from 'react-native';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout } from '@/constants/layout';
import { PRODUCTS } from '@/data/products';
import { SEED_RECIPES, type SeedRecipe } from '@/data/seed-recipes';
import { SEED_STEPS } from '@/data/seed-steps';
import { db } from '@/firebase';

type Props = { uid: string; authorName: string; existing: { id: string; name: string; ingredientNames: string[]; steps: string[] }[] };

// The first version was published with these English names. They are fixed to the Portuguese ones.
const OLD_NAMES: Record<string, string> = {
  'Bifanas (pork steaks in garlic and wine)': 'Bifanas de Porco',
  'Frango Piri-Piri (piri-piri chicken)': 'Frango Piri-Piri',
  'Arroz de Marisco (seafood rice)': 'Arroz de Marisco',
  'Bife à Casa (steak with fried egg and potatoes)': 'Bife à Casa com Ovo e Batatas',
  'Dourada Grelhada (grilled sea bream with potatoes and green beans)': 'Dourada Grelhada com Batatas e Feijão-verde',
  'Spaghetti Bolognese': 'Esparguete à Bolonhesa',
  'Spaghetti Carbonara': 'Esparguete à Carbonara',
  'Chicken Curry with Rice': 'Caril de Frango com Arroz',
  'Ham and Cheese Omelette with Salad': 'Omelete de Fiambre e Queijo com Salada',
  'Tuna Pasta': 'Massa de Atum',
  'Grilled Chicken with Rice and Salad': 'Frango Grelhado com Arroz e Salada',
  'Baked Salmon with Potatoes and Broccoli': 'Salmão no Forno com Batatas e Brócolos',
};

function buildIngredients(recipe: SeedRecipe) {
  return recipe.ingredients.map((ing) => {
    const product = PRODUCTS.find((p) => p.name === ing.product);
    if (!product) throw new Error(`Unknown product: ${ing.product}`);
    return { name: product.pt, amount: ing.amount, unit: ing.unit, productId: product.id };
  });
}

export function PublishStarterRecipes({ uid, authorName, existing }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const key = (n: string) => n.trim().toLowerCase();
  const seedByName = new Map(SEED_RECIPES.map((r) => [key(r.name), r]));
  const have = new Set(existing.map((r) => key(OLD_NAMES[r.name] ?? r.name)));
  const missing = SEED_RECIPES.filter((r) => !have.has(key(r.name)));
  // Recipes to fix: an old English name, or a seed recipe whose saved ingredient names are not Portuguese yet.
  const toFix = existing.filter((r) => {
    if (r.name in OLD_NAMES) return true;
    const recipe = seedByName.get(key(r.name));
    if (!recipe) return false;
    const stepsDiffer = (SEED_STEPS[recipe.name] ?? []).join('|') !== r.steps.join('|');
    return stepsDiffer || buildIngredients(recipe).map((i) => i.name).join('|') !== r.ingredientNames.join('|');
  });

  async function publish() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    let added = 0;
    let fixed = 0;
    try {
      for (const old of toFix) {
        const recipe = seedByName.get(key(OLD_NAMES[old.name] ?? old.name));
        if (!recipe) continue;
        await updateDoc(doc(db, 'recipes', old.id), {
          name: recipe.name,
          ingredients: buildIngredients(recipe),
          steps: SEED_STEPS[recipe.name] ?? [],
          updatedAt: serverTimestamp(),
        });
        fixed += 1;
      }
      for (const recipe of missing) {
        await addDoc(collection(db, 'recipes'), {
          ownerId: uid,
          name: recipe.name,
          visibility: 'public',
          authorName,
          ingredients: buildIngredients(recipe),
          steps: SEED_STEPS[recipe.name] ?? [],
          photo: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        added += 1;
      }
      setMessage(`Done: ${added} added, ${fixed} fixed.`);
    } catch (err) {
      setMessage(`Stopped (${added} added, ${fixed} fixed): ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView type="backgroundElement" style={Layout.card}>
      <ThemedText type="smallBold">Starter recipes (temporary)</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {missing.length === 0 && toFix.length === 0
          ? 'All starter recipes are already on this account, in Portuguese.'
          : `${missing.length} to publish, ${toFix.length} to fix (names in Portuguese).`}
      </ThemedText>
      {missing.length > 0 || toFix.length > 0 ? (
        <Pressable style={Layout.smallButton} disabled={busy} onPress={publish}>
          <ThemedText type="smallBold">{busy ? 'Working...' : 'Publish and fix recipes'}</ThemedText>
        </Pressable>
      ) : null}
      {message ? <ThemedText type="small">{message}</ThemedText> : null}
    </ThemedView>
  );
}
