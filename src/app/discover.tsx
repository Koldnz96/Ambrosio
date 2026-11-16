import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { Comments } from '@/components/comments';
import { HiddenRecipes } from '@/components/hidden-recipes';
import { NicknameForm } from '@/components/nickname-form';
import { Photo } from '@/components/photo';
import { RecipeHeading } from '@/components/recipe-heading';
import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { WelcomeCard } from '@/components/welcome-card';
import { ThemedView } from '@/components/themed-view';
import { WarningChips } from '@/components/warning-chips';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hideRecipe, splitByHidden } from '@/data/hidden';
import { normalize } from '@/data/products';
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
  const [openIds, setOpenIds] = useState<Set<string>>(new Set()); // cards opened to show their details
  const theme = useTheme();

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

  // No double listings, then the recipes you are not interested in, then the search filter
  // (name, cook, ingredients; accents and capitals ignored).
  const visible = useMemo(() => {
    const myId = user?.uid ?? '';
    const noDuplicates = hideDuplicateReposts(
      recipes,
      (recipe) => repostOf({ ...recipe, ...copyInfo(recipe) }) !== '',
      myId,
    );
    const single = splitByHidden(noDuplicates, hidden).visible;
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
  }, [recipes, search, user?.uid, ingredientLabel, hidden]);

  function toggleOpen(id: string) {
    setOpenIds((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">{t('discoverTitle')}</ThemedText>

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
                  <ThemedView style={styles.grid}>
                    {visible.slice(0, 12).map((recipe) => (
                      <ThemedView key={recipe.id} type="backgroundElement" style={styles.card}>
                        {recipe.photo ? <Photo photo={recipe.photo} /> : null}
                        <RecipeHeading
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
                <TextInput
                  style={[styles.search, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder={t('searchPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  value={search}
                  onChangeText={setSearch}
                />
              ) : null}
              {loaded && recipes.length === 0 ? (
                <ThemedText themeColor="textSecondary">{t('discoverEmpty')}</ThemedText>
              ) : null}
              {recipes.length > 0 && visible.length === 0 ? (
                <ThemedText themeColor="textSecondary">{t('noResults')}</ThemedText>
              ) : null}

              <ThemedView style={styles.grid}>
              {visible.map((recipe) => {
                const mine = recipe.ownerId === user.uid;
                const original = repostOf({ ...recipe, ...copyInfo(recipe) });
                const isOpen = openIds.has(recipe.id);
                return (
                  <ThemedView key={recipe.id} type="backgroundElement" style={styles.card}>
                    {recipe.photo ? <Photo photo={recipe.photo} /> : null}
                    <RecipeHeading
                      name={recipe.name}
                      author={recipe.authorName || t('anonymousCook')}
                      original={original || undefined}
                      note={mine ? t('yourRecipe') : undefined}
                    />
                    <StarRating recipeId={recipe.id} uid={user.uid} canRate={!mine} compact={!isOpen} />
                    <WarningChips warnings={recipeWarnings(recipe.ingredients, profile)} />

                    <ThemedView style={styles.buttonRow}>
                      <Pressable style={styles.smallButton} onPress={() => toggleOpen(recipe.id)}>
                        <ThemedText type="smallBold">{isOpen ? t('hideDetails') : t('showDetails')}</ThemedText>
                      </Pressable>
                      {mine ? null : copied.has(recipe.id) ? (
                        <ThemedText type="small">{t('copySaved')}</ThemedText>
                      ) : (
                        <Pressable style={styles.smallButton} onPress={() => saveCopy(recipe)}>
                          <ThemedText type="smallBold">{t('saveCopy')}</ThemedText>
                        </Pressable>
                      )}
                      {mine ? null : (
                        <Pressable style={styles.smallButton} onPress={() => saveHidden(hideRecipe(hidden, recipe.id))}>
                          <ThemedText type="smallBold">{t('notInterested')}</ThemedText>
                        </Pressable>
                      )}
                    </ThemedView>

                    {/* The ingredients and comments only appear (and only load) when the card is open. */}
                    {isOpen ? (
                      <>
                        {recipe.ingredients.map((ing, index) => (
                          <ThemedText key={index} type="small" themeColor="textSecondary">
                            {[ing.amount ?? '', ing.unit, ingredientLabel(ing)].filter((part) => part !== '').join(' ')}
                          </ThemedText>
                        ))}
                        <Comments recipeId={recipe.id} recipeOwnerId={recipe.ownerId} uid={user.uid} nickname={displayName} />
                      </>
                    ) : null}
                  </ThemedView>
                );
              })}
              </ThemedView>

              <HiddenRecipes uid={user.uid} />
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, alignItems: 'flex-start' },
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    maxWidth: 520,
  },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one, flexGrow: 1, flexBasis: 320, maxWidth: 520 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  smallButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: Spacing.one,
  },
});
