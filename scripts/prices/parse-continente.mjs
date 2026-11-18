// Reads a Continente product page (HTML) and returns what we need. No internet here: just text work,
// so it can be tested on a saved page (sample.html).

const euros = (text) => Number(text.replace(/\./g, '').replace(',', '.'));
const clean = (html) => html.replace(/&euro;/g, '€').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

export function parseContinente(rawHtml) {
  const html = clean(rawHtml);
  const out = {
    name: null, brand: null, gtin: null, price: null, oldPrice: null,
    shopUnitPrice: null, shopUnit: null, packText: null, packAmount: null, packUnit: null, unitPrice: null,
  };

  // 1. The built-in product data (JSON-LD): name, brand, barcode and price. The most reliable part.
  for (const block of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(block[1]);
      for (const item of Array.isArray(data) ? data : [data]) {
        if (item?.['@type'] !== 'Product') continue;
        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        out.name = item.name ?? out.name;
        out.brand = item.brand?.name ?? out.brand;
        out.gtin = item.gtin13 ?? out.gtin;
        if (offer?.price) out.price = Number(offer.price);
      }
    } catch {
      // not valid JSON: skip it
    }
  }

  // 2. The shop's own price per litre / kg, shown under the price: "1,00€/lt".
  const second = html.match(/pwc-tile--price-secondary[^>]*>\s*(\d{1,4},\d{2})\s?€\s?\/\s?(\w+)/i);
  if (second) {
    out.shopUnitPrice = euros(second[1]);
    out.shopUnit = second[2].toLowerCase();
  }

  // 3. The pack size: "emb. 6 x 1 lt".
  const pack = html.match(/ct-pdp--unit[^>]*>\s*(emb\.[^<]*?)\s*</i);
  if (pack) {
    out.packText = pack[1].trim();
    const m = out.packText.match(/emb\.\s*(?:(\d+)\s*x\s*)?(\d+(?:[.,]\d+)?)\s*(kg|gr|g|lt|l|ml|cl|un|dz)\b/i);
    if (m) {
      let amount = Number(m[2].replace(',', '.')) * (m[1] ? Number(m[1]) : 1);
      let unit = m[3].toLowerCase();
      if (unit === 'g' || unit === 'gr') { amount /= 1000; unit = 'kg'; }
      if (unit === 'ml') { amount /= 1000; unit = 'l'; }
      if (unit === 'cl') { amount /= 100; unit = 'l'; }
      if (unit === 'lt') unit = 'l';
      if (unit === 'dz') { amount *= 12; unit = 'un'; }
      out.packAmount = Math.round(amount * 1000) / 1000;
      out.packUnit = unit;
    }
  }

  // Our own price per kg / l / unit, from the price and the pack (so every shop is compared the same way).
  if (out.price !== null && out.packAmount) out.unitPrice = Math.round((out.price / out.packAmount) * 100) / 100;
  return out;
}
