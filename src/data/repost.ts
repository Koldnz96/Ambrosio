// Copies and reposts.
//
// When you save a copy of someone's recipe, the copy remembers who made the original
// and what the original looked like (its "signature"). While the copy is unchanged,
// making it public shows it as a REPOST of the original cook. Once you change the name
// or the ingredients, it is your own version and shows under your nickname.

type Ingredient = { name: string; amount: number | null; unit: string; productId: string | null };
type Content = { name: string; ingredients: Ingredient[] };

// A short text that is the same for two recipes with the same name and ingredients.
// Capitals and extra spaces do not count as a change.
export function recipeSignature(recipe: Content): string {
  const tidy = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');
  return JSON.stringify([
    tidy(recipe.name),
    recipe.ingredients.map((ing) => [ing.productId ?? tidy(ing.name), ing.amount, tidy(ing.unit)]),
  ]);
}

export type CopyInfo = {
  copiedFrom: string; // id of the recipe it was copied from ('' when it is not a copy)
  originalAuthor: string; // nickname of the cook who wrote the original
  originalSignature: string; // what the original looked like when it was copied
};

// The nickname of the original cook when this recipe is still an unchanged copy, else ''.
export function repostOf(recipe: Content & CopyInfo): string {
  if (!recipe.originalAuthor || !recipe.originalSignature) return '';
  return recipeSignature(recipe) === recipe.originalSignature ? recipe.originalAuthor : '';
}

type Listed = Content & { id: string; ownerId: string };

// Discover should not show the same recipe twice. An unchanged repost is hidden when the
// original (or an older identical repost) is already listed. Your own recipes always stay.
// "isRepost" says whether each recipe is an unchanged copy. The list is newest first.
export function hideDuplicateReposts<T extends Listed>(
  recipes: T[],
  isRepost: (recipe: T) => boolean,
  myId: string,
): T[] {
  const seen = new Set<string>(); // signatures of recipes that are listed as "real"
  for (const recipe of recipes) {
    if (!isRepost(recipe)) seen.add(recipeSignature(recipe));
  }
  // Walk from the oldest repost to the newest: the first one of each kind is kept.
  const keepReposts = new Set<string>();
  for (const recipe of [...recipes].reverse()) {
    if (!isRepost(recipe)) continue;
    const sig = recipeSignature(recipe);
    if (seen.has(sig)) continue;
    seen.add(sig);
    keepReposts.add(recipe.id);
  }
  return recipes.filter(
    (recipe) => !isRepost(recipe) || recipe.ownerId === myId || keepReposts.has(recipe.id),
  );
}
