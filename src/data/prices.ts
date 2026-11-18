// Supermarket prices: the maths. The prices come from prices/prices.json, made once a day by the
// GitHub Actions job (scripts/prices). They are online prices, so always shown as "≈" (about).

import { getProduct } from '@/data/products';
import { baseUnit } from '@/data/shopping';

export type PriceItem = {
  unitPrice: number; // euros per kg, l or un
  unit: 'kg' | 'l' | 'un';
  price: number; // price of the pack that was read
  oldPrice: number | null; // set when it is on promotion
  pack: string | null;
  product: string;
  url: string;
};

export type PricesFile = {
  updatedAt: string;
  shops: Record<string, { name: string; items: Record<string, PriceItem> }>;
};

export type Line = { productId: string | null; amount: number | null; unit: string };

export type ShopTotal = { shopId: string; name: string; total: number };

export type Comparison = {
  ranking: ShopTotal[]; // cheapest first, compared on the same items
  priced: number; // how many lines got a price in the comparison
  total: number; // how many lines there are
};

// The cost of one line at one shop, or null when we cannot work it out (no price, or the units do not
// match: for example "3 garlic" when garlic is sold per kg).
export function lineCost(line: Line, shop: PricesFile['shops'][string]): number | null {
  const product = line.productId ? getProduct(line.productId) : undefined;
  if (!product || line.amount === null || !(line.amount > 0)) return null;
  const item = shop.items[product.name];
  if (!item) return null;
  const base = baseUnit(line.unit || product.unit);
  const amount = line.amount * base.factor; // in g, ml or unit
  if (base.unit === 'g' && item.unit === 'kg') return (amount / 1000) * item.unitPrice;
  if (base.unit === 'ml' && item.unit === 'l') return (amount / 1000) * item.unitPrice;
  if (base.unit === 'unit' && item.unit === 'un') return amount * item.unitPrice;
  return null;
}

// Which supermarket is cheapest for these lines, overall (not item by item: nobody wants to visit
// 3 shops). To be fair, every shop is compared on the SAME lines: the ones all of them have a price for.
// Shops that miss too many lines (less than 60% of the lines that have any price) are left out.
export function compareShops(lines: Line[], prices: PricesFile | null): Comparison {
  const empty: Comparison = { ranking: [], priced: 0, total: lines.length };
  if (!prices) return empty;
  const shops = Object.entries(prices.shops);
  const costs = lines.map((line) => shops.map(([, shop]) => lineCost(line, shop)));
  const priceable = costs.filter((row) => row.some((c) => c !== null)).length;
  if (priceable === 0) return empty;

  const keep = shops
    .map(([id], i) => ({ id, i, count: costs.filter((row) => row[i] !== null).length }))
    .filter((s) => s.count >= priceable * 0.6);
  if (keep.length === 0) return empty;

  const common = costs.filter((row) => keep.every((s) => row[s.i] !== null));
  const ranking = keep
    .map((s) => ({
      shopId: s.id,
      name: shops[s.i][1].name,
      total: Math.round(common.reduce((sum, row) => sum + (row[s.i] as number), 0) * 100) / 100,
    }))
    .sort((a, b) => a.total - b.total);
  return { ranking, priced: common.length, total: lines.length };
}

// Amounts scaled for a different number of servings (recipe for 4, cooking for 2 -> half).
export function scaleLines<T extends { amount: number | null }>(lines: T[], factor: number): T[] {
  if (factor === 1) return lines;
  return lines.map((line) => ({
    ...line,
    amount: line.amount === null ? null : Math.round(line.amount * factor * 100) / 100,
  }));
}

export function formatEuros(value: number): string {
  return `≈ ${value.toFixed(2).replace('.', ',')} €`;
}
