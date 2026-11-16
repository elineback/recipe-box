# Recipe Box

A recipe manager built with Node.js, TypeScript and PostgreSQL.

- **Add recipes** by pasting a link (imports the page's recipe data) or with a step-by-step wizard
- **Search** by name or ingredient and filter by protein
- **Plan a week of dinners** with one click — it avoids the same protein on back-to-back nights
- **Preview mode** — shuffle or hand-pick a replacement for any night before confirming
- **Shopping list** — ingredients for the week merged and grouped by store section

## Run it

You only need Docker.

```bash
docker compose up --build
```

Then open http://localhost:3000. Sixteen starter recipes are loaded the first time.

- Use a different port: `APP_PORT=8080 docker compose up --build`
- Stop: `docker compose down` (your recipes are kept in a Docker volume)
- Erase everything: `docker compose down -v`

## How it works

| Path | What it does |
| --- | --- |
| `src/server.ts` | Express app; serves the API and the web interface |
| `src/routes.ts` | REST API for recipes, import, week plan and shopping list |
| `src/importer.ts` | Reads schema.org recipe data (JSON-LD) from a web page |
| `src/ingredients.ts` | Parses "1 ½ cups flour" into amount / unit / name; detects the main protein |
| `src/planner.ts` | Picks the week: no repeated recipe, no protein two nights running |
| `src/shopping.ts` | Merges ingredients across recipes into a categorized list |
| `src/db.ts` | Database connection, schema and first-run seed data |
| `public/` | The web interface (plain HTML, CSS and JavaScript) |

URL import works with sites that publish standard recipe data, which most recipe sites do.
If a site blocks automated requests or has no recipe data, use the manual wizard instead.

## Development without Docker

```bash
npm install
npm test
DATABASE_URL=postgres://user:pass@localhost:5432/recipes npm run dev
```
