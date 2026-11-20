import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
import { makeEntry, parseEntry } from '@/data/week-entry';
import { scaleLines } from '@/data/prices';
import { RecipeSteps } from '@/components/recipe-steps';
import { RecipePickCard } from '@/components/recipe-pick-card';
import { usePrices } from '@/hooks/use-prices';
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
  const prices = usePrices(); // for the price per person on the pick cards

  function addRecipe(day: Day, recipeId: string) {
    saveWeek({ ...week, [day]: [...week[day], recipeId] });
    setPickingDay(null);
  }

  // "Trocar": swap one planned meal for another recipe, keeping the number of people.
  const [changingKey, setChangingKey] = useState<string | null>(null); // the meal whose "change" list is open
  const [showWarned, setShowWarned] = useState(false); // also list recipes with allergy warnings

  // Everything you can pick: your own recipes and the public ones (no repeats), A to Z.
  const choices = [...recipes, ...publicRecipes.filter((p) => !recipes.some((r) => r.id === p.id))].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  // A recipe is "warned" when it contains (or may contain) one of your allergies, or is not vegan for a vegan.
  // Recipes we simply cannot check stay in the list, with their yellow chip.
  const isWarned = (ingredients: { productId: string | null }[]) =>
    recipeWarnings(ingredients, profile).some((w) => w.level !== 'unchecked');

  function openChange(key: string) {
    setChangingKey(changingKey === key ? null : key);
    setShowWarned(false);
    setConfirmKey(null);
  }

  function changeRecipe(day: Day, index: number, newId: string, servings: number | null) {
    const key = `${day}-${index}`;
    saveWeek({ ...week, [day]: week[day].map((text, i) => (i === index ? makeEntry(newId, servings) : text)) });
    setChangingKey(null);
    // The meal in this spot is a new one: close its recipe.
    setOpenKeys((old) => {
      const next = new Set(old);
      next.delete(key);
      return next;
    });
    setFullKeys((old) => {
      const next = new Set(old);
      next.delete(key);
      return next;
    });
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
                  const key = `${day}-${index}`;
                  // Same number of people as the meal it replaces.
                  const keepServings = entry.servings ?? recipe?.servings ?? null;
                  const options = choices.filter((c) => c.id !== entry.recipeId);
                  const safe = options.filter((c) => !isWarned(c.ingredients));
                  const warnedCount = options.length - safe.length;
                  const listed = showWarned ? options : safe;
                  return (
                    <ThemedView key={`${text}-${index}`} type="backgroundElement" style={styles.meal}>
                    <ThemedView type="backgroundElement" style={styles.itemRow}>
                      {/* A small picture of the dish (or a plate when it has no photo), with a small bin on its corner. */}
                      <View style={styles.thumbBox}>
                        {recipe?.photo?.startsWith('data:image/') ? (
                          <Image source={{ uri: recipe.photo }} resizeMode="cover" style={styles.thumb} />
                        ) : (
                          <ThemedView type="backgroundSelected" style={[styles.thumb, styles.thumbEmpty]}>
                            <ThemedText style={styles.thumbIcon}>🍽️</ThemedText>
                          </ThemedView>
                        )}
                        {/* Remove from the week. Hidden during the tour (a removed meal cannot come back there). */}
                        {tourOn ? null : (
                          <Pressable
                            style={styles.binOnPhoto}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={t('removeFromWeek')}
                            onPress={() => {
                              setChangingKey(null);
                              setConfirmKey(confirmKey === key ? null : key);
                            }}>
                            <ThemedText style={styles.binIcon}>🗑️</ThemedText>
                          </Pressable>
                        )}
                      </View>
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
                    </ThemedView>

                    {/* Under the meal: "remove?" question, or the quiet "Trocar" button. */}
                    {confirmKey === key ? (
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
                      // Also during the tour: if you like the example week, keep it and swap what you don't like.
                      <Pressable
                        style={[Layout.smallButton, changingKey === key && styles.buttonOn]}
                        accessibilityRole="button"
                        accessibilityLabel={t('changeRecipe')}
                        onPress={() => openChange(key)}>
                        <ThemedText type="small">🔄 {t('changeRecipe')}</ThemedText>
                      </Pressable>
                    )}

                    {/* The list of recipes to swap to. Allergy-safe ones first; the others only if asked for. */}
                    {changingKey === key ? (
                      <ThemedView type="backgroundElement" style={styles.picker}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {t('changeAsk')}
                        </ThemedText>
                        <ScrollView style={styles.pickList} contentContainerStyle={styles.pickListInner} nestedScrollEnabled>
                          {listed.length === 0 ? (
                            <ThemedText type="small" themeColor="textSecondary">
                              {t('changeNone')}
                            </ThemedText>
                          ) : null}
                          {listed.map((c) => (
                            <RecipePickCard
                              key={c.id}
                              recipe={c}
                              profile={profile}
                              prices={prices}
                              onPress={() => changeRecipe(day, index, c.id, keepServings)}
                            />
                          ))}
                        </ScrollView>
                        {warnedCount > 0 && !showWarned ? (
                          <Pressable style={Layout.smallButton} onPress={() => setShowWarned(true)}>
                            <ThemedText type="small">{t('changeShowWarned', { count: warnedCount })}</ThemedText>
                          </Pressable>
                        ) : null}
                        <Pressable style={Layout.smallButton} onPress={() => setChangingKey(null)}>
                          <ThemedText type="smallBold">{t('cancel')}</ThemedText>
                        </Pressable>
                      </ThemedView>
                    ) : null}
                    </ThemedView>
                  );
                })}

                {pickingDay === day ? (
                  <ThemedView type="backgroundElement" style={styles.picker}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('tapToAdd')}
                    </ThemedText>
                    {recipes.map((recipe) => (
                      <RecipePickCard
                        key={recipe.id}
                        recipe={recipe}
                        profile={profile}
                        prices={prices}
                        onPress={() => addRecipe(day, recipe.id)}
                      />
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
  confirm: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.one, backgroundColor: 'transparent' },
  dangerButton: { backgroundColor: '#D93025', borderColor: '#D93025' },
  dangerText: { color: '#FFFFFF' },
  openRecipe: { gap: Spacing.one, paddingTop: Spacing.one, backgroundColor: 'transparent' },
  picker: { gap: Spacing.two },
  meal: { gap: Spacing.two },
  thumbBox: { position: 'relative' },
  binOnPhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  binIcon: { fontSize: 13, lineHeight: 16 },
  buttonOn: { opacity: 0.6 },
  pickList: { maxHeight: 360 },
  pickListInner: { gap: Spacing.two },
});
