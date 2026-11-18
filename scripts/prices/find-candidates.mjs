// Works offline: reads the saved Continente list and finds candidate products for each ingredient.
// Run: node scripts/prices/find-candidates.mjs  ->  scripts/prices/continente-candidates.json
import { readFile, writeFile } from 'node:fs/promises';
import { NEVER, RULES } from './match-rules.mjs';

const { products } = JSON.parse(await readFile(new URL('./continente-products.json', import.meta.url), 'utf8'));
const never = new Set(NEVER);

function matches(rule, words) {
  if (rule.start && words[0] !== rule.start) return false;
  if ((rule.all ?? []).some((w) => !words.includes(w))) return false;
  if (rule.any && !rule.any.some((w) => words.includes(w))) return false;
  if ((rule.none ?? []).some((w) => words.includes(w))) return false;
  if (words.some((w) => never.has(w))) return false;
  return true;
}

const out = {};
for (const rule of RULES) {
  const found = products.filter((p) => matches(rule, p.words));
  out[rule.product] = { count: found.length, examples: found.map((p) => p.words.join(' ')), urls: found.map((p) => p.url) };
}
await writeFile(new URL('./continente-candidates.json', import.meta.url), JSON.stringify(out, null, 1));
for (const [name, r] of Object.entries(out)) console.log(`${String(r.count).padStart(5)}  ${name}`);

// A readable list for João to check (open it in VS Code): every ingredient with the products found.
const lines = ['# Continente: products found per ingredient', '', 'Check that each list only has things that really are that ingredient.', ''];
for (const [name, r] of Object.entries(out)) {
  lines.push(`## ${name} (${r.count})`, '');
  const unique = [...new Set(r.examples)];
  for (const e of unique.slice(0, 40)) lines.push(`- ${e}`);
  if (unique.length > 40) lines.push(`- ... and ${unique.length - 40} more`);
  lines.push('');
}
await writeFile(new URL('./continente-candidates.md', import.meta.url), lines.join('\n'));
console.log('\nReadable list: scripts/prices/continente-candidates.md');
