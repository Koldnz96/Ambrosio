import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLanguage } from '@/i18n/language';

// The colour used for nicknames, so the cook stands out on every card.
export const NICKNAME_COLOR = '#E8590C';

type Props = {
  name: string; // the recipe name: the biggest thing on the card
  author?: string; // nickname of the person who shared it (left out on private recipes)
  original?: string; // set when it is an unchanged copy: nickname of the original cook
  note?: string; // small extra text after the line, for example "Your recipe"
};

// The top of a recipe card: big recipe name, then who made it, with nicknames in colour:
//   "by NICKNAME"   or   "NICKNAME reposted a recipe by ORIGINAL"
// (Later, the cook's photo of the dish can go right above this.)
export function RecipeHeading({ name, author, original, note }: Props) {
  const { t } = useLanguage();
  // The sentence is split around the two names, so only the nicknames get the colour.
  const A = '\u0000';
  const B = '\u0001';
  const sentence = original ? t('repostLine', { name: A, original: B }) : t('byAuthor', { name: A });
  const parts = sentence.split(/(\u0000|\u0001)/);
  return (
    <ThemedView type="backgroundElement" style={styles.wrap}>
      <ThemedText style={styles.name}>{name}</ThemedText>
      {author ? (
        <ThemedText type="small" themeColor="textSecondary">
          {parts.map((part, index) =>
            part === A || part === B ? (
              <ThemedText key={index} type="smallBold" style={styles.nickname}>
                {part === A ? author : original}
              </ThemedText>
            ) : (
              part
            ),
          )}
          {note ? ` · ${note}` : ''}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  name: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  nickname: { color: NICKNAME_COLOR, fontSize: 15 },
});
