import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import type { IngredientInput } from '@/components/recipe-form';
import type { CopyInfo } from '@/data/repost';
import { db } from '@/firebase';

export type PublicRecipe = {
  id: string;
  ownerId: string;
  authorName: string;
  name: string;
  ingredients: IngredientInput[];
  steps: string[]; // how to cook it, one step per item
  photo: string; // a small picture saved as text ('' = no photo)
  servings: number; // how many people the amounts are for
  createdAtMs: number;
} & CopyInfo;

// Every recipe that someone made public, newest first.
export function usePublicRecipes(enabled: boolean) {
  const [recipes, setRecipes] = useState<PublicRecipe[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) {
      setRecipes([]);
      setLoaded(false);
      return;
    }
    const q = query(collection(db, 'recipes'), where('visibility', '==', 'public'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: PublicRecipe[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: data.ownerId ?? '',
            authorName: data.authorName ?? '',
            name: data.name ?? '',
            ingredients: (data.ingredients ?? []).map((ing: Partial<IngredientInput>) => ({
              name: ing.name ?? '',
              amount: ing.amount ?? null,
              unit: ing.unit ?? '',
              productId: ing.productId ?? null,
            })),
            createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
            steps: Array.isArray(data.steps) ? data.steps.filter((s: unknown) => typeof s === 'string') : [],
            photo: typeof data.photo === 'string' ? data.photo : '',
            servings: Number.isInteger(data.servings) && data.servings > 0 ? data.servings : 4, // older recipes: 4
            copiedFrom: data.copiedFrom ?? '',
            originalAuthor: data.originalAuthor ?? '',
            originalSignature: data.originalSignature ?? '',
          };
        });
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setRecipes(list);
        setLoaded(true);
      },
      (err) => setError(err.message),
    );
  }, [enabled]);

  return { recipes, loaded, error };
}
