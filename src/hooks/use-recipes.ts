import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import type { IngredientInput } from '@/components/recipe-form';
import { db } from '@/firebase';

export type Recipe = {
  id: string;
  name: string;
  visibility: 'private' | 'public';
  ingredients: IngredientInput[];
  createdAtMs: number;
};

// This user's recipes, newest first. The list updates by itself when something is saved.
export function useRecipes(uid: string | null) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) {
      setRecipes([]);
      return;
    }
    const q = query(collection(db, 'recipes'), where('ownerId', '==', uid));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Recipe[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name ?? '',
            visibility: data.visibility ?? 'private',
            ingredients: (data.ingredients ?? []).map((ing: Partial<IngredientInput>) => ({
              name: ing.name ?? '',
              amount: ing.amount ?? null,
              unit: ing.unit ?? '',
              productId: ing.productId ?? null,
            })),
            createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
          };
        });
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setRecipes(list);
      },
      (err) => setError(`Could not load recipes: ${err.message}`),
    );
  }, [uid]);

  return { recipes, error };
}
