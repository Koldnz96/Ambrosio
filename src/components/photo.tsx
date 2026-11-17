import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

// A photo saved with a recipe or a comment (see src/lib/pick-photo.ts).
export function Photo({ photo, small }: { photo: string; small?: boolean }) {
  if (!photo.startsWith('data:image/')) return null; // only pictures made by the app itself
  return <Image source={{ uri: photo }} resizeMode="cover" style={small ? styles.small : styles.large} />;
}

// A soft empty picture, so recipes without a photo take the same space as the ones with a photo.
export function PhotoPlaceholder() {
  const theme = useTheme();
  return (
    <View style={[styles.large, styles.placeholder, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText style={styles.icon}>🍽️</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 40, lineHeight: 48, opacity: 0.5 },
  large: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12 },
  small: { width: 220, maxWidth: '100%', aspectRatio: 4 / 3, borderRadius: 10 },
});
