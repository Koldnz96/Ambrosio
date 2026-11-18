// Reads a product page (HTML) from Continente, Pingo Doce or Auchan and returns what we need.
// No internet here, just text work, so it can be tested on saved pages.
// All three shops use the same shop software (Salesforce Commerce Cloud), so the pages look alike.

const euros = (text) => Number(text.replace(/\s/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
const clean = (html) =>
  html.replace(/&euro;|&#8364;/g, '€').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

// "6 x 1 lt", "1 Kg", "0.75 L", "400g", "75 cl", "1 dz" -> { amount, unit } in kg, l or un.
export function readSize(text) {
  const m = text.match(/(?:(\d+)\s*x\s*)?(\d+(?:[.,]\d+)?)\s*(kg|gr|g|lt|l|ml|cl|un|uni|dz)\b/i);
  if (!m) return null;
  let amount = Number(m[2].replace(',', '.')) * (m[1] ? Number(m[1]) : 1);
  let unit = m[3].toLowerCase();
  if (unit === 'g' || unit === 'gr') { amount /= 1000; unit = 'kg'; }
  if (unit === 'ml') { amount /= 1000; unit = 'l'; }
  if (unit === 'cl') { amount /= 100; unit = 'l'; }
  if (unit === 'lt') unit = 'l';
  if (unit === 'uni') unit = 'un';
  if (unit === 'dz') { amount *= 12; unit = 'un'; }
  if (!(amount > 0)) return null;
  return { amount: Math.round(amount * 1000) / 1000, unit };
}

export function parseProduct(rawHtml) {
  const html = clean(rawHtml);
  const out = {
    name: null, brand: null, gtin: null, price: null, oldPrice: null,
    shopUnitPrice: null, shopUnit: null, packText: null, packAmount: null, packUnit: null, unitPrice: null,
  };

  // 1. Built-in product data (JSON-LD): name, brand, barcode, sometimes the price.
  for (const block of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(block[1]);
      for (const item of Array.isArray(data) ? data : [data]) {
        if (item?.['@type'] !== 'Product') continue;
        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        out.name = item.name ?? out.name;
        out.brand = item.brand?.name ?? out.brand;
        out.gtin = item.gtin13 ?? item.gtin ?? out.gtin;
        if (offer?.price) out.price = Number(offer.price);
      }
    } catch {
      // not valid JSON: skip it
    }
  }

  // 2. The price on the page: <span class="sales"> <span class="value" content="0.99">
  if (out.price === null) {
    const m = html.match(/class="sales"[^>]*>\s*<span[^>]*class="value"[^>]*content="(\d+(?:\.\d+)?)"/i)
      ?? html.match(/class="value"[^>]*content="(\d+(?:\.\d+)?)"/i);
    if (m) out.price = Number(m[1]);
  }
  // Old (crossed-out) price when there is a promotion.
  const old = html.match(/class="strike-through[^"]*"[^>]*>\s*<span[^>]*class="value"[^>]*content="(\d+(?:\.\d+)?)"/i);
  if (old) out.oldPrice = Number(old[1]);

  // 3. Pack size and the shop's price per unit.
  //    Continente: <div class="ct-pdp--unit">emb. 6 x 1 lt</div> and "1,00€/lt"
  //    Pingo Doce: <h1 class="product-unit-measure">1 L | 0,99 €/L</h1>
  const measure = html.match(/product-unit-measure[^>]*>\s*([^<]+)</i)?.[1];
  const emb = html.match(/ct-pdp--unit[^>]*>\s*(emb\.[^<]*?)\s*</i)?.[1];
  out.packText = (emb ?? measure?.split('|')[0] ?? '').trim() || null;
  const per = (measure ?? '').match(/(\d{1,4},\d{2})\s?€\s?\/\s?(\w+)/)
    ?? html.match(/pwc-tile--price-secondary[^>]*>\s*(\d{1,4},\d{2})\s?€\s?\/\s?(\w+)/i);
  if (per) {
    out.shopUnitPrice = euros(per[1]);
    out.shopUnit = per[2].toLowerCase();
  }
  // No pack text? Try the product name ("Fortificante Ovomaltine 400g").
  const size = readSize(out.packText ?? '') ?? readSize(out.name ?? '');
  if (size) {
    out.packAmount = size.amount;
    out.packUnit = size.unit;
  }

  // 4. Our own price per kg / l / unit, so every shop is compared the same way.
  if (out.price !== null && out.packAmount) out.unitPrice = Math.round((out.price / out.packAmount) * 100) / 100;
  else if (out.shopUnitPrice !== null) {
    out.unitPrice = out.shopUnitPrice;
    out.packUnit = { lt: 'l', l: 'l', kg: 'kg', un: 'un' }[out.shopUnit] ?? out.shopUnit;
  }
  return out;
}
