import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WarningChips } from '@/components/warning-chips';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { recipeWarnings } from '@/data/warnings';
import { useAuthUser } from '@/hooks/use-auth-user';
import { useRecipes } from '@/hooks/use-recipes';
import { DAYS, DAY_LABELS, useUserData, type Day } from '@/hooks/use-user-data';

export default function WeekScreen() {
  const { user, ready } = useAuthUser();
  const { recipes } = useRecipes(user?.uid ?? null);
  const { profile, week, loaded, error, saveWeek } = useUserData(user?.uid ?? null);
  const [pickingDay, setPickingDay] = useState<Day | null>(null); // the day whose recipe list is open

  function addRecipe(day: Day, recipeId: string) {
    saveWeek({ ...week, [day]: [...week[day], recipeId] });
    setPickingDay(null);
  }

  function removeRecipe(day: Day, index: number) {
    saveWeek({ ...week, [day]: week[day].filter((_, i) => i !== index) });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">Week</ThemedText>

          {!ready ? (
            <ThemedText themeColor="textSecondary">Checking if you are signed in...</ThemedText>
          ) : !user ? (
            <ThemedText themeColor="textSecondary">Sign in on the Profile tab to plan your week.</ThemedText>
          ) : (
            <>
              <ThemedText themeColor="textSecondary">
                Choose what you will cook each day. The Shopping tab adds it all up for you.
              </ThemedText>
              {!loaded && !error ? <ThemedText type="small">Loading your plan...</ThemedText> : null}
              {error ? <ThemedText type="small">{error}</ThemedText> : null}
              {recipes.length === 0 ? (
                <ThemedText type="small">You have no recipes yet. Write one on the My recipes tab first.</ThemedText>
              ) : null}

              {DAYS.map((day) => (
                <ThemedView key={day} type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">{DAY_LABELS[day]}</ThemedText>

                  {week[day].length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Nothing planned.
                    </ThemedText>
                  ) : null}

                  {week[day].map((recipeId, index) => {
                    const recipe = recipes.find((r) => r.id === recipeId);
                    return (
                      <ThemedView key={`${recipeId}-${index}`} type="backgroundElement" style={styles.itemRow}>
                        <ThemedView type="backgroundElement" style={styles.itemText}>
                          <ThemedText type="small">{recipe ? recipe.name : 'A recipe that no longer exists'}</ThemedText>
                          {recipe ? <WarningChips warnings={recipeWarnings(recipe.ingredients, profile)} /> : null}
                        </ThemedView>
                        <Pressable style={styles.smallButton} onPress={() => removeRecipe(day, index)}>
                          <ThemedText type="smallBold">✕</ThemedText>
                        </Pressable>
                      </ThemedView>
                    );
                  })}

                  {pickingDay === day ? (
                    <ThemedView type="backgroundElement" style={styles.picker}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Tap a recipe to add it:
                      </ThemedText>
                      {recipes.map((recipe) => (
                        <Pressable key={recipe.id} style={styles.pickRow} onPress={() => addRecipe(day, recipe.id)}>
                          <ThemedText type="small">{recipe.name}</ThemedText>
                          <WarningChips warnings={recipeWarnings(recipe.ingredients, profile)} />
                        </Pressable>
                      ))}
                      <Pressable style={styles.smallButton} onPress={() => setPickingDay(null)}>
                        <ThemedText type="smallBold">Cancel</ThemedText>
                      </Pressable>
                    </ThemedView>
                  ) : (
                    <Pressable
                      style={styles.smallButton}
                      disabled={recipes.length === 0 || !loaded}
                      onPress={() => setPickingDay(day)}>
                      <ThemedText type="smallBold">+ Add recipe</ThemedText>
                    </Pressable>
                  )}
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
  itemRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  itemText: { flex: 1, gap: Spacing.one },
  picker: { gap: Spacing.two },
  pickRow: { gap: Spacing.one, paddingVertical: 4 },
  smallButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
