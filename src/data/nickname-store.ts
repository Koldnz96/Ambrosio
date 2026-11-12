// Keeps nicknames unique, using one small document per nickname:
//   nicknames/{key} = { uid, createdAt }
// The key is the nickname without capitals and accents (see nicknameKey).
// Whoever creates the document first owns that nickname.

import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';

import { nicknameKey } from '@/data/nickname';
import { db } from '@/firebase';

export type NicknameResult = { ok: true } | { ok: false; reason: 'taken' } | { ok: false; reason: 'error'; message: string };

// Can this person use this nickname? (Free, or already theirs.)
export async function isNicknameFree(name: string, uid: string | null): Promise<boolean> {
  const snapshot = await getDoc(doc(db, 'nicknames', nicknameKey(name)));
  return !snapshot.exists() || snapshot.data().uid === uid;
}

// Take the nickname for this person, give back their old one, and save it on their profile.
// It all happens together (a transaction), so two people can never get the same nickname.
export async function claimNickname(uid: string, name: string, oldName: string): Promise<NicknameResult> {
  const key = nicknameKey(name);
  const oldKey = oldName ? nicknameKey(oldName) : '';
  try {
    const taken = await runTransaction(db, async (tx) => {
      const ref = doc(db, 'nicknames', key);
      const current = await tx.get(ref);
      if (current.exists() && current.data().uid !== uid) return true;

      const oldRef = oldKey && oldKey !== key ? doc(db, 'nicknames', oldKey) : null;
      const old = oldRef ? await tx.get(oldRef) : null;

      if (!current.exists()) tx.set(ref, { uid, createdAt: serverTimestamp() });
      if (oldRef && old?.exists() && old.data().uid === uid) tx.delete(oldRef);
      tx.set(doc(db, 'users', uid), { displayName: name }, { merge: true });
      return false;
    });
    return taken ? { ok: false, reason: 'taken' } : { ok: true };
  } catch (err) {
    return { ok: false, reason: 'error', message: (err as Error).message };
  }
}
