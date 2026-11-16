import { Pool } from 'pg';
import { parseIngredient } from './ingredients';
import { SEED_RECIPES } from './seed';

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

export async function initDb(): Promise<void> {
  await waitForDb();
  await pool.query(SCHEMA);

  // Seed starter recipes exactly once, so deleting them all doesn't bring them back.
  const seeded = await pool.query(
    `INSERT INTO app_meta (key, value) VALUES ('seeded', 'true') ON CONFLICT DO NOTHING RETURNING key`,
  );
  if (seeded.rowCount === 0) return;
  for (const r of SEED_RECIPES) {
    await pool.query(
      `INSERT INTO recipes (title, description, protein, servings, prep_minutes, cook_minutes, ingredients, steps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        r.title,
        r.description,
        r.protein,
        r.servings,
        r.prep,
        r.cook,
        JSON.stringify(r.ingredients.map(parseIngredient)),
        JSON.stringify(r.steps),
      ],
    );
  }
  console.log(`Seeded ${SEED_RECIPES.length} starter recipes`);
}
