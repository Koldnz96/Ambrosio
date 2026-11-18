import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';

import { NicknameForm } from '@/components/nickname-form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { WelcomeCard } from '@/components/welcome-card';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, SavedGreen, Spacing } from '@/constants/theme';
import { Layout } from '@/constants/layout';
import { compareShops, formatEuros } from '@/data/prices';
import { buildShoppingList, type Needed } from '@/data/shopping';
import { useAuthUser } from '@/hooks/use-auth-user';
import { useIsPhone } from '@/hooks/use-is-phone';
import { usePrices } from '@/hooks/use-prices';
import { useRecipes } from '@/hooks/use-recipes';
import { usePublicRecipes } from '@/hooks/use-public-recipes';
import { parseEntry } from '@/data/week-entry';
import { scaleLines } from '@/data/prices';
import { DAYS, useUserData } from '@/hooks/use-user-data';
import { getProduct, type Category } from '@/data/products';
import { useLanguage } from '@/i18n/language';

// A picture per supermarket section, so the list is quick to scan in the shop.
const SECTION_ICONS: Record<Category | 'other', string> = {
  vegetables: '🥕',
  fruit: '🍎',
  meat: '🥩',
  fish: '🐟',
  dairy: '🥛',
  grains: '🍝',
  legumes: '🫘',
  herbs: '🌿',
  spices: '🧂',
  condiments: '🫙',
  oils: '🫒',
  baking: '🧁',
  canned: '🥫',
  nuts: '🥜',
  drinks: '🍷',
  other: '🛍️',
};

export default function ShoppingScreen() {
  const { t, product: productLabel, categoryName } = useLanguage();
  const { user, ready } = useAuthUser();
  const { recipes } = useRecipes(user?.uid ?? null);
  const { week, loaded, needsNickname, saveDisplayName } = useUserData(user?.uid ?? null);
  const [ticked, setTicked] = useState<Set<string>>(new Set()); // ticks live in memory only
  const prices = usePrices();
  // Big, thumb-friendly rows on a phone (used in the shop); the normal size of the app on a computer.
  const isPhone = useIsPhone();
  // How many columns of sections fit (one on a phone; about 300 px each on a computer).
  const windowWidth = useWindowDimensions().width;
  const columnCount = Math.max(1, Math.floor((Math.min(windowWidth, MaxContentWidth) - 64 + 16) / (300 + 16)));
  const { recipes: publicRecipes } = usePublicRecipes(ready && user !== null); // recipes added from Discover

  // Every ingredient of every planned recipe. A recipe planned twice counts twice.
  const { groups, recipeCount, needed } = useMemo(() => {
    const needed: Needed[] = [];
    let count = 0;
    for (const day of DAYS) {
      for (const text of week[day]) {
        const entry = parseEntry(text);
        const recipe = recipes.find((r) => r.id === entry.recipeId) ?? publicRecipes.find((r) => r.id === entry.recipeId);
        if (!recipe) continue;
        count += 1;
        // Amounts for the number of people chosen when it was planned (else as the recipe is written).
        needed.push(...scaleLines(recipe.ingredients, (entry.servings ?? recipe.servings) / recipe.servings));
      }
    }
    return { groups: buildShoppingList(needed), recipeCount: count, needed };
  }, [week, recipes, publicRecipes]);

  // Which supermarket is cheapest overall for this list (approximate: online prices).
  const comparison = useMemo(() => compareShops(needed, prices), [needed, prices]);
  const best = comparison.ranking[0];

  function toggle(key: string) {
    setTicked((old) => {
      const next = new Set(old);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <Screen title={t('shoppingTitle')}>
      {!ready ? (
        <ThemedText themeColor="textSecondary">{t('checkingSignIn')}</ThemedText>
      ) : !user ? (
        <>
          <ThemedText themeColor="textSecondary">{t('shoppingSignIn')}</ThemedText>
          <WelcomeCard />
        </>
      ) : needsNickname ? (
        <NicknameForm onSave={saveDisplayName} />
      ) : !loaded ? (
        <ThemedText themeColor="textSecondary">{t('loadingPlan')}</ThemedText>
      ) : recipeCount === 0 ? (
        <ThemedText themeColor="textSecondary">
          {t('nothingToBuy')}
        </ThemedText>
      ) : (
        <>
          <ThemedText themeColor="textSecondary">
            {recipeCount === 1 ? t('fromRecipesOne') : t('fromRecipesMany', { count: recipeCount })}
          </ThemedText>
          {best && prices ? (
            <ThemedView type="backgroundElement" style={[Layout.card, styles.priceBox]}>
              <ThemedText type="smallBold">
                🛒 {t('priceBest', { shop: best.name, total: formatEuros(best.total) })}
              </ThemedText>
              {comparison.ranking.length > 1 ? (
                <ThemedText type="small">
                  {comparison.ranking
                    .slice(1)
                    .map((s) => `${s.name} ${formatEuros(s.total)}`)
                    .join(' · ')}
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">
                {t('priceNote', {
                  priced: comparison.priced,
                  total: comparison.total,
                  date: new Date(prices.updatedAt).toLocaleDateString(),
                })}
              </ThemedText>
            </ThemedView>
          ) : null}
          {/* How far you are in the shop: "5 of 23 in the basket", with a bar. */}
          {(() => {
            const total = groups.reduce((n, g) => n + g.items.length, 0);
            const done = groups.reduce((n, g) => n + g.items.filter((i) => ticked.has(i.key)).length, 0);
            return (
              <ThemedView type="backgroundElement" style={[Layout.card, styles.progressCard]}>
                <ThemedView style={styles.progressHead}>
                  <ThemedText type="smallBold">
                    🛒 {done === total && total > 0 ? t('shopAllDone') : t('shopProgress', { done, total })}
                  </ThemedText>
                  {ticked.size > 0 ? (
                    <Pressable style={Layout.smallButton} onPress={() => setTicked(new Set())}>
                      <ThemedText type="smallBold">{t('clearTicks')}</ThemedText>
                    </Pressable>
                  ) : null}
                </ThemedView>
                <ThemedView type="backgroundSelected" style={styles.bar}>
                  <ThemedView style={[styles.barFill, { width: `${total ? (done / total) * 100 : 0}%` }]} />
                </ThemedView>
              </ThemedView>
            );
          })()}

          {/* "Masonry": sections are stacked in columns, each one going into the shortest column,
              so a short section (Fruit, 1 item) never leaves a big hole next to a long one. */}
          <ThemedView style={styles.columns}>
            {(() => {
              const cols: (typeof groups)[] = Array.from({ length: columnCount }, () => []);
              const heights = new Array(columnCount).fill(0);
              for (const g of groups) {
                const shortest = heights.indexOf(Math.min(...heights));
                cols[shortest].push(g);
                heights[shortest] += 70 + g.items.length * 52; // about: header + rows
              }
              return cols;
            })().map((col, ci) => (
            <ThemedView key={ci} style={styles.column}>
            {col.map((group) => {
              // Things already in the basket go to the bottom of their section.
              const items = [...group.items].sort((a, b) => Number(ticked.has(a.key)) - Number(ticked.has(b.key)));
              const doneHere = group.items.filter((i) => ticked.has(i.key)).length;
              return (
                <ThemedView key={group.category} type="backgroundElement" style={Layout.card}>
                  <ThemedView style={styles.sectionHead}>
                    <ThemedText style={isPhone ? styles.sectionIconPhone : styles.sectionIcon}>{SECTION_ICONS[group.category]}</ThemedText>
                    <ThemedText type="smallBold" style={[styles.sectionName, isPhone && styles.sectionNamePhone]}>
                      {group.category === 'other' ? t('categoryOther') : categoryName(group.category)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {doneHere}/{group.items.length}
                    </ThemedText>
                  </ThemedView>
                  {items.map((item) => {
                    const done = ticked.has(item.key);
                    const name = item.productId && getProduct(item.productId) ? productLabel(getProduct(item.productId)!) : item.name;
                    return (
                      <Pressable
                        key={item.key}
                        style={[styles.itemRow, isPhone && styles.itemRowPhone]}
                        onPress={() => toggle(item.key)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: done }}>
                        {/* A big tick box: easy to hit with a thumb while pushing a trolley. */}
                        <ThemedView style={[styles.box, isPhone && styles.boxPhone, done && styles.boxDone]}>
                          {done ? <ThemedText style={[styles.tick, isPhone && styles.tickPhone]}>✓</ThemedText> : null}
                        </ThemedView>
                        <ThemedText
                          style={[styles.itemName, isPhone && styles.itemNamePhone, done && styles.itemDone]}
                          themeColor={done ? 'textSecondary' : 'text'}>
                          {name}
                        </ThemedText>
                        <ThemedView type="backgroundSelected" style={[styles.qty, done && styles.qtyDone]}>
                          <ThemedText type="small">
                            {item.quantities.length > 0 ? item.quantities.join(' + ') : t('quantitySome')}
                          </ThemedText>
                        </ThemedView>
                      </Pressable>
                    );
                  })}
                </ThemedView>
              );
            })}
            </ThemedView>
            ))}
          </ThemedView>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  priceBox: { maxWidth: 520 },
  progressCard: { gap: Spacing.two },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, backgroundColor: 'transparent' },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5, backgroundColor: SavedGreen },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, backgroundColor: 'transparent' },
  column: { flex: 1, minWidth: 0, gap: 16, backgroundColor: 'transparent' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingBottom: Spacing.one, backgroundColor: 'transparent' },
  sectionIcon: { fontSize: 18, lineHeight: 22 },
  sectionIconPhone: { fontSize: 24, lineHeight: 30 },
  sectionName: { flex: 1 },
  sectionNamePhone: { fontSize: 17 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 36,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(42, 27, 18, 0.08)',
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  boxDone: { backgroundColor: SavedGreen, borderColor: SavedGreen },
  tick: { color: '#FFFFFF', fontSize: 13, lineHeight: 16, fontWeight: '800' },
  itemName: { flex: 1, fontSize: 14, lineHeight: 20 },
  // Phone: bigger, for one hand in the shop.
  itemRowPhone: { gap: 12, minHeight: 52, paddingVertical: 8 },
  boxPhone: { width: 28, height: 28, borderRadius: 8 },
  tickPhone: { fontSize: 17, lineHeight: 20 },
  itemNamePhone: { fontSize: 17, lineHeight: 23 },
  itemDone: { textDecorationLine: 'line-through' },
  qty: { borderRadius: 999, paddingVertical: 2, paddingHorizontal: 10 },
  qtyDone: { opacity: 0.5 },
});
