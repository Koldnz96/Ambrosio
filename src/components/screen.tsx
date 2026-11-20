import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Footer } from '@/components/footer';
import { FirstQuestions, TourBanner } from '@/components/guest-tour';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useIsPhone } from '@/hooks/use-is-phone';

// The page every tab sits in: the same width, spacing and title on all of them.
// The contact footer shows on every page on a wide screen; on a phone only where showFooterOnPhone is set.
export function Screen({ title, children, showFooterOnPhone = false }: { title: string; children: ReactNode; showFooterOnPhone?: boolean }) {
  const isPhone = useIsPhone();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={[styles.safeArea, isPhone && styles.safeAreaPhone]}>
        <ScrollView
          contentContainerStyle={[styles.content, isPhone && styles.contentPhone]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText type="subtitle" style={isPhone ? styles.titlePhone : undefined}>
            {title}
          </ThemedText>
          {/* The guided tour card for new guests (only on the page its current step is about). */}
          <FirstQuestions />
          <TourBanner />
          {children}
          {(!isPhone || showFooterOnPhone) && <Footer />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // minWidth 0 matters: a flex item normally cannot get narrower than its widest content (for
  // example two inputs side by side), which made the whole page wider than a phone screen.
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center', minWidth: 0, maxWidth: '100%', overflow: 'hidden' },
  safeArea: {
    flex: 1,
    minWidth: 0,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? 96 : Spacing.five,
  },
  content: { gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.five, minWidth: 0 },
  // Phone: slimmer margins, room for the slim top bar and for the bottom tab bar.
  safeAreaPhone: { paddingHorizontal: Spacing.three, paddingTop: 72 },
  contentPhone: { paddingBottom: 110 },
  titlePhone: { fontSize: 26, lineHeight: 34 },
});
