// The nickname is the only name other people see. Emails are never shown in the app.

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 24;

// Tidy what was typed: no spaces at the ends, no double spaces.
export function cleanNickname(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

// Good nickname: 2 to 24 characters, at least one letter or number, no @ (so it is
// not an email address) and no / (the database cannot use it in a name).
export function isValidNickname(text: string): boolean {
  const name = cleanNickname(text);
  return (
    name.length >= NICKNAME_MIN &&
    name.length <= NICKNAME_MAX &&
    !name.includes('@') &&
    !name.includes('/') &&
    /[\p{L}\p{N}]/u.test(name)
  );
}

// Two nicknames count as THE SAME when they only differ in capitals, accents or spaces:
// "Chef João", "chef joao" and "CHEF  JOAO" all give the key "chef joao".
// The key is the name of the document in the "nicknames" collection.
export function nicknameKey(text: string): string {
  return cleanNickname(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
