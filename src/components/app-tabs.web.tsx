import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, type PressableProps } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
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
          <TabTrigger name="home" href="/home" asChild>
            <BrandButton />
          </TabTrigger>
          <TabTrigger name="recipes" href="/" asChild>
            <TabButton>{t('tabRecipes')}</TabButton>
          </TabTrigger>
          <TabTrigger name="week" href="/week" asChild>
            <TabButton>{t('tabWeek')}</TabButton>
          </TabTrigger>
          <TabTrigger name="shopping" href="/shopping" asChild>
            <TabButton>{t('tabShopping')}</TabButton>
          </TabTrigger>
          <TabTrigger name="discover" href="/discover" asChild>
            <TabButton>{t('tabDiscover')}</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton>{t('tabProfile')}</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
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
      <ThemedText type="smallBold" style={isFocused ? styles.brandActive : undefined}>
        Ambrósio
      </ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
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
  },
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
});
