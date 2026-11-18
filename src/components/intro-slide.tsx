// The welcome scene, shown once per browser. It plays the famous Portuguese line that gave the app its
// name, as a little chat: you type "Ambrósio, apetecia-me algo…", Ambrósio is typing (three dots), he
// answers, and then the app appears: logo, name, one sentence, one button.
// "Saltar" (skip) in the corner works at any moment. It is remembered in localStorage, so people who
// already saw it go straight to the app.
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Accent, Colors } from '@/constants/theme';
import { useLanguage } from '@/i18n/language';

const STORAGE_KEY = 'ambrosio-intro-seen';
const LOGO = require('@/assets/images/ambrosio-logo.png');
const TYPE_MS = 45; // time per letter when "you" type

// The cream curtain from public/index.html (it hides the app until this scene is on screen).
function removeCurtain() {
  if (typeof document !== 'undefined') document.documentElement.classList.remove('intro-first');
}

function alreadySeen(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

// Three dots going up and down, like a chat app when the other person is writing.
function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const loops = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(300 - i * 150),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={styles.dots}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }]}
        />
      ))}
    </View>
  );
}

type Step = 'typing' | 'thinking' | 'answer' | 'reveal';

export function IntroSlide() {
  const { t } = useLanguage();
  const router = useRouter();
  const small = useWindowDimensions().width < 480;
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>('typing');
  const [typed, setTyped] = useState(0); // letters of the question shown so far
  // Starts fully visible: it must cover the app at once (no fade-in), so the app never shows first.
  const fade = useRef(new Animated.Value(1)).current;
  const answerIn = useRef(new Animated.Value(0)).current;
  const revealIn = useRef(new Animated.Value(0)).current;
  const ask = t('introAsk');

  // Decide in the browser (not while the page is being built) whether to show it.
  useEffect(() => {
    if (Platform.OS !== 'web' || alreadySeen()) {
      removeCurtain();
      return;
    }
    setVisible(true);
  }, []);

  // Once the scene is on screen it covers the app by itself, so the cream curtain can go.
  // (The curtain sits ABOVE the whole app, this scene included, so it must go before the chat plays.)
  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => removeCurtain());
    return () => cancelAnimationFrame(id);
  }, [visible]);

  // The scene, step by step.
  useEffect(() => {
    if (!visible) return;
    if (step === 'typing') {
      if (typed < ask.length) {
        const id = setTimeout(() => setTyped((n) => n + 1), typed === 0 ? 500 : TYPE_MS);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setStep('thinking'), 400);
      return () => clearTimeout(id);
    }
    if (step === 'thinking') {
      const id = setTimeout(() => setStep('answer'), 1300);
      return () => clearTimeout(id);
    }
    if (step === 'answer') {
      Animated.spring(answerIn, { toValue: 1, friction: 6, useNativeDriver: true }).start();
      const id = setTimeout(() => setStep('reveal'), 1400);
      return () => clearTimeout(id);
    }
    if (step === 'reveal') {
      Animated.timing(revealIn, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visible, step, typed, ask.length, answerIn, revealIn]);

  function close() {
    removeCurtain();
    // Everyone lands on the Home page first, so they read what the app is about.
    router.replace('/');
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, '1');
    } catch {
      // storage can be blocked: the scene will just show again next time
    }
    Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => setVisible(false));
  }

  if (!visible) return null;

  const rise = (value: Animated.Value, from: number) => ({
    opacity: value,
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: fade }]}>
      {/* Skip: always there, small, in the corner. */}
      <Pressable style={styles.skip} onPress={close} accessibilityRole="button">
        <ThemedText style={styles.skipText}>{t('introSkip')} ›</ThemedText>
      </Pressable>

      <View style={[styles.chat, small && styles.chatSmall]}>
        {/* You */}
        <View style={[styles.bubble, styles.mine]}>
          <ThemedText style={[styles.mineText, small && styles.textSmall]}>
            {ask.slice(0, typed)}
            {step === 'typing' ? <ThemedText style={styles.cursor}>|</ThemedText> : null}
          </ThemedText>
        </View>

        {/* Ambrósio: first typing, then his answer */}
        {step !== 'typing' ? (
          <View style={styles.theirsRow}>
            <Image source={LOGO} style={styles.avatar} />
            {step === 'thinking' ? (
              <View style={[styles.bubble, styles.theirs]}>
                <TypingDots />
              </View>
            ) : (
              <Animated.View style={[styles.bubble, styles.theirs, rise(answerIn, 12)]}>
                <ThemedText style={[styles.theirsText, small && styles.textSmall]}>{t('introAnswer')}</ThemedText>
              </Animated.View>
            )}
          </View>
        ) : null}
      </View>

      {/* And here it is: the app */}
      {step === 'reveal' ? (
        <Animated.View style={[styles.reveal, rise(revealIn, 30)]}>
          <Image source={LOGO} style={[styles.bigLogo, small && styles.bigLogoSmall]} />
          <ThemedText style={[styles.name, small && styles.nameSmall]}>Ambrósio</ThemedText>
          <ThemedText style={[styles.tagline, small && styles.taglineSmall]}>{t('introTagline')}</ThemedText>
          <Pressable style={styles.button} onPress={close} accessibilityRole="button">
            <ThemedText style={styles.buttonText}>{t('introButton')}</ThemedText>
          </Pressable>
        </Animated.View>
      ) : null}
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
    gap: 28,
  },
  skip: { position: 'absolute', top: 18, right: 18, paddingVertical: 8, paddingHorizontal: 12 },
  skipText: { color: Colors.light.textSecondary, fontSize: 15 },
  chat: { width: '100%', maxWidth: 520, gap: 14 },
  chatSmall: { gap: 10 },
  bubble: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, maxWidth: '85%' },
  mine: { alignSelf: 'flex-end', backgroundColor: Colors.light.backgroundElement, borderBottomRightRadius: 6 },
  mineText: { fontSize: 22, lineHeight: 30, fontStyle: 'italic', color: Colors.light.text },
  cursor: { color: Accent, fontWeight: '700' },
  theirsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  theirs: { backgroundColor: Accent, borderBottomLeftRadius: 6 },
  theirsText: { fontSize: 22, lineHeight: 30, fontWeight: '700', color: '#FFFFFF' },
  textSmall: { fontSize: 18, lineHeight: 25 },
  dots: { flexDirection: 'row', gap: 6, paddingVertical: 8, paddingHorizontal: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFFFFF', opacity: 0.9 },
  reveal: { alignItems: 'center', gap: 14, maxWidth: 640 },
  bigLogo: { width: 96, height: 96, borderRadius: 24 },
  bigLogoSmall: { width: 72, height: 72, borderRadius: 18 },
  name: { fontSize: 64, lineHeight: 74, fontWeight: '800', color: Accent, textAlign: 'center' },
  nameSmall: { fontSize: 44, lineHeight: 52 },
  tagline: { fontSize: 22, lineHeight: 31, textAlign: 'center', color: Colors.light.text },
  taglineSmall: { fontSize: 18, lineHeight: 26 },
  button: { marginTop: 8, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, backgroundColor: Accent },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
