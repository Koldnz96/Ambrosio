/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// The warm kitchen palette: cream paper, white cards and one orange accent.
// "light" is cream, "dark" is a warm dark brown (never pure black).
export const Colors = {
  light: {
    text: '#2A1B12',
    background: '#F0D5BC',
    backgroundElement: '#FBF0E4',
    backgroundSelected: '#E4BC9C',
    textSecondary: '#6E4F3C',
  },
  dark: {
    text: '#F6EBDD',
    background: '#1C1511',
    backgroundElement: '#2B211B',
    backgroundSelected: '#3C2E25',
    textSecondary: '#C2AB95',
  },
} as const;

// The app always uses this look, whatever the computer is set to.
// Use null to follow the computer's light or dark setting instead.
export const FORCED_SCHEME: 'light' | 'dark' | null = 'light';

// The orange used for nicknames and highlights.
export const Accent = '#C15F3C';

// A soft warm line for borders (cards and buttons), which works on light and dark.
export const BorderColor = 'rgba(140, 70, 30, 0.35)';

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1200;
