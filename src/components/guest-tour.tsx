// For new guests: first two quick questions (allergies, how many people), then a ready-made week
// (up to 7 dinners by Ambrosio, without their allergies, for that many people) and a short guided tour:
// Week -> open a meal -> Shopping list -> prices -> "create a free account for more".
//
// Two parts:
// - <GuestTour /> (in _layout): no picture of its own. It gives the ready-made week, decides when the tour
//   runs and which step it is on, and opens the right tab.
// - <TourBanner /> (in every page, under the title): the Ambrósio card itself. It is PART of the page
//   (it does not cover anything), so it is clear you can still use the page while following it.
// - <FirstQuestions /> (in every page, under the title): the questions card, before the week is made.
// Shown once per browser (localStorage "ambrosio-tour"); it can be replayed from the Profile tab.
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Accent } from '@/constants/theme';
import { getProduct } from '@/data/products';
import { pickVariedWeek } from '@/data/preset-week';
import { ALLERGEN_ICONS, ALLERGEN_ORDER, recipeWarnings, type Profile } from '@/data/warnings';
import { type Allergen } from '@/data/products';
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
const ASKED_KEY = 'ambrosio-first-questions'; // "1" once allergies and people were answered
const PEOPLE_KEY = 'ambrosio-first-people'; // how many people they said they cook for
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
type Answers = { allergies: Allergen[]; vegan: boolean; people: number };
type TourState = {
  step: number | null;
  isGuest: boolean;
  go: (n: number) => void;
  finish: (toProfile?: boolean) => void;
  asking: boolean; // the first questions card is showing
  answer: (a: Answers) => void;
  days: number; // how many dinners the ready-made week got (for the first tour text)
  people: number;
};
let state: TourState = {
  step: null,
  isGuest: false,
  go: () => {},
  finish: () => {},
  asking: false,
  answer: () => {},
  days: 7,
  people: 2,
};
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
  const { isGuest, week, profile, loaded, saveWeek, saveProfile } = useUserData(user?.uid ?? null);
  const weekEmpty = DAYS.every((d) => week[d].length === 0);
  const [introSeen, setIntroSeen] = useState(read(INTRO_KEY) === '1');
  const [replay, setReplay] = useState(0);
  const [presetGiven, setPresetGiven] = useState(read(PRESET_KEY) === '1');
  const [asked, setAsked] = useState(read(ASKED_KEY) === '1');
  // The answers from the questions card (kept here, because the saved profile arrives a moment later).
  const [answers, setAnswers] = useState<Answers | null>(null);

  // 1. First the questions: a new guest, after the welcome scene, before the ready-made week.
  const asking = isGuest && loaded && introSeen && weekEmpty && !presetGiven && !asked;
  useEffect(() => {
    const answer = (a: Answers) => {
      saveProfile({ allergies: a.allergies, vegan: a.vegan }); // same allergies as on the Profile tab
      write(ASKED_KEY, '1');
      write(PEOPLE_KEY, String(a.people));
      setAnswers(a);
      setAsked(true);
    };
    setState({ asking, answer });
  }, [asking, saveProfile]);

  // 2. The ready-made week: only for a guest, only once, only if their week is still empty, after the questions.
  const needPreset = isGuest && loaded && weekEmpty && !presetGiven && asked;
  const { recipes } = usePublicRecipes(needPreset);
  const starters = useMemo(
    // Only dinners (no desserts, cakes or breakfasts in the ready-made week).
    () => recipes.filter((r) => r.authorName.trim().toLowerCase() === 'ambrosio' && !r.copiedFrom && r.course === 'dinner'),
    [recipes],
  );
  useEffect(() => {
    if (!needPreset || starters.length === 0) return;
    const prof: Profile = answers ? { allergies: answers.allergies, vegan: answers.vegan } : profile;
    const people = answers?.people ?? (Number(read(PEOPLE_KEY)) || 2);
    // Leave out every dinner that contains (or may contain) one of their allergies, or is not vegan for a vegan.
    // If fewer than 7 are left, some days simply stay empty.
    const safe = starters.filter((r) => !recipeWarnings(r.ingredients, prof).some((w) => w.level !== 'unchecked'));
    const ids = pickVariedWeek(
      safe.map((r) => ({ id: r.id, name: r.name, kinds: [...recipeCategories(r.ingredients, getProduct)] })),
    );
    const next: Week = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
    ids.forEach((id, i) => next[DAYS[i]].push(makeEntry(id, people)));
    write(PRESET_KEY, '1');
    setPresetGiven(true);
    setState({ days: ids.length, people });
    saveWeek(next);
  }, [needPreset, starters, saveWeek, answers, profile]);

  // For the first tour text ("we planned N dinners for P people") after a page reload.
  useEffect(() => {
    if (!loaded) return;
    const days = DAYS.filter((d) => week[d].length > 0).length;
    if (days > 0) setState({ days, people: Number(read(PEOPLE_KEY)) || 2 });
  }, [loaded, week]);

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
    // Waits for the ready-made week (it can be empty when every starter clashes with their allergies).
    if (saved === 'done' || !introSeen || !loaded || (weekEmpty && !presetGiven)) return;
    if (!isGuest && replay === 0) return; // people with an account only see it when they ask
    const n = Math.min(Math.max(Number(saved ?? 0) || 0, 0), STEPS.length - 1);
    state.go(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introSeen, loaded, weekEmpty, presetGiven, isGuest, replay]);

  return null;
}

// --- The card, inside the page (under the title) ----------------------------------------------
export function TourBanner() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { step, isGuest, go, finish, days, people } = useTourState();
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
      <ThemedText style={styles.text}>
        {step === 0
          ? t(days === 0 ? 'tourWeekNone' : days === 1 ? 'tourWeekOne' : 'tourWeek', {
              days,
              people: t(people === 1 ? 'peopleOne' : 'peopleMany', { count: people }),
            })
          : t(STEPS[step].text)}
      </ThemedText>
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

// --- The first questions card (under the title, on the Week page) ------------------------------
export function FirstQuestions() {
  const { t, allergenShortName } = useLanguage();
  const pathname = usePathname();
  const { asking, answer } = useTourState();
  const [allergies, setAllergies] = useState<Allergen[]>([]);
  const [vegan, setVegan] = useState(false);
  const [people, setPeople] = useState(2);

  if (!asking || pathname !== STEPS[0].route) return null;
  const toggle = (a: Allergen) =>
    setAllergies((old) => (old.includes(a) ? old.filter((x) => x !== a) : [...old, a]));
  const nothingPicked = allergies.length === 0 && !vegan;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Image source={LOGO} style={styles.avatar} />
        <ThemedText style={styles.who}>Ambrósio</ThemedText>
      </View>
      <ThemedText style={styles.text}>{t('fqTitle')}</ThemedText>
      <ThemedText style={styles.small}>{t('fqAllergies')}</ThemedText>
      <View style={styles.chips}>
        {ALLERGEN_ORDER.map((a) => {
          const on = allergies.includes(a);
          return (
            <Pressable
              key={a}
              onPress={() => toggle(a)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.chip, on && styles.chipOn]}>
              <ThemedText style={[styles.chipText, on && styles.chipTextOn]}>
                {on ? '✓ ' : ''}
                {ALLERGEN_ICONS[a]} {allergenShortName(a)}
              </ThemedText>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setVegan((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: vegan }}
          style={[styles.chip, vegan && styles.chipOn]}>
          <ThemedText style={[styles.chipText, vegan && styles.chipTextOn]}>
            {vegan ? '✓ ' : ''}🌱 {t('imVegan')}
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText style={styles.note}>{t('fqPackaging')}</ThemedText>

      <ThemedText style={styles.small}>{t('fqPeople')}</ThemedText>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => setPeople((n) => Math.max(1, n - 1))}
          disabled={people <= 1}
          accessibilityRole="button"
          accessibilityLabel={t('servingsLess')}
          style={[styles.stepButton, people <= 1 && styles.off]}>
          <ThemedText style={styles.stepText}>−</ThemedText>
        </Pressable>
        <ThemedText style={styles.stepValue}>
          👥 {t(people === 1 ? 'peopleOne' : 'peopleMany', { count: people })}
        </ThemedText>
        <Pressable
          onPress={() => setPeople((n) => Math.min(20, n + 1))}
          disabled={people >= 20}
          accessibilityRole="button"
          accessibilityLabel={t('servingsMore')}
          style={[styles.stepButton, people >= 20 && styles.off]}>
          <ThemedText style={styles.stepText}>+</ThemedText>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Pressable onPress={() => answer({ allergies, vegan, people })} style={styles.button} accessibilityRole="button">
          <ThemedText style={styles.buttonText}>{nothingPicked ? t('fqNone') : `${t('fqContinue')} →`}</ThemedText>
        </Pressable>
      </View>
    </View>
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
  // the first questions card
  small: { fontSize: 15, lineHeight: 21, fontWeight: '700', color: '#FFFFFF' },
  note: { fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.85)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)' },
  chipOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  chipText: { fontSize: 14, lineHeight: 19, color: '#FFFFFF' },
  chipTextOn: { color: Accent, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  stepText: { color: Accent, fontSize: 20, lineHeight: 24, fontWeight: '800' },
  stepValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  off: { opacity: 0.4 },
});
