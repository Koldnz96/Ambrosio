// The app only runs in the browser (no server-rendered pages), so we can read the real
// dark or light setting straight away. This avoids a light flash while the page loads.
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { FORCED_SCHEME } from '@/constants/theme';

// "light" or "dark": the forced look from theme.ts, or else the computer's own setting.
export function useColorScheme() {
  const system = useSystemColorScheme();
  return FORCED_SCHEME ?? system;
}
