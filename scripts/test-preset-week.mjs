// Checks the ready-made week picker (src/data/preset-week.ts). Run: node scripts/test-preset-week.mjs
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const code = await readFile(new URL('../src/data/preset-week.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { pickVariedWeek } = await import('data:text/javascript,' + encodeURIComponent(js));
const r = (id, kinds) => ({ id, name: id, kinds });
const recipes = [r('cod1', ['fish']), r('cod2', ['fish']), r('chk1', ['chicken']), r('chk2', ['chicken']), r('prk1', ['pork']), r('bef1', ['beef']), r('shr1', ['shellfish']), r('pasta', ['vegetarian'])];
const week = pickVariedWeek(recipes);
const checks = [
  ['7 dinners', week.length === 7],
  ['no repeats', new Set(week).size === 7],
  ['starts varied: fish, chicken, pork, beef', week.slice(0, 4).join() === 'cod1,chk1,prk1,bef1'],
  ['fewer recipes than days: gives what it has', pickVariedWeek(recipes.slice(0, 3)).length === 3],
];
let bad = 0;
for (const [n, ok] of checks) { console.log(ok ? 'PASS' : 'FAIL', n); if (!ok) bad++; }
console.log(week.join(', '));
process.exit(bad ? 1 : 0);
