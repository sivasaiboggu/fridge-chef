/* Fridge Chef — tests for the pure logic in logic.js.
   Run: node --test tests/logic.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const FC = require('../logic.js');
const DATA = require('../data.js');

const PANTRY = DATA.DEFAULT_PANTRY;

function ing(name, extra) {
  return Object.assign({ name, qty: '1', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified' }, extra || {});
}

/* ---- names ------------------------------------------------------------ */
test('canonical maps synonyms to one group', () => {
  assert.equal(FC.canonical('Cherry Tomatoes'), 'tomato');
  assert.equal(FC.canonical('tomatoes on the vine'), 'tomato');
  assert.equal(FC.canonical('Brinjal'), 'aubergine');
  assert.equal(FC.canonical('Zucchini'), 'courgette');
  assert.equal(FC.canonical('  CUMIN SEEDS '), 'cumin');
  assert.equal(FC.canonical('Olive Oil'), 'oil');
  assert.equal(FC.canonical('Dried Pasta'), 'pasta');
});

test('canonical leaves unknown names alone (normalised)', () => {
  assert.equal(FC.canonical('Dragon Fruit'), 'dragon fruit');
  assert.equal(FC.canonical(''), '');
});

/* ---- quantities ------------------------------------------------------- */
test('parseQty reads numbers, fractions and units', () => {
  assert.deepEqual(FC.parseQty('2 tbsp'), { num: 2, unit: 'tbsp' });
  assert.deepEqual(FC.parseQty('~250 g'), { num: 250, unit: 'g' });
  assert.deepEqual(FC.parseQty('1/2 tsp'), { num: 0.5, unit: 'tsp' });
  assert.deepEqual(FC.parseQty('1 punnet'), { num: 1, unit: 'punnet' });
  assert.deepEqual(FC.parseQty('some'), { num: null, unit: 'some' });
});

test('scaleQty scales servings, leaves free text alone', () => {
  assert.equal(FC.scaleQty('200 g', 1.5), '300 g');
  assert.equal(FC.scaleQty('1/2 tsp', 2), '1 tsp');
  assert.equal(FC.scaleQty('to taste', 3), 'to taste');
  assert.equal(FC.scaleQty('2', 1), '2');
});

test('mergeQtyStrings adds same-unit numbers and joins different units', () => {
  assert.equal(FC.mergeQtyStrings(['2 tbsp', '1 tbsp']), '3 tbsp');
  assert.equal(FC.mergeQtyStrings(['200 g', '1 head']), '200 g + 1 head');
  assert.equal(FC.mergeQtyStrings(['some', '2']), '2 + some');
});

/* ---- matching --------------------------------------------------------- */
test('matchNeed finds fridge items through synonyms', () => {
  const list = [ing('Cherry tomatoes'), ing('Courgette', { qty: '2' })];
  assert.equal(FC.matchNeed({ name: 'Tomatoes', qty: '3' }, list, []).have, true);
  assert.equal(FC.matchNeed({ name: 'Zucchini', qty: '1' }, list, []).source, 'fridge');
  assert.equal(FC.matchNeed({ name: 'Chicken', qty: '500 g' }, list, []).have, false);
});

test('matchNeed falls back to owned pantry, and fridgeOnly blocks the pantry', () => {
  assert.equal(FC.matchNeed({ name: 'Garlic', qty: '2 cloves' }, [], PANTRY).source, 'pantry');
  assert.equal(FC.matchNeed({ name: 'Cooked rice', qty: '2 cups', fridgeOnly: true }, [], PANTRY).have, false);
  const tubs = [ing('Closed tub 1', { tub: true, label: 'Cooked rice', unsure: false })];
  assert.equal(FC.matchNeed({ name: 'Cooked rice', qty: '2 cups', fridgeOnly: true }, tubs, PANTRY).source, 'fridge');
});

test('matchNeed does not count an unsure loose item as have', () => {
  const list = [ing('Baby carrots', { unsure: true, confidence: 'medium' })];
  const m = FC.matchNeed({ name: 'Baby carrots', qty: '200 g' }, list, []);
  assert.equal(m.have, false);
  assert.equal(m.reason, 'unsure');
  // ...unless a sure item with the same name is also there
  const list2 = [ing('Baby carrots', { unsure: true }), ing('Carrots', { qty: '3' })];
  assert.equal(FC.matchNeed({ name: 'Carrots', qty: '2' }, list2, []).have, true);
});

test('effectiveName uses the tub label, not the tub name', () => {
  assert.equal(FC.effectiveName(ing('Closed tub 1', { tub: true, label: 'Soup or stew' })), 'Soup or stew');
  assert.equal(FC.effectiveName(ing('Eggs')), 'Eggs');
});

/* ---- recipes ---------------------------------------------------------- */
test('analyseRecipe splits have/missing and computes coverage', () => {
  const fridge = DATA.FRIDGES[0]; // fresh drawer
  const recipe = fridge.cachedRecipes[0]; // frittata: all have
  const a = FC.analyseRecipe(recipe, fridge.ingredients, PANTRY);
  assert.equal(a.missing.length, 0);
  assert.equal(a.coverage, 1);
  const stir = fridge.cachedRecipes[2]; // stir-fry: soy sauce + spring onions missing
  const b = FC.analyseRecipe(stir, fridge.ingredients, PANTRY);
  assert.deepEqual(b.missing.map((n) => n.name), ['Soy sauce', 'Spring onions']);
  assert.equal(b.coverage, 6 / 8);
});

test('analyseRecipe counts fridge items used, not pantry items', () => {
  const fridge = DATA.FRIDGES[2]; // veg bin
  const a = FC.analyseRecipe(fridge.cachedRecipes[0], fridge.ingredients, PANTRY); // bharta
  assert.equal(a.fridgeItemsUsed, 2); // aubergine + tomatoes
  assert.equal(a.missing.length, 3); // onion, green chilli, lemon
});

test('isRecipeVisible gates recipes on tub labels', () => {
  const fridge = DATA.FRIDGES[1]; // leftovers
  const fried = fridge.cachedRecipes[1];
  assert.equal(FC.isRecipeVisible(fried, fridge.ingredients), false);
  const labelled = JSON.parse(JSON.stringify(fridge.ingredients));
  labelled[5].label = 'Cooked rice';
  assert.equal(FC.isRecipeVisible(fried, labelled), true);
  assert.equal(FC.isRecipeVisible(fridge.cachedRecipes[0], fridge.ingredients), true); // cooler: no gate
});

test('rankRecipes orders by coverage, then fridge use, then time', () => {
  const fridge = DATA.FRIDGES[0];
  const ranked = FC.rankRecipes(fridge.cachedRecipes, fridge.ingredients, PANTRY, {});
  assert.equal(ranked[0].recipe.id, 'a-frittata'); // 100%, uses 5 fridge items
  assert.equal(ranked[1].recipe.id, 'a-traybake'); // 100%, uses 4 fridge items
  assert.equal(ranked[2].recipe.id, 'a-stirfry'); // 75%
});

test('rankRecipes hides tub-gated recipes until labelled', () => {
  const fridge = DATA.FRIDGES[1];
  const ranked = FC.rankRecipes(fridge.cachedRecipes, fridge.ingredients, PANTRY, {});
  assert.deepEqual(ranked.map((r) => r.recipe.id), ['b-cooler']);
});

test('applyFilters respects veg, time and spice', () => {
  const recipes = DATA.FRIDGES[2].cachedRecipes;
  assert.equal(FC.applyFilters(recipes, { vegOnly: true }).length, 3);
  assert.equal(FC.applyFilters(recipes, { maxMinutes: 30 }).length, 2);
  assert.equal(FC.applyFilters(recipes, { spice: 'Hot' }).length, 1);
  assert.equal(FC.applyFilters(recipes, { spice: 'Hot', maxMinutes: 30 }).length, 0);
});

/* ---- gap list --------------------------------------------------------- */
test('buildGapList merges the same missing item across recipes', () => {
  const fridge = DATA.FRIDGES[0];
  const gaps = FC.buildGapList(
    [fridge.cachedRecipes[2]], fridge.ingredients, PANTRY);
  assert.deepEqual(gaps.map((g) => g.name), ['Soy sauce', 'Spring onions']);
  // Two recipes both missing soy sauce 2 tbsp -> one merged row, 4 tbsp
  const fake = { title: 'Second stir-fry', needs: [{ name: 'Soy sauce', qty: '2 tbsp' }, { name: 'Tofu', qty: '200 g' }] };
  const gaps2 = FC.buildGapList([fridge.cachedRecipes[2], fake], fridge.ingredients, PANTRY);
  const soy = gaps2.find((g) => g.name === 'Soy sauce');
  assert.equal(soy.qty, '4 tbsp');
  assert.deepEqual(soy.forRecipes, ['Broccoli & carrot stir-fry with egg-fried rice', 'Second stir-fry']);
  assert.equal(gaps2.length, 3);
});

test('buildGapList never lists pantry items', () => {
  const fridge = DATA.FRIDGES[2];
  const gaps = FC.buildGapList([fridge.cachedRecipes[0]], fridge.ingredients, PANTRY);
  assert.deepEqual(gaps.map((g) => g.name), ['Onion', 'Green chilli', 'Lemon']);
});

test('buildGapList is empty when everything is have', () => {
  const fridge = DATA.FRIDGES[0];
  assert.deepEqual(FC.buildGapList([fridge.cachedRecipes[0]], fridge.ingredients, PANTRY), []);
});

test('gapListText renders plain copyable text', () => {
  const text = FC.gapListText([{ name: 'Soy sauce', qty: '2 tbsp', forRecipes: ['Stir-fry'] }]);
  assert.match(text, /Soy sauce — 2 tbsp/);
  assert.match(text, /for: Stir-fry/);
  assert.equal(FC.gapListText([]), 'Nothing to buy — you have everything for the selected recipes.');
});

/* ---- Gemini parsing --------------------------------------------------- */
test('parseGeminiIngredients accepts clean JSON and drops bad rows', () => {
  const res = FC.parseGeminiIngredients(JSON.stringify({
    ingredients: [
      { name: 'Eggs', quantity: '12', confidence: 'high' },
      { name: '', quantity: '1' },
      { name: 'Milk', quantity: '1 L', confidence: 'weird' },
      { quantity: '3' }
    ]
  }));
  assert.equal(res.ok, true);
  assert.equal(res.ingredients.length, 2);
  assert.equal(res.dropped, 2);
  assert.equal(res.ingredients[1].confidence, 'low');
  assert.equal(res.ingredients[0].source, 'gemini');
});

test('parseGeminiIngredients handles fenced JSON and rejects garbage', () => {
  const fenced = FC.parseGeminiIngredients('```json\n{"ingredients":[{"name":"Eggs","quantity":"6","confidence":"high"}]}\n```');
  assert.equal(fenced.ok, true);
  assert.equal(fenced.ingredients[0].name, 'Eggs');
  const bad = FC.parseGeminiIngredients('not json at all');
  assert.equal(bad.ok, false);
  const empty = FC.parseGeminiIngredients('{"ingredients":[]}');
  assert.equal(empty.ok, false);
});

test('parseGeminiRecipes validates shape and coerces fields', () => {
  const res = FC.parseGeminiRecipes(JSON.stringify({
    recipes: [
      { title: 'Test soup', blurb: 'Warm.', minutes: 20, difficulty: 'Easy', servings: 2, spice: 'Mild', veg: true, kcalPerServing: 200,
        needs: [{ name: 'Tomatoes', qty: '3' }], steps: ['Chop.', 'Cook.'] },
      { title: 'No steps' },
      { title: 'No needs', steps: ['Do it.'], needs: [] }
    ]
  }));
  assert.equal(res.ok, true);
  assert.equal(res.recipes.length, 1);
  assert.equal(res.dropped, 2);
  assert.equal(res.recipes[0].source, 'gemini');
  assert.equal(res.recipes[0].minutes, 20);
});

test('parseGeminiRecipes rejects non-JSON', () => {
  assert.equal(FC.parseGeminiRecipes('hello').ok, false);
});

test('stripCodeFence removes fences only', () => {
  assert.equal(FC.stripCodeFence('```json\n{}\n```'), '{}');
  assert.equal(FC.stripCodeFence('{}'), '{}');
});

/* ---- seeded data sanity ---------------------------------------------- */
test('seeded fridges: every cached recipe need is either in the fridge, the pantry, or honestly missing', () => {
  for (const fridge of DATA.FRIDGES) {
    for (const recipe of fridge.cachedRecipes) {
      for (const need of recipe.needs) {
        const m = FC.matchNeed(need, fridge.ingredients, PANTRY);
        // No assertion on have/missing here except that matching never throws
        assert.ok(typeof m.have === 'boolean', `${fridge.id}/${recipe.id}/${need.name}`);
      }
      assert.ok(recipe.steps.length >= 3, `${recipe.id} needs real steps`);
      assert.ok(recipe.needs.length >= 3, `${recipe.id} needs real ingredients`);
    }
  }
});

test('seeded data: exactly 3 fridges, 3 + 3 + 3 cached recipes', () => {
  assert.equal(DATA.FRIDGES.length, 3);
  assert.deepEqual(DATA.FRIDGES.map((f) => f.cachedRecipes.length), [3, 3, 3]);
  assert.deepEqual(DATA.FRIDGES.map((f) => f.ingredients.length), [17, 8, 5]);
});
