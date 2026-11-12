// Star ratings: each person can give one rating (1 to 5 stars) per recipe.

export type Rating = { uid: string; stars: number };

export type RatingSummary = {
  count: number;
  average: number | null; // null when nobody has rated yet
  mine: number | null; // this person's stars, or null
};

export function summarizeRatings(ratings: Rating[], uid: string | null): RatingSummary {
  const valid = ratings.filter((r) => Number.isInteger(r.stars) && r.stars >= 1 && r.stars <= 5);
  const total = valid.reduce((sum, r) => sum + r.stars, 0);
  const own = valid.find((r) => r.uid === uid);
  return {
    count: valid.length,
    average: valid.length === 0 ? null : Math.round((total / valid.length) * 10) / 10,
    mine: own ? own.stars : null,
  };
}
