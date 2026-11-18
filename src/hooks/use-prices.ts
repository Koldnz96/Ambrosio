import { useEffect, useState } from 'react';

import type { PricesFile } from '@/data/prices';

// The prices file made every day by GitHub Actions, read from the public GitHub repository.
// (This is the app fetching information from a website.)
const PRICES_URL = 'https://raw.githubusercontent.com/Koldnz96/Ambrosio/main/prices/prices.json';

// Read once per visit and shared by every screen.
let cache: Promise<PricesFile | null> | null = null;

function loadPrices(): Promise<PricesFile | null> {
  cache ??= fetch(PRICES_URL)
    .then((response) => (response.ok ? (response.json() as Promise<PricesFile>) : null))
    .then((data) => (data && data.shops ? data : null))
    .catch(() => null);
  return cache;
}

// null while loading, or when there are no prices yet (the app then simply shows no prices).
export function usePrices(): PricesFile | null {
  const [prices, setPrices] = useState<PricesFile | null>(null);
  useEffect(() => {
    let alive = true;
    loadPrices().then((data) => {
      if (alive) setPrices(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  return prices;
}
