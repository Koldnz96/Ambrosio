import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import type { IngredientInput } from '@/components/recipe-form';
import type { CopyInfo } from '@/data/repost';
import { db } from '@/firebase';

export type Recipe = {
  id: string;
  name: string;
  visibility: 'private' | 'public';
  authorName: string; // shown when the recipe is public (empty = anonymous)
  ingredients: IngredientInput[];
  photo: string; // a small picture saved as text ('' = no photo)
  createdAtMs: number;
} & CopyInfo;

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
            authorName: data.authorName ?? '',
            ingredients: (data.ingredients ?? []).map((ing: Partial<IngredientInput>) => ({
              name: ing.name ?? '',
              amount: ing.amount ?? null,
              unit: ing.unit ?? '',
              productId: ing.productId ?? null,
            })),
            createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
            photo: typeof data.photo === 'string' ? data.photo : '',
            copiedFrom: data.copiedFrom ?? '',
            originalAuthor: data.originalAuthor ?? '',
            originalSignature: data.originalSignature ?? '',
          };
        });
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setRecipes(list);
      },
      (err) => setError(err.message),
    );
  }, [uid]);

  return { recipes, error };
}
