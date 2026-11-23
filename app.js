/* Fridge Chef — UI. Plain vanilla JS, hash routing, no framework.
   Works fully without a Gemini key (seeded data); live AI only runs when
   the user pastes a key in Settings. */
(function () {
  'use strict';

  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- storage -------------------------------------------------------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---- state ---------------------------------------------------------- */
  var state = {
    fridgeId: null,            // seeded id or 'uploaded'
    uploadedPhoto: null,       // data URL
    uploadedName: '',
    ingredients: [],           // working copy for current fridge
    sourceNote: '',            // how the current list was made
    geminiRecipes: [],         // generated for current fridge this session
    geminiNote: '',
    filters: { servings: 2, vegOnly: false, maxMinutes: 0, spice: 'any' },
    selected: {},              // recipeId -> true (for shopping list)
    detailId: null,
    key: store.get('fc-key', ''),
    model: store.get('fc-model', 'gemini-3.8-flash'),
    pantry: store.get('fc-pantry', null) || FCDATA.DEFAULT_PANTRY.slice(),
    history: store.get('fc-history', []),
    checked: store.get('fc-checked', {}),
    busy: ''
  };

  function pantryOwned() { return state.pantry.slice(); }

  function currentFridge() {
    if (state.fridgeId === 'uploaded') {
      return { id: 'uploaded', name: state.uploadedName || 'Your photo', blurb: 'Uploaded just now.', photo: state.uploadedPhoto, photoCredit: 'Your photo — stored only in this browser tab, never uploaded without a key.', ingredients: [], cachedRecipes: [] };
    }
    return FCDATA.FRIDGES.find(function (f) { return f.id === state.fridgeId; }) || null;
  }

  function loadFridge(id) {
    state.fridgeId = id;
    state.geminiRecipes = [];
    state.geminiNote = '';
    state.selected = {};
    if (id === 'uploaded') {
      state.ingredients = [];
      state.sourceNote = 'No detection has run on this photo yet. Add what you see, or detect with Gemini in Settings.';
      return;
    }
    var f = currentFridge();
    state.ingredients = JSON.parse(JSON.stringify(f.ingredients));
    state.sourceNote = 'Saved list — checked against this photo by a human. No AI detection has run on it.';
  }

  function allRecipes() {
    var f = currentFridge();
    return (f ? f.cachedRecipes : []).concat(state.geminiRecipes);
  }

  function ranked() {
    return FC.rankRecipes(allRecipes(), state.ingredients, pantryOwned(), state.filters);
  }

  function confBadge(c) {
    var label = c === 'high' ? 'Sure' : c === 'medium' ? 'Likely' : 'Unsure';
    return '<span class="badge ' + esc(c) + '">' + label + '</span>';
  }

  function srcBadge(source) {
    var label = source === 'verified' ? 'Checked list' : source === 'gemini' ? 'Detected by Gemini' : 'You typed this';
    return '<span class="badge src">' + label + '</span>';
  }

  /* ---- router --------------------------------------------------------- */
  function go(hash) { location.hash = hash; }

  function route() {
    var h = (location.hash || '#/home').replace(/^#\/?/, '');
    var parts = h.split('/');
    var view = parts[0] || 'home';
    var root = $('#view');
    $$('nav.main button').forEach(function (b) { b.classList.toggle('active', b.dataset.view === view || (view === 'recipe' && b.dataset.view === 'recipes') || (view === 'fridge' && b.dataset.view === 'home')); });

    if (view === 'home') renderHome(root);
    else if (view === 'fridge') { ensureFridge(parts[1]); renderFridge(root); }
    else if (view === 'recipes') { ensureFridge(parts[1]); renderRecipes(root); }
    else if (view === 'recipe') { ensureFridge(parts[1]); renderDetail(root, parts[2]); }
    else if (view === 'shopping') { ensureFridge(parts[1]); renderShopping(root); }
    else if (view === 'settings') renderSettings(root);
    else renderHome(root);
    window.scrollTo(0, 0);
  }

  function ensureFridge(id) {
    if (!id) { go('#/home'); return; }
    if (id !== state.fridgeId) loadFridge(id);
    if (!currentFridge() && id !== 'uploaded') { go('#/home'); }
  }

  /* ---- shared bits ---------------------------------------------------- */
  function busyBar() {
    return state.busy ? '<div class="notice" role="status">' + esc(state.busy) + '</div>' : '';
  }

  function keyHint() {
    if (state.key) return '';
    return '<div class="notice amber"><b>No Gemini key yet.</b> Live detection and recipe generation need your free key. ' +
      'Everything else on this page works without one. <a href="#/settings">Add a key in Settings</a>.</div>';
  }

  function navCount() {
    var gaps = FC.buildGapList(selectedRecipes(), state.ingredients, pantryOwned());
    var el = $('#nav-shop-count');
    if (el) el.textContent = gaps.length ? String(gaps.length) : '';
  }

  function selectedRecipes() {
    var all = allRecipes();
    return all.filter(function (r) { return state.selected[r.id]; });
  }

  /* ---- home ----------------------------------------------------------- */
  function renderHome(root) {
    var cards = FCDATA.FRIDGES.map(function (f) {
      return '<button class="fridge-card" data-fridge="' + esc(f.id) + '">' +
        '<img src="' + esc(f.photo) + '" alt="Photo of ' + esc(f.name.toLowerCase()) + '">' +
        '<span class="body"><h3>' + esc(f.name) + '</h3><p>' + esc(f.blurb) + '</p>' +
        '<span class="meta">' + f.ingredients.length + ' items listed &middot; ' + f.cachedRecipes.length + ' recipes ready</span></span>' +
        '</button>';
    }).join('');

    var hist = state.history.slice(0, 6).map(function (h) {
      return '<li><time>' + esc(h.date) + '</time><span><b>' + esc(h.recipe) + '</b> <span class="muted">— from ' + esc(h.fridge) + '</span></span></li>';
    }).join('');

    root.innerHTML =
      '<section class="hero"><p class="kicker">Fridge Chef</p>' +
      '<h1 class="page">What&rsquo;s in the fridge?</h1>' +
      '<p class="lede">Photograph the fridge, get recipes you can actually cook from what&rsquo;s inside it, ' +
      'and one shopping list for what&rsquo;s missing. Nothing guessed, nothing faked.</p></section>' +
      '<section class="section"><h2>Pick a fridge</h2>' +
      '<p class="sub">Three real fridges, photographed and listed by hand. Or use your own photo.</p>' +
      '<div class="fridge-grid">' + cards +
      '<button class="fridge-card upload" id="upload-card"><span class="body">' +
      '<h3>Use your own photo</h3><p>Take a photo of your fridge or pick one from your camera roll. ' +
      'It stays in your browser unless you ask Gemini to look at it.</p>' +
      '<span class="meta">JPG or PNG &middot; shrunk to 1024 px before anything leaves the browser</span>' +
      '<input type="file" id="photo-input" accept="image/*" hidden></span></button>' +
      '</div></section>' +
      '<section class="section"><h2>How it works</h2><div class="how">' +
      '<div class="card step"><div class="num">1</div><h3>See what&rsquo;s there</h3><p>Every item lists how sure we are. Closed tubs say so instead of guessing.</p></div>' +
      '<div class="card step"><div class="num">2</div><h3>Fix the list</h3><p>Delete a wrong item, add one we missed, label a tub. The recipes follow the list, not the other way round.</p></div>' +
      '<div class="card step"><div class="num">3</div><h3>Cook, then shop once</h3><p>Recipes rank by what you already have. Pick up to three and the gap list merges what&rsquo;s missing.</p></div>' +
      '</div></section>' +
      (state.history.length ?
        '<section class="section"><h2>Cooked before</h2><div class="card"><ul class="history-list">' + hist + '</ul></div></section>' : '') +
      '<section class="section"><h2>Plainly stated</h2>' +
      '<p class="sub">A photo can&rsquo;t see inside closed containers or read expiry dates. Recipes here are ' +
      'generated or hand-written, not tested in a kitchen, and nutrition numbers are estimates. ' +
      'With no Gemini key, everything runs on the saved lists — the app says so on every screen.</p></section>';

    $$('[data-fridge]', root).forEach(function (b) {
      b.addEventListener('click', function () { go('#/fridge/' + b.dataset.fridge); });
    });
    $('#upload-card', root).addEventListener('click', function (e) {
      if (e.target.tagName !== 'INPUT') $('#photo-input', root).click();
    });
    $('#photo-input', root).addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      state.busy = 'Shrinking your photo…';
      FCGEM.compressImage(file).then(function (dataUrl) {
        state.uploadedPhoto = dataUrl;
        state.uploadedName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || 'Your photo';
        loadFridge('uploaded');
        go('#/fridge/uploaded');
      }).catch(function (err) { alert(err.message); });
    });
  }

  /* ---- fridge view ---------------------------------------------------- */
  function renderFridge(root) {
    var f = currentFridge();
    if (!f) { go('#/home'); return; }
    var unsureCount = state.ingredients.filter(function (g) { return g.unsure; }).length;

    var items = state.ingredients.map(function (g, i) {
      var tubCtl = '';
      if (g.tub) {
        var opts = ['<option value="">What&rsquo;s inside?</option>'].concat(FCDATA.TUB_LABELS.map(function (l) {
          return '<option value="' + esc(l) + '"' + (g.label === l ? ' selected' : '') + '>' + esc(l) + '</option>';
        })).join('');
        tubCtl = '<span class="tub-label"><select data-tub="' + i + '" aria-label="What is inside this tub">' + opts + '</select></span>';
      }
      var confirmBtn = (g.unsure && !g.tub)
        ? '<button class="icon-btn keep" data-confirm="' + i + '">Confirm it&rsquo;s there</button>' : '';
      return '<li><span class="name">' + esc(g.tub && g.label ? g.label + ' (tub)' : g.name) + '</span>' +
        '<span class="qty">' + esc(g.qty) + '</span>' + confBadge(g.confidence) + srcBadge(g.source) +
        '<span class="spacer"></span>' + confirmBtn +
        '<button class="icon-btn" data-remove="' + i + '" aria-label="Remove ' + esc(g.name) + '">Remove</button>' +
        (g.note ? '<span class="note">' + esc(g.note) + '</span>' : '') + tubCtl + '</li>';
    }).join('');

    root.innerHTML =
      '<section class="section"><p><a href="#/home">&larr; All fridges</a></p>' +
      '<h1 class="page" style="margin-top:10px">' + esc(f.name) + '</h1>' +
      '<p class="lede">' + esc(f.blurb) + '</p></section>' +
      '<div class="fridge-layout"><div>' +
      '<div class="card photo-card"><img src="' + esc(f.photo) + '" alt="Photo of ' + esc(f.name.toLowerCase()) + '">' +
      '<p class="cap">' + esc(f.photoCredit) + '</p></div>' +
      '<div style="height:16px"></div>' + keyHint() +
      (state.fridgeId === 'uploaded' ?
        '<div class="notice"><b>Your photo.</b> ' + esc(state.sourceNote) + '</div>' +
        '<button class="btn" id="detect-btn" ' + (state.key ? '' : 'disabled') + '>Detect ingredients with Gemini</button> ' +
        (state.key ? '' : '<span class="small muted">Add a key in Settings to use this.</span>') +
        '<div style="height:16px"></div>' : '') +
      '<button class="btn" id="to-recipes">Get recipes &rarr;</button> ' +
      '<button class="btn ghost" id="reset-list">Reset list</button>' +
      '</div><div>' +
      '<h2 style="font-size:22px;margin-bottom:4px">What&rsquo;s inside</h2>' +
      '<p class="muted small" style="margin-bottom:12px">' + esc(state.sourceNote) +
      (unsureCount ? ' ' + unsureCount + ' item' + (unsureCount > 1 ? 's are' : ' is') + ' marked unsure.' : '') + '</p>' +
      '<div class="card"><ul class="ing-list">' + (items || '<li class="muted">Nothing listed yet — add what you see, or detect with Gemini.</li>') + '</ul>' +
      '<div class="add-row"><input id="add-name" type="text" placeholder="Add an item, e.g. Chicken thighs" aria-label="Item name">' +
      '<input id="add-qty" type="text" placeholder="Qty" aria-label="Quantity" style="max-width:90px">' +
      '<button class="btn small" id="add-btn">Add</button></div></div>' +
      '<h3 style="font-size:17px;margin:18px 0 6px">Pantry — assumed already owned</h3>' +
      '<p class="muted small" style="margin-bottom:8px">Recipe needs from this list never appear on the shopping list. Tap to turn off.</p>' +
      '<div class="pantry">' + FCDATA.DEFAULT_PANTRY.map(function (p) {
        var on = state.pantry.indexOf(p) >= 0;
        return '<button data-pantry="' + esc(p) + '" class="' + (on ? '' : 'off') + '" aria-pressed="' + on + '">' + esc(p) + '</button>';
      }).join('') + '</div>' +
      '</div></div>';

    $$('[data-remove]', root).forEach(function (b) {
      b.addEventListener('click', function () { state.ingredients.splice(Number(b.dataset.remove), 1); route(); });
    });
    $$('[data-confirm]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var g = state.ingredients[Number(b.dataset.confirm)];
        g.unsure = false; g.confidence = 'high'; g.source = 'typed'; route();
      });
    });
    $$('[data-tub]', root).forEach(function (sel) {
      sel.addEventListener('change', function () {
        var g = state.ingredients[Number(sel.dataset.tub)];
        g.label = sel.value || null;
        if (g.label) { g.unsure = false; g.confidence = 'high'; g.source = 'typed'; }
        route();
      });
    });
    $$('[data-pantry]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.dataset.pantry;
        var i = state.pantry.indexOf(p);
        if (i >= 0) state.pantry.splice(i, 1); else state.pantry.push(p);
        store.set('fc-pantry', state.pantry);
        route();
      });
    });
    $('#add-btn', root).addEventListener('click', function () {
      var name = $('#add-name', root).value.trim();
      var qty = $('#add-qty', root).value.trim() || 'some';
      if (!name) { $('#add-name', root).focus(); return; }
      state.ingredients.push({ name: name, qty: qty, confidence: 'high', unsure: false, tub: false, label: null, source: 'typed', note: '' });
      route();
    });
    $('#reset-list', root).addEventListener('click', function () { loadFridge(state.fridgeId); route(); });
    $('#to-recipes', root).addEventListener('click', function () { go('#/recipes/' + state.fridgeId); });
    var det = $('#detect-btn', root);
    if (det) det.addEventListener('click', function () {
      if (!state.key || !state.uploadedPhoto) return;
      state.busy = 'Asking Gemini to look at your photo…';
      route();
      FCGEM.detectIngredients(state.uploadedPhoto, state.key, state.model).then(function (res) {
        state.busy = '';
        if (!res.ok) { alert('Gemini could not read this photo: ' + res.error); route(); return; }
        state.ingredients = res.ingredients;
        state.sourceNote = 'Detected by Gemini just now (' + state.model + '). ' + res.ingredients.length + ' items found' +
          (res.dropped ? ', ' + res.dropped + ' unreadable row' + (res.dropped > 1 ? 's' : '') + ' dropped.' : '.') +
          ' Check the list — detection can be wrong.';
        route();
      }).catch(function (err) {
        state.busy = '';
        alert('Gemini call failed: ' + err.message + '\nYour photo and list are unchanged.');
        route();
      });
    });
  }

  /* ---- recipes view --------------------------------------------------- */
  function renderRecipes(root) {
    var f = currentFridge();
    if (!f) { go('#/home'); return; }
    var list = ranked();
    var hidden = allRecipes().filter(function (r) { return !FC.isRecipeVisible(r, state.ingredients); });
    var flt = state.filters;

    var cards = list.map(function (entry) {
      var r = entry.recipe, a = entry.analysis;
      var sel = !!state.selected[r.id];
      var miss = a.missing.length;
      return '<article class="card recipe-card">' +
        '<h3>' + esc(r.title) + '</h3><p class="blurb">' + esc(r.blurb) + '</p>' +
        '<div class="meta"><span><b>' + r.minutes + '</b> min</span><span>' + esc(r.difficulty) + '</span>' +
        '<span>Serves ' + r.servings + '</span><span>' + esc(r.spice) + '</span>' +
        (r.kcalPerServing ? '<span>~' + r.kcalPerServing + ' kcal/serving (estimate)</span>' : '') + '</div>' +
        '<p class="cover"><span class="have">You have ' + a.have.length + ' of ' + r.needs.length + ' things</span>' +
        (miss ? ' &middot; <span class="miss">need ' + miss + ' more</span>' : ' &middot; <span class="have">nothing to buy</span>') + '<br>' +
        '<span class="muted">Uses ' + a.fridgeItemsUsed + ' of your fridge items</span></p>' +
        '<div class="foot">' +
        '<button class="btn small" data-open="' + esc(r.id) + '">Cook this</button>' +
        '<button class="btn ghost small" data-pick="' + esc(r.id) + '" aria-pressed="' + sel + '">' + (sel ? '✓ On the shopping list' : '+ Shopping list') + '</button>' +
        (r.source === 'gemini' ? '<span class="tag ai">Made by Gemini</span>' : '<span class="tag">Saved recipe</span>') +
        '</div></article>';
    }).join('');

    root.innerHTML =
      '<section class="section"><p><a href="#/fridge/' + esc(state.fridgeId) + '">&larr; Back to the fridge</a></p>' +
      '<h1 class="page" style="margin-top:10px">Recipes from this fridge</h1>' +
      '<p class="lede">Ranked by what you can cook right now — most ingredients already in the fridge first.</p></section>' +
      busyBar() +
      '<div class="card filters"><div class="field"><label>Servings</label><div class="stepper">' +
      '<button id="serv-minus" aria-label="Fewer servings">−</button><span>' + flt.servings + '</span><button id="serv-plus" aria-label="More servings">+</button></div></div>' +
      '<div class="field"><label>Max time</label><select id="f-time">' +
      '<option value="0"' + (flt.maxMinutes === 0 ? ' selected' : '') + '>Any time</option>' +
      '<option value="20"' + (flt.maxMinutes === 20 ? ' selected' : '') + '>20 minutes</option>' +
      '<option value="30"' + (flt.maxMinutes === 30 ? ' selected' : '') + '>30 minutes</option>' +
      '<option value="45"' + (flt.maxMinutes === 45 ? ' selected' : '') + '>45 minutes</option></select></div>' +
      '<div class="field"><label>Spice</label><select id="f-spice">' +
      ['any', 'Mild', 'Medium', 'Hot'].map(function (s) { return '<option value="' + s + '"' + (flt.spice === s ? ' selected' : '') + '>' + (s === 'any' ? 'Any spice' : s) + '</option>'; }).join('') + '</select></div>' +
      '<label class="check-row"><input type="checkbox" id="f-veg"' + (flt.vegOnly ? ' checked' : '') + '> Vegetarian only</label>' +
      '<button class="btn ghost" id="gen-btn" ' + (state.key ? '' : 'disabled') + '>Generate 3 more with Gemini</button></div>' +
      (state.key ? '' : '<div class="notice amber"><b>Want fresh recipes from Gemini?</b> Add your free key in <a href="#/settings">Settings</a> — the saved recipes above work without one.</div>') +
      (state.geminiNote ? '<div class="notice">' + esc(state.geminiNote) + '</div>' : '') +
      (list.length ? '<div class="recipe-grid">' + cards + '</div>'
        : '<div class="card empty"><h3>No recipes fit this fridge yet</h3><p>' +
          (hidden.length ? 'Some recipes are waiting on a labelled tub — go back and say what&rsquo;s inside one. ' : '') +
          'Or loosen the filters, add an ingredient, or generate with Gemini.</p></div>') +
      (hidden.length ? '<p class="muted small" style="margin-top:14px">' + hidden.length + ' recipe' + (hidden.length > 1 ? 's are' : ' is') +
        ' hidden until a tub is labelled (' + hidden.map(function (r) { return esc(r.title); }).join(', ') + ').</p>' : '') +
      '<div style="height:16px"></div><button class="btn" id="to-shop">Shopping list &rarr;</button>';

    $('#serv-minus', root).addEventListener('click', function () { state.filters.servings = Math.max(1, flt.servings - 1); route(); });
    $('#serv-plus', root).addEventListener('click', function () { state.filters.servings = Math.min(6, flt.servings + 1); route(); });
    $('#f-time', root).addEventListener('change', function (e) { state.filters.maxMinutes = Number(e.target.value); route(); });
    $('#f-spice', root).addEventListener('change', function (e) { state.filters.spice = e.target.value; route(); });
    $('#f-veg', root).addEventListener('change', function (e) { state.filters.vegOnly = e.target.checked; route(); });
    $$('[data-open]', root).forEach(function (b) {
      b.addEventListener('click', function () { go('#/recipe/' + state.fridgeId + '/' + b.dataset.open); });
    });
    $$('[data-pick]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.pick;
        state.selected[id] = !state.selected[id];
        navCount(); route();
      });
    });
    $('#to-shop', root).addEventListener('click', function () { go('#/shopping/' + state.fridgeId); });
    var gen = $('#gen-btn', root);
    if (gen) gen.addEventListener('click', function () {
      if (!state.key) return;
      state.busy = 'Asking Gemini for 3 recipes from your list…';
      route();
      FCGEM.generateRecipes(state.ingredients, state.filters, state.key, state.model).then(function (res) {
        state.busy = '';
        if (!res.ok) { alert('Gemini could not write recipes: ' + res.error); route(); return; }
        state.geminiRecipes = res.recipes;
        state.geminiNote = 'Generated by Gemini just now (' + state.model + ') from your confirmed list.' +
          (res.dropped ? ' ' + res.dropped + ' unusable draft' + (res.dropped > 1 ? 's' : '') + ' dropped.' : '') +
          ' They are not kitchen-tested — read the steps before you cook.';
        route();
      }).catch(function (err) {
        state.busy = '';
        alert('Gemini call failed: ' + err.message + '\nThe saved recipes are still here.');
        route();
      });
    });
  }

  /* ---- recipe detail -------------------------------------------------- */
  function renderDetail(root, recipeId) {
    var f = currentFridge();
    var r = allRecipes().find(function (x) { return x.id === recipeId; });
    if (!f || !r) { go('#/recipes/' + state.fridgeId); return; }
    var a = FC.analyseRecipe(r, state.ingredients, pantryOwned());
    var factor = state.filters.servings / r.servings;
    var cooked = state.history.some(function (h) { return h.recipe === r.title && h.fridge === f.name; });

    var steps = r.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    var haveRows = a.have.map(function (n) {
      return '<li><span><span class="tick">✓</span> ' + esc(n.name) + '</span><span class="qty">' + esc(FC.scaleQty(n.qty, factor)) + '</span></li>';
    }).join('');
    var missRows = a.missing.map(function (n) {
      return '<li><span><span class="cross">○</span> ' + esc(n.name) + '</span><span class="qty">' + esc(FC.scaleQty(n.qty, factor)) + '</span></li>';
    }).join('');

    root.innerHTML =
      '<section class="section"><p><a href="#/recipes/' + esc(state.fridgeId) + '">&larr; All recipes</a></p>' +
      '<h1 class="page" style="margin-top:10px">' + esc(r.title) + '</h1>' +
      '<p class="lede">' + esc(r.blurb) + '</p>' +
      '<p class="muted" style="margin-top:10px">' + r.minutes + ' min &middot; ' + esc(r.difficulty) + ' &middot; ' + esc(r.spice) +
      ' &middot; Serves ' + state.filters.servings + ' (recipe written for ' + r.servings + ')' +
      (r.kcalPerServing ? ' &middot; ~' + Math.round(r.kcalPerServing * factor) + ' kcal/serving (estimate)' : '') +
      (r.source === 'gemini' ? ' &middot; Made by Gemini — not kitchen-tested' : ' &middot; Saved recipe') + '</p></section>' +
      '<div class="detail-layout"><div class="card"><ol class="steps">' + steps + '</ol></div>' +
      '<div><div class="card have-need" style="padding:18px 20px"><h3>You have</h3><ul>' + (haveRows || '<li class="muted">Nothing from this recipe is in the fridge.</li>') + '</ul>' +
      '<h3>You need</h3><ul>' + (missRows || '<li class="muted">Nothing — you can cook this now.</li>') + '</ul></div>' +
      '<div style="height:12px"></div>' +
      '<button class="btn" id="pick-btn">' + (state.selected[r.id] ? '✓ On the shopping list' : '+ Add to shopping list') + '</button> ' +
      '<button class="btn ghost" id="cooked-btn" ' + (cooked ? 'disabled' : '') + '>' + (cooked ? 'Cooked — saved to history' : 'I cooked this') + '</button>' +
      '</div></div>';

    $('#pick-btn', root).addEventListener('click', function () {
      state.selected[r.id] = !state.selected[r.id];
      navCount(); route();
    });
    $('#cooked-btn', root).addEventListener('click', function () {
      state.history.unshift({ recipe: r.title, fridge: f.name, date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) });
      state.history = state.history.slice(0, 20);
      store.set('fc-history', state.history);
      route();
    });
  }

  /* ---- shopping list -------------------------------------------------- */
  function renderShopping(root) {
    var f = currentFridge();
    if (!f) { go('#/home'); return; }
    var list = ranked();
    var gaps = FC.buildGapList(selectedRecipes(), state.ingredients, pantryOwned());

    var picks = list.map(function (entry) {
      var r = entry.recipe;
      return '<label><input type="checkbox" data-sel="' + esc(r.id) + '"' + (state.selected[r.id] ? ' checked' : '') + '> ' +
        esc(r.title) + ' <span class="muted small">(' + entry.analysis.missing.length + ' to buy)</span></label>';
    }).join('');

    var gapRows = gaps.map(function (g, i) {
      var key = g.name;
      var done = !!state.checked[key];
      return '<li class="' + (done ? 'done' : '') + '"><input type="checkbox" data-gap="' + esc(key) + '"' + (done ? ' checked' : '') + ' aria-label="Bought ' + esc(g.name) + '">' +
        '<span><span class="gname">' + esc(g.name) + '</span><br><span class="for">for ' + esc(g.forRecipes.join(', ')) + '</span></span>' +
        '<span class="qty">' + esc(g.qty) + '</span></li>';
    }).join('');

    root.innerHTML =
      '<section class="section"><p><a href="#/recipes/' + esc(state.fridgeId) + '">&larr; Back to recipes</a></p>' +
      '<h1 class="page" style="margin-top:10px">Shopping list</h1>' +
      '<p class="lede">Everything missing for the recipes you picked, merged into one list. Tick things off as you buy them.</p></section>' +
      '<div class="detail-layout"><div>' +
      '<h2 style="font-size:20px;margin-bottom:10px">To buy (' + gaps.length + ')</h2>' +
      '<div class="card">' + (gaps.length ? '<ul class="gap-list">' + gapRows + '</ul>'
        : '<div class="empty"><h3>Nothing to buy</h3><p>Pick a recipe on the right, or you already have everything for the ones picked.</p></div>') + '</div>' +
      '<div style="height:12px"></div><div class="no-print">' +
      '<button class="btn" id="copy-btn">Copy as text</button> ' +
      '<button class="btn ghost" id="print-btn">Print</button></div>' +
      '<p class="small muted" style="margin-top:10px">This list only knows about the fridge and your pantry list. It does not know about your cupboards unless you tell it.</p>' +
      '</div><div><h2 style="font-size:20px;margin-bottom:10px">Recipes on the list</h2>' +
      '<div class="pick-list">' + (picks || '<p class="muted">No recipes fit the current filters.</p>') + '</div></div></div>';

    $$('[data-sel]', root).forEach(function (cb) {
      cb.addEventListener('change', function () { state.selected[cb.dataset.sel] = cb.checked; navCount(); route(); });
    });
    $$('[data-gap]', root).forEach(function (cb) {
      cb.addEventListener('change', function () {
        state.checked[cb.dataset.gap] = cb.checked;
        store.set('fc-checked', state.checked);
        route();
      });
    });
    $('#copy-btn', root).addEventListener('click', function () {
      var text = FC.gapListText(gaps);
      var done = function () { $('#copy-btn', root).textContent = 'Copied'; setTimeout(route, 900); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });
    $('#print-btn', root).addEventListener('click', function () { window.print(); });
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---- settings ------------------------------------------------------- */
  function renderSettings(root) {
    var models = FCGEM.MODELS.map(function (m) {
      return '<option value="' + esc(m.id) + '"' + (state.model === m.id ? ' selected' : '') + '>' + esc(m.label) + '</option>';
    }).join('');

    root.innerHTML =
      '<section class="section"><h1 class="page">Settings</h1>' +
      '<p class="lede">Your key, your pantry, and the honest limits of this app.</p></section>' +
      '<div class="settings-grid">' +
      '<div class="card"><h3>Gemini key</h3>' +
      '<p class="muted small">Live detection and recipe generation use Google&rsquo;s Gemini API. Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>. The key is stored only in this browser&rsquo;s local storage and is sent to Google only when you tap Detect or Generate.</p>' +
      '<div class="field"><label for="key-input">API key</label><div class="key-row">' +
      '<input type="password" id="key-input" placeholder="Paste your key here" value="' + esc(state.key) + '" autocomplete="off">' +
      '<button class="btn ghost" id="toggle-key" type="button">Show</button></div></div>' +
      '<div class="field"><label for="model-select">Model</label><select id="model-select">' + models + '</select>' +
      '<p class="muted small" style="margin-top:6px">Gemini 3.8 Flash is the current free-tier model (verified 23 Nov 2026). Gemini 2.5 Flash was deprecated by Google on 2 Nov 2026, so it is not offered here.</p></div>' +
      '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" id="save-key">Save key</button>' +
      '<button class="btn ghost small" id="test-key">Test key</button>' +
      '<button class="btn danger small" id="clear-key">Remove key</button></div>' +
      '<p class="status" id="key-status">' + (state.key ? 'A key is saved in this browser.' : 'No key saved. The app runs on saved lists until you add one.') + '</p></div>' +
      '<div class="card"><h3>Pantry</h3>' +
      '<p class="muted small">Staples assumed already owned. Recipe needs from this list never reach the shopping list.</p>' +
      '<div class="pantry" style="margin-top:12px">' + FCDATA.DEFAULT_PANTRY.map(function (p) {
        var on = state.pantry.indexOf(p) >= 0;
        return '<button data-pantry="' + esc(p) + '" class="' + (on ? '' : 'off') + '">' + esc(p) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="card"><h3>Honest limits</h3><ul class="limits">' +
      '<li>A photo cannot see inside closed containers, behind items, or into the freezer. Tubs are labelled unsure until you say what&rsquo;s inside.</li>' +
      '<li>Vision can misidentify items and guess quantities. Every detection shows a confidence badge, and the list is always editable.</li>' +
      '<li>Recipes are generated or hand-written — not tested in a kitchen. Nutrition figures are estimates.</li>' +
      '<li>Without a key, nothing is detected live. Seeded fridges use lists checked against the photos by a human.</li>' +
      '<li>Your key lives only in this browser. Calls go straight from here to Google; there is no Fridge Chef server.</li>' +
      '</ul></div>' +
      '<div class="card"><h3>Your data</h3>' +
      '<p class="muted small">History, pantry, ticked shopping items and your key live in this browser&rsquo;s local storage. Nothing leaves the device except the optional Gemini calls.</p>' +
      '<div style="margin-top:14px"><button class="btn danger small" id="wipe">Erase everything stored</button></div></div>' +
      '</div>';

    $('#toggle-key', root).addEventListener('click', function () {
      var inp = $('#key-input', root);
      inp.type = inp.type === 'password' ? 'text' : 'password';
      $('#toggle-key', root).textContent = inp.type === 'password' ? 'Show' : 'Hide';
    });
    $('#save-key', root).addEventListener('click', function () {
      state.key = $('#key-input', root).value.trim();
      state.model = $('#model-select', root).value;
      store.set('fc-key', state.key); store.set('fc-model', state.model);
      $('#key-status', root).textContent = state.key ? 'Key saved in this browser.' : 'Key field was empty — nothing saved.';
      $('#key-status', root).className = 'status ok';
    });
    $('#test-key', root).addEventListener('click', function () {
      var key = $('#key-input', root).value.trim();
      var model = $('#model-select', root).value;
      var st = $('#key-status', root);
      if (!key) { st.textContent = 'Paste a key first.'; st.className = 'status err'; return; }
      st.textContent = 'Testing…'; st.className = 'status';
      FCGEM.testKey(key, model).then(function (res) {
        st.textContent = res.ok ? 'Key works with ' + model + '.' : 'Key test failed: ' + res.error;
        st.className = 'status ' + (res.ok ? 'ok' : 'err');
      });
    });
    $('#clear-key', root).addEventListener('click', function () {
      state.key = ''; store.del('fc-key');
      $('#key-input', root).value = '';
      $('#key-status', root).textContent = 'Key removed. Live AI is off until you add one.';
      $('#key-status', root).className = 'status';
    });
    $$('[data-pantry]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.dataset.pantry;
        var i = state.pantry.indexOf(p);
        if (i >= 0) state.pantry.splice(i, 1); else state.pantry.push(p);
        store.set('fc-pantry', state.pantry);
        route();
      });
    });
    $('#wipe', root).addEventListener('click', function () {
      if (!confirm('Erase the saved key, pantry, history and ticked items in this browser?')) return;
      ['fc-key', 'fc-model', 'fc-pantry', 'fc-history', 'fc-checked'].forEach(store.del);
      state.key = ''; state.model = 'gemini-3.8-flash'; state.pantry = FCDATA.DEFAULT_PANTRY.slice(); state.history = []; state.checked = {};
      route();
    });
  }

  /* ---- boot ----------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    var shopBtn = $('#nav-shopping');
    if (shopBtn) shopBtn.addEventListener('click', function () { go(state.fridgeId ? '#/shopping/' + state.fridgeId : '#/home'); });
    window.addEventListener('hashchange', route);
    // Debug/testing hook (read-only state + re-render; no secrets exposed).
    window.FridgeChefApp = { state: state, rerender: route };
    route();
    navCount();
  });
})();
