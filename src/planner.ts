export interface PlanCandidate {
  id: number;
  protein: string;
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick one dinner per day.
 *
 * Rules, in priority order:
 *  1. Never the same protein two nights in a row.
 *  2. Never the same recipe twice in a week.
 *  3. Spread proteins out (prefer the protein used least so far).
 *
 * A randomized backtracking search satisfies all three when the recipe box
 * allows it. If it can't (e.g. only chicken recipes exist), a greedy fallback
 * relaxes the rules as little as possible.
 */
export function planWeek(recipes: PlanCandidate[], days = 7): number[] {
  if (recipes.length === 0) return [];

  const pool = shuffle(recipes);
  const chosen: PlanCandidate[] = [];
  const used = new Set<number>();
  const proteinUse = new Map<string, number>();
  let budget = 20000;

  const search = (): boolean => {
    if (chosen.length === days) return true;
    const prev = chosen[chosen.length - 1];
    const candidates = pool
      .filter((r) => !used.has(r.id) && r.protein !== prev?.protein)
      .sort((a, b) => (proteinUse.get(a.protein) ?? 0) - (proteinUse.get(b.protein) ?? 0));
    for (const c of candidates) {
      if (budget-- <= 0) return false;
      chosen.push(c);
      used.add(c.id);
      proteinUse.set(c.protein, (proteinUse.get(c.protein) ?? 0) + 1);
      if (search()) return true;
      chosen.pop();
      used.delete(c.id);
      proteinUse.set(c.protein, (proteinUse.get(c.protein) ?? 0) - 1);
    }
    return false;
  };

  if (search()) return chosen.map((r) => r.id);

  // Fallback: build greedily, relaxing rules only when nothing else fits.
  const result: PlanCandidate[] = [];
  const usedIds = new Set<number>();
  const useCount = new Map<string, number>();
  for (let day = 0; day < days; day++) {
    const prev = result[result.length - 1];
    const tiers = [
      pool.filter((r) => !usedIds.has(r.id) && r.protein !== prev?.protein),
      pool.filter((r) => r.protein !== prev?.protein && r.id !== prev?.id),
      pool.filter((r) => !usedIds.has(r.id)),
      pool.filter((r) => r.id !== prev?.id),
      pool,
    ];
    const options = tiers.find((t) => t.length > 0)!;
    options.sort((a, b) => (useCount.get(a.protein) ?? 0) - (useCount.get(b.protein) ?? 0));
    const pick = options[0];
    result.push(pick);
    usedIds.add(pick.id);
    useCount.set(pick.protein, (useCount.get(pick.protein) ?? 0) + 1);
  }
  return result.map((r) => r.id);
}

/**
 * Pick a replacement for one day: prefer a recipe not already in the week whose
 * protein differs from the nights before and after.
 */
export function pickReplacement(
  recipes: PlanCandidate[],
  currentId: number | null,
  idsInPlan: number[],
  neighborProteins: string[],
): number | null {
  const pool = shuffle(recipes.filter((r) => r.id !== currentId));
  const inPlan = new Set(idsInPlan);
  const tiers = [
    pool.filter((r) => !inPlan.has(r.id) && !neighborProteins.includes(r.protein)),
    pool.filter((r) => !neighborProteins.includes(r.protein)),
    pool.filter((r) => !inPlan.has(r.id)),
    pool,
  ];
  return tiers.find((t) => t.length > 0)?.[0]?.id ?? null;
}
