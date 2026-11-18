import { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { NicknameForm } from '@/components/nickname-form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { WelcomeCard } from '@/components/welcome-card';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Layout } from '@/constants/layout';
import { compareShops, formatEuros } from '@/data/prices';
import { buildShoppingList, type Needed } from '@/data/shopping';
import { useAuthUser } from '@/hooks/use-auth-user';
import { usePrices } from '@/hooks/use-prices';
import { useRecipes } from '@/hooks/use-recipes';
import { DAYS, useUserData } from '@/hooks/use-user-data';
import { getProduct } from '@/data/products';
import { useLanguage } from '@/i18n/language';

export default function ShoppingScreen() {
  const { t, product: productLabel, categoryName } = useLanguage();
  const { user, ready } = useAuthUser();
  const { recipes } = useRecipes(user?.uid ?? null);
  const { week, loaded, needsNickname, saveDisplayName } = useUserData(user?.uid ?? null);
  const [ticked, setTicked] = useState<Set<string>>(new Set()); // ticks live in memory only
  const prices = usePrices();

  // Every ingredient of every planned recipe. A recipe planned twice counts twice.
  const { groups, recipeCount, needed } = useMemo(() => {
    const needed: Needed[] = [];
    let count = 0;
    for (const day of DAYS) {
      for (const recipeId of week[day]) {
        const recipe = recipes.find((r) => r.id === recipeId);
        if (!recipe) continue;
        count += 1;
        needed.push(...recipe.ingredients);
      }
    }
    return { groups: buildShoppingList(needed), recipeCount: count, needed };
  }, [week, recipes]);

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
          {ticked.size > 0 ? (
            <Pressable style={Layout.smallButton} onPress={() => setTicked(new Set())}>
              <ThemedText type="smallBold">{t('clearTicks')}</ThemedText>
            </Pressable>
          ) : null}

          <ThemedView style={Layout.grid}>
            {groups.map((group) => (
              <ThemedView key={group.category} type="backgroundElement" style={Layout.card}>
                <ThemedText type="smallBold">
                  {group.category === 'other' ? t('categoryOther') : categoryName(group.category)}
                </ThemedText>
                {group.items.map((item) => {
                  const done = ticked.has(item.key);
                  return (
                    <Pressable key={item.key} style={styles.itemRow} onPress={() => toggle(item.key)}>
                      <ThemedText type="small" themeColor={done ? 'textSecondary' : 'text'}>
                        {done ? '☑' : '☐'} {item.productId && getProduct(item.productId) ? productLabel(getProduct(item.productId)!) : item.name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.quantities.length > 0 ? item.quantities.join(' + ') : t('quantitySome')}
                      </ThemedText>
                    </Pressable>
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
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two, paddingVertical: 2 },
});
