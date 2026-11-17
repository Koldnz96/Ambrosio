import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Image } from 'expo-image';
import { Children, type ReactNode } from 'react';
import { Pressable, View, StyleSheet, type PressableProps } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useIsPhone } from '@/hooks/use-is-phone';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/i18n/language';

import { LanguageSwitcher } from './language-switcher';
import { NICKNAME_COLOR } from './recipe-heading';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  const theme = useTheme();
  const { t } = useLanguage();

  return (
    <Tabs>
      <TabSlot style={{ height: '100%', backgroundColor: theme.background }} />
      <TabList asChild>
        <CustomTabList>
          {/* The brand is a button too: it opens the Home page. */}
          <TabTrigger name="home" href="/" asChild>
            <BrandButton />
          </TabTrigger>
          <TabTrigger name="recipes" href="/recipes" asChild>
            <TabButton icon="📖" short={t('tabRecipesShort')}>{t('tabRecipes')}</TabButton>
          </TabTrigger>
          <TabTrigger name="week" href="/week" asChild>
            <TabButton icon="📅">{t('tabWeek')}</TabButton>
          </TabTrigger>
          <TabTrigger name="shopping" href="/shopping" asChild>
            <TabButton icon="🛒">{t('tabShopping')}</TabButton>
          </TabTrigger>
          <TabTrigger name="discover" href="/discover" asChild>
            <TabButton icon="🌍">{t('tabDiscover')}</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="👤">{t('tabProfile')}</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon?: string; short?: string };

// On a computer: a pill in the top bar. On a phone: an icon with a small name, in the bottom bar.
export function TabButton({ children, isFocused, icon, short, ...props }: TabButtonProps) {
  const isPhone = useIsPhone();
  if (isPhone) {
    return (
      <Pressable {...(props as unknown as PressableProps)} style={({ pressed }) => [styles.phoneTab, pressed && styles.pressed]}>
        <ThemedView
          type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
          style={styles.phoneTabInner}>
          <ThemedText style={styles.phoneIcon}>{icon}</ThemedText>
          <ThemedText
            type={isFocused ? 'smallBold' : 'small'}
            themeColor={isFocused ? 'text' : 'textSecondary'}
            numberOfLines={1}
            style={styles.phoneLabel}>
            {short ?? children}
          </ThemedText>
        </ThemedView>
      </Pressable>
    );
  }
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function BrandButton({ isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...(props as unknown as PressableProps)} style={({ pressed }) => [styles.brandText, pressed && styles.pressed]}>
      <Image source={require('@/assets/images/ambrosio-logo.png')} style={styles.brandLogo} />
      <ThemedText type="smallBold" style={isFocused ? styles.brandActive : undefined}>
        Ambrósio
      </ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const isPhone = useIsPhone();

  if (isPhone) {
    // Phone: a slim bar on top (name and languages) and the five tabs in a bar at the bottom,
    // where a thumb can reach them. The first child is the brand, the rest are the tabs.
    const [brand, ...tabs] = Children.toArray(props.children as ReactNode);
    return (
      <>
        <View style={styles.phoneTop}>
          <ThemedView type="backgroundElement" style={styles.phoneTopInner}>
            {brand}
            <LanguageSwitcher />
          </ThemedView>
        </View>
        <View style={styles.phoneBottom}>
          <ThemedView type="backgroundElement" style={styles.phoneBottomInner}>
            {tabs}
          </ThemedView>
        </View>
      </>
    );
  }

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {props.children}
        <LanguageSwitcher />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandLogo: { width: 28, height: 28, borderRadius: 8 },
  brandActive: {
    color: NICKNAME_COLOR,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  // ---- phone layout ----
  phoneTop: { position: 'absolute', top: 0, left: 0, right: 0, padding: Spacing.two },
  phoneTopInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  phoneBottom: {
    // "fixed" keeps the bar at the bottom of the window while the page scrolls.
    position: 'fixed' as unknown as 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    padding: Spacing.two,
    // keeps the bar above the iPhone home line
    paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' as unknown as number,
  },
  phoneBottomInner: {
    flexDirection: 'row',
    borderRadius: Spacing.five,
    padding: Spacing.one,
    gap: Spacing.half,
    borderWidth: 1,
    borderColor: 'rgba(140, 70, 30, 0.25)',
  },
  phoneTab: { flex: 1, minWidth: 0 },
  phoneTabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
    gap: 0,
  },
  phoneIcon: { fontSize: 22, lineHeight: 26 },
  phoneLabel: { fontSize: 11, lineHeight: 14 },
});
