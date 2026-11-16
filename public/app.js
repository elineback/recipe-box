'use strict';

const PROTEINS = {
  chicken: { label: 'Chicken', emoji: '🍗' },
  beef: { label: 'Beef', emoji: '🥩' },
  pork: { label: 'Pork', emoji: '🥓' },
  seafood: { label: 'Seafood', emoji: '🐟' },
  turkey: { label: 'Turkey', emoji: '🦃' },
  lamb: { label: 'Lamb', emoji: '🍖' },
  vegetarian: { label: 'Vegetarian', emoji: '🥦' },
  other: { label: 'Other', emoji: '🍽️' },
};
const WIZARD_STEPS = ['Basics', 'Ingredients', 'Instructions', 'Helpful tips', 'Review'];

const state = {
  view: 'recipes',
  q: '',
  protein: '',
  wizard: null, // { step, id, imported, data }
  plan: null,
};

const main = document.getElementById('main');
const dialog = document.getElementById('dialog');
const toastEl = document.getElementById('toast');

// ---------- utilities ----------

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Something went wrong.');
  return data;
}

let toastTimer;
function toast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.className = 'show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.className = ''), isError ? 5000 : 2600);
}

function badge(protein) {
  const p = PROTEINS[protein] || PROTEINS.other;
  return `<span class="badge p-${esc(protein)}">${p.emoji} ${p.label}</span>`;
}

function thumb(recipe, cls = 'thumb') {
  const p = PROTEINS[recipe.protein] || PROTEINS.other;
  if (recipe.image_url) {
    return `<img class="${cls}" src="${esc(recipe.image_url)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`;
  }
  return `<div class="${cls} p-${esc(recipe.protein)}" aria-hidden="true">${p.emoji}</div>`;
}

function timeText(recipe) {
  const total = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0);
  if (!total) return '';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return '⏱ ' + (h ? `${h} hr${m ? ' ' + m + ' min' : ''}` : `${m} min`);
}

function formatQty(q) {
  const whole = Math.floor(q);
  const frac = q - whole;
  const fractions = [[0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.5, '½'], [0.667, '⅔'], [0.75, '¾']];
  const match = fractions.find(([v]) => Math.abs(v - frac) < 0.02);
  if (frac < 0.02) return String(whole);
  if (match) return (whole ? whole + ' ' : '') + match[1];
  return String(Math.round(q * 100) / 100);
}

function formatAmounts(amounts) {
  return amounts.map((a) => formatQty(a.quantity) + (a.unit ? ' ' + a.unit : '')).join(' + ');
}

function lines(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

// ---------- routing ----------

function route() {
  const view = location.hash.replace('#', '') || 'recipes';
  state.view = ['recipes', 'add', 'week', 'shopping'].includes(view) ? view : 'recipes';
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === state.view));
  render();
  window.scrollTo(0, 0);
}

function render() {
  ({ recipes: renderRecipes, add: renderAdd, week: renderWeek, shopping: renderShopping })[state.view]().catch(
    (err) => toast(err.message, true),
  );
}

// ---------- recipes ----------

async function renderRecipes() {
  main.innerHTML = `
    <div class="page-head">
      <div><h1>Recipes</h1><p class="muted" id="count">&nbsp;</p></div>
      <a class="btn primary" href="#add">＋ Add recipe</a>
    </div>
    <div class="search"><input type="search" id="q" placeholder="Search by name or ingredient…" value="${esc(state.q)}" aria-label="Search recipes" /></div>
    <div class="chips" id="chips"></div>
    <div id="results"></div>`;
  renderChips();
  let timer;
  document.getElementById('q').addEventListener('input', (e) => {
    state.q = e.target.value;
    clearTimeout(timer);
    timer = setTimeout(() => loadRecipes().catch((err) => toast(err.message, true)), 180);
  });
  await loadRecipes();
}

function renderChips() {
  const chips = [['', 'All'], ...Object.entries(PROTEINS).map(([k, v]) => [k, `${v.emoji} ${v.label}`])];
  document.getElementById('chips').innerHTML = chips
    .map(([key, label]) => `<button class="chip ${state.protein === key ? 'active' : ''}" data-action="filter" data-protein="${key}">${label}</button>`)
    .join('');
}

let loadSeq = 0;
async function loadRecipes() {
  const seq = ++loadSeq;
  const params = new URLSearchParams();
  if (state.q.trim()) params.set('q', state.q.trim());
  if (state.protein) params.set('protein', state.protein);
  const recipes = await api('/recipes?' + params);
  if (seq !== loadSeq || state.view !== 'recipes') return;
  const filtered = state.q.trim() || state.protein;
  document.getElementById('count').textContent = `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}${filtered ? ' found' : ' in your box'}`;
  const results = document.getElementById('results');
  if (recipes.length === 0) {
    results.innerHTML = filtered
      ? `<div class="empty"><div class="icon">🔎</div><h2>No recipes match</h2><p>Try a different word or clear the filters.</p><button class="btn" data-action="clear-filters">Clear filters</button></div>`
      : `<div class="empty"><div class="icon">📖</div><h2>Your recipe box is empty</h2><p>Import one from a link or type one in.</p><a class="btn primary" href="#add">Add your first recipe</a></div>`;
    return;
  }
  results.innerHTML = `<div class="grid">${recipes
    .map(
      (r) => `
      <button class="recipe-card" data-action="open-recipe" data-id="${r.id}">
        ${thumb(r)}
        <div class="body">
          <h3>${esc(r.title)}</h3>
          <p class="desc">${esc(r.description)}</p>
          <div class="meta">${badge(r.protein)}<span>${timeText(r)}</span></div>
        </div>
      </button>`,
    )
    .join('')}</div>`;
}

async function openRecipe(id) {
  const r = await api('/recipes/' + id);
  const facts = [timeText(r), r.servings ? `Serves ${r.servings}` : ''].filter(Boolean).join(' · ');
  dialog.innerHTML = `
    <div class="dlg-head">
      <div><h1>${esc(r.title)}</h1><div class="meta" style="margin-top:10px">${badge(r.protein)}<span>${facts}</span></div></div>
      <button class="close" data-action="close-dialog" aria-label="Close">✕</button>
    </div>
    <div class="dlg-body detail">
      ${r.image_url ? `<img class="hero" src="${esc(r.image_url)}" alt="" referrerpolicy="no-referrer" />` : ''}
      ${r.description ? `<p>${esc(r.description)}</p>` : ''}
      <h3>Ingredients</h3>
      <ul>${r.ingredients.map((i) => `<li>${esc(i.raw)}</li>`).join('')}</ul>
      ${r.steps.length ? `<h3>Instructions</h3><ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
      ${r.tips?.length ? `<div class="tips"><h3>💡 Helpful tips</h3><ul>${r.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      ${r.source_url ? `<p class="small" style="margin-top:18px"><a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer">View original recipe ↗</a></p>` : ''}
      <div class="btn-row">
        <button class="btn" data-action="edit-recipe" data-id="${r.id}">Edit</button>
        <button class="btn danger" data-action="delete-recipe" data-id="${r.id}">Delete</button>
      </div>
    </div>`;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

// ---------- add recipe: import + wizard ----------

function blankRecipe() {
  return { title: '', description: '', protein: 'auto', servings: '', prep_minutes: '', cook_minutes: '', image_url: '', source_url: '', ingredientsText: '', stepsText: '', tipsText: '' };
}

function startWizard(recipe, extra = {}) {
  state.wizard = {
    step: 0,
    id: extra.id || null,
    imported: !!extra.imported,
    data: {
      ...blankRecipe(),
      ...recipe,
      servings: recipe.servings ?? '',
      prep_minutes: recipe.prep_minutes ?? '',
      cook_minutes: recipe.cook_minutes ?? '',
      image_url: recipe.image_url ?? '',
      source_url: recipe.source_url ?? '',
    },
  };
}

async function renderAdd() {
  if (state.wizard) return renderWizard();
  main.innerHTML = `
    <div class="page-head"><div><h1>Add a recipe</h1><p class="muted">Import one from the web or enter it yourself.</p></div></div>
    <div class="choices">
      <form class="panel" id="import-form">
        <div class="icon">🔗</div>
        <h2>Import from a link</h2>
        <p class="muted">Paste the address of a recipe page. You'll get to review everything before it's saved.</p>
        <div class="inline-form">
          <input type="url" id="import-url" placeholder="https://…" required aria-label="Recipe link" />
          <button class="btn primary" id="import-btn">Import</button>
        </div>
      </form>
      <div class="panel">
        <div class="icon">✍️</div>
        <h2>Enter it manually</h2>
        <p class="muted">A short step-by-step form: basics, ingredients, instructions, then review.</p>
        <button class="btn primary" data-action="start-manual">Start</button>
      </div>
    </div>`;
  document.getElementById('import-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('import-btn');
    btn.disabled = true;
    btn.textContent = 'Importing…';
    try {
      const draft = await api('/import', { method: 'POST', body: { url: document.getElementById('import-url').value } });
      startWizard({ ...draft, ingredientsText: draft.ingredients.join('\n'), stepsText: draft.steps.join('\n') }, { imported: true });
      renderWizard();
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false;
      btn.textContent = 'Import';
    }
  });
}

function wizardStepHtml(w) {
  const d = w.data;
  if (w.step === 0) {
    return `
      <div class="field"><label for="f-title">Recipe name</label><input type="text" id="f-title" value="${esc(d.title)}" placeholder="e.g. Grandma's meatloaf" /></div>
      <div class="field"><label for="f-description">Short description <span class="hint">(optional)</span></label><input type="text" id="f-description" value="${esc(d.description)}" /></div>
      <div class="field-row">
        <div class="field"><label for="f-protein">Main protein</label>
          <select id="f-protein">
            <option value="auto" ${d.protein === 'auto' ? 'selected' : ''}>Detect from ingredients</option>
            ${Object.entries(PROTEINS).map(([k, v]) => `<option value="${k}" ${d.protein === k ? 'selected' : ''}>${v.label}</option>`).join('')}
          </select></div>
        <div class="field"><label for="f-servings">Servings</label><input type="number" min="0" id="f-servings" value="${esc(d.servings)}" /></div>
        <div class="field"><label for="f-prep_minutes">Prep (minutes)</label><input type="number" min="0" id="f-prep_minutes" value="${esc(d.prep_minutes)}" /></div>
        <div class="field"><label for="f-cook_minutes">Cook (minutes)</label><input type="number" min="0" id="f-cook_minutes" value="${esc(d.cook_minutes)}" /></div>
      </div>
      <div class="field"><label for="f-image_url">Photo link <span class="hint">(optional)</span></label><input type="url" id="f-image_url" value="${esc(d.image_url)}" placeholder="https://…" /></div>`;
  }
  if (w.step === 1) {
    return `
      <div class="field"><label for="f-ingredientsText">Ingredients <span class="hint">— one per line, amount first</span></label>
      <textarea id="f-ingredientsText" rows="10" placeholder="2 lb chicken thighs&#10;1 tbsp olive oil&#10;3 cloves garlic, minced">${esc(d.ingredientsText)}</textarea></div>
      <p class="muted small">Starting each line with the amount (like "1 1/2 cups flour") lets the shopping list add things up.</p>`;
  }
  if (w.step === 2) {
    return `
      <div class="field"><label for="f-stepsText">Instructions <span class="hint">— one step per line</span></label>
      <textarea id="f-stepsText" rows="10" placeholder="Heat the oven to 400°F.&#10;Season the chicken…">${esc(d.stepsText)}</textarea></div>`;
  }
  if (w.step === 3) {
    return `
      <div class="field"><label for="f-tipsText">Helpful tips <span class="hint">— optional, one per line</span></label>
      <textarea id="f-tipsText" rows="8" placeholder="Let the meat rest 10 minutes before slicing.&#10;Swap the cream for coconut milk to make it dairy-free.&#10;Leftovers keep 3 days in the fridge.">${esc(d.tipsText)}</textarea></div>
      <p class="muted small">Things worth remembering next time: substitutions, make-ahead and storage notes, what to serve it with.</p>`;
  }
  const facts = [
    d.protein === 'auto' ? 'Protein: detected when saved' : `Protein: ${PROTEINS[d.protein]?.label || d.protein}`,
    d.servings ? `Serves ${d.servings}` : '',
    d.prep_minutes ? `Prep ${d.prep_minutes} min` : '',
    d.cook_minutes ? `Cook ${d.cook_minutes} min` : '',
  ].filter(Boolean).join(' · ');
  return `
    <div class="review">
      <h2>${esc(d.title)}</h2>
      ${d.description ? `<p class="muted" style="margin-top:4px">${esc(d.description)}</p>` : ''}
      <p class="small" style="margin-top:8px">${esc(facts)}</p>
      <h3>Ingredients (${lines(d.ingredientsText).length})</h3>
      <ul>${lines(d.ingredientsText).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <h3>Instructions (${lines(d.stepsText).length})</h3>
      ${lines(d.stepsText).length ? `<ol>${lines(d.stepsText).map((l) => `<li>${esc(l)}</li>`).join('')}</ol>` : '<p class="muted">None added.</p>'}
      ${lines(d.tipsText).length ? `<h3>Helpful tips (${lines(d.tipsText).length})</h3><ul>${lines(d.tipsText).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    </div>`;
}

function renderWizard() {
  const w = state.wizard;
  const last = w.step === WIZARD_STEPS.length - 1;
  main.innerHTML = `
    <div class="page-head"><div><h1>${w.id ? 'Edit recipe' : w.imported ? 'Review imported recipe' : 'New recipe'}</h1></div></div>
    <div class="panel">
      ${w.imported && w.step === 0 ? '<div class="notice info">Imported! Check each step and fix anything that looks off before saving.</div>' : ''}
      <ol class="steps-bar">${WIZARD_STEPS.map((s, i) => `<li class="${i === w.step ? 'current' : i < w.step ? 'done' : ''}"><b>${i < w.step ? '✓' : i + 1}</b>${s}</li>`).join('')}</ol>
      ${wizardStepHtml(w)}
      <div class="wizard-foot">
        <button class="btn" data-action="wizard-cancel">Cancel</button>
        <div class="btn-row">
          ${w.step > 0 ? '<button class="btn" data-action="wizard-back">← Back</button>' : ''}
          <button class="btn primary" data-action="${last ? 'wizard-save' : 'wizard-next'}">${last ? 'Save recipe' : 'Next →'}</button>
        </div>
      </div>
    </div>`;
  main.querySelector('input, textarea')?.focus();
}

function captureWizard() {
  const d = state.wizard.data;
  for (const key of Object.keys(d)) {
    const el = document.getElementById('f-' + key);
    if (el) d[key] = el.value;
  }
}

function wizardNext() {
  captureWizard();
  const w = state.wizard;
  if (w.step === 0 && !w.data.title.trim()) return toast('Give the recipe a name first.', true);
  if (w.step === 1 && lines(w.data.ingredientsText).length === 0) return toast('Add at least one ingredient.', true);
  w.step++;
  renderWizard();
}

async function wizardSave() {
  const w = state.wizard;
  const d = w.data;
  const body = {
    title: d.title, description: d.description, protein: d.protein, servings: d.servings,
    prep_minutes: d.prep_minutes, cook_minutes: d.cook_minutes, image_url: d.image_url, source_url: d.source_url,
    ingredients: lines(d.ingredientsText), steps: lines(d.stepsText), tips: lines(d.tipsText),
  };
  const saved = await api(w.id ? '/recipes/' + w.id : '/recipes', { method: w.id ? 'PUT' : 'POST', body });
  state.wizard = null;
  toast(`Saved "${saved.title}"`);
  if (location.hash === '#recipes') route();
  else location.hash = '#recipes';
}

// ---------- week plan ----------

async function renderWeek() {
  state.plan = await api('/plan');
  const plan = state.plan;
  if (!plan) {
    main.innerHTML = `
      <div class="page-head"><div><h1>This week</h1></div></div>
      <div class="empty"><div class="icon">🗓️</div><h2>No dinners planned yet</h2>
        <p>One click picks seven dinners, without the same protein two nights in a row.</p>
        <button class="btn primary big" data-action="generate-plan">Plan my week</button></div>`;
    return;
  }
  const draft = plan.status === 'draft';
  const conflicts = plan.days.filter((d) => d.sameAsPrevious).length;
  main.innerHTML = `
    <div class="page-head">
      <div><h1>This week's dinners</h1><p class="muted">${draft ? 'Preview — swap anything you like, then confirm.' : 'Confirmed.'}</p></div>
      <button class="btn" data-action="generate-plan">↻ Plan a new week</button>
    </div>
    ${draft
      ? `<div class="notice info"><b>Preview mode.</b> Use <b>Shuffle</b> for a random replacement or <b>Choose…</b> to pick a specific recipe.</div>`
      : `<div class="notice ok"><b>Week confirmed.</b> Your shopping list is ready.</div>`}
    ${conflicts ? `<div class="notice warn">⚠ ${conflicts === 1 ? 'One night has' : conflicts + ' nights have'} the same protein as the night before.</div>` : ''}
    <div class="week">${plan.days.map((d) => dayHtml(d, draft)).join('')}</div>
    <div class="week-foot">
      <span class="muted small">${draft ? 'Happy with the week?' : 'Need to change something?'}</span>
      <div class="btn-row">
        ${draft
          ? `<button class="btn primary big" data-action="confirm-plan">✓ Confirm week</button>`
          : `<button class="btn" data-action="reopen-plan">Edit week</button><a class="btn primary big" href="#shopping">🛒 View shopping list</a>`}
      </div>
    </div>`;
}

function dayHtml(day, draft) {
  const r = day.recipe;
  return `
    <div class="day ${day.sameAsPrevious ? 'conflict' : ''}">
      <div class="dayname">${day.dayName}</div>
      ${r ? thumb(r) : '<div class="thumb p-other" aria-hidden="true">—</div>'}
      <div class="info">
        ${r
          ? `<button class="title" data-action="open-recipe" data-id="${r.id}">${esc(r.title)}</button>
             <div class="meta">${badge(r.protein)}<span>${timeText(r)}</span></div>`
          : '<span class="muted">No recipe (it was deleted)</span>'}
        ${day.sameAsPrevious ? '<span class="warn-text">⚠ Same protein as the night before</span>' : ''}
      </div>
      ${draft
        ? `<div class="btn-row">
             <button class="btn sm" data-action="shuffle-day" data-day="${day.dayIndex}" aria-label="Shuffle ${day.dayName}">🔀 Shuffle</button>
             <button class="btn sm" data-action="choose-day" data-day="${day.dayIndex}" aria-label="Choose a recipe for ${day.dayName}">Choose…</button>
           </div>`
        : '<div></div>'}
    </div>`;
}

async function openPicker(dayIndex) {
  const recipes = await api('/recipes');
  const days = state.plan.days;
  const day = days[dayIndex];
  const neighbors = [days[dayIndex - 1], days[dayIndex + 1]].filter((d) => d && d.recipe);
  const inPlan = new Set(days.filter((d) => d.recipe && d.dayIndex !== dayIndex).map((d) => d.recipe.id));

  dialog.innerHTML = `
    <div class="dlg-head">
      <div><h1>Choose ${esc(day.dayName)}'s dinner</h1>${day.recipe ? `<p class="muted small" style="margin-top:4px">Currently: ${esc(day.recipe.title)}</p>` : ''}</div>
      <button class="close" data-action="close-dialog" aria-label="Close">✕</button>
    </div>
    <div class="dlg-body">
      <input type="search" id="pick-q" placeholder="Filter recipes…" aria-label="Filter recipes" />
      <div class="pick-list" id="pick-list"></div>
    </div>`;
  const draw = (q) => {
    const matches = recipes.filter((r) => r.id !== day.recipe?.id && r.title.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('pick-list').innerHTML =
      matches
        .map((r) => {
          const clash = neighbors.find((n) => n.recipe.protein === r.protein);
          const note = clash ? `⚠ Same protein as ${clash.dayName}` : inPlan.has(r.id) ? 'Already in this week' : '';
          return `<button class="pick" data-action="pick-recipe" data-day="${dayIndex}" data-id="${r.id}">
            <span>${esc(r.title)}${note ? `<span class="warn-text">${esc(note)}</span>` : ''}</span>${badge(r.protein)}</button>`;
        })
        .join('') || '<p class="muted">No recipes match.</p>';
  };
  draw('');
  document.getElementById('pick-q').addEventListener('input', (e) => draw(e.target.value));
  if (!dialog.open) dialog.showModal();
}

// ---------- shopping list ----------

function checkedKey(planId) {
  return 'recipe-box-checked-' + planId;
}
function loadChecked(planId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(checkedKey(planId)) || '[]'));
  } catch {
    return new Set();
  }
}
function saveChecked(planId, set) {
  try {
    localStorage.setItem(checkedKey(planId), JSON.stringify([...set]));
  } catch { /* storage unavailable: ticks just won't persist */ }
}

let shopping = null;
async function renderShopping() {
  const plan = await api('/plan');
  if (!plan) {
    main.innerHTML = `
      <div class="page-head"><div><h1>Shopping list</h1></div></div>
      <div class="empty"><div class="icon">🛒</div><h2>Nothing to shop for yet</h2><p>Plan a week of dinners and the list builds itself.</p>
      <a class="btn primary" href="#week">Go to this week</a></div>`;
    return;
  }
  shopping = await api('/plan/shopping-list');
  const checked = loadChecked(shopping.planId);
  const total = shopping.categories.reduce((n, c) => n + c.items.length, 0);
  main.innerHTML = `
    <div class="page-head">
      <div><h1>Shopping list</h1><p class="muted">${total} items for ${shopping.recipeCount} dinners</p></div>
      <div class="btn-row no-print">
        <button class="btn" data-action="copy-list">Copy</button>
        <button class="btn" data-action="print-list">Print</button>
      </div>
    </div>
    ${plan.status === 'draft' ? '<div class="notice warn no-print">This week is still a preview. The list will update if you swap recipes — <a href="#week">review the week</a>.</div>' : ''}
    <div class="shop-cols">${shopping.categories
      .map(
        (c) => `
        <section class="panel shop-cat">
          <h2>${esc(c.category)}</h2>
          ${c.items
            .map(
              (item) => `
            <label class="shop-item ${checked.has(item.name) ? 'checked' : ''}">
              <input type="checkbox" data-item="${esc(item.name)}" ${checked.has(item.name) ? 'checked' : ''} />
              <span class="txt">${esc(item.name)}${item.amounts.length ? ` <span class="amt">— ${esc(formatAmounts(item.amounts))}</span>` : ''}
                <span class="for">${esc(item.recipes.join(', '))}</span></span>
            </label>`,
            )
            .join('')}
        </section>`,
      )
      .join('')}</div>`;
}

function shoppingText() {
  return shopping.categories
    .map((c) => `${c.category.toUpperCase()}\n` + c.items.map((i) => `- ${i.name}${i.amounts.length ? ' — ' + formatAmounts(i.amounts) : ''}`).join('\n'))
    .join('\n\n');
}

// ---------- actions ----------

const actions = {
  filter(el) {
    state.protein = el.dataset.protein;
    renderChips();
    return loadRecipes();
  },
  'clear-filters'() {
    state.q = '';
    state.protein = '';
    return renderRecipes();
  },
  'open-recipe': (el) => openRecipe(el.dataset.id),
  'close-dialog': () => dialog.close(),
  async 'edit-recipe'(el) {
    const r = await api('/recipes/' + el.dataset.id);
    dialog.close();
    startWizard({ ...r, ingredientsText: r.ingredients.map((i) => i.raw).join('\n'), stepsText: r.steps.join('\n'), tipsText: (r.tips || []).join('\n') }, { id: r.id });
    if (location.hash === '#add') route();
    else location.hash = '#add';
  },
  async 'delete-recipe'(el) {
    if (!confirm('Delete this recipe? This cannot be undone.')) return;
    await api('/recipes/' + el.dataset.id, { method: 'DELETE' });
    dialog.close();
    toast('Recipe deleted');
    render();
  },
  'start-manual'() {
    startWizard({});
    renderWizard();
  },
  'wizard-next': wizardNext,
  'wizard-back'() {
    captureWizard();
    state.wizard.step--;
    renderWizard();
  },
  'wizard-cancel'() {
    const editing = state.wizard.id;
    state.wizard = null;
    if (editing) location.hash = '#recipes';
    else render();
  },
  'wizard-save': wizardSave,
  async 'generate-plan'() {
    if (state.plan && !confirm('Replace the current week with a new one?')) return;
    await api('/plan/generate', { method: 'POST' });
    await renderWeek();
  },
  async 'shuffle-day'(el) {
    await api(`/plan/days/${el.dataset.day}/shuffle`, { method: 'POST' });
    await renderWeek();
  },
  'choose-day': (el) => openPicker(Number(el.dataset.day)),
  async 'pick-recipe'(el) {
    await api(`/plan/days/${el.dataset.day}`, { method: 'PUT', body: { recipeId: Number(el.dataset.id) } });
    dialog.close();
    await renderWeek();
  },
  async 'confirm-plan'() {
    await api('/plan/confirm', { method: 'POST' });
    await renderWeek();
    toast('Week confirmed — shopping list is ready');
  },
  async 'reopen-plan'() {
    await api('/plan/reopen', { method: 'POST' });
    await renderWeek();
  },
  async 'copy-list'() {
    try {
      await navigator.clipboard.writeText(shoppingText());
      toast('Shopping list copied');
    } catch {
      toast('Could not copy — try Print instead.', true);
    }
  },
  'print-list': () => window.print(),
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) Promise.resolve().then(() => fn(el)).catch((err) => toast(err.message, true));
});

document.addEventListener('change', (e) => {
  const item = e.target.dataset?.item;
  if (!item || !shopping) return;
  const checked = loadChecked(shopping.planId);
  if (e.target.checked) checked.add(item);
  else checked.delete(item);
  saveChecked(shopping.planId, checked);
  e.target.closest('.shop-item').classList.toggle('checked', e.target.checked);
});

// Click on the backdrop closes the dialog.
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
});

window.addEventListener('hashchange', route);
route();
