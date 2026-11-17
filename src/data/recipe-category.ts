// Works out which Discover categories a recipe belongs to, from its ingredients.
// Nobody has to tag anything: old and new recipes are sorted automatically.
//
// A recipe can be in more than one category (for example chicken AND shellfish).
// A recipe that fits none (for example a plain omelette) still shows under "All".
//
// The rules (read them to know what to expect):
// - chicken:    an ingredient is chicken. (Turkey, duck and rabbit are not "chicken".)
// - beef:       an ingredient is beef or veal, including offal (liver, tongue, tripe, oxtail).
// - pork:       an ingredient is pork, including cured pork: chouriço, presunto, bacon, sausages...
// - lamb:       an ingredient is lamb or goat.
// - fish:       an ingredient is fish (fresh, salted, smoked or canned).
// - shellfish:  an ingredient is a crustacean or a mollusc (prawns, clams, squid, octopus...).
// - vegetarian: no meat, no fish and no shellfish, and no meat or fish stock.
// - vegan:      like vegetarian, and also no milk, eggs or other animal products.
// Vegetarian and vegan need every ingredient to be in the catalog. An ingredient typed by hand
// is unknown, so it counts as "not sure": the recipe is left out, to be on the safe side.

export type RecipeCategory =
  | 'chicken'
  | 'beef'
  | 'pork'
  | 'lamb'
  | 'fish'
  | 'shellfish'
  | 'vegetarian'
  | 'vegan';

// The little part of a catalog product that we need (kept small so this file is easy to test).
export type CategoryProduct = {
  name: string; // English name, for example "Chicken breast"
  category: string; // for example "meat" or "fish"
  vegan: 'yes' | 'maybe' | 'no';
  allergens: string[];
};

const BEEF = /beef|veal|oxtail|tripe/i;
const PORK = /pork|chouri|farinheira|morcela|lingui|paio|salpic|bacon|pancetta|ham\b|sausage|frankfurter|mortadella|trotter/i;
const LAMB = /lamb|goat/i;
// Stocks and stock cubes in the catalog that are made from meat or fish.
const ANIMAL_STOCK = /\b(beef|chicken|fish|pork|lamb)\b/i;

export function recipeCategories(
  ingredients: { productId: string | null }[],
  lookup: (id: string | null) => CategoryProduct | undefined,
): Set<RecipeCategory> {
  const result = new Set<RecipeCategory>();
  let allKnown = ingredients.length > 0;
  let noAnimalFlesh = true; // no meat, fish, shellfish or animal stock
  let noAnimalAtAll = true; // also no milk, eggs and so on

  for (const ing of ingredients) {
    const product = ing.productId ? lookup(ing.productId) : undefined;
    if (!product) {
      allKnown = false;
      continue;
    }

    const isMeat = product.category === 'meat';
    const isShellfish =
      !product.allergens.includes('fish') &&
      (product.allergens.includes('crustaceans') || product.allergens.includes('molluscs'));
    const isFish = product.allergens.includes('fish') || (product.category === 'fish' && !isShellfish);

    if (isMeat) {
      if (/chicken/i.test(product.name)) result.add('chicken');
      if (BEEF.test(product.name)) result.add('beef');
      if (PORK.test(product.name)) result.add('pork');
      if (LAMB.test(product.name)) result.add('lamb');
      // "Mixed minced meat" is beef and pork together.
      if (/mixed minced/i.test(product.name)) {
        result.add('beef');
        result.add('pork');
      }
    }
    if (isFish) result.add('fish');
    if (isShellfish) result.add('shellfish');

    if (isMeat || isFish || isShellfish || ANIMAL_STOCK.test(product.name)) noAnimalFlesh = false;
    if (product.vegan === 'no') noAnimalAtAll = false;
  }

  if (allKnown && noAnimalFlesh) result.add('vegetarian');
  if (allKnown && noAnimalFlesh && noAnimalAtAll) result.add('vegan');
  return result;
}
