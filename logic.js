/* Fridge Chef — pure logic (no DOM, no network).
   Loaded as a classic script in the browser (window.FC) and required by
   Node tests. Every function here is covered by tests/logic.test.js. */
(function (root) {
  'use strict';

  /* ---- name normalisation + synonyms ---------------------------------- */
  // canonical group -> aliases that mean the same thing in a kitchen
  var SYNONYMS = {
    'tomato': ['tomato', 'tomatoes', 'cherry tomato', 'cherry tomatoes', 'tomatoes on the vine'],
    'aubergine': ['aubergine', 'aubergines', 'eggplant', 'brinjal'],
    'courgette': ['courgette', 'courgettes', 'zucchini'],
    'broccoli': ['broccoli'],
    'carrot': ['carrot', 'carrots', 'baby carrot', 'baby carrots'],
    'spinach': ['spinach'],
    'egg': ['egg', 'eggs'],
    'onion': ['onion', 'onions', 'white onion', 'red onion'],
    'milk': ['milk'],
    'lemon': ['lemon', 'lemons'],
    'lime': ['lime', 'limes'],
    'grapefruit': ['grapefruit'],
    'kiwi': ['kiwi', 'kiwis'],
    'orange juice': ['orange juice'],
    'sparkling lemon drink': ['sparkling lemon drink', 'lemon soda', 'sparkling lemon'],
    'orange soda': ['orange soda'],
    'iced coffee': ['iced coffee'],
    'dressing': ['sauce or dressing jar', 'dressing', 'sauce jar', 'salad dressing'],
    'oil': ['oil', 'cooking oil', 'olive oil', 'vegetable oil'],
    'garlic': ['garlic'],
    'ginger': ['ginger'],
    'cumin': ['cumin', 'cumin seeds', 'ground cumin'],
    'turmeric': ['turmeric'],
    'chilli powder': ['chilli powder', 'chili powder', 'red chilli powder'],
    'garam masala': ['garam masala'],
    'chilli flakes': ['chilli flakes', 'chili flakes', 'red pepper flakes'],
    'salt': ['salt'],
    'pepper': ['pepper', 'black pepper'],
    'rice': ['rice', 'cooked rice'],
    'pasta': ['pasta', 'dried pasta', 'spaghetti', 'penne'],
    'soy sauce': ['soy sauce'],
    'spring onion': ['spring onion', 'spring onions', 'scallion', 'scallions', 'green onion'],
    'parmesan': ['parmesan', 'parmesan cheese'],
    'green chilli': ['green chilli', 'green chili', 'green chillies', 'green chilies'],
    'bread': ['bread'],
    'butter': ['butter'],
    'soup': ['soup', 'soup or stew', 'stew'],
    'ice': ['ice'],
    'mint': ['mint', 'mint leaves']
  };

  var ALIAS_TO_CANON = {};
  Object.keys(SYNONYMS).forEach(function (canon) {
    SYNONYMS[canon].forEach(function (a) { ALIAS_TO_CANON[a] = canon; });
  });

  function normalize(name) {
    return String(name || '').toLowerCase().trim().replace(/\s+/g, ' ');
  }

  function canonical(name) {
    var n = normalize(name);
    return ALIAS_TO_CANON[n] || n;
  }

  // A closed tub's effective name is what the user labelled inside it.
  function effectiveName(ing) {
    if (ing && ing.tub && ing.label) return ing.label;
    return ing ? ing.name : '';
  }

  /* ---- quantities ------------------------------------------------------ */
  // "2 tbsp" -> {num:2, unit:"tbsp"} ; "~250 g" -> {num:250, unit:"g"} ; "1 punnet" -> {num:1, unit:"punnet"}
  function parseQty(qty) {
    var m = String(qty || '').trim().match(/^~?\s*(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?)\s*(.*)$/);
    if (!m) return { num: null, unit: String(qty || '').trim() };
    var num = m[1].indexOf('/') >= 0
      ? (function (p) { return p[0] / p[1]; })(m[1].split('/').map(Number))
      : parseFloat(m[1]);
    return { num: num, unit: m[2].trim() };
  }

  function formatQty(num, unit) {
    var n = (Math.round(num * 100) / 100).toString();
    return unit ? n + ' ' + unit : n;
  }

  // Scale a quantity string by a factor (servings change). Unparseable stays as-is.
  function scaleQty(qty, factor) {
    if (!factor || factor === 1) return qty;
    var p = parseQty(qty);
    if (p.num === null) return qty;
    return formatQty(p.num * factor, p.unit);
  }

  // Merge quantities for the same item: same unit numbers add up,
  // different units are joined with " + ".
  function mergeQtyStrings(qtys) {
    var byUnit = {};
    var order = [];
    var free = [];
    qtys.forEach(function (q) {
      var p = parseQty(q);
      if (p.num === null) { if (free.indexOf(q) < 0) free.push(q); return; }
      var u = p.unit || '';
      if (!(u in byUnit)) { byUnit[u] = 0; order.push(u); }
      byUnit[u] += p.num;
    });
    var out = order.map(function (u) { return formatQty(byUnit[u], u); });
    return out.concat(free).join(' + ');
  }

  /* ---- matching / coverage -------------------------------------------- */
  // Does the fridge or pantry cover this recipe need?
  // need: {name, qty, fridgeOnly?} — fridgeOnly needs (cooked rice, soup) must
  // come from a labelled tub, never from the pantry.
  function matchNeed(need, ingredients, pantryOwned) {
    var want = canonical(need.name);
    var i, ing, unsureMatch = false;
    for (i = 0; i < ingredients.length; i++) {
      ing = ingredients[i];
      if (canonical(effectiveName(ing)) !== want) continue;
      if (ing.unsure && !ing.tub) { unsureMatch = true; continue; }
      return { have: true, source: 'fridge', item: ing };
    }
    if (unsureMatch) return { have: false, source: null, reason: 'unsure' };
    if (!need.fridgeOnly) {
      for (i = 0; i < pantryOwned.length; i++) {
        if (canonical(pantryOwned[i]) === want) return { have: true, source: 'pantry', item: null };
      }
    }
    return { have: false, source: null, reason: 'missing' };
  }

  function analyseRecipe(recipe, ingredients, pantryOwned) {
    var have = [], missing = [], fridgeItemsUsed = {};
    recipe.needs.forEach(function (need) {
      var m = matchNeed(need, ingredients, pantryOwned);
      if (m.have) {
        have.push(need);
        if (m.source === 'fridge' && m.item) fridgeItemsUsed[canonical(effectiveName(m.item))] = true;
      } else {
        missing.push(need);
      }
    });
    var total = recipe.needs.length || 1;
    var fridgeTotal = ingredients.filter(function (g) { return !g.unsure || g.tub; }).length || 1;
    return {
      have: have,
      missing: missing,
      coverage: have.length / total,                 // share of recipe needs already had
      fridgeUse: Object.keys(fridgeItemsUsed).length / fridgeTotal, // share of fridge used
      fridgeItemsUsed: Object.keys(fridgeItemsUsed).length
    };
  }

  // A recipe gated on a tub label only shows once a tub carries that label.
  function isRecipeVisible(recipe, ingredients) {
    if (!recipe.requiresLabel) return true;
    return ingredients.some(function (g) {
      return g.tub && g.label && canonical(g.label) === canonical(recipe.requiresLabel);
    });
  }

  function applyFilters(recipes, filters) {
    filters = filters || {};
    return recipes.filter(function (r) {
      if (filters.vegOnly && !r.veg) return false;
      if (filters.maxMinutes && r.minutes > filters.maxMinutes) return false;
      if (filters.spice && filters.spice !== 'any' && r.spice !== filters.spice) return false;
      return true;
    });
  }

  function rankRecipes(recipes, ingredients, pantryOwned, filters) {
    var visible = recipes.filter(function (r) { return isRecipeVisible(r, ingredients); });
    var scored = applyFilters(visible, filters).map(function (r) {
      var a = analyseRecipe(r, ingredients, pantryOwned);
      return { recipe: r, analysis: a };
    });
    scored.sort(function (x, y) {
      if (y.analysis.coverage !== x.analysis.coverage) return y.analysis.coverage - x.analysis.coverage;
      if (y.analysis.fridgeUse !== x.analysis.fridgeUse) return y.analysis.fridgeUse - x.analysis.fridgeUse;
      return x.recipe.minutes - y.recipe.minutes;
    });
    return scored;
  }

  /* ---- shopping gap list ---------------------------------------------- */
  function buildGapList(selectedRecipes, ingredients, pantryOwned) {
    var byCanon = {};
    var order = [];
    selectedRecipes.forEach(function (recipe) {
      var a = analyseRecipe(recipe, ingredients, pantryOwned);
      a.missing.forEach(function (need) {
        var c = canonical(need.name);
        if (!byCanon[c]) { byCanon[c] = { name: need.name, qtys: [], forRecipes: [] }; order.push(c); }
        byCanon[c].qtys.push(need.qty);
        if (byCanon[c].forRecipes.indexOf(recipe.title) < 0) byCanon[c].forRecipes.push(recipe.title);
      });
    });
    return order.map(function (c) {
      return { name: byCanon[c].name, qty: mergeQtyStrings(byCanon[c].qtys), forRecipes: byCanon[c].forRecipes };
    });
  }

  function gapListText(gaps) {
    if (!gaps.length) return 'Nothing to buy — you have everything for the selected recipes.';
    return 'Shopping list — Fridge Chef\n' + gaps.map(function (g) {
      return '- ' + g.name + ' — ' + g.qty + '  (for: ' + g.forRecipes.join(', ') + ')';
    }).join('\n');
  }

  /* ---- Gemini response validation -------------------------------------- */
  // Never trust model JSON blindly: drop bad rows, keep the good ones.
  function stripCodeFence(text) {
    var t = String(text || '').trim();
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return t.trim();
  }

  function parseGeminiIngredients(text) {
    var dropped = 0, ingredients = [];
    var data;
    try { data = JSON.parse(stripCodeFence(text)); } catch (e) { return { ok: false, ingredients: [], dropped: 0, error: 'Not valid JSON.' }; }
    var list = Array.isArray(data) ? data : data.ingredients;
    if (!Array.isArray(list)) return { ok: false, ingredients: [], dropped: 0, error: 'No ingredient list in the reply.' };
    list.slice(0, 30).forEach(function (row) {
      if (!row || typeof row.name !== 'string' || !normalize(row.name)) { dropped++; return; }
      var conf = ['high', 'medium', 'low'].indexOf(String(row.confidence || '').toLowerCase()) >= 0
        ? String(row.confidence).toLowerCase() : 'low';
      ingredients.push({
        name: row.name.trim(), qty: String(row.quantity || row.qty || '').trim() || 'some',
        confidence: conf, unsure: conf === 'low', tub: false, label: null, source: 'gemini',
        note: row.note ? String(row.note) : ''
      });
    });
    return { ok: ingredients.length > 0, ingredients: ingredients, dropped: dropped, error: ingredients.length ? '' : 'No usable ingredients in the reply.' };
  }

  function parseGeminiRecipes(text) {
    var dropped = 0, recipes = [];
    var data;
    try { data = JSON.parse(stripCodeFence(text)); } catch (e) { return { ok: false, recipes: [], dropped: 0, error: 'Not valid JSON.' }; }
    var list = Array.isArray(data) ? data : data.recipes;
    if (!Array.isArray(list)) return { ok: false, recipes: [], dropped: 0, error: 'No recipe list in the reply.' };
    list.slice(0, 5).forEach(function (row, idx) {
      if (!row || typeof row.title !== 'string' || !normalize(row.title) ||
          !Array.isArray(row.steps) || !row.steps.length ||
          !Array.isArray(row.needs) || !row.needs.length) { dropped++; return; }
      var needs = row.needs.filter(function (n) { return n && typeof n.name === 'string' && normalize(n.name); })
        .map(function (n) { return { name: n.name.trim(), qty: String(n.qty || n.quantity || '').trim() || 'some' }; });
      if (!needs.length) { dropped++; return; }
      recipes.push({
        id: 'gemini-' + Date.now() + '-' + idx,
        title: row.title.trim(),
        blurb: typeof row.blurb === 'string' ? row.blurb.trim() : '',
        minutes: Number(row.minutes) > 0 ? Math.round(Number(row.minutes)) : 30,
        difficulty: row.difficulty === 'Medium' ? 'Medium' : 'Easy',
        servings: Number(row.servings) > 0 ? Math.round(Number(row.servings)) : 2,
        spice: ['Mild', 'Medium', 'Hot'].indexOf(row.spice) >= 0 ? row.spice : 'Mild',
        veg: row.veg !== false,
        kcalPerServing: Number(row.kcalPerServing) > 0 ? Math.round(Number(row.kcalPerServing)) : 0,
        needs: needs,
        steps: row.steps.filter(function (s) { return typeof s === 'string' && s.trim(); }).map(function (s) { return s.trim(); }),
        requiresLabel: null,
        source: 'gemini'
      });
    });
    return { ok: recipes.length > 0, recipes: recipes, dropped: dropped, error: recipes.length ? '' : 'No usable recipes in the reply.' };
  }

  var FC = {
    SYNONYMS: SYNONYMS,
    normalize: normalize,
    canonical: canonical,
    effectiveName: effectiveName,
    parseQty: parseQty,
    formatQty: formatQty,
    scaleQty: scaleQty,
    mergeQtyStrings: mergeQtyStrings,
    matchNeed: matchNeed,
    analyseRecipe: analyseRecipe,
    isRecipeVisible: isRecipeVisible,
    applyFilters: applyFilters,
    rankRecipes: rankRecipes,
    buildGapList: buildGapList,
    gapListText: gapListText,
    stripCodeFence: stripCodeFence,
    parseGeminiIngredients: parseGeminiIngredients,
    parseGeminiRecipes: parseGeminiRecipes
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = FC;
  root.FC = FC;
})(typeof window !== 'undefined' ? window : globalThis);
