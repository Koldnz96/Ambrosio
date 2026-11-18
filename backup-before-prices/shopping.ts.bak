// Builds a shopping list from a pile of ingredients.
// Same product + same unit are added together (500 g + 1 kg = 1.5 kg).

import { CATEGORY_LABELS, getProduct, normalize, type Category } from '@/data/products';

export type Needed = {
  name: string;
  amount: number | null;
  unit: string;
  productId: string | null;
};

export type ShoppingItem = {
  key: string;
  name: string; // the name as typed (or the English name); screens show the catalog name in the chosen language
  productId: string | null;
  quantities: string[]; // for example ["1.5 kg", "2"]. Empty means no amount was given ("some")
};

export type ShoppingGroup = {
  category: Category | 'other';
  items: ShoppingItem[];
};

type Base = { unit: string; factor: number };

// Turn the unit people type into a base unit (g, ml or unit) when we can.
function baseUnit(raw: string): Base {
  const u = normalize(raw).replace(/\.$/, '');
  if (u === 'g' || u === 'gr' || u === 'gramas' || u === 'grama') return { unit: 'g', factor: 1 };
  if (u === 'kg' || u === 'kilo' || u === 'kilos') return { unit: 'g', factor: 1000 };
  if (u === 'ml') return { unit: 'ml', factor: 1 };
  if (u === 'cl') return { unit: 'ml', factor: 10 };
  if (u === 'dl') return { unit: 'ml', factor: 100 };
  if (u === 'l' || u === 'lt' || u === 'litro' || u === 'litros') return { unit: 'ml', factor: 1000 };
  if (u === '' || u === 'unit' || u === 'units' || u === 'un' || u === 'unidade' || u === 'unidades') {
    return { unit: 'unit', factor: 1 };
  }
  return { unit: u, factor: 1 }; // tbsp, tsp, pinch... stay as they are
}

function round(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function formatQuantity(amount: number, unit: string): string {
  if (unit === 'g') return amount >= 1000 ? `${round(amount / 1000)} kg` : `${round(amount)} g`;
  if (unit === 'ml') return amount >= 1000 ? `${round(amount / 1000)} l` : `${round(amount)} ml`;
  if (unit === 'unit') return `${round(amount)}`;
  return `${round(amount)} ${unit}`;
}

export function buildShoppingList(needed: Needed[]): ShoppingGroup[] {
  type Acc = { key: string; name: string; category: Category | 'other'; sums: Map<string, number>; some: boolean };
  const all = new Map<string, Acc>();

  for (const item of needed) {
    const product = item.productId ? getProduct(item.productId) : undefined;
    const key = product ? product.id : `free:${normalize(item.name)}`;
    let acc = all.get(key);
    if (!acc) {
      acc = { key, name: product ? product.name : item.name.trim(), category: product ? product.category : 'other', sums: new Map(), some: false };
      all.set(key, acc);
    }
    if (item.amount === null || !(item.amount > 0)) {
      acc.some = true; // no amount given: we just say "some"
      continue;
    }
    const base = baseUnit(item.unit || product?.unit || '');
    acc.sums.set(base.unit, (acc.sums.get(base.unit) ?? 0) + item.amount * base.factor);
  }

  const groups = new Map<Category | 'other', ShoppingItem[]>();
  for (const acc of all.values()) {
    const quantities = [...acc.sums.entries()].map(([unit, amount]) => formatQuantity(amount, unit));
    const list = groups.get(acc.category) ?? [];
    list.push({ key: acc.key, name: acc.name, productId: acc.key.startsWith('free:') ? null : acc.key, quantities });
    groups.set(acc.category, list);
  }

  const order = [...(Object.keys(CATEGORY_LABELS) as Category[]), 'other' as const];
  return order
    .filter((c) => groups.has(c))
    .map((c) => ({
      category: c,
      items: groups.get(c)!.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
