import { StyleSheet, View } from 'react-native';

import type { Lang } from '@/i18n/lang';

// Small flags drawn with plain coloured boxes. (Windows does not draw flag emoji,
// and picture files did not show up in the browser, so they are built from shapes.)
export function Flag({ lang, width = 30 }: { lang: Lang; width?: number }) {
  const height = Math.round((width * 2) / 3);
  const box = [styles.flag, { width, height }];

  if (lang === 'fr') {
    return (
      <View style={[box, styles.row]}>
        <View style={[styles.third, { backgroundColor: '#0055A4' }]} />
        <View style={[styles.third, { backgroundColor: '#FFFFFF' }]} />
        <View style={[styles.third, { backgroundColor: '#EF4135' }]} />
      </View>
    );
  }

  if (lang === 'pt') {
    const circle = Math.round(height * 0.5);
    return (
      <View style={[box, styles.row, { backgroundColor: '#FF0000' }]}>
        <View style={{ width: width * 0.4, backgroundColor: '#006600' }} />
        <View
          style={{
            position: 'absolute',
            left: width * 0.4 - circle / 2,
            top: (height - circle) / 2,
            width: circle,
            height: circle,
            borderRadius: circle / 2,
            backgroundColor: '#FFCC00',
          }}
        />
      </View>
    );
  }

  // United Kingdom: blue, white and red diagonals, then the white and red cross on top.
  const diagonal = Math.sqrt(width * width + height * height);
  const angle = `${(Math.atan(height / width) * 180) / Math.PI}deg`;
  const bar = (thickness: number, color: string, rotate: string) => (
    <View
      style={{
        position: 'absolute',
        left: (width - diagonal) / 2,
        top: (height - thickness) / 2,
        width: diagonal,
        height: thickness,
        backgroundColor: color,
        transform: [{ rotate }],
      }}
    />
  );
  const cross = (thickness: number, color: string) => (
    <>
      <View style={{ position: 'absolute', left: (width - thickness) / 2, top: 0, width: thickness, height, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 0, top: (height - thickness) / 2, width, height: thickness, backgroundColor: color }} />
    </>
  );
  return (
    <View style={[box, { backgroundColor: '#012169' }]}>
      {bar(height * 0.2, '#FFFFFF', angle)}
      {bar(height * 0.2, '#FFFFFF', `-${angle}`)}
      {bar(height * 0.08, '#C8102E', angle)}
      {bar(height * 0.08, '#C8102E', `-${angle}`)}
      {cross(height * 0.34, '#FFFFFF')}
      {cross(height * 0.2, '#C8102E')}
    </View>
  );
}

const styles = StyleSheet.create({
  flag: {
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.6)',
  },
  row: { flexDirection: 'row' },
  third: { flex: 1 },
});
