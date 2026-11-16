export interface Ingredient {
  raw: string;
  quantity: number | null;
  unit: string;
  name: string;
}

export const PROTEINS = [
  'chicken',
  'beef',
  'pork',
  'seafood',
  'turkey',
  'lamb',
  'vegetarian',
  'other',
] as const;
export type Protein = (typeof PROTEINS)[number];

/** What a recipe is for. A recipe can have several (e.g. lunch and dinner). */
export const MEAL_TYPES = [
  'dinner',
  'lunch',
  'breakfast',
  'side',
  'appetizer',
  'dessert',
  'snack',
  'drink',
] as const;

/** Keep only known meal types, in canonical order; default to dinner. */
export function cleanMealTypes(value: unknown): string[] {
  const given = Array.isArray(value) ? value.map((v) => String(v).toLowerCase()) : [];
  const valid = MEAL_TYPES.filter((t) => given.includes(t));
  return valid.length ? [...valid] : ['dinner'];
}

const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6',
  '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};

const UNITS: Record<string, string> = {};
const unitGroups: Record<string, string[]> = {
  cup: ['cup', 'cups', 'c'],
  tbsp: ['tablespoon', 'tablespoons', 'tbsp', 'tbsps', 'tbs', 'tbl'],
  tsp: ['teaspoon', 'teaspoons', 'tsp', 'tsps'],
  oz: ['ounce', 'ounces', 'oz'],
  lb: ['pound', 'pounds', 'lb', 'lbs'],
  g: ['gram', 'grams', 'g'],
  kg: ['kilogram', 'kilograms', 'kg'],
  ml: ['milliliter', 'milliliters', 'millilitre', 'millilitres', 'ml'],
  l: ['liter', 'liters', 'litre', 'litres', 'l'],
  quart: ['quart', 'quarts', 'qt'],
  pint: ['pint', 'pints', 'pt'],
  clove: ['clove', 'cloves'],
  can: ['can', 'cans'],
  jar: ['jar', 'jars'],
  package: ['package', 'packages', 'pkg', 'packet', 'packets'],
  slice: ['slice', 'slices'],
  stick: ['stick', 'sticks'],
  bunch: ['bunch', 'bunches'],
  sprig: ['sprig', 'sprigs'],
  stalk: ['stalk', 'stalks'],
  head: ['head', 'heads'],
  pinch: ['pinch', 'pinches'],
  dash: ['dash', 'dashes'],
  piece: ['piece', 'pieces'],
};
for (const [canonical, variants] of Object.entries(unitGroups)) {
  for (const v of variants) UNITS[v] = canonical;
}

function parseNumber(token: string): number | null {
  if (/^\d+\/\d+$/.test(token)) {
    const [n, d] = token.split('/').map(Number);
    return d ? n / d : null;
  }
  if (/^(\d+\.?\d*|\.\d+)$/.test(token)) return Number(token);
  return null;
}

/** Turn a free-text line like "1 ½ cups flour, sifted" into quantity / unit / name. */
export function parseIngredient(input: string): Ingredient {
  const raw = input.replace(/\s+/g, ' ').trim();
  let s = raw.replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (ch) => ` ${UNICODE_FRACTIONS[ch]} `);
  // "2-3 cloves" / "2 to 3 cloves" -> use the lower bound
  s = s.replace(/^\s*([\d./]+)\s*(?:-|–|—|to)\s*[\d./]+/, '$1');
  const tokens = s.trim().split(/\s+/);

  let quantity: number | null = null;
  while (tokens.length) {
    const value = parseNumber(tokens[0]);
    if (value === null) break;
    if (quantity === null) quantity = value;
    else if (value < 1) quantity += value;
    else break;
    tokens.shift();
  }

  let unit = '';
  if (quantity !== null && tokens.length > 1) {
    const candidate = tokens[0].toLowerCase().replace(/\.$/, '');
    if (UNITS[candidate]) {
      unit = UNITS[candidate];
      tokens.shift();
      if (tokens[0]?.toLowerCase() === 'of') tokens.shift();
    }
  }

  const name = tokens.join(' ').trim() || raw;
  return { raw, quantity: quantity === null ? null : Math.round(quantity * 1000) / 1000, unit, name };
}

const PROTEIN_KEYWORDS: [Protein, RegExp][] = [
  ['chicken', /\bchicken\b|\bdrumsticks?\b/],
  ['turkey', /\bturkey\b/],
  ['beef', /\bbeef\b|\bsteaks?\b|\bbrisket\b|\bsirloin\b|\bchuck roast\b|\bshort ribs?\b|\bveal\b/],
  ['pork', /\bpork\b|\bbacon\b|\bham\b|\bsausages?\b|\bprosciutto\b|\bpancetta\b|\bchorizo\b|\bpepperoni\b/],
  ['lamb', /\blamb\b/],
  ['seafood', /\bfish\b|\bsalmon\b|\bshrimps?\b|\bprawns?\b|\btuna\b|\bcod\b|\btilapia\b|\bhalibut\b|\bscallops?\b|\bcrab\b|\blobster\b|\bmussels?\b|\bclams?\b|\banchov(y|ies)\b|\bmahi\b|\btrout\b/],
];
const NOT_MEAT = /\b(broth|stock|bouillon|fish sauce|oyster sauce|seasoning)\b/;

/** Guess the main protein from the title first, then from the ingredient list. */
export function detectProtein(title: string, ingredients: Ingredient[]): Protein {
  const t = title.toLowerCase();
  for (const [protein, re] of PROTEIN_KEYWORDS) if (re.test(t)) return protein;

  const counts = new Map<Protein, number>();
  for (const ing of ingredients) {
    const n = ing.name.toLowerCase();
    if (NOT_MEAT.test(n)) continue;
    for (const [protein, re] of PROTEIN_KEYWORDS) {
      if (re.test(n)) counts.set(protein, (counts.get(protein) ?? 0) + 1);
    }
  }
  let best: Protein = 'vegetarian';
  let bestCount = 0;
  for (const [protein, count] of counts) {
    if (count > bestCount) {
      best = protein;
      bestCount = count;
    }
  }
  return best;
}
