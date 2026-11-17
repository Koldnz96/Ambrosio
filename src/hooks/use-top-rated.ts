import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';

import { summarizeRatings } from '@/data/ratings';
import { topRated, type Rated } from '@/data/top-rated';
import { recipeSignature } from '@/data/repost';
import { db } from '@/firebase';
import type { PublicRecipe } from '@/hooks/use-public-recipes';

// The best rated public recipes. Ratings are read once (not live) when the page opens,
// one small request per recipe. That is fine for a small app; later we could keep the
// average on the recipe itself.
// Ratings can only be read by signed-in people, so signed-out visitors get an empty list.
export function useTopRated(recipes: PublicRecipe[], signedIn: boolean, limit = 3) {
  const [top, setTop] = useState<Rated<PublicRecipe>[]>([]);
  const [loading, setLoading] = useState(false);
  const ids = recipes.map((r) => r.id).join(',');

  useEffect(() => {
    if (!signedIn || recipes.length === 0) {
      setTop([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      recipes.map(async (recipe): Promise<Rated<PublicRecipe>> => {
        const snapshot = await getDocs(collection(db, 'recipes', recipe.id, 'ratings'));
        const summary = summarizeRatings(
          snapshot.docs.map((d) => ({ uid: d.id, stars: d.data().stars })),
          null,
        );
        return { recipe, average: summary.average, count: summary.count };
      }),
    )
      .then((list) => {
        if (!cancelled) setTop(topRated(list, limit, recipeSignature));
      })
      .catch(() => {
        if (!cancelled) setTop([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // "ids" changes when the list of recipes changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, signedIn, limit]);

  return { top, loading };
}
