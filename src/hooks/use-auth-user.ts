import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { auth } from '@/firebase';

// Who is signed in? "ready" turns true once Firebase has answered.
export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setReady(true);
    });
  }, []);

  return { user, ready };
}
