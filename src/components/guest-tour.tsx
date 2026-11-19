// For new guests: a ready-made week (7 dinners by Ambrosio, for 2 people) and a short guided tour:
// Week -> open a meal -> Shopping list -> prices -> "create a free account for more".
//
// Two parts:
// - <GuestTour /> (in _layout): no picture of its own. It gives the ready-made week, decides when the tour
//   runs and which step it is on, and opens the right tab.
// - <TourBanner /> (in every page, under the title): the Ambrósio card itself. It is PART of the page
//   (it does not cover anything), so it is clear you can still use the page while following it.
// Shown once per browser (localStorage "ambrosio-tour"); it can be replayed from the Profile tab.
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Accent } from '@/constants/theme';
import { getProduct } from '@/data/products';
import { pickVariedWeek } from '@/data/preset-week';
import { recipeCategories } from '@/data/recipe-category';
import { makeEntry } from '@/data/week-entry';
import { useAuthUser } from '@/hooks/use-auth-user';
import { usePublicRecipes } from '@/hooks/use-public-recipes';
import { DAYS, useUserData, type Week } from '@/hooks/use-user-data';
import { useLanguage } from '@/i18n/language';

const LOGO = require('@/assets/images/ambrosio-logo.png');
const TOUR_KEY = 'ambrosio-tour'; // a step number while it runs, "done" when finished
const PRESET_KEY = 'ambrosio-preset-week'; // "1" once the ready-made week was given
const INTRO_KEY = 'ambrosio-intro-seen';
const TOUR_EVENT = 'ambrosio-tour'; // "show the tour again" (from Profile)

const STEPS = [
  { route: '/week', text: 'tourWeek' },
  { route: '/week', text: 'tourMeal' },
  { route: '/shopping', text: 'tourShopping' },
  { route: '/shopping', text: 'tourPrices' },
  { route: '/shopping', text: 'tourAccount' },
] as const;

function read(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // storage blocked: the tour may show again, that is all
  }
}

// --- A tiny shared "store": the current step and the buttons' actions --------------------------
type TourState = { step: number | null; isGuest: boolean; go: (n: number) => void; finish: (toProfile?: boolean) => void };
let state: TourState = { step: null, isGuest: false, go: () => {}, finish: () => {} };
const listeners = new Set<() => void>();
function setState(next: Partial<TourState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
function useTourState(): TourState {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

// True while the tour is running (screens can show shorter versions of things meanwhile).
export function useTourActive(): boolean {
  return useTourState().step !== null;
}

// Profile calls this to show the tour again.
export function replayTour() {
  write(TOUR_KEY, '0');
  globalThis.dispatchEvent?.(new Event(TOUR_EVENT));
}

// --- The logic (no picture) ------------------------------------------------------------------
export function GuestTour() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthUser();
  const { isGuest, week, loaded, saveWeek } = useUserData(user?.uid ?? null);
  const weekEmpty = DAYS.every((d) => week[d].length === 0);
  const [introSeen, setIntroSeen] = useState(read(INTRO_KEY) === '1');
  const [replay, setReplay] = useState(0);

  // 1. The ready-made week: only for a guest, only once, only if their week is still empty.
  const needPreset = isGuest && loaded && weekEmpty && read(PRESET_KEY) !== '1';
  const { recipes } = usePublicRecipes(needPreset);
  const starters = useMemo(
    // Only dinners (no desserts, cakes or breakfasts in the ready-made week).
    () => recipes.filter((r) => r.authorName.trim().toLowerCase() === 'ambrosio' && !r.copiedFrom && r.course === 'dinner'),
    [recipes],
  );
  useEffect(() => {
    if (!needPreset || starters.length === 0) return;
    const ids = pickVariedWeek(
      starters.map((r) => ({ id: r.id, name: r.name, kinds: [...recipeCategories(r.ingredients, getProduct)] })),
    );
    const next: Week = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
    ids.forEach((id, i) => next[DAYS[i]].push(makeEntry(id, 2)));
    write(PRESET_KEY, '1');
    saveWeek(next);
  }, [needPreset, starters, saveWeek]);

  // 2. When the welcome scene closes: go straight to where the visitor should be (no flash of Home).
  const guestRef = useRef(isGuest);
  guestRef.current = isGuest;
  useEffect(() => {
    const onIntroDone = () => {
      setIntroSeen(true);
      const tourPending = read(TOUR_KEY) !== 'done';
      router.replace(guestRef.current && tourPending ? STEPS[0].route : '/');
    };
    globalThis.addEventListener?.('ambrosio-intro-done', onIntroDone);
    return () => globalThis.removeEventListener?.('ambrosio-intro-done', onIntroDone);
  }, [router]);

  // Backup: also notice the end of the welcome scene by its saved mark.
  useEffect(() => {
    if (introSeen) return;
    const id = setInterval(() => {
      if (read(INTRO_KEY) === '1') setIntroSeen(true);
    }, 800);
    return () => clearInterval(id);
  }, [introSeen]);

  // "Show the tour again" from Profile.
  useEffect(() => {
    const onReplay = () => setReplay((n) => n + 1);
    globalThis.addEventListener?.(TOUR_EVENT, onReplay);
    return () => globalThis.removeEventListener?.(TOUR_EVENT, onReplay);
  }, []);

  // The buttons' actions (they need the router, so they live here).
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  useEffect(() => {
    const go = (n: number) => {
      if (n >= STEPS.length) return finish();
      write(TOUR_KEY, String(n));
      setState({ step: n });
      if (pathRef.current !== STEPS[n].route) router.push(STEPS[n].route);
    };
    const finish = (toProfile = false) => {
      write(TOUR_KEY, 'done');
      setState({ step: null });
      if (toProfile) router.push('/profile');
    };
    setState({ go, finish, isGuest });
  }, [router, isGuest]);

  // 3. Start (or continue) the tour: a guest with a planned week who has not finished it.
  useEffect(() => {
    const saved = read(TOUR_KEY);
    if (saved === 'done' || !introSeen || !loaded || weekEmpty) return;
    if (!isGuest && replay === 0) return; // people with an account only see it when they ask
    const n = Math.min(Math.max(Number(saved ?? 0) || 0, 0), STEPS.length - 1);
    state.go(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introSeen, loaded, weekEmpty, isGuest, replay]);

  return null;
}

// --- The card, inside the page (under the title) ----------------------------------------------
export function TourBanner() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { step, isGuest, go, finish } = useTourState();
  const drop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step === null) return;
    drop.setValue(0);
    Animated.spring(drop, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
  }, [step, drop]);

  // Only on the page this step is about.
  if (step === null || STEPS[step].route !== pathname) return null;
  const last = step === STEPS.length - 1;

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: drop, transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] },
      ]}>
      <View style={styles.head}>
        <Image source={LOGO} style={styles.avatar} />
        <ThemedText style={styles.who}>Ambrósio</ThemedText>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            // Each dot is a button: press it to jump to that step (back or forward). Bigger touch area than the dot.
            <Pressable
              key={i}
              onPress={() => go(i)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('tourStep', { n: i + 1, total: STEPS.length })}
              style={styles.dotHit}>
              <View style={[styles.dot, i === step && styles.dotOn, i < step && styles.dotDone]} />
            </Pressable>
          ))}
        </View>
      </View>
      <ThemedText style={styles.text}>{t(STEPS[step].text)}</ThemedText>
      <View style={styles.row}>
        <Pressable onPress={() => finish()} style={styles.ghost} accessibilityRole="button">
          <ThemedText style={styles.ghostText}>{last ? t('tourLater') : t('tourSkip')}</ThemedText>
        </Pressable>
        {last && isGuest ? (
          <Pressable onPress={() => finish(true)} style={styles.button} accessibilityRole="button">
            <ThemedText style={styles.buttonText}>{t('createAccount')}</ThemedText>
          </Pressable>
        ) : (
          <Pressable onPress={() => go(step + 1)} style={styles.button} accessibilityRole="button">
            <ThemedText style={styles.buttonText}>{last ? t('tourDone') : `${t('tourNext')} →`}</ThemedText>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Solid terracotta with white text: it stands out, but it sits in the page like everything else.
  card: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 12, padding: 20, borderRadius: 20, backgroundColor: Accent },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#FFFFFF' },
  who: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', flex: 1 },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dotHit: { paddingVertical: 8, paddingHorizontal: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotDone: { backgroundColor: 'rgba(255,255,255,0.7)' },
  dotOn: { width: 22, backgroundColor: '#FFFFFF' },
  text: { fontSize: 19, lineHeight: 27, fontWeight: '600', color: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  ghost: { paddingVertical: 10, paddingHorizontal: 12 },
  ghostText: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  button: { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#FFFFFF' },
  buttonText: { color: Accent, fontSize: 16, fontWeight: '800' },
});
