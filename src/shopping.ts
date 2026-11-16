import { Ingredient } from './ingredients';

export interface ShoppingItem {
  name: string;
  amounts: { quantity: number; unit: string }[];
  recipes: string[];
}
export interface ShoppingCategory {
  category: string;
  items: ShoppingItem[];
}

const DESCRIPTORS = new Set([
  'fresh', 'freshly', 'chopped', 'diced', 'minced', 'sliced', 'grated', 'shredded',
  'large', 'small', 'medium', 'boneless', 'skinless', 'finely', 'thinly', 'roughly',
  'coarsely', 'peeled', 'cooked', 'uncooked', 'ripe', 'extra-virgin', 'unsalted',
  'salted', 'low-sodium', 'packed', 'softened', 'melted', 'cubed', 'halved',
  'trimmed', 'rinsed', 'drained', 'divided', 'whole', 'lean', 'raw', 'thick-cut',
  'and', 'deveined', 'toasted', 'crumbled', 'juiced', 'zested', 'cold', 'warm', 'hot',
]);

function singular(word: string): string {
  if (word.length < 4) return word;
  if (/(oes)$/.test(word)) return word.slice(0, -2);
  if (/(ies)$/.test(word)) return word.slice(0, -3) + 'y';
  if (/(ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2);
  if (/s$/.test(word) && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

/** Reduce "2 large yellow onions, finely diced" style names to a mergeable key like "yellow onion". */
export function normalizeName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(to taste|for serving|for garnish|as needed|optional|plus more.*)\b/g, ' ')
    .split(',')[0]
    .replace(/[^a-z0-9\s'-]/g, ' ');
  const words = cleaned.split(/\s+/).filter((w) => w && !DESCRIPTORS.has(w));
  if (words.length === 0) return name.toLowerCase().trim();
  words[words.length - 1] = singular(words[words.length - 1]);
  return words.join(' ');
}

const CATEGORY_RULES: [string, RegExp][] = [
  ['Produce', /green bean|bean sprout|coleslaw/],
  ['Pantry', /broth|stock|paste|sauce|canned|crushed tomato|diced tomato|coconut milk|peanut butter|powder|flake|dried|black pepper|\boil\b|vinegar|bean\b|chickpea|lentil|seasoning|salsa/],
  ['Bakery', /bread|\bbun\b|tortilla|pita|naan|\broll\b|baguette|crouton/],
  ['Meat & Seafood', /chicken|beef|pork|bacon|sausage|turkey|lamb|salmon|shrimp|fish|\bcod\b|tuna|steak|\bham\b|prosciutto|pancetta|chorizo/],
  ['Dairy & Eggs', /milk|cream|butter|cheese|yogurt|\begg\b|parmesan|mozzarella|cheddar|feta|ricotta/],
  ['Produce', /onion|garlic|tomato|pepper|carrot|celery|lettuce|spinach|kale|potato|lemon|lime|cilantro|parsley|basil|ginger|mushroom|zucchini|broccoli|avocado|cucumber|scallion|cabbage|sprout|apple|thyme|rosemary|dill|mint|shallot|squash|corn\b|pea\b|green bean|asparagus|eggplant|cauliflower|jalape|orange|berry|arugula|chive|leek/],
];
const CATEGORY_ORDER = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery', 'Pantry'];

function categorize(name: string): string {
  for (const [category, re] of CATEGORY_RULES) if (re.test(name)) return category;
  return 'Pantry';
}

/** Merge the ingredients of several recipes into one list grouped by store section. */
export function buildShoppingList(
  recipes: { title: string; ingredients: Ingredient[] }[],
): ShoppingCategory[] {
  const items = new Map<string, ShoppingItem>();
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const key = normalizeName(ing.name);
      if (!key || key === 'water') continue;
      let item = items.get(key);
      if (!item) {
        item = { name: key.charAt(0).toUpperCase() + key.slice(1), amounts: [], recipes: [] };
        items.set(key, item);
      }
      if (!item.recipes.includes(recipe.title)) item.recipes.push(recipe.title);
      if (ing.quantity !== null) {
        const existing = item.amounts.find((a) => a.unit === ing.unit);
        if (existing) existing.quantity = Math.round((existing.quantity + ing.quantity) * 1000) / 1000;
        else item.amounts.push({ quantity: ing.quantity, unit: ing.unit });
      }
    }
  }

  const byCategory = new Map<string, ShoppingItem[]>();
  for (const [key, item] of items) {
    const category = categorize(key);
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(item);
  }
  return CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((category) => ({
    category,
    items: byCategory.get(category)!.sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
