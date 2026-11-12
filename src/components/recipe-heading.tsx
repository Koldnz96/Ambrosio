import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLanguage } from '@/i18n/language';

// The colour used for nicknames, so the cook stands out on every card.
export const NICKNAME_COLOR = '#E8590C';

type Props = {
  name: string; // the recipe name: the biggest thing on the card
  author?: string; // the cook's nickname (left out on private recipes)
  note?: string; // small extra text after the nickname, for example "Your recipe"
};

// The top of a recipe card: big recipe name, then "by NICKNAME" with the nickname in colour.
// (Later, the cook's photo of the dish can go right above this.)
export function RecipeHeading({ name, author, note }: Props) {
  const { t } = useLanguage();
  // "by {name}" is split around the name so only the nickname gets the colour.
  const [before, after] = t('byAuthor', { name: '\u0000' }).split('\u0000');
  return (
    <ThemedView type="backgroundElement" style={styles.wrap}>
      <ThemedText style={styles.name}>{name}</ThemedText>
      {author ? (
        <ThemedText type="small" themeColor="textSecondary">
          {before}
          <ThemedText type="smallBold" style={styles.nickname}>
            {author}
          </ThemedText>
          {after}
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
