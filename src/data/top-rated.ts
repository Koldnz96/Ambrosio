// Which recipes to show on the Home page: the best rated ones, or the newest.
// These are small "pure" functions, so they are easy to test.

export type Rated<T> = { recipe: T; average: number | null; count: number };

// The best rated recipes: highest average first; on a tie, more ratings first, then the newest.
// Recipes nobody rated are left out. "keyOf" says when two recipes are the same dish (for example
// an unchanged repost), so the same dish is not listed twice.
export function topRated<T extends { createdAtMs: number }>(
  list: Rated<T>[],
  limit: number,
  keyOf: (recipe: T) => string,
): Rated<T>[] {
  const sorted = list
    .filter((item) => item.count > 0 && item.average !== null)
    .sort(
      (a, b) =>
        (b.average as number) - (a.average as number) ||
        b.count - a.count ||
        b.recipe.createdAtMs - a.recipe.createdAtMs,
    );
  const seen = new Set<string>();
  const result: Rated<T>[] = [];
  for (const item of sorted) {
    const key = keyOf(item.recipe);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length === limit) break;
  }
  return result;
}

// The newest recipes (the list can be in any order), without the same dish twice.
export function newest<T extends { createdAtMs: number }>(recipes: T[], limit: number, keyOf: (recipe: T) => string): T[] {
  const sorted = [...recipes].sort((a, b) => b.createdAtMs - a.createdAtMs);
  const seen = new Set<string>();
  const result: T[] = [];
  for (const recipe of sorted) {
    const key = keyOf(recipe);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(recipe);
    if (result.length === limit) break;
  }
  return result;
}
