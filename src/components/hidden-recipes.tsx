import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { showRecipe, splitByHidden } from '@/data/hidden';
import { usePublicRecipes } from '@/hooks/use-public-recipes';
import { useUserData } from '@/hooks/use-user-data';
import { useLanguage } from '@/i18n/language';

// The recipes you marked "Not interested", with a button to bring each one back.
// It is used at the bottom of Discover and on the Profile tab, so it loads what it needs itself.
export function HiddenRecipes({ uid }: { uid: string }) {
  const { t } = useLanguage();
  const { recipes } = usePublicRecipes(true);
  const { hidden, saveHidden } = useUserData(uid);
  const [open, setOpen] = useState(false); // closed until you tap it

  // Only recipes that are still public can be listed (an id of a deleted recipe is just ignored).
  const { hiddenRecipes } = splitByHidden(recipes, hidden);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable onPress={() => setOpen((value) => !value)}>
        <ThemedText type="smallBold">
          {open ? '▾ ' : '▸ '}
          {t('hiddenTitle', { count: hiddenRecipes.length })}
        </ThemedText>
      </Pressable>

      {open ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {t('hiddenHelp')}
          </ThemedText>
          {hiddenRecipes.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('hiddenEmpty')}
            </ThemedText>
          ) : (
            hiddenRecipes.map((recipe) => (
              <ThemedView key={recipe.id} style={styles.row}>
                <ThemedText type="small" style={styles.name}>
                  {recipe.name}
                </ThemedText>
                <Pressable style={styles.smallButton} onPress={() => saveHidden(showRecipe(hidden, recipe.id))}>
                  <ThemedText type="smallBold">{t('showAgain')}</ThemedText>
                </Pressable>
              </ThemedView>
            ))
          )}
        </>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two, maxWidth: 520 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  name: { flex: 1 },
  smallButton: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
});
