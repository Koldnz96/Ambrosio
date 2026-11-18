// What to actually BUY in the supermarket (not what the recipes use).
// Example: the recipes need 15 ml of oil -> buy 1 bottle of 750 ml; 50 g of carrot -> buy 1 carrot.
// Prices come from prices/prices.json (online prices, a reference only: always shown with "≈").

import { getProduct } from '@/data/products';
import type { PriceItem, PricesFile } from '@/data/prices';
import { baseUnit } from '@/data/shopping';

// Average weight of ONE piece, in grams, for things you can buy one by one (checked by a cook).
// Used to turn "50 g of carrot" into "1 carrot", and "1 lemon" into a weight when lemons are priced per kg.
export const PIECE_GRAMS: Record<string, number> = {
  Carrot: 80,
  Onion: 150,
  'Red onion': 150,
  Shallot: 30,
  Potato: 150,
  'Sweet potato': 250,
  Tomato: 120,
  Cucumber: 300,
  Courgette: 250,
  Aubergine: 300,
  'Red pepper': 150,
  'Green pepper': 150,
  'Yellow pepper': 150,
  Leek: 200,
  Lettuce: 400,
  Cabbage: 1000,
  Broccoli: 400,
  Cauliflower: 800,
  Fennel: 250,
  Apple: 180,
  Pear: 170,
  Banana: 120,
  Orange: 180,
  Lemon: 100,
  Lime: 70,
  Kiwi: 80,
  Pineapple: 1200,
  Mango: 300,
  Melon: 1500,
  Avocado: 200,
};
// Small things recipes count one by one but shops sell by weight (2 bay leaves -> the smallest bag of bay leaves).
// Only used to work out the amount: you never buy them one by one.
const SMALL_PIECE_GRAMS: Record<string, number> = { 'Fresh bay leaf': 0.2, 'Cinnamon stick': 3 };
// Liquids the recipes measure in ml but shops sell by weight. Coffee: about 2 g of instant coffee per 100 ml.
const GRAMS_PER_ML: Record<string, number> = { Coffee: 0.02 };
// Never bought: tap water. Left out of the list and the price.
export const NOT_BOUGHT = new Set(['Water']);
// Hard to find: priced (and suggested) as something easier to buy.
export const BUY_INSTEAD: Record<string, string> = { Pancetta: 'Bacon' };

// Garlic: recipes count cloves, the shop sells heads (about 10 cloves, about 50 g).
const GARLIC_CLOVE_G = 5;
const GARLIC_HEAD_G = 50;

// Everything the week needs of one product, added up, in g, ml or unit.
export type Need = { productId: string; amount: number; unit: 'g' | 'ml' | 'unit' };

export function sumNeeds(lines: { productId: string | null; amount: number | null; unit: string }[]): Need[] {
  const map = new Map<string, Need>();
  for (const line of lines) {
    const product = line.productId ? getProduct(line.productId) : undefined;
    if (!product || NOT_BOUGHT.has(product.name) || line.amount === null || !(line.amount > 0)) continue;
    const base = baseUnit(line.unit || product.unit);
    if (base.unit !== 'g' && base.unit !== 'ml' && base.unit !== 'unit') continue;
    const key = `${product.id}|${base.unit}`;
    const old = map.get(key);
    const amount = line.amount * base.factor;
    if (old) old.amount += amount;
    else map.set(key, { productId: product.id, amount, unit: base.unit });
  }
  return [...map.values()];
}

// The plan for one product at one shop.
export type Buy = {
  label: { count: number; size: string } | { pieces: number }; // "1 × 750 ml" or "2 pieces"
  cost: number; // what you pay at the till (approximately)
  onSale: boolean;
  estimated?: boolean; // this shop has no price for it: the average of the other shops
  instead?: string; // bought as another product (Pancetta -> Bacon)
};

function sizeText(amount: number, unit: string): string {
  const r = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
  if (unit === 'kg') return amount < 1 ? `${r(amount * 1000)} g` : `${r(amount)} kg`;
  if (unit === 'l') return amount < 1 ? `${r(amount * 1000)} ml` : `${r(amount)} l`;
  return `${r(amount)} un.`;
}

// How much of the price unit (kg, l or un) the week needs, or null if the units cannot be matched.
function needIn(item: PriceItem, need: Need, name: string): number | null {
  if (item.unit === 'kg') {
    if (need.unit === 'g') return need.amount / 1000;
    if (need.unit === 'unit') {
      if (name === 'Garlic') return (need.amount * GARLIC_CLOVE_G) / 1000;
      const g = PIECE_GRAMS[name] ?? SMALL_PIECE_GRAMS[name];
      return g ? (need.amount * g) / 1000 : null;
    }
    if (need.unit === 'ml' && GRAMS_PER_ML[name]) return (need.amount * GRAMS_PER_ML[name]) / 1000;
    return null;
  }
  if (item.unit === 'l') return need.unit === 'ml' ? need.amount / 1000 : null;
  if (item.unit === 'un') {
    if (need.unit === 'unit') return need.amount;
    const g = PIECE_GRAMS[name];
    return need.unit === 'g' && g ? need.amount / g : null;
  }
  return null;
}

export function planBuy(need: Need, item: PriceItem | undefined, asName?: string): Buy | null {
  const product = getProduct(need.productId);
  if (!item || !product) return null;
  const qty = needIn(item, need, asName ?? product.name);
  if (qty === null || !(qty > 0)) return null;

  // 1. Things bought one by one (carrots, lemons, garlic heads): whole pieces, never a big bag for one carrot.
  const pieceG = product.name === 'Garlic' ? GARLIC_HEAD_G : PIECE_GRAMS[product.name];
  const loose = (item.packs ?? []).some((p) => p.loose) || !(item.packs ?? []).length;
  let piecesOption: Buy | null = null;
  if (pieceG && item.unit === 'kg' && loose) {
    const pieces = Math.max(1, Math.ceil((qty * 1000) / pieceG));
    piecesOption = { label: { pieces }, cost: ((pieces * pieceG) / 1000) * item.unitPrice, onSale: !!item.oldPrice };
  }

  // 2. Packs: the smallest pack that covers the week, or several of the biggest one.
  const packs = (item.packs ?? []).filter((p) => p.amount > 0 && !p.loose);
  let packOption: Buy | null = null;
  if (packs.length > 0) {
    const fits = packs.filter((p) => p.amount >= qty).sort((a, b) => a.price - b.price)[0];
    if (fits) {
      packOption = { label: { count: 1, size: sizeText(fits.amount, item.unit) }, cost: fits.price, onSale: !!fits.oldPrice };
    } else {
      const biggest = [...packs].sort((a, b) => b.amount - a.amount)[0];
      const count = Math.ceil(qty / biggest.amount);
      packOption = { label: { count, size: sizeText(biggest.amount, item.unit) }, cost: count * biggest.price, onSale: !!biggest.oldPrice };
    }
  }

  // Pick the cheaper of the two (for one carrot the piece wins; for 950 g of potatoes the bag usually wins).
  const options = [piecesOption, packOption].filter((o): o is Buy => o !== null);
  if (options.length > 0) return options.sort((a, b) => a.cost - b.cost)[0];

  // 3. No pack information yet (older prices file): price of what is used, pack unknown.
  return { label: { count: 1, size: sizeText(qty, item.unit) }, cost: qty * item.unitPrice, onSale: !!item.oldPrice };
}

export type ShopPlan = { shopId: string; name: string; total: number; buys: Map<string, Buy>; estimated: number };

// Every shop's shopping, compared on the SAME products (the ones all compared shops have a price for).
// Shops missing too many products (less than 60% of those that have any price) are left out.
export function planShops(needs: Need[], prices: PricesFile | null): { shops: ShopPlan[]; priced: number; total: number } {
  if (!prices) return { shops: [], priced: 0, total: needs.length };
  const all = Object.entries(prices.shops).map(([shopId, shop]) => {
    const buys = new Map<string, Buy>();
    for (const need of needs) {
      const product = getProduct(need.productId);
      if (!product) continue;
      const instead = BUY_INSTEAD[product.name];
      const b = instead ? planBuy(need, shop.items[instead], instead) : planBuy(need, shop.items[product.name]);
      if (b) buys.set(`${need.productId}|${need.unit}`, instead ? { ...b, instead } : b);
    }
    return { shopId, name: shop.name, buys };
  });
  const keys = needs.map((n) => `${n.productId}|${n.unit}`);
  const priceableKeys = keys.filter((k) => all.some((s) => s.buys.has(k)));
  const priceable = priceableKeys.length;
  // Shops with too few real prices are left out (their total would be mostly guesses).
  const kept = all.filter((s) => priceable > 0 && s.buys.size >= priceable * 0.6);
  // Fair comparison: every shop is priced on the same products. When a shop has no price for one,
  // use the average of the shops that do (marked as an estimate) instead of dropping the product.
  const shops = kept
    .map((s) => {
      const buys = new Map(s.buys);
      let estimated = 0;
      for (const k of priceableKeys) {
        if (buys.has(k)) continue;
        const others = kept.map((o) => o.buys.get(k)).filter((b): b is Buy => !!b);
        const from = others.length ? others : all.map((o) => o.buys.get(k)).filter((b): b is Buy => !!b);
        const avg = from.reduce((sum, b) => sum + b.cost, 0) / from.length;
        buys.set(k, { ...from[0], cost: avg, onSale: false, estimated: true });
        estimated++;
      }
      const total = Math.round(priceableKeys.reduce((sum, k) => sum + buys.get(k)!.cost, 0) * 100) / 100;
      return { ...s, buys, total, estimated };
    })
    .sort((a, b) => a.total - b.total);
  return { shops, priced: priceable, total: needs.length };
}
