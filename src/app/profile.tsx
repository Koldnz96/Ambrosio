import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

import { NicknameForm } from '@/components/nickname-form';
import { LEVEL_COLORS } from '@/components/warning-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { ALLERGEN_ICONS, ALLERGEN_ORDER } from '@/data/warnings';
import { useLanguage } from '@/i18n/language';
import { useUserData } from '@/hooks/use-user-data';
import { useTheme } from '@/hooks/use-theme';
import { maskEmail } from '@/data/email';
import { NICKNAME_MAX, cleanNickname, isValidNickname } from '@/data/nickname';
import { claimNickname, type NicknameResult } from '@/data/nickname-store';
import { useRecipes } from '@/hooks/use-recipes';
import { useSyncAuthorName } from '@/hooks/use-sync-author-name';
import { auth } from '@/firebase';

// Turns Firebase's technical error codes into short messages a person can read.
function friendlyError(error: unknown, t: ReturnType<typeof useLanguage>['t']): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return t('errInvalidEmail');
    case 'auth/missing-password':
      return t('errMissingPassword');
    case 'auth/weak-password':
      return t('errWeakPassword');
    case 'auth/email-already-in-use':
      return t('errEmailInUse');
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return t('errWrongLogin');
    case 'auth/too-many-requests':
      return t('errTooMany');
    default:
      return t('errGeneric', { code: code || String(error) });
  }
}

// The nickname shown on shared recipes. It saves when you press Save (or Enter).
function DisplayNameField(props: { saved: string; disabled: boolean; onSave: (name: string) => Promise<NicknameResult> }) {
  const theme = useTheme();
  const { t } = useLanguage();
  const [text, setText] = useState(props.saved);
  const [error, setError] = useState('');
  const changed = cleanNickname(text) !== props.saved;

  async function submit() {
    if (!changed || props.disabled) return;
    if (!isValidNickname(text)) {
      setError(t('errNickname'));
      return;
    }
    setError('');
    const result = await props.onSave(cleanNickname(text));
    if (!result.ok) setError(result.reason === 'taken' ? t('errNicknameTaken') : t('errSave', { message: result.message }));
  }

  return (
    <>
      <ThemedView style={styles.row}>
        <TextInput
          style={[styles.input, styles.nameInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
          placeholder={t('displayNamePlaceholder')}
          placeholderTextColor={theme.textSecondary}
          maxLength={NICKNAME_MAX}
          autoCapitalize="none"
          autoCorrect={false}
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
        />
        {changed ? (
          <Pressable style={styles.button} disabled={props.disabled} onPress={submit}>
            <ThemedText type="smallBold">{t('saveChanges')}</ThemedText>
          </Pressable>
        ) : null}
      </ThemedView>
      {error ? <ThemedText type="small">{error}</ThemedText> : null}
    </>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { t, allergenName } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const { profile, displayName, needsNickname, loaded, error: dataError, saveProfile, saveDisplayName } = useUserData(user?.uid ?? null);

  const { recipes } = useRecipes(user?.uid ?? null);
  // Save the new nickname, and put it on the recipes this person already shared.
  async function changeNickname(name: string): Promise<NicknameResult> {
    return saveDisplayName(name);
  }
  useSyncAuthorName(recipes, displayName);

  // A nickname saved before nicknames were unique is reserved the first time Profile opens.
  useEffect(() => {
    if (user && loaded && displayName) claimNickname(user.uid, displayName, displayName);
  }, [user, loaded, displayName]);

  function toggleAllergy(allergen: (typeof ALLERGEN_ORDER)[number]) {
    const has = profile.allergies.includes(allergen);
    saveProfile({
      ...profile,
      allergies: has ? profile.allergies.filter((a) => a !== allergen) : [...profile.allergies, allergen],
    });
  }

  // Firebase tells us when someone signs in or out (and who is signed in when the page opens).
  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setReady(true);
    });
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage('');
    try {
      await action();
      setPassword('');
    } catch (error) {
      setMessage(friendlyError(error, t));
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.backgroundSelected }];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="subtitle">{t('profileTitle')}</ThemedText>


        {!ready ? (
          <ThemedText themeColor="textSecondary">{t('checkingSignIn')}</ThemedText>
        ) : user ? (
          <>
            {/* The email is hidden by default, in case someone else is looking at the screen. */}
            <ThemedView style={styles.row}>
              <ThemedText>
                {t('signedInAs', { email: showEmail ? (user.email ?? '') : maskEmail(user.email ?? '') })}
              </ThemedText>
              <Pressable style={styles.option} onPress={() => setShowEmail(!showEmail)}>
                <ThemedText type="small">{showEmail ? t('hide') : t('show')}</ThemedText>
              </Pressable>
            </ThemedView>

            {needsNickname ? (
              // A new account (or an old one without a nickname): ask for it here, once.
              <NicknameForm onSave={changeNickname} />
            ) : (
              <>
                <ThemedText type="smallBold">{t('displayName')}</ThemedText>
                <DisplayNameField key={displayName} saved={displayName} disabled={!loaded} onSave={changeNickname} />
                <ThemedText themeColor="textSecondary" type="small">
                  {t('displayNameHelp')}
                </ThemedText>
              </>
            )}

            <ThemedText type="smallBold">{t('diet')}</ThemedText>
            <Pressable
              disabled={!loaded}
              onPress={() => saveProfile({ ...profile, vegan: !profile.vegan })}
              style={[styles.option, profile.vegan && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type={profile.vegan ? 'smallBold' : 'small'}>
                {profile.vegan ? '✓ ' : ''}🌱 {t('imVegan')}
              </ThemedText>
            </Pressable>

            <ThemedText type="smallBold">{t('myAllergies')}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {t('allergiesHelp')}
            </ThemedText>
            <ThemedView style={styles.options}>
              {ALLERGEN_ORDER.map((allergen) => {
                const on = profile.allergies.includes(allergen);
                return (
                  <Pressable
                    key={allergen}
                    disabled={!loaded}
                    onPress={() => toggleAllergy(allergen)}
                    style={[styles.option, on && { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type={on ? 'smallBold' : 'small'}>
                      {on ? '✓ ' : ''}
                      {ALLERGEN_ICONS[allergen]} {allergenName(allergen)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ThemedView>
            {dataError ? (
              <ThemedText type="small">
                {t(dataError.kind === 'load' ? 'errLoadSettings' : 'errSave', { message: dataError.message })}
              </ThemedText>
            ) : null}

            <ThemedText type="smallBold">{t('legendTitle')}</ThemedText>
            <ThemedView style={styles.legend}>
              {([
                ['contains', t('legendContains')],
                ['may', t('legendMay')],
                ['unchecked', t('legendUnchecked')],
              ] as const).map(([level, text]) => (
                <ThemedView key={level} style={styles.row}>
                  <ThemedView style={[styles.dot, { backgroundColor: LEVEL_COLORS[level].border }]} />
                  <ThemedText type="small">{text}</ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
            <ThemedText themeColor="textSecondary" type="small">
              {t('guideNote')}
            </ThemedText>

            {/* Sign out sits at the very end, in red, and asks before doing it. */}
            <ThemedView style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
            {confirmingSignOut ? (
              <ThemedView style={styles.signOutRow}>
                <ThemedText type="small">{t('signOutAsk')}</ThemedText>
                <Pressable
                  style={[styles.button, styles.dangerButton]}
                  disabled={busy}
                  onPress={() => {
                    setConfirmingSignOut(false);
                    run(() => signOut(auth));
                  }}>
                  <ThemedText type="smallBold" style={styles.dangerText}>
                    {t('signOutYes')}
                  </ThemedText>
                </Pressable>
                <Pressable style={styles.button} onPress={() => setConfirmingSignOut(false)}>
                  <ThemedText type="smallBold">{t('cancel')}</ThemedText>
                </Pressable>
              </ThemedView>
            ) : (
              <Pressable style={[styles.button, styles.dangerButton]} onPress={() => setConfirmingSignOut(true)}>
                <ThemedText type="smallBold" style={styles.dangerText}>
                  {t('signOut')}
                </ThemedText>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <ThemedText themeColor="textSecondary">
              {t('signInPrompt')}
            </ThemedText>
            <TextInput
              style={inputStyle}
              placeholder={t('emailPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={inputStyle}
              placeholder={t('passwordPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <ThemedView style={styles.row}>
              <Pressable
                style={styles.button}
                disabled={busy}
                onPress={() => run(() => signInWithEmailAndPassword(auth, email.trim(), password))}>
                <ThemedText type="smallBold">{t('signIn')}</ThemedText>
              </Pressable>
              <Pressable
                style={styles.button}
                disabled={busy}
                onPress={() => run(() => createUserWithEmailAndPassword(auth, email.trim(), password))}>
                <ThemedText type="smallBold">{t('createAccount')}</ThemedText>
              </Pressable>
            </ThemedView>
            {message ? <ThemedText type="small">{message}</ThemedText> : null}
          </>
        )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? 96 : Spacing.five,
  },
  content: { gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.five },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.5)',
  },
  divider: { height: 1, marginTop: Spacing.three },
  signOutRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  dangerButton: { borderColor: '#D93025' },
  dangerText: { color: '#D93025' },
  legend: { gap: Spacing.one },
  dot: { width: 12, height: 12, borderRadius: 6 },
  input: {
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, alignItems: 'center' },
  nameInput: { flex: 1 },
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
});
