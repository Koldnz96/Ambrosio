import { Image, StyleSheet } from 'react-native';

import type { Lang } from '@/i18n/lang';

// Small flag pictures. (Windows does not draw flag emoji, so these are drawn as images.)
const SVG: Record<Lang, string> = {
  en: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30"><clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath><clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath><g clip-path="url(#s)"><path d="M0,0 v30 h60 v-30 z" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#t)" stroke="#C8102E" stroke-width="4"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></g></svg>',
  pt: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="40" fill="#FF0000"/><rect width="24" height="40" fill="#006600"/><circle cx="24" cy="20" r="7" fill="#FFCC00"/><circle cx="24" cy="20" r="4.6" fill="#fff"/><circle cx="24" cy="20" r="2.6" fill="#FF0000"/></svg>',
  fr: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="20" height="40" fill="#0055A4"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#EF4135"/></svg>',
};

export function Flag({ lang, width = 30 }: { lang: Lang; width?: number }) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(SVG[lang])}` }}
      style={[styles.flag, { width, height: Math.round((width * 2) / 3) }]}
    />
  );
}

const styles = StyleSheet.create({
  flag: { borderRadius: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(128,128,128,0.6)' },
});
