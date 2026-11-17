// A quick welcome slide, shown once per browser: the app name big, one sentence, one button.
// It is remembered in localStorage, so people who already saw it go straight to the app.
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Accent, Colors } from '@/constants/theme';
import { useLanguage } from '@/i18n/language';

const STORAGE_KEY = 'ambrosio-intro-seen';

function alreadySeen(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function IntroSlide() {
  const { t } = useLanguage();
  const router = useRouter();
  const small = useWindowDimensions().width < 480;
  const [visible, setVisible] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  // Decide in the browser (not while the page is being built) whether to show it.
  useEffect(() => {
    if (Platform.OS !== 'web' || alreadySeen()) return;
    setVisible(true);
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [fade]);

  function close() {
    // Everyone lands on the Home page first, so they read what the app is about.
    router.replace('/home');
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, '1');
    } catch {
      // storage can be blocked: the slide will just show again next time
    }
    Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() =>
      setVisible(false),
    );
  }

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fade }]}>
      <View style={styles.content}>
        <ThemedText style={[styles.name, small && styles.nameSmall]}>Ambrósio</ThemedText>
        <View style={styles.line} />
        <ThemedText style={[styles.tagline, small && styles.taglineSmall]}>{t('introTagline')}</ThemedText>
        <Pressable style={styles.button} onPress={close} accessibilityRole="button">
          <ThemedText style={styles.buttonText}>{t('introButton')}</ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    // "fixed" keeps it covering the whole window, even when the page is scrolled.
    position: 'fixed' as unknown as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: { alignItems: 'center', gap: 24, maxWidth: 640 },
  name: {
    fontSize: 80,
    lineHeight: 92,
    fontWeight: '800',
    color: Accent,
    textAlign: 'center',
  },
  nameSmall: { fontSize: 52, lineHeight: 62 },
  taglineSmall: { fontSize: 19, lineHeight: 28 },
  line: { width: 72, height: 4, borderRadius: 2, backgroundColor: Accent, opacity: 0.6 },
  tagline: {
    fontSize: 24,
    lineHeight: 34,
    textAlign: 'center',
    color: Colors.light.text,
  },
  button: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    backgroundColor: Accent,
  },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
