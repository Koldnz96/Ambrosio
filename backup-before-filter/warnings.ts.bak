// Allergy and vegan warnings.
//
// Warnings only INFORM, they never block anything. The catalog is a general
// guide, not a guarantee: always check the packaging.

import { getProduct, type Allergen } from '@/data/products';

// Small icons shown next to each allergen. (There is no sesame or mustard
// emoji, so those two use a coloured dot.)
export const ALLERGEN_ICONS: Record<Allergen, string> = {
  gluten: '🌾',
  crustaceans: '🦐',
  eggs: '🥚',
  fish: '🐟',
  peanuts: '🥜',
  soybeans: '🫘',
  milk: '🥛',
  nuts: '🌰',
  celery: '🥬',
  mustard: '🟡',
  sesame: '⚪',
  sulphites: '🍷',
  lupin: '🌼',
  molluscs: '🦪',
};

export const ALLERGEN_ORDER = Object.keys(ALLERGEN_ICONS) as Allergen[];

// What we know about the person.
export type Profile = { allergies: Allergen[]; vegan: boolean };
export const EMPTY_PROFILE: Profile = { allergies: [], vegan: false };

// red = contains, orange = may contain, yellow = we cannot check
export type Level = 'contains' | 'may' | 'unchecked';

export type Warning =
  | { kind: 'allergen'; allergen: Allergen; level: 'contains' | 'may' }
  | { kind: 'vegan'; level: 'contains' | 'may' } // contains = not vegan, may = maybe not vegan
  | { kind: 'unchecked'; level: 'unchecked' };

const RANK: Record<Level, number> = { contains: 0, may: 1, unchecked: 2 };

function key(w: Warning): string {
  return w.kind === 'allergen' ? `a:${w.allergen}` : w.kind;
}

export function hasProfile(profile: Profile): boolean {
  return profile.vegan || profile.allergies.length > 0;
}

// Warnings for ONE ingredient. A typed ingredient that is not in the catalog
// cannot be checked, so it gets a single "unchecked" warning.
export function ingredientWarnings(productId: string | null, profile: Profile): Warning[] {
  if (!hasProfile(profile)) return [];
  const product = productId ? getProduct(productId) : undefined;
  if (!product) return [{ kind: 'unchecked', level: 'unchecked' }];

  const out: Warning[] = [];
  for (const allergen of profile.allergies) {
    if (product.allergens.includes(allergen)) out.push({ kind: 'allergen', allergen, level: 'contains' });
    else if (product.mayContain.includes(allergen)) out.push({ kind: 'allergen', allergen, level: 'may' });
  }
  if (profile.vegan && product.vegan === 'no') out.push({ kind: 'vegan', level: 'contains' });
  if (profile.vegan && product.vegan === 'maybe') out.push({ kind: 'vegan', level: 'may' });
  return sortWarnings(out);
}

// Warnings for a whole recipe: one chip per problem, with the strongest level.
export function recipeWarnings(ingredients: { productId: string | null }[], profile: Profile): Warning[] {
  const best = new Map<string, Warning>();
  for (const ing of ingredients) {
    for (const w of ingredientWarnings(ing.productId, profile)) {
      const old = best.get(key(w));
      if (!old || RANK[w.level] < RANK[old.level]) best.set(key(w), w);
    }
  }
  return sortWarnings([...best.values()]);
}

function sortWarnings(list: Warning[]): Warning[] {
  return [...list].sort((a, b) => {
    if (RANK[a.level] !== RANK[b.level]) return RANK[a.level] - RANK[b.level];
    const order = (w: Warning) => (w.kind === 'vegan' ? -1 : w.kind === 'allergen' ? ALLERGEN_ORDER.indexOf(w.allergen) : 99);
    return order(a) - order(b);
  });
}
