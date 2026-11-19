import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, useWindowDimensions } from 'react-native';

import { NicknameForm } from '@/components/nickname-form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { WelcomeCard } from '@/components/welcome-card';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, SavedGreen, Spacing } from '@/constants/theme';
import { Layout } from '@/constants/layout';
import { formatEuros } from '@/data/prices';
import { NOT_BOUGHT, planShops, sumNeeds, type Buy } from '@/data/buy';
import { buildShoppingList, type Needed } from '@/data/shopping';
import { useAuthUser } from '@/hooks/use-auth-user';
import { useIsPhone } from '@/hooks/use-is-phone';
import { usePrices } from '@/hooks/use-prices';
import { useRecipes } from '@/hooks/use-recipes';
import { usePublicRecipes } from '@/hooks/use-public-recipes';
import { parseEntry } from '@/data/week-entry';
import { scaleLines } from '@/data/prices';
import { DAYS, useUserData } from '@/hooks/use-user-data';
import { getProduct, PRODUCTS, type Category } from '@/data/products';
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
  const { week, loaded, needsNickname, saveDisplayName, haveAtHome, saveHaveAtHome, otherItems, saveOtherItems } = useUserData(user?.uid ?? null);
  const [shopId, setShopId] = useState<string | null>(null); // shop tab chosen (null = the cheapest)
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

  // What to BUY at each shop (packs and pieces), and which shop is cheapest overall.
  // Things you said you still have at home are left out.
  const have = useMemo(() => new Set(haveAtHome), [haveAtHome]);
  const plan = useMemo(
    () => planShops(sumNeeds(needed).filter((n) => !have.has(n.productId)), prices),
    [needed, prices, have],
  );
  const best = plan.shops[0];
  const shown = plan.shops.find((s) => s.shopId === shopId) ?? best; // the shop whose packs are shown
  // The buy plan for one list item at the shown shop (an item can need g and units: added together).
  function buyFor(productId: string | null): Buy | null {
    if (!productId || !shown) return null;
    const found = [...shown.buys.entries()].filter(([k]) => k.startsWith(`${productId}|`)).map(([, b]) => b);
    if (found.length === 0) return null;
    if (found.length === 1) return found[0];
    return { ...found[0], cost: found.reduce((sum, b) => sum + b.cost, 0) };
  }
  function buyText(b: Buy): string {
    return 'pieces' in b.label ? t('buyPieces', { count: b.label.pieces }) : `${b.label.count} × ${b.label.size}`;
  }
  // "Other things for home" (toilet paper...): free notes, never part of prices or the food list.
  const [otherText, setOtherText] = useState('');
  function addOther() {
    const text = otherText.trim().slice(0, 60);
    if (!text) return;
    saveOtherItems([...otherItems, { id: `${Date.now()}-${otherItems.length}`, text, done: false }]);
    setOtherText('');
  }
  const otherCard = (
    <ThemedView type="backgroundElement" style={[Layout.card, styles.otherCard]}>
      <ThemedText type="smallBold">{t('otherTitle')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('otherHelp')}
      </ThemedText>
      {otherItems.map((item) => (
        <ThemedView key={item.id} style={styles.otherRow}>
          <Pressable
            accessibilityRole="button"
            style={styles.otherMain}
            onPress={() => saveOtherItems(otherItems.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)))}>
            <ThemedView style={[styles.box, isPhone && styles.boxPhone, item.done && styles.boxDone]}>
              {item.done ? <ThemedText style={[styles.tick, isPhone && styles.tickPhone]}>✓</ThemedText> : null}
            </ThemedView>
            <ThemedText style={[styles.otherText, item.done && styles.itemDone]} themeColor={item.done ? 'textSecondary' : 'text'}>
              {item.text}
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('otherRemove')}
            style={styles.homeButton}
            onPress={() => saveOtherItems(otherItems.filter((x) => x.id !== item.id))}>
            <ThemedText style={styles.homeIcon}>✕</ThemedText>
          </Pressable>
        </ThemedView>
      ))}
      <ThemedView style={styles.otherRow}>
        <TextInput
          value={otherText}
          onChangeText={setOtherText}
          onSubmitEditing={addOther}
          placeholder={t('otherPlaceholder')}
          placeholderTextColor="#8A7A70"
          maxLength={60}
          returnKeyType="done"
          style={styles.otherInput}
        />
        <Pressable accessibilityRole="button" style={[Layout.smallButton, styles.otherAdd]} onPress={addOther}>
          <ThemedText type="smallBold">{t('otherAdd')}</ThemedText>
        </Pressable>
      </ThemedView>
      {otherItems.some((x) => x.done) ? (
        <Pressable accessibilityRole="button" style={Layout.smallButton} onPress={() => saveOtherItems(otherItems.filter((x) => !x.done))}>
          <ThemedText type="smallBold">{t('otherClear')}</ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );

  function toggleHave(productId: string) {
    saveHaveAtHome(have.has(productId) ? haveAtHome.filter((id) => id !== productId) : [...haveAtHome, productId]);
  }
  // The list without the things at home; those get their own small card at the end.
  // The name (in the app language) of the product bought instead, e.g. Pancetta -> "bacon".
  function insteadLabel(name: string): string {
    const p = PRODUCTS.find((x) => x.name === name);
    return p ? productLabel(p) : name;
  }
  // Tap water is never bought, so it is not on the list.
  const isWater = (i: { productId: string | null }) =>
    !!i.productId && NOT_BOUGHT.has(getProduct(i.productId)?.name ?? '');
  const listGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !isWater(i) && !(i.productId && have.has(i.productId))) }))
    .filter((g) => g.items.length > 0);
  const atHome = groups.flatMap((g) => g.items.filter((i) => i.productId && have.has(i.productId)));

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
        <>
          <ThemedText themeColor="textSecondary">
            {t('nothingToBuy')}
          </ThemedText>
          {otherCard}
        </>
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
              {/* Shop tabs: the list below shows the packs and prices of the chosen shop. */}
              <ThemedView style={styles.shopTabs}>
                {plan.shops.map((s) => {
                  const on = s.shopId === shown?.shopId;
                  return (
                    <Pressable
                      key={s.shopId}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.shopTab, on && styles.shopTabOn]}
                      onPress={() => setShopId(s.shopId)}>
                      <ThemedText type="smallBold" style={on ? styles.shopTabTextOn : undefined}>
                        {s.name} {formatEuros(s.total)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ThemedView>
              <ThemedText type="small" themeColor="textSecondary">
                {t('buyNote', {
                  priced: plan.priced,
                  total: plan.total,
                  date: new Date(prices.updatedAt).toLocaleDateString(),
                })}
                {shown && shown.estimated > 0 ? ` ${t('buyEstimatedCount', { count: shown.estimated, shop: shown.name })}` : ''}
              </ThemedText>
            </ThemedView>
          ) : null}
          {/* How far you are in the shop: "5 of 23 in the basket", with a bar. */}
          {(() => {
            const total = listGroups.reduce((n, g) => n + g.items.length, 0);
            const done = listGroups.reduce((n, g) => n + g.items.filter((i) => ticked.has(i.key)).length, 0);
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
              const cols: (typeof listGroups)[] = Array.from({ length: columnCount }, () => []);
              const heights = new Array(columnCount).fill(0);
              for (const g of listGroups) {
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
                        <ThemedView style={styles.itemText}>
                          <ThemedText
                            style={[styles.itemName, isPhone && styles.itemNamePhone, done && styles.itemDone]}
                            themeColor={done ? 'textSecondary' : 'text'}>
                            {name}
                          </ThemedText>
                          {/* What the recipes use, small, and the approximate price of what you buy. */}
                          <ThemedText type="small" themeColor="textSecondary" style={styles.useLine}>
                            {t('buyUses', { amount: item.quantities.length > 0 ? item.quantities.join(' + ') : t('quantitySome') })}
                            {buyFor(item.productId) ? ` · ${formatEuros(buyFor(item.productId)!.cost)}` : ''}
                            {buyFor(item.productId)?.estimated ? ` · ${t('buyEstimate')}` : ''}
                            {buyFor(item.productId)?.onSale ? ' · 🏷️' : ''}
                            {buyFor(item.productId)?.instead ? ` · ${t('buyInstead', { name: insteadLabel(buyFor(item.productId)!.instead!) })}` : ''}
                          </ThemedText>
                        </ThemedView>
                        {/* What to put in the basket: "1 × 750 ml", "2 un." (or the amount when no price yet). */}
                        <ThemedView type="backgroundSelected" style={[styles.qty, done && styles.qtyDone]}>
                          <ThemedText type="smallBold">
                            {buyFor(item.productId)
                              ? buyText(buyFor(item.productId)!)
                              : item.quantities.length > 0
                                ? item.quantities.join(' + ')
                                : t('quantitySome')}
                          </ThemedText>
                        </ThemedView>
                        {item.productId ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('haveAtHome')}
                            style={styles.homeButton}
                            onPress={() => toggleHave(item.productId!)}>
                            <ThemedText style={styles.homeIcon}>🏠</ThemedText>
                          </Pressable>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ThemedView>
              );
            })}
            </ThemedView>
            ))}
          </ThemedView>

          {/* Things you still have at home: not bought, not in the price. Tap to put one back on the list. */}
          {atHome.length > 0 ? (
            <ThemedView type="backgroundElement" style={[Layout.card, styles.homeCard]}>
              <ThemedText type="smallBold">🏠 {t('haveAtHomeTitle', { count: atHome.length })}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('haveAtHomeHelp')}
              </ThemedText>
              <ThemedView style={styles.homeChips}>
                {atHome.map((item) => (
                  <Pressable key={item.key} style={styles.homeChip} onPress={() => toggleHave(item.productId!)}>
                    <ThemedText type="small">
                      ↺ {item.productId && getProduct(item.productId) ? productLabel(getProduct(item.productId)!) : item.name}
                    </ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            </ThemedView>
          ) : null}

          {otherCard}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  priceBox: { maxWidth: 720 },
  shopTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, backgroundColor: 'transparent' },
  shopTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: Accent },
  shopTabOn: { backgroundColor: Accent },
  shopTabTextOn: { color: '#FFFFFF' },
  itemText: { flex: 1, minWidth: 0, backgroundColor: 'transparent' },
  useLine: { fontSize: 12, lineHeight: 16 },
  homeButton: { paddingHorizontal: 4, paddingVertical: 4 },
  homeIcon: { fontSize: 16, lineHeight: 20, opacity: 0.75 },
  homeCard: { gap: Spacing.two },
  otherCard: { gap: Spacing.two, maxWidth: 720 },
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: 'transparent' },
  otherMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 4 },
  otherText: { flex: 1, minWidth: 0, fontSize: 16 },
  otherInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(42,27,18,0.2)',
    fontSize: 16,
  },
  otherAdd: { minWidth: 48, alignItems: 'center' },
  homeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, backgroundColor: 'transparent' },
  homeChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(42,27,18,0.2)' },
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
