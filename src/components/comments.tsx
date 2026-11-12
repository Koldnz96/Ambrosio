import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

import { NICKNAME_COLOR } from '@/components/recipe-heading';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/firebase';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/i18n/language';

const MAX_COMMENT = 500;

type Comment = { id: string; uid: string; authorName: string; text: string; createdAtMs: number };

type Props = {
  recipeId: string;
  recipeOwnerId: string;
  uid: string; // the person looking
  nickname: string; // their nickname, written on the comments they post
};

// Comments under a public recipe. Text only: photos are not allowed in comments.
// They live in recipes/{recipeId}/comments. You can delete your own comments,
// and the owner of the recipe can delete any comment on it.
export function Comments({ recipeId, recipeOwnerId, uid, nickname }: Props) {
  const theme = useTheme();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Only listen while the comments are open, so a long Discover page stays light.
  useEffect(() => {
    if (!open) return;
    return onSnapshot(
      collection(db, 'recipes', recipeId, 'comments'),
      (snapshot) => {
        const list: Comment[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            uid: data.uid ?? '',
            authorName: data.authorName ?? '',
            text: data.text ?? '',
            createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
          };
        });
        list.sort((a, b) => a.createdAtMs - b.createdAtMs); // oldest first, like a conversation
        setComments(list);
      },
      (err) => setError(t('errLoadComments', { message: err.message })),
    );
  }, [open, recipeId, t]);

  async function post() {
    const clean = text.trim();
    if (!clean) {
      setError(t('errCommentEmpty'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await addDoc(collection(db, 'recipes', recipeId, 'comments'), {
        uid,
        authorName: nickname,
        text: clean.slice(0, MAX_COMMENT),
        createdAt: serverTimestamp(),
      });
      setText('');
    } catch (err) {
      setError(t('errComment', { message: (err as Error).message }));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError('');
    try {
      await deleteDoc(doc(db, 'recipes', recipeId, 'comments', id));
    } catch (err) {
      setError(t('errComment', { message: (err as Error).message }));
    }
  }

  if (!open) {
    return (
      <Pressable style={styles.smallButton} onPress={() => setOpen(true)}>
        <ThemedText type="smallBold">💬 {t('comments')}</ThemedText>
      </Pressable>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.wrap}>
      <Pressable style={styles.smallButton} onPress={() => setOpen(false)}>
        <ThemedText type="smallBold">💬 {t('hideComments')}</ThemedText>
      </Pressable>

      {comments.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('noComments')}
        </ThemedText>
      ) : null}

      {comments.map((comment) => (
        <ThemedView key={comment.id} style={[styles.comment, { borderColor: theme.backgroundSelected }]}>
          <ThemedView style={styles.commentTop}>
            <ThemedText type="smallBold" style={styles.nickname}>
              {comment.authorName || t('anonymousCook')}
            </ThemedText>
            {comment.uid === uid || recipeOwnerId === uid ? (
              <Pressable onPress={() => remove(comment.id)} hitSlop={6} accessibilityLabel={t('delete')}>
                <ThemedText type="small" themeColor="textSecondary">
                  ✕ {t('delete')}
                </ThemedText>
              </Pressable>
            ) : null}
          </ThemedView>
          {comment.text ? <ThemedText type="small">{comment.text}</ThemedText> : null}
        </ThemedView>
      ))}

      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
        placeholder={t('commentPlaceholder')}
        placeholderTextColor={theme.textSecondary}
        maxLength={MAX_COMMENT}
        multiline
        value={text}
        onChangeText={setText}
      />
      <ThemedView type="backgroundElement" style={styles.row}>
        <Pressable style={styles.smallButton} disabled={busy} onPress={post}>
          <ThemedText type="smallBold">{busy ? t('saving') : t('postComment')}</ThemedText>
        </Pressable>
      </ThemedView>
      {error ? <ThemedText type="small">{error}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two, marginTop: Spacing.one },
  comment: { gap: Spacing.one, padding: Spacing.two, borderRadius: 12, borderWidth: 1 },
  commentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two, backgroundColor: 'transparent' },
  nickname: { color: NICKNAME_COLOR },
  input: { borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, fontSize: 15, minHeight: 44 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
  smallButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
});
