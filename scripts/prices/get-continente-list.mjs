// Downloads Continente's list of product links (its public sitemaps, made for robots) and saves it.
// It reads no product pages and changes nothing in the app or in Firebase.
// Run it with:  node scripts/prices/get-continente-list.mjs
//
// Polite: one file every 3 seconds, with our name and contact email in the User-Agent.

import { writeFile } from 'node:fs/promises';

const USER_AGENT = 'AmbrosioStudentProject/0.1 (school test; ambrosio.app.pt@gmail.com)';
const INDEX = 'https://www.continente.pt/sitemap_index.xml';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

// All the <loc>...</loc> links in a sitemap file.
const links = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));

// 1. The index: keep only the files whose name says "product".
const files = links(await get(INDEX)).filter((url) => /-product\.xml$/i.test(url));
console.log(`Found ${files.length} product lists.`);

// 2. Each product list: keep the product pages ("/produto/name-1234567.html").
const byId = new Map();
for (const file of files) {
  await wait(3000);
  try {
    const found = links(await get(file)).filter((url) => url.includes('/produto/'));
    for (const url of found) {
      const m = url.match(/\/produto\/([^/?#]+)-(\d+)\.html/);
      if (!m) continue;
      // The words of the link, for example ["arroz", "agulha", "cigala"].
      byId.set(m[2], { id: m[2], url, words: m[1].split('-').filter(Boolean) });
    }
    console.log(`${file.split('/').pop()}: ${found.length} links (total so far: ${byId.size})`);
  } catch (err) {
    console.log(`Skipped ${file}: ${err.message}`);
  }
}

const products = [...byId.values()];
await writeFile(
  'scripts/prices/continente-products.json',
  JSON.stringify({ shop: 'continente', fetchedAt: new Date().toISOString(), count: products.length, products }),
);
console.log(`\nSaved ${products.length} products to scripts/prices/continente-products.json`);
