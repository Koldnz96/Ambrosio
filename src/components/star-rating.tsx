import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { summarizeRatings, type Rating } from '@/data/ratings';
import { db } from '@/firebase';
import { useLanguage } from '@/i18n/language';

type Props = {
  recipeId: string;
  uid: string;
  canRate: boolean; // false on your own recipe
};

// Shows the average rating of a recipe and lets you give your own (one per person).
// Ratings live in recipes/{recipeId}/ratings/{your user id}, so rating again just replaces yours.
export function StarRating({ recipeId, uid, canRate }: Props) {
  const { t } = useLanguage();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    return onSnapshot(
      collection(db, 'recipes', recipeId, 'ratings'),
      (snapshot) => setRatings(snapshot.docs.map((d) => ({ uid: d.id, stars: d.data().stars }))),
      (err) => setError(err.message),
    );
  }, [recipeId]);

  const summary = summarizeRatings(ratings, uid);

  async function rate(stars: number) {
    setError('');
    try {
      await setDoc(doc(db, 'recipes', recipeId, 'ratings', uid), { stars, updatedAt: serverTimestamp() });
    } catch (err) {
      setError(t('errRate', { message: (err as Error).message }));
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.wrap}>
      <ThemedText type="small">
        {summary.average === null
          ? t('noRatings')
          : `★ ${
              summary.count === 1
                ? t('ratingsOne', { average: summary.average.toFixed(1) })
                : t('ratingsMany', { average: summary.average.toFixed(1), count: summary.count })
            }`}
      </ThemedText>

      {canRate ? (
        <ThemedView type="backgroundElement" style={styles.row}>
          <ThemedText type="small" themeColor="textSecondary">
            {summary.mine === null ? t('tapStar') : t('yourRating', { stars: summary.mine })}
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => rate(n)} hitSlop={4} accessibilityLabel={`${n}/5`}>
                <ThemedText style={styles.star}>{summary.mine !== null && n <= summary.mine ? '★' : '☆'}</ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        </ThemedView>
      ) : null}
      {error ? <ThemedText type="small">{error}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  stars: { flexDirection: 'row', gap: Spacing.one },
  star: { fontSize: 24, lineHeight: 28, color: '#E0A800' },
});
