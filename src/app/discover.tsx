import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { Comments } from '@/components/comments';
import { NicknameForm } from '@/components/nickname-form';
import { Photo, PhotoPlaceholder } from '@/components/photo';
import { RecipeSteps } from '@/components/recipe-steps';
import { RecipeHeading } from '@/components/recipe-heading';
import { StarRating } from '@/components/star-rating';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { WelcomeCard } from '@/components/welcome-card';
import { ThemedView } from '@/components/themed-view';
import { WarningChips } from '@/components/warning-chips';

import { Accent, BorderColor } from '@/constants/theme';
import { useIsPhone } from '@/hooks/use-is-phone';
import { useTheme } from '@/hooks/use-theme';
import { Layout } from '@/constants/layout';
import { hideRecipe, showRecipe, splitByHidden } from '@/data/hidden';
import { getProduct, normalize } from '@/data/products';
import { diffRecipes, hasChanges, type RecipeDiff } from '@/data/recipe-diff';
import { recipeCategories, type RecipeCategory } from '@/data/recipe-category';
import { hideDuplicateReposts, recipeSignature, repostOf, type CopyInfo } from '@/data/repost';
import { recipeWarnings } from '@/data/warnings';
import { db } from '@/firebase';
import { useAuthUser } from '@/hooks/use-auth-user';
import { usePublicRecipes, type PublicRecipe } from '@/hooks/use-public-recipes';
import { useUserData } from '@/hooks/use-user-data';
import { useLanguage } from '@/i18n/language';

export default function DiscoverScreen() {
  const { t, ingredient: ingredientLabel } = useLanguage();
  const { user, ready } = useAuthUser();
  const { recipes, loaded, error: loadError } = usePublicRecipes(ready);
  const { profile, displayName, needsNickname, hidden, saveHidden, saveDisplayName } = useUserData(user?.uid ?? null);
  const [copied, setCopied] = useState<Set<string>>(new Set()); // recipes copied in this visit
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<RecipeCategory | 'all'>('all');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set()); // cards opened to show their details
  const [showHidden, setShowHidden] = useState(false); // the "Not interested" list, next to the search box
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set()); // cards showing "the original"
  const theme = useTheme();
  const isPhone = useIsPhone();

  // Who wrote the original, and what it looked like. Copies made before this was saved
  // on the recipe are worked out from the original, when it is still public.
  function copyInfo(recipe: PublicRecipe): CopyInfo {
    if (recipe.originalAuthor && recipe.originalSignature) return recipe;
    const source = recipe.copiedFrom ? recipes.find((r) => r.id === recipe.copiedFrom) : undefined;
    if (!source) return { copiedFrom: recipe.copiedFrom, originalAuthor: '', originalSignature: '' };
    const sourceInfo = copyInfo(source);
    return {
      copiedFrom: recipe.copiedFrom,
      originalAuthor: repostOf({ ...source, ...sourceInfo }) || source.authorName,
      originalSignature: recipeSignature(source),
    };
  }

  // The recipes you marked "Not interested" (still public), for the list next to the search box.
  const hiddenRecipes = splitByHidden(recipes, hidden).hiddenRecipes;

  // No double listings, then the recipes you are not interested in, then the search filter
  // (name, cook, ingredients; accents and capitals ignored).
  const visible = useMemo(() => {
    const myId = user?.uid ?? '';
    const noDuplicates = hideDuplicateReposts(
      recipes,
      (recipe) => repostOf({ ...recipe, ...copyInfo(recipe) }) !== '',
      myId,
    );
    const notHidden = splitByHidden(noDuplicates, hidden).visible;
    const single =
      category === 'all'
        ? notHidden
        : notHidden.filter((recipe) => recipeCategories(recipe.ingredients, getProduct).has(category));
    const words = normalize(search).split(/\s+/).filter(Boolean);
    if (words.length === 0) return single;
    return single.filter((recipe) => {
      const text = normalize(
        [
          recipe.name,
          recipe.authorName,
          repostOf({ ...recipe, ...copyInfo(recipe) }),
          ...recipe.ingredients.map((ing) => `${ing.name} ${ingredientLabel(ing)}`),
        ].join(' '),
      );
      return words.every((word) => text.includes(word));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes, search, category, user?.uid, ingredientLabel, hidden]);

  function toggleOpen(id: string) {
    setOpenIds((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleOriginal(id: string) {
    setOriginalIds((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // For a copy: who wrote the original, the original itself (when it is still public, so we
  // can show it), and what is different. Each version is compared with ITS original only.
  function versionInfo(recipe: PublicRecipe) {
    const info = copyInfo(recipe);
    if (!info.originalAuthor) return null;
    const parent = recipe.copiedFrom ? recipes.find((r) => r.id === recipe.copiedFrom) : undefined;
    const isRepost = repostOf({ ...recipe, ...info }) !== '';
    return { author: info.originalAuthor, parent, isRepost, diff: parent ? diffRecipes(parent, recipe) : null };
  }

  // One short line, for example "Ingredients: +6 −1 ~2 · steps added".
  function summaryLine(diff: RecipeDiff): string {
    const parts: string[] = [];
    const ing = [
      diff.added.length ? `+${diff.added.length}` : '',
      diff.removed.length ? `−${diff.removed.length}` : '',
      diff.amounts.length ? `~${diff.amounts.length}` : '',
    ].filter(Boolean);
    if (ing.length) parts.push(`${t('diffIngredients')}: ${ing.join(' ')}`);
    if (diff.steps === 'changed') parts.push(t('diffSteps'));
    if (diff.steps === 'added') parts.push(t('diffStepsAdded'));
    if (diff.steps === 'removed') parts.push(t('diffStepsRemoved'));
    if (diff.renamed) parts.push(t('diffRenamed'));
    return parts.join(' · ');
  }

  function ingredientLine(ing: PublicRecipe['ingredients'][number]): string {
    return [ing.amount ?? '', ing.unit, ingredientLabel(ing)].filter((part) => part !== '').join(' ');
  }

  // A copy is a new private recipe of your own. Changing it never changes the original.
  // It remembers the original cook: copying a repost still credits the first cook.
  async function saveCopy(recipe: PublicRecipe) {
    if (!user) return;
    setError('');
    try {
      await addDoc(collection(db, 'recipes'), {
        ownerId: user.uid,
        name: recipe.name,
        visibility: 'private',
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        photo: recipe.photo,
        copiedFrom: recipe.id,
        originalAuthor: repostOf({ ...recipe, ...copyInfo(recipe) }) || recipe.authorName,
        originalSignature: recipeSignature(recipe),
        createdAt: serverTimestamp(),
      });
      setCopied((old) => new Set(old).add(recipe.id));
    } catch (err) {
      setError(t('errCopy', { message: (err as Error).message }));
    }
  }

  return (
    <Screen title={t('discoverTitle')}>
      {!ready ? (
        <ThemedText themeColor="textSecondary">{t('checkingSignIn')}</ThemedText>
      ) : !user ? (
        <>
          <ThemedText themeColor="textSecondary">{t('discoverSignIn')}</ThemedText>
          <WelcomeCard />
          {/* A read-only preview for visitors: no stars, comments or buttons. */}
          {visible.length > 0 ? (
            <>
              <ThemedText type="smallBold">{t('previewTitle')}</ThemedText>
              <ThemedView style={Layout.grid}>
                {visible.slice(0, 12).map((recipe) => (
                  <ThemedView key={recipe.id} type="backgroundElement" style={Layout.card}>
                    {recipe.photo ? <Photo photo={recipe.photo} /> : <PhotoPlaceholder />}
                    <RecipeHeading
                      reserveTwoLines
                      name={recipe.name}
                      author={recipe.authorName || t('anonymousCook')}
                      original={repostOf({ ...recipe, ...copyInfo(recipe) }) || undefined}
                    />
                  </ThemedView>
                ))}
              </ThemedView>
            </>
          ) : null}
        </>
      ) : needsNickname ? (
        <NicknameForm onSave={saveDisplayName} />
      ) : (
        <>
          <ThemedText themeColor="textSecondary">{t('discoverHelp')}</ThemedText>
          {loadError ? <ThemedText type="small">{t('errLoadPublic', { message: loadError })}</ThemedText> : null}
          {error ? <ThemedText type="small">{error}</ThemedText> : null}
          {recipes.length > 0 ? (
            <ThemedView style={styles.searchRow}>
              <TextInput
                style={[styles.search, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showHidden }}
                style={[styles.chip, showHidden && styles.chipSelected]}
                onPress={() => setShowHidden((value) => !value)}>
                <ThemedText type="smallBold" style={showHidden ? styles.chipTextSelected : undefined}>
                  {t('hiddenTitle', { count: hiddenRecipes.length })}
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}
          {showHidden ? (
            <ThemedView type="backgroundElement" style={[Layout.card, styles.hiddenBox]}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('hiddenHelp')}
              </ThemedText>
              {hiddenRecipes.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('hiddenEmpty')}
                </ThemedText>
              ) : (
                hiddenRecipes.map((recipe) => (
                  <ThemedView key={recipe.id} style={Layout.row}>
                    <ThemedText type="small" style={styles.hiddenName}>
                      {recipe.name}
                    </ThemedText>
                    <Pressable style={Layout.smallButton} onPress={() => saveHidden(showRecipe(hidden, recipe.id))}>
                      <ThemedText type="smallBold">{t('showAgain')}</ThemedText>
                    </Pressable>
                  </ThemedView>
                ))
              )}
            </ThemedView>
          ) : null}
          {recipes.length > 0 ? (
            isPhone ? (
              // On a phone the chips sit in one line that scrolls sideways (they would take 4 rows).
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
              {(
                [
                  ['all', 'catAll'],
                  ['chicken', 'catChicken'],
                  ['beef', 'catBeef'],
                  ['pork', 'catPork'],
                  ['lamb', 'catLamb'],
                  ['fish', 'catFish'],
                  ['shellfish', 'catShellfish'],
                  ['vegetarian', 'catVegetarian'],
                  ['vegan', 'catVegan'],
                ] as const
              ).map(([key, label]) => {
                const selected = category === key;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setCategory(key)}>
                    <ThemedText type="smallBold" style={selected ? styles.chipTextSelected : undefined}>
                      {t(label)}
                    </ThemedText>
                  </Pressable>
                );
              })}
              </ScrollView>
            ) : (
              <ThemedView style={Layout.row}>
              {(
                [
                  ['all', 'catAll'],
                  ['chicken', 'catChicken'],
                  ['beef', 'catBeef'],
                  ['pork', 'catPork'],
                  ['lamb', 'catLamb'],
                  ['fish', 'catFish'],
                  ['shellfish', 'catShellfish'],
                  ['vegetarian', 'catVegetarian'],
                  ['vegan', 'catVegan'],
                ] as const
              ).map(([key, label]) => {
                const selected = category === key;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setCategory(key)}>
                    <ThemedText type="smallBold" style={selected ? styles.chipTextSelected : undefined}>
                      {t(label)}
                    </ThemedText>
                  </Pressable>
                );
              })}
              </ThemedView>
            )
          ) : null}
          {loaded && recipes.length === 0 ? (
            <ThemedText themeColor="textSecondary">{t('discoverEmpty')}</ThemedText>
          ) : null}
          {recipes.length > 0 && visible.length === 0 ? (
            <ThemedText themeColor="textSecondary">{t('noResults')}</ThemedText>
          ) : null}

          <ThemedView style={Layout.grid}>
          {visible.map((recipe) => {
            const mine = recipe.ownerId === user.uid;
            const original = repostOf({ ...recipe, ...copyInfo(recipe) });
            const isOpen = openIds.has(recipe.id);
            const version = versionInfo(recipe);
            const showOriginal = originalIds.has(recipe.id) && version?.parent;
            const count = recipe.ingredients.length;
            return (
              <ThemedView key={recipe.id} type="backgroundElement" style={Layout.card}>
                {recipe.photo ? <Photo photo={recipe.photo} /> : <PhotoPlaceholder />}
                <RecipeHeading
                  reserveTwoLines
                  name={recipe.name}
                  author={recipe.authorName || t('anonymousCook')}
                  original={original || undefined}
                  note={mine ? t('yourRecipe') : undefined}
                />
                {version && !version.isRepost ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('versionLine', { original: version.author })}
                  </ThemedText>
                ) : null}
                {version?.diff && !version.isRepost && hasChanges(version.diff) ? (
                  <ThemedText type="smallBold">{summaryLine(version.diff)}</ThemedText>
                ) : null}
                <ThemedText type="small" themeColor="textSecondary">
                  {t(count === 1 ? 'ingredientsCountOne' : 'ingredientsCountMany', { count })}
                </ThemedText>
                <StarRating recipeId={recipe.id} uid={user.uid} canRate={!mine} compact={!isOpen} />
                <WarningChips warnings={recipeWarnings(recipe.ingredients, profile)} />

                <ThemedView style={Layout.row}>
                  <Pressable style={Layout.smallButton} onPress={() => toggleOpen(recipe.id)}>
                    <ThemedText type="smallBold">{isOpen ? t('hideDetails') : t('showDetails')}</ThemedText>
                  </Pressable>
                  {version?.parent ? (
                    <Pressable style={Layout.smallButton} onPress={() => toggleOriginal(recipe.id)}>
                      <ThemedText type="smallBold">
                        {originalIds.has(recipe.id) ? t('hideOriginal') : t('seeOriginal')}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                  {mine ? null : copied.has(recipe.id) ? (
                    <ThemedText type="small">{t('copySaved')}</ThemedText>
                  ) : (
                    <Pressable style={Layout.smallButton} onPress={() => saveCopy(recipe)}>
                      <ThemedText type="smallBold">{t('saveCopy')}</ThemedText>
                    </Pressable>
                  )}
                  {mine ? null : (
                    <Pressable style={Layout.smallButton} onPress={() => saveHidden(hideRecipe(hidden, recipe.id))}>
                      <ThemedText type="smallBold">{t('notInterested')}</ThemedText>
                    </Pressable>
                  )}
                </ThemedView>

                {showOriginal && version?.parent && version.diff ? (
                  <ThemedView type="backgroundSelected" style={styles.originalBox}>
                    <ThemedText type="smallBold">
                      {t('originalIs', {
                        name: version.parent.name,
                        author: version.parent.authorName || t('anonymousCook'),
                      })}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t(
                        version.parent.ingredients.length === 1 ? 'ingredientsCountOne' : 'ingredientsCountMany',
                        { count: version.parent.ingredients.length },
                      )}
                    </ThemedText>
                    <ThemedText type="smallBold">{t('changesTitle')}</ThemedText>
                    {hasChanges(version.diff) ? (
                      <>
                        {version.diff.added.map((ing, i) => (
                          <ThemedText key={`a${i}`} type="small">+ {ingredientLine(ing)}</ThemedText>
                        ))}
                        {version.diff.removed.map((ing, i) => (
                          <ThemedText key={`r${i}`} type="small">− {ingredientLine(ing)}</ThemedText>
                        ))}
                        {version.diff.amounts.map((c, i) => (
                          <ThemedText key={`c${i}`} type="small">
                            ~ {ingredientLabel(c.after)}: {ingredientLine({ ...c.before, name: '', productId: null })} →{' '}
                            {ingredientLine({ ...c.after, name: '', productId: null })}
                          </ThemedText>
                        ))}
                        {version.diff.steps !== 'same' || version.diff.renamed ? (
                          <ThemedText type="small">{summaryLine({ ...version.diff, added: [], removed: [], amounts: [] })}</ThemedText>
                        ) : null}
                        <ThemedText type="small" themeColor="textSecondary">{t('diffLegend')}</ThemedText>
                      </>
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary">{t('diffNothing')}</ThemedText>
                    )}
                  </ThemedView>
                ) : null}

                {/* The ingredients and comments only appear (and only load) when the card is open. */}
                {isOpen ? (
                  <>
                    {recipe.ingredients.map((ing, index) => (
                      <ThemedText key={index} type="small" themeColor="textSecondary">
                        {[ing.amount ?? '', ing.unit, ingredientLabel(ing)].filter((part) => part !== '').join(' ')}
                      </ThemedText>
                    ))}
                    <RecipeSteps steps={recipe.steps} />
                    <Comments recipeId={recipe.id} recipeOwnerId={recipe.ownerId} uid={user.uid} nickname={displayName} />
                  </>
                ) : null}
              </ThemedView>
            );
          })}
          </ThemedView>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  hiddenBox: { maxWidth: 520 },
  hiddenName: { flex: 1 },
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    maxWidth: 520,
    flexGrow: 1,
    flexBasis: 260,
  },
  chipScroll: { gap: 8, paddingRight: 16 },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BorderColor,
  },
  chipSelected: { backgroundColor: Accent, borderColor: Accent },
  chipTextSelected: { color: '#FFFFFF' },
  originalBox: { padding: 12, borderRadius: 12, gap: 4 },
});
