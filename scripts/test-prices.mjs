// Checks the price maths in src/data/prices.ts with made-up prices. Run: node scripts/test-prices.mjs
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Load prices.ts with tiny stand-ins for the catalog and the unit helper.
let code = await readFile(new URL('../src/data/prices.ts', import.meta.url), 'utf8');
code = code.replace(/^import .*$/gm, '');
const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const stubs = `
const CATALOG = { rice: { name: 'Carolino rice', unit: 'g' }, milk: { name: 'Whole milk', unit: 'ml' }, egg: { name: 'Egg', unit: 'unit' }, garlic: { name: 'Garlic', unit: 'unit' } };
const getProduct = (id) => CATALOG[id];
const baseUnit = (u) => (u === 'kg' ? { unit: 'g', factor: 1000 } : u === 'l' ? { unit: 'ml', factor: 1000 } : u === 'g' || u === 'ml' ? { unit: u, factor: 1 } : { unit: 'unit', factor: 1 });
`;
const mod = await import('data:text/javascript,' + encodeURIComponent(stubs + js));

const prices = {
  updatedAt: '2026-11-18',
  shops: {
    a: { name: 'Shop A', items: { 'Carolino rice': { unitPrice: 1, unit: 'kg' }, 'Whole milk': { unitPrice: 1, unit: 'l' }, Egg: { unitPrice: 0.25, unit: 'un' }, Garlic: { unitPrice: 5, unit: 'kg' } } },
    b: { name: 'Shop B', items: { 'Carolino rice': { unitPrice: 2, unit: 'kg' }, 'Whole milk': { unitPrice: 0.5, unit: 'l' }, Egg: { unitPrice: 0.2, unit: 'un' } } },
    c: { name: 'Shop C', items: { Egg: { unitPrice: 0.1, unit: 'un' } } }, // misses too much: left out
  },
};
const lines = [
  { productId: 'rice', amount: 500, unit: 'g' }, // A 0.50, B 1.00
  { productId: 'milk', amount: 1, unit: 'l' }, // A 1.00, B 0.50
  { productId: 'egg', amount: 4, unit: '' }, // A 1.00, B 0.80
  { productId: 'garlic', amount: 3, unit: '' }, // sold per kg, counted in units: no price
];
const r = mod.compareShops(lines, prices);
const scaled = mod.scaleLines(lines, 0.5);
const checks = [
  ['B is cheapest overall (2.30 vs 2.50), even though A has cheaper rice', r.ranking[0].name === 'Shop B' && r.ranking[0].total === 2.3],
  ['A total 2.50', r.ranking[1].total === 2.5],
  ['C left out (too few prices)', r.ranking.length === 2],
  ['3 of 4 lines priced (garlic units do not match)', r.priced === 3 && r.total === 4],
  ['half the servings = half the rice', scaled[0].amount === 250],
  ['euros shown as about', mod.formatEuros(2.3) === '≈ 2,30 €'],
];
let bad = 0;
for (const [name, ok] of checks) { console.log(ok ? 'PASS' : 'FAIL', name); if (!ok) bad++; }
process.exit(bad ? 1 : 0);
