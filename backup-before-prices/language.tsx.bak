// The language the app shows. It is remembered in this browser.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Allergen, Category, Product } from '@/data/products';
import { getProduct, productName } from '@/data/products';
import type { Lang } from '@/i18n/lang';
import { ALLERGEN_NAMES, CATEGORY_NAMES, translate, type StringKey } from '@/i18n/strings';

const STORAGE_KEY = 'ambrosio-language';

function readSavedLanguage(): Lang {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'pt' || saved === 'fr') return saved;
  } catch {
    // storage can be blocked: just use English
  }
  return 'en';
}

type LanguageApi = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  allergenName: (allergen: Allergen) => string; // long name, for example "Milk (and lactose)"
  allergenShortName: (allergen: Allergen) => string; // short name, for example "Milk"
  categoryName: (category: Category) => string;
  product: (product: Product) => string; // the product name in this language
  // The name of an ingredient: from the catalog (in this language) when it has a product, else as typed.
  ingredient: (ing: { name: string; productId: string | null }) => string;
};

const LanguageContext = createContext<LanguageApi | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readSavedLanguage);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, next);
    } catch {
      // not saved, but it still works until the page is closed
    }
  }, []);

  // Tell the browser which language the page is in.
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  const api = useMemo<LanguageApi>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      allergenName: (allergen) => ALLERGEN_NAMES[lang][allergen],
      allergenShortName: (allergen) => ALLERGEN_NAMES[lang][allergen].split(' (')[0],
      categoryName: (category) => CATEGORY_NAMES[lang][category],
      product: (product) => productName(product, lang),
      ingredient: (ing) => {
        const product = getProduct(ing.productId);
        return product ? productName(product, lang) : ing.name;
      },
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={api}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageApi {
  const api = useContext(LanguageContext);
  if (!api) throw new Error('useLanguage must be used inside LanguageProvider');
  return api;
}
