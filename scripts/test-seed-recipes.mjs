import { readFileSync } from 'node:fs';
import { SEED_RECIPES } from '../src/data/seed-recipes.ts';
import { SEED_STEPS } from '../src/data/seed-steps.ts';

// Read the English product names straight from products.ts (the rows look like "Name|unit|...").
const text = readFileSync(new URL('../src/data/products.ts', import.meta.url), 'utf8');
const products = new Map(); // name -> default unit
let inRows = false;
let def = 'g';
for (const line of text.split('\n')) {
  if (/= parse\(/.test(line)) { inRows = true; const m = line.match(/parse\('[a-z]+', '(g|ml|unit)'/); def = m ? m[1] : 'g'; continue; }
  if (line.startsWith('`')) { inRows = false; continue; }
  if (inRows && line.includes('|')) {
    const [name, unit] = line.split('|').map((s) => s.trim());
    products.set(name, unit || def);
  }
}

let fails = 0;
function check(label, ok) { if (!ok) { fails += 1; console.log('FAIL', label); } }

console.log('products read:', products.size);
check('about 549 products', products.size > 500);
check('27 recipes (20 dinners, 4 desserts, 2 cakes, 1 breakfast)', SEED_RECIPES.length === 27);
check('names are unique', new Set(SEED_RECIPES.map((r) => r.name)).size === SEED_RECIPES.length);
for (const r of SEED_RECIPES) {
  check(`${r.name}: name length`, r.name.length > 0 && r.name.length <= 200);
  check(`${r.name}: has ingredients`, r.ingredients.length >= 3);
  const seen = new Set();
  for (const i of r.ingredients) {
    check(`${r.name}: "${i.product}" exists`, products.has(i.product));
    check(`${r.name}: "${i.product}" unit ${i.unit} matches product unit ${products.get(i.product)}`, products.get(i.product) === i.unit);
    check(`${r.name}: "${i.product}" amount > 0`, i.amount > 0);
    check(`${r.name}: "${i.product}" repeated`, !seen.has(i.product));
    seen.add(i.product);
  }
}
for (const r of SEED_RECIPES) {
  const steps = SEED_STEPS[r.name] ?? [];
  check(`${r.name}: has 4 to 8 steps`, steps.length >= 4 && steps.length <= 8);
  check(`${r.name}: steps are not empty`, steps.every((x) => x.trim().length > 10));
}
check('no steps for unknown recipes', Object.keys(SEED_STEPS).every((k) => SEED_RECIPES.some((r) => r.name === k)));
console.log(fails ? `FAIL (${fails})` : 'PASS: all recipes valid');
process.exit(fails ? 1 : 0);
