// Reads today's prices for our ingredients at Continente, Pingo Doce and Auchan, and saves ONE file:
//   prices/prices.json
// Run on your PC as a quick test:   node scripts/prices/fetch-prices.mjs --test
// Full run (about 45-60 minutes, normally done by GitHub Actions once a day):
//                                    node scripts/prices/fetch-prices.mjs
//
// Before it, these must have run (GitHub Actions does all of it):
//   node scripts/prices/get-continente-list.mjs   (Continente product list)
//   node scripts/prices/check-shops.mjs           (Pingo Doce and Auchan product lists)
//   node scripts/prices/build-matches.mjs         (which products fit each ingredient)
//
// Polite: only product pages (allowed in each shop's robots.txt), one page every 1.5 s per shop,
// with our name and contact email. Prices are a REFERENCE: online prices can differ in the shop.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { parseProduct } from './parse-product.mjs';

const TEST = process.argv.includes('--test');
const USER_AGENT = 'AmbrosioStudentProject/0.1 (school project; ambrosio.app.pt@gmail.com)';
const PER_INGREDIENT = 4; // products read per ingredient and shop
const DELAY_MS = 1500;
// Shop lists keep old products that no longer exist (the page sends you to the home page). When a page
// gives no price we try the next product, up to this many pages per ingredient and shop.
const MAX_TRIES = 8;
const SHOPS = [
  { id: 'continente', name: 'Continente', ownBrand: ['continente'] },
  { id: 'pingodoce', name: 'Pingo Doce', ownBrand: ['pingo', 'doce'] },
  { id: 'auchan', name: 'Auchan', ownBrand: ['auchan'] },
];
const TEST_INGREDIENTS = ['Semi-skimmed milk', 'Carolino rice', 'Olive oil', 'Egg', 'Onion', 'Salted cod'];

const here = (file) => new URL(file, import.meta.url);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The simplest, shop-brand products first: they are usually the cheapest and the most "plain".
function pickCandidates(products, ownBrand) {
  const score = (p) => (ownBrand.every((w) => p.name.split(' ').includes(w)) ? 0 : 1000) + p.name.length;
  return [...products].sort((a, b) => score(a) - score(b)).slice(0, MAX_TRIES);
}

async function readShop(shop) {
  let matches;
  try {
    matches = JSON.parse(await readFile(here(`./${shop.id}-matches.json`), 'utf8')).result;
  } catch {
    console.log(`${shop.name}: no matches file, skipped`);
    return {};
  }
  const names = Object.keys(matches).filter((n) => matches[n].count > 0 && (!TEST || TEST_INGREDIENTS.includes(n)));
  const items = {};
  let pages = 0;
  for (const ingredient of names) {
    const found = [];
    for (const candidate of pickCandidates(matches[ingredient].products, shop.ownBrand)) {
      if (found.length >= PER_INGREDIENT) break;
      try {
        const response = await fetch(candidate.url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'pt-PT' } });
        pages++;
        if (!response.ok && TEST) console.log(`  ${shop.name} | ${ingredient}: HTTP ${response.status} for ${candidate.url}`);
        if (response.ok) {
          const html = await response.text();
          const p = parseProduct(html);
          if (p.price > 0 && p.unitPrice > 0 && p.packUnit) found.push({ ...p, url: candidate.url });
          else if (TEST) {
            // In the test, keep pages we could not read, so Claude can see why.
            mkdirSync(here('./samples/failed'), { recursive: true });
            await writeFile(here(`./samples/failed/${shop.id}-${ingredient.replace(/\W+/g, '_')}-${candidate.id}.html`), html);
          }
        }
      } catch (err) {
        if (TEST) console.log(`  ${shop.name} | ${ingredient}: ${err.message}`);
      }
      await wait(DELAY_MS);
    }
    // The cheapest per kg / litre / unit, using the unit most of the products have.
    const unitCount = {};
    for (const f of found) unitCount[f.packUnit] = (unitCount[f.packUnit] ?? 0) + 1;
    const unit = Object.keys(unitCount).sort((a, b) => unitCount[b] - unitCount[a])[0];
    // Tiny packs (a 36 g snack, a sample size) are not what you buy to cook: skip them if bigger packs exist.
    const sameUnit = found.filter((f) => f.packUnit === unit);
    const normal = sameUnit.filter((f) => !f.packAmount || f.packUnit === 'un' || f.packAmount >= 0.1);
    const best = (normal.length > 0 ? normal : sameUnit).sort((a, b) => a.unitPrice - b.unitPrice)[0];
    if (best) {
      items[ingredient] = {
        unitPrice: best.unitPrice, // euros per kg, l or un
        unit: best.packUnit, // 'kg' | 'l' | 'un'
        price: best.price, // price of the pack
        oldPrice: best.oldPrice, // set when on promotion
        pack: best.packText,
        product: [best.name, best.brand].filter(Boolean).join(' · '),
        url: best.url,
        // Every pack size found (same unit), smallest first: the shopping list picks what to really buy
        // (for example the 750 ml bottle when the recipes need 15 ml). "loose" = sold by weight (kg).
        packs: sameUnit
          .filter((f) => f.packAmount)
          .sort((a, b) => a.packAmount - b.packAmount)
          .map((f) => ({
            amount: f.packAmount,
            price: f.price,
            oldPrice: f.oldPrice,
            product: [f.name, f.brand].filter(Boolean).join(' · '),
            loose: /granel|avulso|\bkg\b/i.test(f.packText ?? '') && !/emb|saco|pack/i.test(f.packText ?? ''),
          })),
      };
    }
    if (TEST) console.log(`${shop.name} | ${ingredient}: ${best ? `${best.unitPrice} €/${best.packUnit} (${best.name}, ${best.packText}, ${best.price} €)` : 'no price'}`);
  }
  console.log(`${shop.name}: ${Object.keys(items).length} ingredients priced, ${pages} pages read.`);
  return items;
}

// The shops are different websites, so they can be read at the same time (each one still slowly).
const results = await Promise.all(SHOPS.map((shop) => readShop(shop)));
const shops = Object.fromEntries(SHOPS.map((shop, i) => [shop.id, { name: shop.name, items: results[i] }]));

// Safety check: a price far from the other shops is probably the wrong product (for example a small jar of
// dried onion instead of fresh onions). When 2 or more shops have a price, drop any price more than 2 times
// higher or lower than the middle one.
const allIngredients = new Set(results.flatMap((items) => Object.keys(items)));
let dropped = 0;
for (const ingredient of allIngredients) {
  const list = SHOPS.map((s) => shops[s.id].items[ingredient]).filter(Boolean);
  if (list.length < 2) continue;
  const unitCount = {};
  for (const l of list) unitCount[l.unit] = (unitCount[l.unit] ?? 0) + 1;
  const unit = Object.keys(unitCount).sort((a, b) => unitCount[b] - unitCount[a])[0];
  const values = list.filter((l) => l.unit === unit).map((l) => l.unitPrice).sort((a, b) => a - b);
  const middle = values[Math.floor(values.length / 2)];
  for (const s of SHOPS) {
    const item = shops[s.id].items[ingredient];
    if (!item) continue;
    if (item.unit !== unit || item.unitPrice > middle * 2 || item.unitPrice < middle / 2) {
      delete shops[s.id].items[ingredient];
      dropped++;
    }
  }
}
console.log(`Safety check removed ${dropped} doubtful prices.`);

await mkdir(here('../../prices'), { recursive: true });
const file = TEST ? '../../prices/prices-test.json' : '../../prices/prices.json';
await writeFile(here(file), JSON.stringify({ updatedAt: new Date().toISOString(), note: 'Online prices, a reference only.', shops }, null, 1));
console.log(`Saved ${file.replace('../../', '')}`);
