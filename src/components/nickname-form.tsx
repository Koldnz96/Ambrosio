import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { NICKNAME_MAX, cleanNickname, isValidNickname } from '@/data/nickname';
import type { NicknameResult } from '@/data/nickname-store';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/i18n/language';

// Shown to a signed-in person who has no nickname yet. They pick one before using the app.
export function NicknameForm({ onSave }: { onSave: (name: string) => Promise<NicknameResult> }) {
  const theme = useTheme();
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (!isValidNickname(text)) {
      setError(t('errNickname'));
      return;
    }
    setError('');
    setBusy(true);
    const result = await onSave(cleanNickname(text));
    setBusy(false);
    if (!result.ok) setError(result.reason === 'taken' ? t('errNicknameTaken') : t('errSave', { message: result.message }));
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{t('nicknameTitle')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('nicknameHelp')}
      </ThemedText>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
        placeholder={t('displayNamePlaceholder')}
        placeholderTextColor={theme.textSecondary}
        maxLength={NICKNAME_MAX}
        autoCapitalize="none"
        autoCorrect={false}
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
      />
      <Pressable style={styles.button} disabled={busy} onPress={submit}>
        <ThemedText type="smallBold">{t('nicknameContinue')}</ThemedText>
      </Pressable>
      {error ? <ThemedText type="small">{error}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two, maxWidth: 520 },
  input: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, fontSize: 16 },
  button: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
});
