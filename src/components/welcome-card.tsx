import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/i18n/language';

// Shown to visitors who are not signed in: what the app is, and one clear button to join.
export function WelcomeCard() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle" style={styles.title}>
        {t('welcomeTitle')}
      </ThemedText>
      <ThemedText>{t('welcomePitch')}</ThemedText>
      <ThemedView type="backgroundElement" style={styles.list}>
        <ThemedText type="small">✓ {t('welcomeBenefitRecipes')}</ThemedText>
        <ThemedText type="small">✓ {t('welcomeBenefitWarnings')}</ThemedText>
        <ThemedText type="small">✓ {t('welcomeBenefitShopping')}</ThemedText>
      </ThemedView>
      <Pressable style={styles.button} onPress={() => router.push('/profile')}>
        <ThemedText type="smallBold">{t('welcomeButton')}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Spacing.three, gap: Spacing.three, maxWidth: 520 },
  title: { fontSize: 28, lineHeight: 34 },
  list: { gap: Spacing.one },
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
});
