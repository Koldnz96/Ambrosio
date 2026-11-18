// Finds Continente products for EVERY ingredient in our catalog, in one go. Works offline.
// Run: node scripts/prices/build-matches.mjs
//   -> scripts/prices/continente-matches.json  (the products found per ingredient)
//   -> prints a short report: ingredients with no match, and the biggest lists
//
// How a rule is made automatically from our catalog (src/data/products.ts):
// - our Portuguese names (aliases) are the search words, for example "arroz carolino"
// - a shop product matches when it STARTS with the first word and contains all the other words
//   (plural or singular both count: "ovo" = "ovos")
// - words of OTHER ingredients that start the same way are excluded: "Tomato" leaves out
//   "cherry", "pelado", "concentrado"... because those are their own ingredients
// - fresh ingredients leave out frozen, canned and ready-made products
// The hand-written rules in match-rules.mjs win over the automatic ones.

import { readFile, writeFile } from 'node:fs/promises';
import { NEVER, RULES } from './match-rules.mjs';

const here = (file) => new URL(file, import.meta.url);
const catalogText = await readFile(here('../../src/data/products.ts'), 'utf8');

// --- read our catalog rows: name|unit|form|aliases|allergens|mayContain -------------------------
const normalize = (text) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ç/g, 'c');
const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'a', 'o', 'ao', 'na', 'no']);
const toWords = (text) => normalize(text).split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w));

const catalog = [];
for (const block of catalogText.matchAll(/parse\('(\w+)', '\w+', `([\s\S]*?)`\)/g)) {
  for (const line of block[2].split('\n').map((l) => l.trim()).filter(Boolean)) {
    const [name, , form = '', aliases = ''] = line.split('|').map((p) => p.trim());
    const phrases = aliases
      .split(';')
      .map((a) => toWords(a))
      .filter((w) => w.length > 0);
    catalog.push({ name, category: block[1], form: form || 'fresh', phrases });
  }
}

// --- automatic rules -----------------------------------------------------------------------------
const same = (a, b) => a === b || a + 's' === b || b + 's' === a || a + 'es' === b || b + 'es' === a;
const has = (words, w) => words.some((x) => same(x, w));

// words used by each first word, per ingredient (to exclude the "siblings")
const byFirst = new Map();
for (const item of catalog) {
  for (const p of item.phrases) {
    const key = p[0].replace(/s$/, '');
    if (!byFirst.has(key)) byFirst.set(key, []);
    byFirst.get(key).push({ name: item.name, words: p });
  }
}

const NOT_FRESH = ['congelado', 'congelada', 'congelados', 'congeladas', 'ultracongelado', 'ultracongelada', 'lata',
  'conserva', 'pure', 'sopa', 'molho', 'panado', 'panados', 'panadas', 'frito', 'frita', 'fritos', 'fritas', 'cozido',
  'cozida', 'desidratado', 'desidratada', 'seco', 'seca', 'po', 'compota', 'doce', 'xarope', 'polpa', 'pelado',
  'triturado', 'concentrado', 'pedacos', 'ralada', 'ralado', 'fumado', 'fumada', 'assado', 'assada'];

function autoRule(item) {
  const own = new Set(item.phrases.flat());
  return item.phrases.map((p) => {
    const none = new Set();
    if (item.form === 'fresh' && ['vegetables', 'fruit', 'meat', 'fish', 'herbs'].includes(item.category)) {
      for (const w of NOT_FRESH) if (!own.has(w)) none.add(w);
    }
    return { start: p[0], all: p.slice(1), none: [...none], size: p.length };
  });
}

const hand = new Map(RULES.map((r) => [r.product, r]));
const never = new Set(NEVER);

// Shops often put a general word first: "queijo mozzarella", "massa rigatoni", "molho pesto", "sumo laranja".
// After one of these words, the second word may be the start word.
const PREFIX = new Set(['queijo', 'massa', 'molho', 'farinha', 'sumo', 'bebida', 'carne', 'file', 'files', 'filetes',
  'bife', 'bifes', 'lombo', 'lombos', 'posta', 'postas', 'oleo', 'polpa', 'preparado', 'tempero', 'especiaria']);

function matches(rule, words) {
  if (rule.start && !same(words[0], rule.start) && !(PREFIX.has(words[0]) && same(words[1] ?? '', rule.start))) return false;
  if ((rule.all ?? []).some((w) => !has(words, w))) return false;
  if (rule.any && !rule.any.some((w) => has(words, w))) return false;
  if ((rule.none ?? []).some((w) => words.includes(w))) return false;
  // Words that mean "not food" are skipped, unless the rule itself asks for them ("sumo" for juices).
  const wanted = new Set([rule.start, ...(rule.all ?? []), ...(rule.any ?? [])]);
  if (words.some((w) => never.has(w) && !wanted.has(w))) return false;
  return true;
}

// --- match every ingredient, shop by shop
const SHOPS = ['continente', 'pingodoce', 'auchan'];
for (const SHOP of SHOPS) {
let shopProducts;
try {
  shopProducts = JSON.parse(await readFile(here(`./${SHOP}-products.json`), 'utf8')).products;
} catch {
  console.log(`\n${SHOP}: no product list yet, skipped`);
  continue;
}
// Auchan links end in a number (".../fortificante-ovomaltine-400g/10.html"): the name is the part before it.
// Only food: Auchan links say "alimentacao" for food.
if (SHOP === 'auchan') {
  shopProducts = shopProducts
    .filter((p) => p.url.includes('/alimentacao/'))
    .map((p) => {
      const parts = p.url.split('?')[0].split('/');
      const words = normalize(decodeURIComponent(parts.at(-2) ?? '')).split(/[^a-z0-9]+/).filter(Boolean);
      return { id: parts.at(-1).replace('.html', ''), url: p.url, words };
    });
} else {
  shopProducts = shopProducts.map((p) => ({ id: p.id ?? p.words.at(-1), url: p.url, words: p.words }));
}

// A shop product can fit several ingredients ("tomate pedacos" fits Tomato and Chopped tomatoes).
// It goes to the MOST SPECIFIC one (the rule with the most words); hand-written rules count as most specific.
const rulesOf = new Map(catalog.map((item) => [item.name, hand.has(item.name) ? [{ ...hand.get(item.name), size: 1.5 + (hand.get(item.name).all ?? []).length }] : autoRule(item)]));
const best = new Map(); // shop id -> { size, names[] }
for (const shop of shopProducts) {
  const words = shop.words.filter((w) => !STOP.has(w));
  for (const [name, rules] of rulesOf) {
    for (const r of rules) {
      if (!matches(r, words)) continue;
      const old = best.get(shop.id);
      if (!old || r.size > old.size) best.set(shop.id, { size: r.size, names: [name] });
      else if (r.size === old.size && !old.names.includes(name)) old.names.push(name);
    }
  }
}
const result = {};
for (const item of catalog) result[item.name] = { rule: hand.has(item.name) ? 'hand' : 'auto', count: 0, products: [] };
for (const shop of shopProducts) {
  const b = best.get(shop.id);
  if (!b) continue;
  for (const name of b.names) {
    result[name].products.push({ id: shop.id, url: shop.url, name: shop.words.join(' ') });
    result[name].count++;
  }
}

await writeFile(here(`./${SHOP}-matches.json`), JSON.stringify({ shop: SHOP, builtAt: new Date().toISOString(), result }));

const entries = Object.entries(result);
const none = entries.filter(([, r]) => r.count === 0).map(([n]) => n);
const found = entries.length - none.length;
console.log(`\n${SHOP}: ${shopProducts.length} products. Ingredients with products: ${found} of ${entries.length}.`);
}
