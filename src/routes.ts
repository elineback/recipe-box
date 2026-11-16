import { Router } from 'express';
import { pool } from './db';
import { importRecipeFromUrl, ImportError } from './importer';
import { cleanMealTypes, detectProtein, Ingredient, parseIngredient, PROTEINS } from './ingredients';
import { pickReplacement, planWeek } from './planner';
import { buildShoppingList } from './shopping';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const router = Router();

// ---------- helpers ----------

function intOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function httpUrlOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v : typeof v?.raw === 'string' ? v.raw : ''))
    .map((s) => s.trim())
    .filter(Boolean);
}

function recipeFromBody(body: any) {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) throw new HttpError(400, 'A recipe needs a title.');
  const ingredients: Ingredient[] = stringList(body.ingredients).map(parseIngredient);
  if (ingredients.length === 0) throw new HttpError(400, 'Add at least one ingredient.');
  const protein = (PROTEINS as readonly string[]).includes(body.protein)
    ? (body.protein as string)
    : detectProtein(title, ingredients);
  return {
    title,
    description: typeof body.description === 'string' ? body.description.trim() : '',
    protein,
    servings: intOrNull(body.servings),
    prep_minutes: intOrNull(body.prep_minutes),
    cook_minutes: intOrNull(body.cook_minutes),
    image_url: httpUrlOrNull(body.image_url),
    source_url: httpUrlOrNull(body.source_url),
    ingredients,
    steps: stringList(body.steps),
    tips: stringList(body.tips),
    meal_types: cleanMealTypes(body.meal_types),
  };
}

function idParam(value: unknown): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 0) throw new HttpError(400, 'Invalid id.');
  return id;
}

// ---------- recipes ----------

router.get('/recipes', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const protein = typeof req.query.protein === 'string' ? req.query.protein : '';
  const where: string[] = [];
  const params: unknown[] = [];
  // Every word must match somewhere in the title, description or ingredients.
  for (const word of q.split(/\s+/).filter(Boolean).slice(0, 8)) {
    params.push(`%${word.replace(/[\\%_]/g, '\\$&')}%`);
    const p = `$${params.length}`;
    where.push(`(title ILIKE ${p} OR description ILIKE ${p} OR ingredients::text ILIKE ${p})`);
  }
  if (protein) {
    params.push(protein);
    where.push(`protein = $${params.length}`);
  }
  if (typeof req.query.type === 'string' && req.query.type) {
    params.push(req.query.type);
    where.push(`$${params.length} = ANY(meal_types)`);
  }
  const { rows } = await pool.query(
    `SELECT id, title, description, protein, meal_types, servings, prep_minutes, cook_minutes, image_url
       FROM recipes ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY title`,
    params,
  );
  res.json(rows);
});

router.get('/recipes/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM recipes WHERE id = $1', [idParam(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Recipe not found.');
  res.json(rows[0]);
});

router.post('/recipes', async (req, res) => {
  const r = recipeFromBody(req.body);
  const { rows } = await pool.query(
    `INSERT INTO recipes (title, description, protein, servings, prep_minutes, cook_minutes, image_url, source_url, ingredients, steps, tips, meal_types)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [r.title, r.description, r.protein, r.servings, r.prep_minutes, r.cook_minutes, r.image_url, r.source_url, JSON.stringify(r.ingredients), JSON.stringify(r.steps), JSON.stringify(r.tips), r.meal_types],
  );
  res.status(201).json(rows[0]);
});

router.put('/recipes/:id', async (req, res) => {
  const r = recipeFromBody(req.body);
  const { rows } = await pool.query(
    `UPDATE recipes SET title=$1, description=$2, protein=$3, servings=$4, prep_minutes=$5, cook_minutes=$6,
            image_url=$7, source_url=$8, ingredients=$9, steps=$10, tips=$12, meal_types=$13
      WHERE id=$11 RETURNING *`,
    [r.title, r.description, r.protein, r.servings, r.prep_minutes, r.cook_minutes, r.image_url, r.source_url, JSON.stringify(r.ingredients), JSON.stringify(r.steps), idParam(req.params.id), JSON.stringify(r.tips), r.meal_types],
  );
  if (!rows[0]) throw new HttpError(404, 'Recipe not found.');
  res.json(rows[0]);
});

router.delete('/recipes/:id', async (req, res) => {
  await pool.query('DELETE FROM recipes WHERE id = $1', [idParam(req.params.id)]);
  res.status(204).end();
});

/** Fetch a recipe page and return a draft for the user to review. Nothing is saved yet. */
router.post('/import', async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url : '';
  if (!url.trim()) throw new HttpError(400, 'Paste a recipe link first.');
  try {
    res.json(await importRecipeFromUrl(url));
  } catch (err) {
    if (err instanceof ImportError) throw new HttpError(422, err.message);
    throw err;
  }
});

// ---------- weekly plan ----------

async function latestPlanId(): Promise<number | null> {
  const { rows } = await pool.query('SELECT id FROM plans ORDER BY id DESC LIMIT 1');
  return rows[0]?.id ?? null;
}

async function loadPlan() {
  const planRes = await pool.query('SELECT id, status, created_at FROM plans ORDER BY id DESC LIMIT 1');
  const plan = planRes.rows[0];
  if (!plan) return null;
  const { rows } = await pool.query(
    `SELECT d.day_index, r.id, r.title, r.description, r.protein, r.meal_types, r.image_url, r.prep_minutes, r.cook_minutes
       FROM plan_days d LEFT JOIN recipes r ON r.id = d.recipe_id
      WHERE d.plan_id = $1`,
    [plan.id],
  );
  const extras = await pool.query(
    `SELECT e.day_index, r.id, r.title, r.protein, r.meal_types, r.image_url, r.prep_minutes, r.cook_minutes
       FROM plan_day_extras e JOIN recipes r ON r.id = e.recipe_id
      WHERE e.plan_id = $1 ORDER BY r.title`,
    [plan.id],
  );
  const days = DAY_NAMES.map((dayName, dayIndex) => {
    const row = rows.find((r) => r.day_index === dayIndex);
    const recipe = row?.id
      ? { id: row.id, title: row.title, description: row.description, protein: row.protein, meal_types: row.meal_types, image_url: row.image_url, prep_minutes: row.prep_minutes, cook_minutes: row.cook_minutes }
      : null;
    const dayExtras = extras.rows
      .filter((e) => e.day_index === dayIndex)
      .map(({ day_index, ...recipe }) => recipe);
    return { dayIndex, dayName, recipe, extras: dayExtras, sameAsPrevious: false };
  });
  for (let i = 1; i < days.length; i++) {
    const a = days[i - 1].recipe;
    const b = days[i].recipe;
    days[i].sameAsPrevious = !!a && !!b && a.protein === b.protein;
  }
  return { id: plan.id as number, status: plan.status as string, days };
}

async function draftPlanId(): Promise<number> {
  const { rows } = await pool.query('SELECT id, status FROM plans ORDER BY id DESC LIMIT 1');
  if (!rows[0]) throw new HttpError(404, 'No week has been planned yet.');
  if (rows[0].status !== 'draft') {
    throw new HttpError(409, 'This week is confirmed. Reopen it to make changes.');
  }
  return rows[0].id;
}

function dayParam(value: unknown): number {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 0 || day > 6) throw new HttpError(400, 'Invalid day.');
  return day;
}

router.get('/plan', async (_req, res) => {
  res.json(await loadPlan());
});

/** Plan a fresh week. It starts as a draft ("preview") until confirmed. */
router.post('/plan/generate', async (_req, res) => {
  const { rows: recipes } = await pool.query(`SELECT id, protein FROM recipes WHERE 'dinner' = ANY(meal_types)`);
  if (recipes.length === 0) {
    throw new HttpError(400, 'There are no dinner recipes yet. Add one, or mark an existing recipe as Dinner.');
  }
  const ids = planWeek(recipes, 7);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM plans');
    const { rows } = await client.query(`INSERT INTO plans (status) VALUES ('draft') RETURNING id`);
    for (let day = 0; day < ids.length; day++) {
      await client.query('INSERT INTO plan_days (plan_id, day_index, recipe_id) VALUES ($1, $2, $3)', [rows[0].id, day, ids[day]]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  res.json(await loadPlan());
});

/** Replace one night with a specific recipe. */
router.put('/plan/days/:day', async (req, res) => {
  const day = dayParam(req.params.day);
  const planId = await draftPlanId();
  const recipeId = idParam(req.body?.recipeId);
  const exists = await pool.query('SELECT 1 FROM recipes WHERE id = $1', [recipeId]);
  if (!exists.rowCount) throw new HttpError(404, 'Recipe not found.');
  await pool.query(
    `INSERT INTO plan_days (plan_id, day_index, recipe_id) VALUES ($1, $2, $3)
     ON CONFLICT (plan_id, day_index) DO UPDATE SET recipe_id = EXCLUDED.recipe_id`,
    [planId, day, recipeId],
  );
  res.json(await loadPlan());
});

/** Replace one night with a random recipe that fits the protein rule. */
router.post('/plan/days/:day/shuffle', async (req, res) => {
  const day = dayParam(req.params.day);
  const planId = await draftPlanId();
  const plan = (await loadPlan())!;
  const { rows: recipes } = await pool.query(`SELECT id, protein FROM recipes WHERE 'dinner' = ANY(meal_types)`);
  const neighbors = [plan.days[day - 1], plan.days[day + 1]]
    .map((d) => d?.recipe?.protein)
    .filter((p): p is string => !!p);
  const inPlan = plan.days.map((d) => d.recipe?.id).filter((id): id is number => !!id);
  const pick = pickReplacement(recipes, plan.days[day].recipe?.id ?? null, inPlan, neighbors);
  if (pick === null) throw new HttpError(400, 'There are no other dinner recipes to swap in.');
  await pool.query(
    `INSERT INTO plan_days (plan_id, day_index, recipe_id) VALUES ($1, $2, $3)
     ON CONFLICT (plan_id, day_index) DO UPDATE SET recipe_id = EXCLUDED.recipe_id`,
    [planId, day, pick],
  );
  res.json(await loadPlan());
});

/** Add a side, dessert or any other recipe alongside a night's dinner. */
router.post('/plan/days/:day/extras', async (req, res) => {
  const day = dayParam(req.params.day);
  const planId = await draftPlanId();
  const recipeId = idParam(req.body?.recipeId);
  const exists = await pool.query('SELECT 1 FROM recipes WHERE id = $1', [recipeId]);
  if (!exists.rowCount) throw new HttpError(404, 'Recipe not found.');
  await pool.query(
    'INSERT INTO plan_day_extras (plan_id, day_index, recipe_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [planId, day, recipeId],
  );
  res.json(await loadPlan());
});

router.delete('/plan/days/:day/extras/:recipeId', async (req, res) => {
  const day = dayParam(req.params.day);
  const planId = await draftPlanId();
  await pool.query(
    'DELETE FROM plan_day_extras WHERE plan_id = $1 AND day_index = $2 AND recipe_id = $3',
    [planId, day, idParam(req.params.recipeId)],
  );
  res.json(await loadPlan());
});

router.post('/plan/confirm', async (_req, res) => {
  const id = await latestPlanId();
  if (id === null) throw new HttpError(404, 'No week has been planned yet.');
  await pool.query(`UPDATE plans SET status = 'confirmed' WHERE id = $1`, [id]);
  res.json(await loadPlan());
});

router.post('/plan/reopen', async (_req, res) => {
  const id = await latestPlanId();
  if (id === null) throw new HttpError(404, 'No week has been planned yet.');
  await pool.query(`UPDATE plans SET status = 'draft' WHERE id = $1`, [id]);
  res.json(await loadPlan());
});

router.get('/plan/shopping-list', async (_req, res) => {
  const id = await latestPlanId();
  if (id === null) throw new HttpError(404, 'No week has been planned yet.');
  const { rows } = await pool.query(
    `SELECT r.title, r.ingredients, x.day_index, x.is_extra
       FROM (SELECT day_index, recipe_id, false AS is_extra FROM plan_days WHERE plan_id = $1
             UNION ALL
             SELECT day_index, recipe_id, true FROM plan_day_extras WHERE plan_id = $1) x
       JOIN recipes r ON r.id = x.recipe_id
      ORDER BY x.day_index, x.is_extra, r.title`,
    [id],
  );
  res.json({
    planId: id,
    dinnerCount: rows.filter((r) => !r.is_extra).length,
    extraCount: rows.filter((r) => r.is_extra).length,
    categories: buildShoppingList(rows),
  });
});
