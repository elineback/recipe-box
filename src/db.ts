import { Pool } from 'pg';
import { parseIngredient } from './ingredients';
import { SEED_EXTRAS, SEED_RECIPES, SeedRecipe } from './seed';

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://recipes:recipes@localhost:5432/recipes',
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS recipes (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  protein      TEXT NOT NULL DEFAULT 'vegetarian',
  servings     INTEGER,
  prep_minutes INTEGER,
  cook_minutes INTEGER,
  image_url    TEXT,
  source_url   TEXT,
  ingredients  JSONB NOT NULL DEFAULT '[]',
  steps        JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tips JSONB NOT NULL DEFAULT '[]';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS meal_types TEXT[] NOT NULL DEFAULT '{dinner}';

CREATE TABLE IF NOT EXISTS plans (
  id         SERIAL PRIMARY KEY,
  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_days (
  plan_id   INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
  PRIMARY KEY (plan_id, day_index)
);

-- Sides, desserts etc. served alongside a night's main dinner.
CREATE TABLE IF NOT EXISTS plan_day_extras (
  plan_id   INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, day_index, recipe_id)
);

CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

async function waitForDb(): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt >= 30) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

/** Insert a batch of starter recipes once, tracked by a key so deleted ones never come back. */
async function seedOnce(key: string, recipes: SeedRecipe[]): Promise<void> {
  const first = await pool.query(
    `INSERT INTO app_meta (key, value) VALUES ($1, 'true') ON CONFLICT DO NOTHING RETURNING key`,
    [key],
  );
  if (first.rowCount === 0) return;
  for (const r of recipes) {
    await pool.query(
      `INSERT INTO recipes (title, description, protein, servings, prep_minutes, cook_minutes, ingredients, steps, meal_types)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        r.title,
        r.description,
        r.protein,
        r.servings,
        r.prep,
        r.cook,
        JSON.stringify(r.ingredients.map(parseIngredient)),
        JSON.stringify(r.steps),
        r.types ?? ['dinner'],
      ],
    );
  }
  console.log(`Seeded ${recipes.length} starter recipes (${key})`);
}

export async function initDb(): Promise<void> {
  await waitForDb();
  await pool.query(SCHEMA);
  await seedOnce('seeded', SEED_RECIPES);
  await seedOnce('seeded_sides_desserts', SEED_EXTRAS);
}
