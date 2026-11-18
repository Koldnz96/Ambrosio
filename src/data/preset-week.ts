// Picks a varied week of dinners (for the ready-made week new guests get): fish, chicken, beef, pork...
// in turn, so two days in a row are not the same kind of meal. Same input -> same week (no randomness).

export type PresetCandidate = { id: string; name: string; kinds: string[] };

const ORDER = ['fish', 'chicken', 'pork', 'beef', 'shellfish', 'lamb', 'vegetarian', 'other'];

export function pickVariedWeek(recipes: PresetCandidate[], count = 7): string[] {
  const buckets = new Map<string, PresetCandidate[]>(ORDER.map((k) => [k, []]));
  for (const r of [...recipes].sort((a, b) => a.name.localeCompare(b.name))) {
    const kind = ORDER.find((k) => r.kinds.includes(k)) ?? 'other';
    buckets.get(kind)!.push(r);
  }
  const picked: string[] = [];
  while (picked.length < count) {
    let added = false;
    for (const kind of ORDER) {
      const next = buckets.get(kind)!.shift();
      if (next && picked.length < count) {
        picked.push(next.id);
        added = true;
      }
    }
    if (!added) break; // fewer recipes than days
  }
  return picked;
}
