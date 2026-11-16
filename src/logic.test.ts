import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractRecipe } from './importer';
import { detectProtein, parseIngredient } from './ingredients';
import { planWeek } from './planner';
import { buildShoppingList } from './shopping';

test('parseIngredient handles fractions, units and ranges', () => {
  assert.deepEqual(parseIngredient('1 ½ cups flour, sifted'), { raw: '1 ½ cups flour, sifted', quantity: 1.5, unit: 'cup', name: 'flour, sifted' });
  assert.equal(parseIngredient('2-3 cloves garlic').quantity, 2);
  assert.equal(parseIngredient('1/4 tsp salt').quantity, 0.25);
  assert.deepEqual(parseIngredient('Salt to taste'), { raw: 'Salt to taste', quantity: null, unit: '', name: 'Salt to taste' });
  assert.equal(parseIngredient('2 lemons').name, 'lemons');
});

test('detectProtein ignores broth and falls back to vegetarian', () => {
  assert.equal(detectProtein('Lentil Soup', [parseIngredient('4 cups chicken broth')]), 'vegetarian');
  assert.equal(detectProtein('Weeknight Skillet', [parseIngredient('1 lb ground beef')]), 'beef');
});

test('planWeek never repeats a protein on consecutive nights when avoidable', () => {
  const recipes = [
    ...['chicken', 'chicken', 'chicken', 'chicken', 'beef', 'beef', 'pork', 'seafood', 'vegetarian'].map(
      (protein, i) => ({ id: i + 1, protein }),
    ),
  ];
  const byId = new Map(recipes.map((r) => [r.id, r.protein]));
  for (let run = 0; run < 500; run++) {
    const week = planWeek(recipes);
    assert.equal(week.length, 7);
    assert.equal(new Set(week).size, 7, 'no recipe repeats');
    for (let i = 1; i < 7; i++) assert.notEqual(byId.get(week[i]), byId.get(week[i - 1]));
  }
});

test('planWeek still fills the week when rules cannot be met', () => {
  assert.equal(planWeek([{ id: 1, protein: 'chicken' }, { id: 2, protein: 'chicken' }]).length, 7);
  const lopsided = [...Array(40)].map((_, i) => ({ id: i + 1, protein: i === 0 ? 'beef' : 'chicken' }));
  assert.equal(planWeek(lopsided).length, 7);
  assert.deepEqual(planWeek([]), []);
});

test('buildShoppingList merges the same ingredient across recipes', () => {
  const list = buildShoppingList([
    { title: 'A', ingredients: ['2 cloves garlic, minced', '1 yellow onion, diced', '1 lb ground beef'].map(parseIngredient) },
    { title: 'B', ingredients: ['3 cloves garlic', '2 yellow onions', '1 cup chicken broth'].map(parseIngredient) },
  ]);
  const all = list.flatMap((c) => c.items);
  assert.deepEqual(all.find((i) => i.name === 'Garlic')?.amounts, [{ quantity: 5, unit: 'clove' }]);
  assert.deepEqual(all.find((i) => i.name === 'Yellow onion')?.amounts, [{ quantity: 3, unit: '' }]);
  assert.equal(list.find((c) => c.items.some((i) => i.name === 'Chicken broth'))?.category, 'Pantry');
});

test('extractRecipe reads schema.org JSON-LD', () => {
  const html = `<html><head><script type="application/ld+json">${JSON.stringify({
    '@graph': [
      { '@type': 'WebSite' },
      {
        '@type': ['Recipe'],
        name: 'Mom&#39;s Pork Chops',
        recipeYield: ['4', '4 servings'],
        prepTime: 'PT10M',
        cookTime: 'PT1H5M',
        image: { url: '/img/chops.jpg' },
        recipeIngredient: ['4 pork chops', '1 tbsp oil'],
        recipeInstructions: [{ '@type': 'HowToSection', itemListElement: [{ '@type': 'HowToStep', text: 'Sear.' }, { '@type': 'HowToStep', text: 'Rest.' }] }],
      },
    ],
  })}</script></head></html>`;
  const r = extractRecipe(html, 'https://example.com/r/1');
  assert.equal(r.title, "Mom's Pork Chops");
  assert.equal(r.protein, 'pork');
  assert.equal(r.servings, 4);
  assert.equal(r.cook_minutes, 65);
  assert.equal(r.image_url, 'https://example.com/img/chops.jpg');
  assert.deepEqual(r.steps, ['Sear.', 'Rest.']);
});
