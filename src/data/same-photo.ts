// The photo rule for copies: a public copy must not reuse the photo of the recipe it was
// copied from. This asks the database for the original's photo and compares the two.
// If the original cannot be read (deleted, or now private) there is nothing to compare,
// so the copy is allowed.
import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/firebase';

export async function sameAsOriginalPhoto(copiedFrom: string, photo: string): Promise<boolean> {
  if (!copiedFrom || !photo) return false;
  try {
    const snap = await getDoc(doc(db, 'recipes', copiedFrom));
    return snap.exists() && typeof snap.data().photo === 'string' && snap.data().photo === photo;
  } catch {
    return false;
  }
}
