import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

import { ALLERGEN_LABELS, type Allergen } from '@/data/products';
import { EMPTY_PROFILE, type Profile } from '@/data/warnings';
import { claimNickname, type NicknameResult } from '@/data/nickname-store';
import { db } from '@/firebase';

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Day = (typeof DAYS)[number];
// For every day, the ids of the recipes planned for it (the same recipe can appear twice).
export type Week = Record<Day, string[]>;
export const EMPTY_WEEK: Week = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

// Everything we keep about the person lives in ONE document: users/{uid}.
// (The security rules only cover that document, not folders inside it.)
export function useUserData(uid: string | null) {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [week, setWeek] = useState<Week>(EMPTY_WEEK);
  const [displayName, setDisplayName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<{ kind: 'load' | 'save'; message: string } | null>(null);

  useEffect(() => {
    if (!uid) {
      setProfile(EMPTY_PROFILE);
      setWeek(EMPTY_WEEK);
      setDisplayName('');
      setLoaded(false);
      return;
    }
    return onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        const data = snapshot.data() ?? {};
        setProfile({
          allergies: (Array.isArray(data.allergies) ? data.allergies : []).filter(
            (a: string): a is Allergen => a in ALLERGEN_LABELS,
          ),
          vegan: data.vegan === true,
        });
        const nextWeek: Week = { ...EMPTY_WEEK };
        for (const day of DAYS) {
          const ids = data.week?.[day];
          nextWeek[day] = Array.isArray(ids) ? ids.filter((id: unknown) => typeof id === 'string') : [];
        }
        setWeek(nextWeek);
        setDisplayName(typeof data.displayName === 'string' ? data.displayName : '');
        setLoaded(true);
      },
      (err) => setError({ kind: 'load', message: err.message }),
    );
  }, [uid]);

  const save = useCallback(
    async (fields: Record<string, unknown>) => {
      if (!uid) return;
      setError(null);
      try {
        await setDoc(doc(db, 'users', uid), fields, { merge: true });
      } catch (err) {
        setError({ kind: 'save', message: (err as Error).message });
      }
    },
    [uid],
  );

  const saveProfile = useCallback((next: Profile) => save({ allergies: next.allergies, vegan: next.vegan }), [save]);
  const saveWeek = useCallback((next: Week) => save({ week: next }), [save]);

  // Nicknames are unique: this fails with reason "taken" when someone else has it.
  const saveDisplayName = useCallback(
    async (name: string): Promise<NicknameResult> => {
      if (!uid) return { ok: false, reason: 'error', message: 'Not signed in' };
      return claimNickname(uid, name, displayName);
    },
    [uid, displayName],
  );

  // Signed in, settings loaded, and still no nickname: the screens ask for one first.
  const needsNickname = uid !== null && loaded && displayName === '';

  return { profile, week, displayName, needsNickname, loaded, error, saveProfile, saveWeek, saveDisplayName };
}
