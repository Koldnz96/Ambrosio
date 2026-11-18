// TEST ONLY: checks Auchan and Pingo Doce, politely. Changes nothing in the app or in Firebase.
// Run it with:  node scripts/prices/check-shops.mjs
//
// For each shop it:
// 1. saves the shop's robots.txt (its rules for robots) -> scripts/prices/samples/<shop>-robots.txt
// 2. reads the sitemap index and the product lists -> scripts/prices/<shop>-products.json
// 3. saves 3 product pages (milk, rice, olive oil) -> scripts/prices/samples/<shop>-page-N.html
// One request every 3 seconds, with our name and contact email.

import { mkdir, writeFile } from 'node:fs/promises';

const USER_AGENT = 'AmbrosioStudentProject/0.1 (school test; ambrosio.app.pt@gmail.com)';
const SHOPS = [
  { id: 'auchan', base: 'https://www.auchan.pt' },
  { id: 'pingodoce', base: 'https://www.pingodoce.pt' },
];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const links = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));

async function get(url) {
  await wait(3000); // be polite
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'pt-PT' } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

await mkdir('scripts/prices/samples', { recursive: true });

for (const shop of SHOPS) {
  console.log(`\n=== ${shop.id} ===`);
  // 1. robots.txt
  let robots = '';
  try {
    robots = await get(`${shop.base}/robots.txt`);
    await writeFile(`scripts/prices/samples/${shop.id}-robots.txt`, robots);
    console.log('robots.txt saved');
  } catch (err) {
    console.log(`robots.txt: ${err.message}`);
  }

  // 2. sitemaps: from robots.txt, or the usual address
  const indexUrls = [...robots.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  if (indexUrls.length === 0) indexUrls.push(`${shop.base}/sitemap_index.xml`);
  const productFiles = new Set();
  for (const indexUrl of indexUrls) {
    try {
      const xml = await get(indexUrl);
      const found = links(xml);
      // An index points to other sitemaps; a plain sitemap points to pages.
      const sitemaps = found.filter((u) => /\.xml(\.gz)?$/i.test(u));
      if (sitemaps.length > 0) sitemaps.filter((u) => /product|produto/i.test(u)).forEach((u) => productFiles.add(u));
      else productFiles.add(indexUrl);
      console.log(`${indexUrl}: ${found.length} entries`);
    } catch (err) {
      console.log(`${indexUrl}: ${err.message}`);
    }
  }
  console.log(`Product lists: ${productFiles.size}`);

  const byUrl = new Map();
  for (const file of productFiles) {
    try {
      const pages = links(await get(file)).filter((u) => !/\.xml/i.test(u));
      for (const url of pages) {
        const slug = decodeURIComponent(url.split('?')[0].replace(/\/$/, '').split('/').pop() ?? '').replace(/\.html$/, '');
        const words = slug.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
        byUrl.set(url, { url, words });
      }
      console.log(`${file.split('/').pop()}: ${pages.length} links (total ${byUrl.size})`);
    } catch (err) {
      console.log(`${file}: ${err.message}`);
    }
  }
  const products = [...byUrl.values()];
  await writeFile(
    `scripts/prices/${shop.id}-products.json`,
    JSON.stringify({ shop: shop.id, fetchedAt: new Date().toISOString(), count: products.length, products }),
  );
  console.log(`Saved ${products.length} products`);

  // 3. three sample product pages
  const wanted = [['leite', 'meio'], ['arroz', 'carolino'], ['azeite']];
  let n = 0;
  for (const words of wanted) {
    const pick = products.find((p) => words.every((w) => p.words.includes(w)));
    if (!pick) continue;
    try {
      await writeFile(`scripts/prices/samples/${shop.id}-page-${++n}.html`, await get(pick.url));
      console.log(`Sample page ${n}: ${pick.url}`);
    } catch (err) {
      console.log(`Sample page: ${err.message}`);
    }
  }
}
console.log('\nDone. Tell Claude "done".');
