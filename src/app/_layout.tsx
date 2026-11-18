import { useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { GuestTour } from '@/components/guest-tour';
import { IntroSlide } from '@/components/intro-slide';
import { LanguageProvider } from '@/i18n/language';
import { auth } from '@/firebase';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  // Nobody signed in? Start a guest session, so people can try the app without an email and password.
  // A guest can later "Create account" on Profile and keep everything (Firebase links the two).
  // If guest sign-in is turned off in Firebase, this fails quietly and the app works as before.
  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (!user) signInAnonymously(auth).catch(() => {});
      }),
    [],
  );
  return (
    <LanguageProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
        <GuestTour />
        <IntroSlide />
      </ThemeProvider>
    </LanguageProvider>
  );
}
