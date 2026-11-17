
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { FORCED_SCHEME } from '@/constants/theme';

// "light" or "dark": the forced look from theme.ts, or else the computer's own setting.
export function useColorScheme() {
  const system = useSystemColorScheme();
  return FORCED_SCHEME ?? system;
}
