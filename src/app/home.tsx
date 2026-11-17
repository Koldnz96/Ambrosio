import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Photo, PhotoPlaceholder } from '@/components/photo';
import { RecipeHeading } from '@/components/recipe-heading';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WelcomeCard } from '@/components/welcome-card';
import { Layout } from '@/constants/layout';
import { Accent, BorderColor } from '@/constants/theme';
import { useIsPhone } from '@/hooks/use-is-phone';
import { recipeSignature } from '@/data/repost';
import { newest } from '@/data/top-rated';
import { useAuthUser } from '@/hooks/use-auth-user';
import { usePublicRecipes, type PublicRecipe } from '@/hooks/use-public-recipes';
import { useTopRated } from '@/hooks/use-top-rated';
import { useLanguage } from '@/i18n/language';

// The front page: what the app is, how it works, and a few recipes to get you hungry.
export default function HomeScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const isPhone = useIsPhone();
  const { user, ready } = useAuthUser();
  const { recipes, loaded } = usePublicRecipes(ready);
  const { top, loading } = useTopRated(recipes, user !== null);

  const steps = [
    { icon: '✍️', title: t('homeStep1Title'), text: t('homeStep1Text') },
    { icon: '📅', title: t('homeStep2Title'), text: t('homeStep2Text') },
    { icon: '🛒', title: t('homeStep3Title'), text: t('homeStep3Text') },
    { icon: '🌍', title: t('homeStep4Title'), text: t('homeStep4Text') },
  ];

  // Signed-in people see the best rated recipes. Visitors (who cannot read ratings), or when
  // nothing is rated yet, see the newest recipes instead.
  const showTop = top.length > 0;
  const shown: { recipe: PublicRecipe; stars?: string }[] = showTop
    ? top.map((item) => ({
        recipe: item.recipe,
        stars: `★ ${
          item.count === 1
            ? t('ratingsOne', { average: (item.average as number).toFixed(1) })
            : t('ratingsMany', { average: (item.average as number).toFixed(1), count: item.count })
        }`,
      }))
    : newest(recipes, 3, recipeSignature).map((recipe) => ({ recipe }));
  const waiting = !ready || !loaded || (user !== null && loading);

  return (
    <Screen title={t('homeTitle')}>
      <ThemedView type="backgroundElement" style={[styles.hero, isPhone && styles.heroPhone]}>
        <ThemedView type="backgroundElement" style={styles.accentBar} />
        <ThemedText style={[styles.heroTitle, isPhone && styles.heroTitlePhone]}>{t('homeIntroTitle')}</ThemedText>
        <ThemedText style={[styles.heroLead, isPhone && styles.heroLeadPhone]}>{t('homeIntroLead')}</ThemedText>
        <ThemedView type="backgroundElement" style={styles.ctaRow}>
          <Pressable style={styles.ctaMain} onPress={() => router.push('/')}>
            <ThemedText style={styles.ctaMainText}>✍️ {t('homeCtaWrite')}</ThemedText>
          </Pressable>
          <Pressable style={styles.ctaSecond} onPress={() => router.push('/discover')}>
            <ThemedText type="smallBold">🌍 {t('homeCtaBrowse')}</ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>

      <ThemedView style={Layout.grid}>
        <ThemedView type="backgroundElement" style={Layout.card}>
          <ThemedText style={styles.icon}>🏠</ThemedText>
          <ThemedText type="smallBold">{t('homeRealTitle')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{t('homeRealText')}</ThemedText>
        </ThemedView>
        <ThemedView type="backgroundElement" style={Layout.card}>
          <ThemedText style={styles.icon}>😅</ThemedText>
          <ThemedText type="smallBold">{t('homeHonestTitle')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{t('homeHonestText')}</ThemedText>
        </ThemedView>
        <ThemedView type="backgroundElement" style={Layout.card}>
          <ThemedText style={styles.icon}>💰</ThemedText>
          <ThemedView type="backgroundElement" style={Layout.row}>
            <ThemedText type="smallBold">{t('homeMoneyTitle')}</ThemedText>
            <ThemedText type="small" style={styles.soon}>{t('homeSoon')}</ThemedText>
          </ThemedView>
          <ThemedText type="small" themeColor="textSecondary">{t('homeMoneyText')}</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedText type="smallBold">{t('homeHowTitle')}</ThemedText>
      <ThemedView style={Layout.grid}>
        {steps.map((step) => (
          <ThemedView key={step.title} type="backgroundElement" style={Layout.card}>
            <ThemedText style={{ fontSize: 32, lineHeight: 40 }}>{step.icon}</ThemedText>
            <ThemedText type="smallBold">{step.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {step.text}
            </ThemedText>
          </ThemedView>
        ))}
      </ThemedView>

      {ready && !user ? <WelcomeCard /> : null}

      <ThemedText type="smallBold">{showTop ? t('homeTopTitle') : t('homeNewTitle')}</ThemedText>
      {waiting ? <ThemedText type="small" themeColor="textSecondary">{t('homeLoading')}</ThemedText> : null}
      {user && !waiting && !showTop && recipes.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('homeTopEmpty')}
        </ThemedText>
      ) : null}
      <ThemedView style={Layout.grid}>
        {shown.map(({ recipe, stars }) => (
          <ThemedView key={recipe.id} type="backgroundElement" style={Layout.card}>
            {recipe.photo ? <Photo photo={recipe.photo} /> : <PhotoPlaceholder />}
            <RecipeHeading reserveTwoLines name={recipe.name} author={recipe.authorName || t('anonymousCook')} />
            {stars ? <ThemedText type="small">{stars}</ThemedText> : null}
          </ThemedView>
        ))}
      </ThemedView>

      {recipes.length > 0 ? (
        <Pressable style={Layout.button} onPress={() => router.push('/discover')}>
          <ThemedText type="smallBold">{t('homeSeeAll')}</ThemedText>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BorderColor,
    gap: 16,
  },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  ctaMain: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: Accent,
  },
  ctaMainText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  ctaSecond: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BorderColor,
  },
  heroPhone: { padding: 20, borderRadius: 20 },
  heroTitlePhone: { fontSize: 26, lineHeight: 34 },
  heroLeadPhone: { fontSize: 17, lineHeight: 26 },
  accentBar: { width: 56, height: 6, borderRadius: 3, backgroundColor: Accent },
  heroTitle: { fontSize: 36, lineHeight: 44, fontWeight: '800', maxWidth: 780 },
  heroLead: { fontSize: 19, lineHeight: 30, maxWidth: 780 },
  icon: { fontSize: 32, lineHeight: 40 },
  soon: {
    color: '#FFFFFF',
    backgroundColor: Accent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});
