import { Linking, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, BorderColor, Spacing } from '@/constants/theme';
import { useLanguage } from '@/i18n/language';

// Contact details shown at the bottom of the page. All of it is public on the live site.
// The phone number and the address are made up (an example), so nobody gets called or visited.
const EMAIL = 'ambrosio.app.pt@gmail.com';
const INSTAGRAM = '@ambrosioapp.pt';
const INSTAGRAM_URL = 'https://www.instagram.com/ambrosioapp.pt/';
const PHONE = '+351 910 931 966';
const ADDRESS = 'Rua da Avenida da Estrada, 120, 4850-500';

export function Footer() {
  const { t } = useLanguage();
  return (
    <ThemedView style={styles.footer}>
      <ThemedText type="smallBold">{t('footerContact')}</ThemedText>
      <ThemedText type="small">
        ✉️ {t('footerEmail')}:{' '}
        <ThemedText
          type="small"
          accessibilityRole="link"
          style={styles.link}
          onPress={() => Linking.openURL(`mailto:${EMAIL}`)}>
          {EMAIL}
        </ThemedText>
      </ThemedText>
      <ThemedText type="small">
        📷 {t('footerInstagram')}:{' '}
        <ThemedText
          type="small"
          accessibilityRole="link"
          style={styles.link}
          onPress={() => Linking.openURL(INSTAGRAM_URL)}>
          {INSTAGRAM}
        </ThemedText>
      </ThemedText>
      <ThemedText type="small">
        {t('footerPhone')}: {PHONE}
      </ThemedText>
      <ThemedText type="small">
        {t('footerAddress')}: {ADDRESS}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('footerExample')}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: BorderColor,
    gap: Spacing.one,
  },
  link: { color: Accent, textDecorationLine: 'underline' },
});
