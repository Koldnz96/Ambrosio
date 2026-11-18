// TEST ONLY: reads the price of a few Continente products, politely, and saves what it found.
// It changes nothing in the app or in Firebase. Run it with:  node scripts/prices/test-continente.mjs
//
// Rules we follow (robots.txt allows product pages; it blocks search, filters and pagination):
// - only product pages, never search or filter URLs
// - one page every 3 seconds, a clear name and contact email in the User-Agent
// - prices are a reference: online prices can differ from the shop

import { mkdir, writeFile } from 'node:fs/promises';
import { parseContinente } from './parse-continente.mjs';

const USER_AGENT = 'AmbrosioStudentProject/0.1 (school test; ambrosio.app.pt@gmail.com)';
const PAGES = [
  'https://www.continente.pt/produto/leite-uht-meio-gordo-mimosa-4421406.html',
  'https://www.continente.pt/produto/leite-uht-magro-mimosa-4421384.html',
  'https://www.continente.pt/produto/arroz-basmati-continente-4949515.html',
  'https://www.continente.pt/produto/arroz-agulha-cigala-2305902.html',
  'https://www.continente.pt/produto/azeite-continente-7082533.html',
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await mkdir('scripts/prices/samples', { recursive: true });

const results = [];
for (const [index, url] of PAGES.entries()) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'pt-PT' } });
    if (!response.ok) {
      results.push({ url, error: `HTTP ${response.status}` });
    } else {
      const html = await response.text();
      await writeFile(`scripts/prices/samples/page-${index + 1}.html`, html); // so Claude can study the layout
      results.push({ url, ...parseContinente(html) });
    }
  } catch (err) {
    results.push({ url, error: err.message });
  }
  const r = results.at(-1);
  console.log(r.error ? `${url}: ${r.error}` : `${r.name} | ${r.packText} | ${r.price} € | ${r.unitPrice} €/${r.packUnit}`);
  await wait(3000); // be polite
}

await writeFile('scripts/prices/test-output.json', JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
console.log('\nSaved to scripts/prices/test-output.json');
