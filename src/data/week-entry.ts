// One recipe planned on a day of the week. It is saved as a short text, so older plans keep working:
//   "abc123"    -> recipe abc123, for the number of people the recipe was written for
//   "abc123@2"  -> recipe abc123, for 2 people (added from Discover with "2 people" chosen)

export type WeekEntry = { recipeId: string; servings: number | null };

export function parseEntry(text: string): WeekEntry {
  const m = text.match(/^(.+)@(\d{1,2})$/);
  if (!m) return { recipeId: text, servings: null };
  return { recipeId: m[1], servings: Number(m[2]) };
}

export function makeEntry(recipeId: string, servings: number | null): string {
  return servings ? `${recipeId}@${servings}` : recipeId;
}
