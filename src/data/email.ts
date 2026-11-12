// Hides most of an email address, so someone looking at your screen cannot read it.
// "joao.costa@gmail.com" becomes "joa•••@•••". Very short names show even less.
export function maskEmail(email: string): string {
  const name = email.split('@')[0] ?? '';
  const shown = name.slice(0, Math.min(3, Math.max(1, name.length - 2)));
  return `${shown}•••@•••`;
}
