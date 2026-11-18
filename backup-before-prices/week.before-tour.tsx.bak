import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { NicknameForm } from '@/components/nickname-form';
import { RecipeHeading } from '@/components/recipe-heading';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { WelcomeCard } from '@/components/welcome-card';
import { ThemedView } from '@/components/themed-view';
import { WarningChips } from '@/components/warning-chips';
import { Spacing } from '@/constants/theme';
import { Layout } from '@/constants/layout';
import { recipeWarnings } from '@/data/warnings';
import { useAuthUser } from '@/hooks/use-auth-user';
import { useRecipes } from '@/hooks/use-recipes';
import { usePublicRecipes } from '@/hooks/use-public-recipes';
import { parseEntry } from '@/data/week-entry';
import { DAYS, useUserData, type Day } from '@/hooks/use-user-data';
import { useLanguage } from '@/i18n/language';

export default function WeekScreen() {
  const { t } = useLanguage();
  const { user, ready } = useAuthUser();
  const { recipes } = useRecipes(user?.uid ?? null);
  const { recipes: publicRecipes } = usePublicRecipes(ready && user !== null); // recipes added from Discover
  const { profile, week, loaded, error, saveWeek, needsNickname, saveDisplayName } = useUserData(user?.uid ?? null);
  const [pickingDay, setPickingDay] = useState<Day | null>(null); // the day whose recipe list is open

  function addRecipe(day: Day, recipeId: string) {
    saveWeek({ ...week, [day]: [...week[day], recipeId] });
    setPickingDay(null);
  }

  function removeRecipe(day: Day, index: number) {
    saveWeek({ ...week, [day]: week[day].filter((_, i) => i !== index) });
  }

  return (
    <Screen title={t('weekTitle')}>
      {!ready ? (
        <ThemedText themeColor="textSecondary">{t('checkingSignIn')}</ThemedText>
      ) : !user ? (
        <>
          <ThemedText themeColor="textSecondary">{t('weekSignIn')}</ThemedText>
          <WelcomeCard />
        </>
      ) : needsNickname ? (
        <NicknameForm onSave={saveDisplayName} />
      ) : (
        <>
          <ThemedText themeColor="textSecondary">
            {t('weekHelp')}
          </ThemedText>
          {!loaded && !error ? <ThemedText type="small">{t('loadingPlan')}</ThemedText> : null}
          {error ? (
            <ThemedText type="small">
              {t(error.kind === 'load' ? 'errLoadSettings' : 'errSave', { message: error.message })}
            </ThemedText>
          ) : null}
          {recipes.length === 0 ? (
            <ThemedText type="small">{t('weekNoRecipes')}</ThemedText>
          ) : null}

          <ThemedView style={Layout.grid}>
            {DAYS.map((day) => (
              <ThemedView key={day} type="backgroundElement" style={Layout.card}>
                <ThemedText type="smallBold">{t(day)}</ThemedText>

                {week[day].length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('nothingPlanned')}
                  </ThemedText>
                ) : null}

                {week[day].map((text, index) => {
                  const entry = parseEntry(text);
                  const recipe = recipes.find((r) => r.id === entry.recipeId) ?? publicRecipes.find((r) => r.id === entry.recipeId);
                  return (
                    <ThemedView key={`${text}-${index}`} type="backgroundElement" style={styles.itemRow}>
                      <ThemedView type="backgroundElement" style={styles.itemText}>
                        <RecipeHeading name={recipe ? recipe.name : t('recipeGone')} />
                        {recipe ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            👥 {t((entry.servings ?? recipe.servings) === 1 ? 'peopleOne' : 'peopleMany', { count: entry.servings ?? recipe.servings })}
                          </ThemedText>
                        ) : null}
                        {recipe ? <WarningChips warnings={recipeWarnings(recipe.ingredients, profile)} /> : null}
                      </ThemedView>
                      <Pressable style={Layout.smallButton} onPress={() => removeRecipe(day, index)}>
                        <ThemedText type="smallBold">✕</ThemedText>
                      </Pressable>
                    </ThemedView>
                  );
                })}

                {pickingDay === day ? (
                  <ThemedView type="backgroundElement" style={styles.picker}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('tapToAdd')}
                    </ThemedText>
                    {recipes.map((recipe) => (
                      <Pressable key={recipe.id} style={styles.pickRow} onPress={() => addRecipe(day, recipe.id)}>
                        <RecipeHeading name={recipe.name} />
                        <WarningChips warnings={recipeWarnings(recipe.ingredients, profile)} />
                      </Pressable>
                    ))}
                    <Pressable style={Layout.smallButton} onPress={() => setPickingDay(null)}>
                      <ThemedText type="smallBold">{t('cancel')}</ThemedText>
                    </Pressable>
                  </ThemedView>
                ) : (
                  <Pressable
                    style={Layout.smallButton}
                    disabled={recipes.length === 0 || !loaded}
                    onPress={() => setPickingDay(day)}>
                    <ThemedText type="smallBold">{t('addRecipe')}</ThemedText>
                  </Pressable>
                )}
              </ThemedView>
            ))}
          </ThemedView>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  itemRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  itemText: { flex: 1, gap: Spacing.one },
  picker: { gap: Spacing.two },
  pickRow: { gap: Spacing.one, paddingVertical: 4 },
});
