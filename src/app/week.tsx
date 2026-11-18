import { useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';

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
import { scaleLines } from '@/data/prices';
import { RecipeSteps } from '@/components/recipe-steps';
import { useTourActive } from '@/components/guest-tour';
import { DAYS, useUserData, type Day } from '@/hooks/use-user-data';
import { useLanguage } from '@/i18n/language';

export default function WeekScreen() {
  const { t, ingredient: ingredientLabel } = useLanguage();
  // Meals opened to see their recipe. Each one opens and closes on its own.
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const toggleOpen = (key: string) =>
    setOpenKeys((old) => {
      const next = new Set(old);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const [confirmKey, setConfirmKey] = useState<string | null>(null); // meal waiting for "Yes, remove"
  const { user, ready } = useAuthUser();
  const { recipes } = useRecipes(user?.uid ?? null);
  const { recipes: publicRecipes } = usePublicRecipes(ready && user !== null); // recipes added from Discover
  const { profile, week, loaded, error, saveWeek, needsNickname, isGuest, saveDisplayName } = useUserData(user?.uid ?? null);
  // During the tour an opened recipe is shown short (3 ingredients, the start of the first step).
  const tourOn = useTourActive();
  const [fullKeys, setFullKeys] = useState<Set<string>>(new Set()); // "Ver tudo" pressed during the tour
  const [pickingDay, setPickingDay] = useState<Day | null>(null); // the day whose recipe list is open

  function addRecipe(day: Day, recipeId: string) {
    saveWeek({ ...week, [day]: [...week[day], recipeId] });
    setPickingDay(null);
  }

  function removeRecipe(day: Day, index: number) {
    setConfirmKey(null);
    setOpenKeys(new Set()); // the positions change after a removal
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

          {/* alignItems flex-start: opening one day does not make the other days taller. */}
          <ThemedView style={[Layout.grid, styles.weekGrid]}>
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
                      {/* A small picture of the dish (or a plate when it has no photo). */}
                      {recipe?.photo?.startsWith('data:image/') ? (
                        <Image source={{ uri: recipe.photo }} resizeMode="cover" style={styles.thumb} />
                      ) : (
                        <ThemedView type="backgroundSelected" style={[styles.thumb, styles.thumbEmpty]}>
                          <ThemedText style={styles.thumbIcon}>🍽️</ThemedText>
                        </ThemedView>
                      )}
                      <Pressable
                        style={styles.itemText}
                        disabled={!recipe}
                        accessibilityRole="button"
                        onPress={() => toggleOpen(`${day}-${index}`)}>
                        {/* The name always takes 2 lines, so every day's card has the same height while closed. */}
                        <RecipeHeading reserveTwoLines name={recipe ? recipe.name : t('recipeGone')} />
                        {recipe ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            👥 {t((entry.servings ?? recipe.servings) === 1 ? 'peopleOne' : 'peopleMany', { count: entry.servings ?? recipe.servings })}
                          </ThemedText>
                        ) : null}
                        {recipe ? <WarningChips warnings={recipeWarnings(recipe.ingredients, profile)} /> : null}
                        {recipe && openKeys.has(`${day}-${index}`) ? (
                          (() => {
                            const key = `${day}-${index}`;
                            const short = tourOn && !fullKeys.has(key);
                            const all = scaleLines(recipe.ingredients, (entry.servings ?? recipe.servings) / recipe.servings);
                            const shown = short ? all.slice(0, 3) : all;
                            const firstStep = recipe.steps[0] ?? '';
                            return (
                              <ThemedView style={styles.openRecipe}>
                                {shown.map((ing, i) => (
                                  <ThemedText key={i} type="small" themeColor="textSecondary">
                                    • {[ing.amount ?? '', ing.unit === 'unit' ? '' : ing.unit, ingredientLabel(ing)].filter((part) => part !== '').join(' ')}
                                  </ThemedText>
                                ))}
                                {short && all.length > 3 ? (
                                  <ThemedText type="small" themeColor="textSecondary">
                                    {t('andMoreIngredients', { count: all.length - 3 })}
                                  </ThemedText>
                                ) : null}
                                {short ? (
                                  firstStep ? (
                                    <ThemedText type="small" themeColor="textSecondary">
                                      1. {firstStep.length > 60 ? `${firstStep.slice(0, 60).trimEnd()}…` : `${firstStep}…`}
                                    </ThemedText>
                                  ) : null
                                ) : (
                                  <RecipeSteps steps={recipe.steps} />
                                )}
                                {short ? (
                                  <Pressable
                                    style={Layout.smallButton}
                                    onPress={() => setFullKeys((old) => new Set(old).add(key))}>
                                    <ThemedText type="smallBold">{t('seeAll')}</ThemedText>
                                  </Pressable>
                                ) : null}
                                <Pressable
                                  style={Layout.smallButton}
                                  accessibilityRole="button"
                                  onPress={() => toggleOpen(key)}>
                                  <ThemedText type="smallBold">▲ {t('closeRecipe')}</ThemedText>
                                </Pressable>
                              </ThemedView>
                            );
                          })()
                        ) : recipe ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {t('tapToSeeRecipe')}
                          </ThemedText>
                        ) : null}
                      </Pressable>
                      {/* Remove from the week: a bin. Hidden during the tour (a removed meal cannot come back there). */}
                      {tourOn ? null : confirmKey === `${day}-${index}` ? (
                        // Asks first, so a meal is not removed by accident.
                        <ThemedView style={styles.confirm}>
                          <ThemedText type="small">{t('removeFromWeekAsk')}</ThemedText>
                          <Pressable
                            style={[Layout.smallButton, styles.dangerButton]}
                            onPress={() => removeRecipe(day, index)}>
                            <ThemedText type="smallBold" style={styles.dangerText}>
                              {t('removeYes')}
                            </ThemedText>
                          </Pressable>
                          <Pressable style={Layout.smallButton} onPress={() => setConfirmKey(null)}>
                            <ThemedText type="smallBold">{t('cancel')}</ThemedText>
                          </Pressable>
                        </ThemedView>
                      ) : (
                        <Pressable
                          style={Layout.smallButton}
                          accessibilityRole="button"
                          accessibilityLabel={t('removeFromWeek')}
                          onPress={() => setConfirmKey(`${day}-${index}`)}>
                          <ThemedText type="smallBold">🗑️</ThemedText>
                        </Pressable>
                      )}
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
                ) : isGuest ? null : (
                  // Guests have no recipes of their own: they add meals from Discover (📅 Semana).
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
  itemRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  thumb: { width: 72, height: 72, borderRadius: 14 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbIcon: { fontSize: 28, lineHeight: 34, opacity: 0.6 },
  itemText: { flex: 1, gap: Spacing.one },
  weekGrid: { alignItems: 'flex-start' },
  confirm: { alignItems: 'flex-end', gap: Spacing.one, backgroundColor: 'transparent' },
  dangerButton: { backgroundColor: '#D93025', borderColor: '#D93025' },
  dangerText: { color: '#FFFFFF' },
  openRecipe: { gap: Spacing.one, paddingTop: Spacing.one, backgroundColor: 'transparent' },
  picker: { gap: Spacing.two },
  pickRow: { gap: Spacing.one, paddingVertical: 4 },
});
