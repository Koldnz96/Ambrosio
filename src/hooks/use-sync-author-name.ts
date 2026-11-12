import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';

import { db } from '@/firebase';
import type { Recipe } from '@/hooks/use-recipes';

// Keeps the nickname written on your public recipes the same as your current nickname.
// (Other people cannot read your profile, so the nickname is copied onto each shared recipe.)
export function useSyncAuthorName(recipes: Recipe[], nickname: string) {
  useEffect(() => {
    if (!nickname) return;
    for (const recipe of recipes) {
      if (recipe.visibility === 'public' && recipe.authorName !== nickname) {
        updateDoc(doc(db, 'recipes', recipe.id), { authorName: nickname }).catch(() => {});
      }
    }
  }, [recipes, nickname]);
}
