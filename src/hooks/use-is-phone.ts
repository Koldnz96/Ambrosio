// True on a narrow screen (a phone, or a small browser window). Used to switch to the
// phone layout: bottom tab bar, smaller headings, side-scrolling chips.
import { useWindowDimensions } from 'react-native';

export const PHONE_MAX_WIDTH = 900;

export function useIsPhone(): boolean {
  const { width } = useWindowDimensions();
  return width < PHONE_MAX_WIDTH;
}
