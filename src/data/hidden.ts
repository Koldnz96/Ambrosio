// Recipes the person is "not interested" in. We keep only their ids.
// These are small "pure" functions: the same input always gives the same output,
// and they change nothing else, so they are easy to test.

export function hideRecipe(hidden: string[], id: string): string[] {
  return hidden.includes(id) ? hidden : [...hidden, id];
}

export function showRecipe(hidden: string[], id: string): string[] {
  return hidden.filter((other) => other !== id);
}

// Splits a list of recipes into the ones to show and the ones the person hid.
export function splitByHidden<T extends { id: string }>(recipes: T[], hidden: string[]) {
  const hiddenIds = new Set(hidden);
  return {
    visible: recipes.filter((r) => !hiddenIds.has(r.id)),
    hiddenRecipes: recipes.filter((r) => hiddenIds.has(r.id)),
  };
}