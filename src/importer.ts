import * as cheerio from 'cheerio';
import { detectProtein, parseIngredient } from './ingredients';

export interface RecipeDraft {
  title: string;
  description: string;
  protein: string;
  servings: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  image_url: string | null;
  source_url: string;
  ingredients: string[];
  steps: string[];
}

export class ImportError extends Error {}

function decode(text: unknown): string {
  if (typeof text !== 'string') return '';
  // Recipe sites often HTML-encode text inside JSON-LD; cheerio decodes entities and strips tags.
  return cheerio.load(`<div>${text}</div>`)('div').text().replace(/\s+/g, ' ').trim();
}

function isRecipe(node: any): boolean {
  const type = node?.['@type'];
  return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
}

function findRecipe(node: any, depth = 0): any | null {
  if (!node || typeof node !== 'object' || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findRecipe(child, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (isRecipe(node)) return node;
  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage']) {
    const found = findRecipe(node[key], depth + 1);
    if (found) return found;
  }
  return null;
}

/** ISO-8601 duration ("PT1H30M") -> minutes. */
function minutes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:\d+(?:\.\d+)?S)?)?$/i);
  if (!m) return null;
  const total = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return total > 0 ? Math.round(total) : null;
}

function imageUrl(image: any): string | null {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return imageUrl(image[0]);
  if (typeof image === 'object') return imageUrl(image.url);
  return null;
}

function servings(value: any): number | null {
  const first = Array.isArray(value) ? value[0] : value;
  const m = String(first ?? '').match(/\d+/);
  return m ? Number(m[0]) : null;
}

function instructions(value: any): string[] {
  if (!value) return [];
  if (typeof value === 'string') {
    return value
      .split(/\n+|(?<=\.)\s+(?=\d+\.\s)/)
      .map(decode)
      .filter(Boolean);
  }
  if (Array.isArray(value)) return value.flatMap(instructions);
  if (typeof value === 'object') {
    if (value.itemListElement) return instructions(value.itemListElement);
    const text = decode(value.text ?? value.name);
    return text ? [text] : [];
  }
  return [];
}

function absoluteHttpUrl(value: string | null, base: string): string | null {
  if (!value) return null;
  try {
    const u = new URL(value, base);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Extract a recipe from a page's schema.org JSON-LD (what nearly every recipe site publishes). */
export function extractRecipe(html: string, url: string): RecipeDraft {
  const $ = cheerio.load(html);
  let recipe: any = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (recipe) return;
    try {
      recipe = findRecipe(JSON.parse($(el).text()));
    } catch {
      /* ignore malformed blocks */
    }
  });
  if (!recipe) {
    throw new ImportError(
      "Couldn't find recipe data on that page. You can still add it with the manual wizard.",
    );
  }

  const ingredients = (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [])
    .map(decode)
    .filter(Boolean);
  const title = decode(recipe.name) || decode($('title').text()) || 'Untitled recipe';

  return {
    title,
    description: decode(recipe.description),
    protein: detectProtein(title, ingredients.map(parseIngredient)),
    servings: servings(recipe.recipeYield),
    prep_minutes: minutes(recipe.prepTime),
    cook_minutes: minutes(recipe.cookTime) ?? (recipe.prepTime ? null : minutes(recipe.totalTime)),
    image_url: absoluteHttpUrl(imageUrl(recipe.image), url),
    source_url: url,
    ingredients,
    steps: instructions(recipe.recipeInstructions),
  };
}

export async function importRecipeFromUrl(rawUrl: string): Promise<RecipeDraft> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new ImportError('That does not look like a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ImportError('Only http and https links can be imported.');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  } catch {
    throw new ImportError('Could not reach that site. Check the link and try again.');
  }
  if ([401, 402, 403, 429].includes(response.status)) {
    throw new ImportError(
      "That site doesn't allow automatic imports. Use the manual wizard for this recipe.",
    );
  }
  if (response.status === 404) {
    throw new ImportError('That page was not found. Check the link and try again.');
  }
  if (!response.ok) {
    throw new ImportError(`The site responded with an error (${response.status}).`);
  }
  const html = await response.text();
  return extractRecipe(html, url.toString());
}
