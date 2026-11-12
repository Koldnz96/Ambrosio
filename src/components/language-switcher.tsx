import { Pressable, StyleSheet, View } from 'react-native';

import { Flag } from '@/components/flag';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LANG_ORDER, type Lang } from '@/i18n/lang';
import { useLanguage } from '@/i18n/language';

const FULL_NAMES: Record<Lang, string> = { en: 'English', pt: 'Português', fr: 'Français' };

// The small EN / PT / FR buttons in the top bar. The chosen one is highlighted.
export function LanguageSwitcher() {
  const theme = useTheme();
  const { lang, setLang } = useLanguage();
  return (
    <View style={styles.wrap}>
      {LANG_ORDER.map((code) => {
        const on = lang === code;
        return (
          <Pressable
            key={code}
            onPress={() => setLang(code)}
            accessibilityRole="button"
            accessibilityLabel={FULL_NAMES[code]}
            style={[styles.option, { borderColor: on ? theme.text : 'transparent' }, on && { backgroundColor: theme.backgroundSelected }]}>
            <Flag lang={code} width={21} />
            <ThemedText type={on ? 'smallBold' : 'small'} themeColor={on ? 'text' : 'textSecondary'}>
              {code.toUpperCase()}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half, marginLeft: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
});
