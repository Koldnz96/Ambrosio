import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { buildShoppingList, type Needed } from '@/data/shopping';
import { useAuthUser } from '@/hooks/use-auth-user';
import { useRecipes } from '@/hooks/use-recipes';
import { DAYS, useUserData } from '@/hooks/use-user-data';

export default function ShoppingScreen() {
  const { user, ready } = useAuthUser();
  const { recipes } = useRecipes(user?.uid ?? null);
  const { week, loaded } = useUserData(user?.uid ?? null);
  const [ticked, setTicked] = useState<Set<string>>(new Set()); // ticks live in memory only

  // Every ingredient of every planned recipe. A recipe planned twice counts twice.
  const { groups, recipeCount } = useMemo(() => {
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
    return { groups: buildShoppingList(needed), recipeCount: count };
  }, [week, recipes]);

  function toggle(key: string) {
    setTicked((old) => {
      const next = new Set(old);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Shopping</ThemedText>

          {!ready ? (
            <ThemedText themeColor="textSecondary">Checking if you are signed in...</ThemedText>
          ) : !user ? (
            <ThemedText themeColor="textSecondary">Sign in on the Profile tab to see your shopping list.</ThemedText>
          ) : !loaded ? (
            <ThemedText themeColor="textSecondary">Loading your plan...</ThemedText>
          ) : recipeCount === 0 ? (
            <ThemedText themeColor="textSecondary">
              Nothing to buy yet. Plan some recipes on the Week tab and the list appears here.
            </ThemedText>
          ) : (
            <>
              <ThemedText themeColor="textSecondary">
                From {recipeCount} planned {recipeCount === 1 ? 'recipe' : 'recipes'} this week. Tap an item to tick it off.
              </ThemedText>
              {ticked.size > 0 ? (
                <Pressable style={styles.smallButton} onPress={() => setTicked(new Set())}>
                  <ThemedText type="smallBold">Clear ticks</ThemedText>
                </Pressable>
              ) : null}

              {groups.map((group) => (
                <ThemedView key={group.category} type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">{group.label}</ThemedText>
                  {group.items.map((item) => {
                    const done = ticked.has(item.key);
                    return (
                      <Pressable key={item.key} style={styles.itemRow} onPress={() => toggle(item.key)}>
                        <ThemedText type="small" themeColor={done ? 'textSecondary' : 'text'}>
                          {done ? '☑' : '☐'} {item.name}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.quantities.join(' + ')}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ThemedView>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? 96 : Spacing.five,
  },
  content: { gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.five },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two, maxWidth: 520 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two, paddingVertical: 2 },
  smallButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
