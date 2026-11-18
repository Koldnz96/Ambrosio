// Checks the parser on the saved page. Run: node scripts/prices/test-parse.mjs
import { readFile } from 'node:fs/promises';
import { parseContinente } from './parse-continente.mjs';
const r = parseContinente(await readFile(new URL('./sample.html', import.meta.url), 'utf8'));
console.log(r);
const ok = r.price === 6 && r.packAmount === 6 && r.packUnit === 'l' && r.unitPrice === 1 && r.shopUnitPrice === 1;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
