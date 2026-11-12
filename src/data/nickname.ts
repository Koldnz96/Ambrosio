// The nickname is the only name other people see. Emails are never shown in the app.

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 24;

// Tidy what was typed: no spaces at the ends, no double spaces.
export function cleanNickname(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

// Good nickname: 2 to 24 characters, and it must not look like an email address.
export function isValidNickname(text: string): boolean {
  const name = cleanNickname(text);
  return name.length >= NICKNAME_MIN && name.length <= NICKNAME_MAX && !name.includes('@');
}
