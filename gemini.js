/* Fridge Chef — Gemini client (optional, key required).
   Calls Google's Gemini API directly from the browser. The key is only ever
   read from localStorage and only sent to Google when the user taps
   "Detect" or "Generate". No key, no call, no faked detection.
   Default model: gemini-3.8-flash (current free-tier Flash model, verified
   23 Nov 2026 against Google's model docs). gemini-2.5-flash is NOT offered:
   Google deprecated it on 2 Nov 2026 and routes it to 3.5 Flash-Lite from
   1 Dec 2026. */
(function (root) {
  'use strict';

  var MODELS = [
    { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (recommended, free tier)' },
    { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (fast, free tier)' }
  ];

  function apiUrl(model) {
    return 'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(model) + ':generateContent';
  }

  function callGemini(key, model, parts) {
    return fetch(apiUrl(model) + '?key=' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
      })
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          var msg = (body.error && body.error.message) || ('Google returned HTTP ' + res.status);
          throw new Error(msg);
        });
      }
      return res.json();
    }).then(function (data) {
      var text = data && data.candidates && data.candidates[0] &&
        data.candidates[0].content && data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
      if (!text) throw new Error('Gemini replied with no text.');
      return text;
    });
  }

  function detectIngredients(imageDataUrl, key, model) {
    var m = imageDataUrl.match(/^data:(image\/[a-z]+);base64,(.*)$/);
    if (!m) return Promise.reject(new Error('That photo could not be read. Try another file.'));
    var prompt = 'Look at this photo of the inside of a fridge. List every food or drink item ' +
      'you can see. Return JSON only: {"ingredients":[{"name":"...","quantity":"...","confidence":"high|medium|low","note":"..."}]}. ' +
      'Rules: only list items you can actually see; do not guess what is inside closed containers — ' +
      'for those use name "Closed container", confidence "low", note "contents not visible". ' +
      'Quantities are rough estimates (e.g. "2", "1 bag", "~250 g"). ' +
      'Confidence "high" only when the item is clearly visible; "low" when partly hidden or the label is unreadable.';
    return callGemini(key, model, [
      { text: prompt },
      { inline_data: { mime_type: m[1], data: m[2] } }
    ]).then(function (text) { return FC.parseGeminiIngredients(text); });
  }

  function generateRecipes(ingredients, filters, key, model) {
    var list = ingredients.map(function (g) { return g.name + ' (' + g.qty + ')'; }).join(', ');
    var prompt = 'You are a practical home cook. Given these fridge ingredients: ' + list + '. ' +
      'Pantry staples already owned: salt, pepper, cooking oil, garlic, ginger, cumin, turmeric, ' +
      'chilli powder, garam masala, chilli flakes, rice, dried pasta. ' +
      'Write 3 recipes that use as much of the fridge as possible. ' +
      (filters && filters.vegOnly ? 'All recipes must be vegetarian. ' : '') +
      (filters && filters.maxMinutes ? 'No recipe over ' + filters.maxMinutes + ' minutes. ' : '') +
      (filters && filters.spice && filters.spice !== 'any' ? 'Spice level ' + filters.spice + '. ' : '') +
      'Return JSON only: {"recipes":[{"title":"...","blurb":"one plain sentence","minutes":25,"difficulty":"Easy|Medium",' +
      '"servings":2,"spice":"Mild|Medium|Hot","veg":true,"kcalPerServing":350,' +
      '"needs":[{"name":"...","qty":"..."}],"steps":["...","..."]}]}. ' +
      'Steps must be real, ordered, and cookable. Do not invent ingredients that are not in the fridge or pantry, ' +
      'except for at most 2 missing items per recipe, which the cook would buy.';
    return callGemini(key, model, [{ text: prompt }])
      .then(function (text) { return FC.parseGeminiRecipes(text); });
  }

  function testKey(key, model) {
    return callGemini(key, model, [{ text: 'Reply with the single word "ok".' }])
      .then(function () { return { ok: true }; })
      .catch(function (err) { return { ok: false, error: err.message }; });
  }

  // Shrink a photo to max 1024px on its longest side, JPEG 0.82.
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, 1024 / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('That file is not a readable photo.')); };
      img.src = url;
    });
  }

  var GEM = { MODELS: MODELS, detectIngredients: detectIngredients, generateRecipes: generateRecipes, testKey: testKey, compressImage: compressImage };
  if (typeof module !== 'undefined' && module.exports) module.exports = GEM;
  root.FCGEM = GEM;
})(typeof window !== 'undefined' ? window : globalThis);
