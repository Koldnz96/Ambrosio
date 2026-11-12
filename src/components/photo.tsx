import { Image, StyleSheet } from 'react-native';

// A photo saved with a recipe or a comment (see src/lib/pick-photo.ts).
export function Photo({ photo, small }: { photo: string; small?: boolean }) {
  if (!photo.startsWith('data:image/')) return null; // only pictures made by the app itself
  return <Image source={{ uri: photo }} resizeMode="cover" style={small ? styles.small : styles.large} />;
}

const styles = StyleSheet.create({
  large: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12 },
  small: { width: 220, maxWidth: '100%', aspectRatio: 4 / 3, borderRadius: 10 },
});
