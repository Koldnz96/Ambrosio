import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { auth } from '@/firebase';

// Turns Firebase's technical error codes into short messages a person can read.
function friendlyError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email does not look right.';
    case 'auth/missing-password':
      return 'Please type a password.';
    case 'auth/weak-password':
      return 'The password is too short. Use at least 6 characters.';
    case 'auth/email-already-in-use':
      return 'There is already an account with that email. Try Sign in.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a moment and try again.';
    default:
      return `Something went wrong (${code || String(error)}).`;
  }
}

export default function ProfileScreen() {
  const theme = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

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
      setMessage(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.backgroundSelected }];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Profile</ThemedText>

        {!ready ? (
          <ThemedText themeColor="textSecondary">Checking if you are signed in...</ThemedText>
        ) : user ? (
          <>
            <ThemedText>Signed in as {user.email}</ThemedText>
            <Pressable style={styles.button} disabled={busy} onPress={() => run(() => signOut(auth))}>
              <ThemedText type="smallBold">Sign out</ThemedText>
            </Pressable>
            <ThemedText themeColor="textSecondary" type="small">
              Your allergies and other settings will live here later.
            </ThemedText>
          </>
        ) : (
          <>
            <ThemedText themeColor="textSecondary">
              Create an account or sign in to save your recipes.
            </ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={inputStyle}
              placeholder="Password (at least 6 characters)"
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
                <ThemedText type="smallBold">Sign in</ThemedText>
              </Pressable>
              <Pressable
                style={styles.button}
                disabled={busy}
                onPress={() => run(() => createUserWithEmailAndPassword(auth, email.trim(), password))}>
                <ThemedText type="smallBold">Create account</ThemedText>
              </Pressable>
            </ThemedView>
            {message ? <ThemedText type="small">{message}</ThemedText> : null}
          </>
        )}
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
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  input: {
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: Spacing.three },
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
});
