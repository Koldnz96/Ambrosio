// What is different between an original recipe and a version made from it.
// It compares ONE version with ITS original only (never with every other version),
// so a recipe with five remakes does not pile up highlights: each card shows its own.

type Ing = { name: string; amount: number | null; unit: string; productId: string | null };
type Content = { name: string; ingredients: Ing[]; steps?: string[] };

export type StepsChange = 'same' | 'changed' | 'added' | 'removed';

export type RecipeDiff = {
  added: Ing[]; // ingredients only in the version
  removed: Ing[]; // ingredients only in the original
  amounts: { before: Ing; after: Ing }[]; // same ingredient, different amount or unit
  steps: StepsChange;
  renamed: boolean;
};

const tidy = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');
const keyOf = (ing: Ing) => ing.productId ?? tidy(ing.name);

export function diffRecipes(original: Content, version: Content): RecipeDiff {
  const before = new Map(original.ingredients.map((ing) => [keyOf(ing), ing]));
  const after = new Map(version.ingredients.map((ing) => [keyOf(ing), ing]));

  const added = [...after].filter(([key]) => !before.has(key)).map(([, ing]) => ing);
  const removed = [...before].filter(([key]) => !after.has(key)).map(([, ing]) => ing);
  const amounts: RecipeDiff['amounts'] = [];
  for (const [key, ing] of after) {
    const old = before.get(key);
    if (old && (old.amount !== ing.amount || tidy(old.unit) !== tidy(ing.unit))) {
      amounts.push({ before: old, after: ing });
    }
  }

  const stepsOf = (recipe: Content) => (recipe.steps ?? []).map(tidy).filter((step) => step !== '');
  const a = stepsOf(original);
  const b = stepsOf(version);
  let steps: StepsChange = 'same';
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    steps = a.length === 0 ? 'added' : b.length === 0 ? 'removed' : 'changed';
  }

  return { added, removed, amounts, steps, renamed: tidy(original.name) !== tidy(version.name) };
}

export function hasChanges(diff: RecipeDiff): boolean {
  return (
    diff.added.length > 0 ||
    diff.removed.length > 0 ||
    diff.amounts.length > 0 ||
    diff.steps !== 'same' ||
    diff.renamed
  );
}
