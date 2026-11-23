# Fridge Chef — PLAN.md

## 1. Project brief (master-prompt §1)

- **Name:** Fridge Chef
- **Type:** Web app (single-page, no build step, GitHub Pages-ready)
- **What it does (1 sentence):** Photograph your fridge and get recipes you can actually cook from what's inside it, plus the exact shopping list for what's missing.
- **Target user and biggest pain:** People who open the fridge, see vegetables going soft, and cook the same two things or order takeaway — because deciding what to cook from random ingredients is the hard part, not cooking.
- **Core promise:** One photo → three cookable recipes → one shopping list. No guessing.
- **Tone:** Calm, plain, kitchen-table. A good cook talking, not a startup.
- **Colours:** Leaf green `#2D6A4F` (one accent, under 10% of any screen), warm paper `#FAF7F0`, ink `#1C2420`. No gradients, no glows.
- **Type:** Fraunces (serif display, self-hosted) + Inter (text, self-hosted).
- **Reference sites (design-playbook):** NYT Cooking (recipe-card hierarchy, serif headlines, clear time/serving metadata); Mobbin recipe & pantry app flows (photo → list → recipe flow, bottom-sheet style detail); Minimal Gallery / Land-book (clean editorial layout, one strong font, restrained spacing).
- **Platforms:** Web, mobile-first (camera path matters).
- **Must-have features:** See §3.
- **Budget/timeline:** Hackathon build, demoable in 24–48 h.

## 2. Honest limits (stated in the app, not hidden)

1. A photo cannot see inside closed containers, behind items, or into the freezer drawer. Items in tubs are shown as **unsure — contents unknown** until the user labels them.
2. A vision model can misidentify items, guess quantities, and cannot read expiry dates. Every detected item shows a confidence badge; low-confidence items are flagged "unsure — tap to confirm or remove". The list is always editable.
3. Recipes are generated, not tested in a kitchen. Nutrition figures are estimates and labelled as estimates.
4. **No API key exists in this build.** Without a key the app never pretends to detect anything: seeded fridges ship with hand-verified ingredient lists (checked against the actual photos by a human), and live detection/generation only run when the user pastes their own free Gemini API key in Settings (stored in `localStorage` only, never sent anywhere except Google's API when the user taps Detect/Generate).
5. The shopping gap list only knows about the fridge and the pantry list the user confirms. It does not know about cupboards unless told.

## 3. Feature set (SaaS level, demoable in 24–48 h)

### Core flow
1. **Pick a fridge** — 3 seeded fridges (real photos, bundled locally, public-domain USDA photos via Wikimedia Commons) or upload your own photo (file picker / phone camera, compressed client-side to max 1024 px before any upload).
2. **See what's inside** — ingredient list with quantity, confidence badge (Sure / Likely / Unsure), and a plain-language note on how the list was made ("Saved list, checked against this photo" vs "Detected by Gemini just now" vs "You typed this").
3. **Fix the list** — add an item, remove one, edit a quantity, confirm or delete an unsure item, label a closed tub from a short list (Cooked rice / Cooked dal / Cooked vegetables / Soup or stew / Bread or sandwiches / Something else).
4. **Set the table** — servings stepper (1–6), filters: vegetarian only, max time (any / 20 / 30 / 45 min), spice (any / mild / medium / hot).
5. **Get 3 recipes** — ranked by how cookable they are right now (share of recipe needs already in the fridge or pantry, then share of fridge items used). Each card shows: title, one-line blurb, minutes, difficulty, servings, spice, "You have 7 of 9 things", "Uses 6 of your 14 fridge items", kcal per serving (estimate).
6. **Open a recipe** — full steps (numbered, plain verbs), have-vs-need split, per-step clarity, "I cooked this" button (logs to history).
7. **Shopping gap list** — pick 1–3 recipes for the week; the gap list combines everything missing, de-duplicates and merges quantities, and can be checked off, copied as plain text, or printed. It updates live when the ingredient list or the selected recipes change.
8. **Pantry** — staples assumed already owned (salt, pepper, oil, garlic, ginger, cumin, turmeric, chilli powder, garam masala, chilli flakes, rice, dried pasta). Editable; a recipe need that is a pantry staple never appears in the gap list.

### Live AI (key required — `gemini-3.8-flash`, free tier)
- **Detect from photo:** sends the photo (base64 JPEG) + strict JSON prompt to Gemini; returns ingredients with quantity + confidence. Validated client-side; bad rows are dropped, never shown.
- **Generate recipes:** sends the confirmed ingredient list + filters; returns 3 recipes in the same JSON shape as the cached ones. Ranked by the same coverage logic.
- Model picker in Settings: `gemini-3.8-flash` (default, current free-tier Flash model, verified 23 Nov 2026 against Google's model docs) or `gemini-3.5-flash-lite` (fallback). `gemini-2.5-flash` is **not** offered: Google deprecated it 2 Nov 2026 and routes it to 3.5 Flash-Lite from 1 Dec 2026.
- **Test key** button: one tiny `generateContent` call; reports success or the exact error Google returns.
- Every AI result is labelled with its source and time. If Gemini fails or the quota runs out, the app says so and keeps the cached recipes working.

### No-key mode (the default demo)
- All 3 seeded fridges work end to end with verified lists and cached recipes.
- Upload-your-own works with manual ingredient entry.
- Every AI button states plainly that a key is needed and links to Settings. Nothing is faked.

### Supporting features
- **History:** recipes marked "cooked" are saved locally (date, fridge, recipe) and listed on the home screen. No account, no server.
- **Print view** for the gap list (clean, ink-friendly).
- **Settings:** key, model, clear key, pantry editor, "how detection works" explainer, honest-limits panel.
- **Empty/error states:** every state says what to do next in plain words.

### Deliberately out of scope (v2)
Accounts/sync, expiry-date tracking (a photo can't read dates reliably), barcode scanning, store prices/ordering, meal-plan calendar, nutrition API verification, multi-user households.

## 4. Data model

```js
Fridge {
  id: string, name: string, blurb: string,
  photo: string,                 // local asset path
  photoCredit: string,           // e.g. "USDA photo by Margaret Barse, public domain"
  ingredients: Ingredient[],     // verified list for seeded fridges
  cachedRecipes: Recipe[]        // cached recipes; some gated on tub labels
}

Ingredient {
  name: string,                  // canonical display name, e.g. "Cherry tomatoes"
  qty: string,                   // "1 punnet", "2", "~250 g" — quantities are estimates
  confidence: "high" | "medium" | "low",
  unsure: boolean,               // true for closed tubs / partly hidden items
  tub: boolean,                  // true if contents cannot be seen
  label: string | null,          // user label for a tub, e.g. "Cooked rice"
  source: "verified" | "gemini" | "typed"
}

Recipe {
  id: string, title: string, blurb: string,
  minutes: number, difficulty: "Easy" | "Medium",
  servings: number, spice: "Mild" | "Medium" | "Hot",
  veg: boolean, kcalPerServing: number,   // ESTIMATE, labelled as such
  needs: { name: string, qty: string }[], // every ingredient the recipe calls for
  steps: string[],
  requiresLabel: string | null,  // e.g. "Cooked rice" — hidden until a tub has this label
  source: "cached" | "gemini"
}

PantryItem { name: string, owned: boolean }
GapItem { name: string, qty: string, forRecipes: string[] }
```

Matching: names are normalised (lowercase, trim, singular) and resolved through a
synonym map (`tomato` group covers tomato / tomatoes / cherry tomatoes / tomatoes on
the vine; `aubergine` covers eggplant / brinjal; `courgette` covers zucchini). A recipe
need is **have** if its canonical group is in the fridge list or in owned pantry.
Coverage = have-needs / all-needs. Fridge-use = fridge items used / fridge items total.
Ranking: coverage desc, then fridge-use desc, then minutes asc.

Gap list: for the selected recipes, every need that is not have, de-duplicated by
canonical name; quantities merged (numbers with the same unit are added; different
units are joined with " + "). Each gap item records which recipes need it.

## 5. Seeded fridges (verified by looking at the photos)

### A. "The fresh drawer" — `assets/fridge-veg.jpg`
USDA photo by Margaret Barse (public domain). Visible: eggs ×12, white onion ×1,
cherry tomatoes 1 punnet, spinach 1 box, baby carrots 1 bag, milk ~1 L, orange juice
~1 L, pink grapefruit juice ~1 L, broccoli 1 head, courgette ×2, aubergine ×2,
tomatoes on the vine ×4, lemon ×1, grapefruit ×2, kiwi ×1, limes ×4. One partly
hidden bag under the tomatoes is marked unsure.
Cached recipes: Spinach & cherry tomato frittata (25 min, all have); Roasted
aubergine, courgette & tomato tray (40 min, all have); Broccoli & carrot stir-fry
with egg-fried rice (20 min, missing soy sauce + spring onions → gap-list demo).

### B. "Weekend leftovers" — `assets/fridge-mixed.jpg`
USDA FSIS photo (public domain): a fridge of mostly drinks and closed tubs — the
honest "unsure" demo. Visible: orange juice ~1 L, sparkling lemon drink 1 can,
orange soda 1 bottle, iced coffee 1 cup, dressing jar 1 (unsure), 3 closed tubs
(contents unknown — tap to label). No fresh produce is clearly identifiable.
Cached recipes: Citrus cooler (always visible); Fridge-clear fried rice (needs a
tub labelled "Cooked rice"); Soup & toast (needs a tub labelled "Soup or stew").
Until a tub is labelled the recipe panel says plainly why only one recipe shows.

### C. "The veg bin" — `assets/fridge-bin.jpg`
USDA photo (public domain). Visible: aubergine ×2, courgette ×2, broccoli 2 heads,
tomatoes on the vine ×5, baby carrots 1 pack (partly hidden — unsure).
Cached recipes (Indian-leaning): Smoky aubergine & tomato mash, baingan bharta
style (35 min, missing onion, green chilli, lemon); Broccoli & tomato pasta
(25 min, missing parmesan); Roasted courgette & carrot tray (30 min, missing lemon).

## 6. User flow end to end

1. Home: headline "What's in the fridge?", three fridge cards (photo, item count,
   one-line note) + "Use your own photo" card + "How this works" + history.
2. Pick a fridge → photo on the left, ingredient list on the right. Confidence
   badges visible. Unsure items carry a one-line reason ("in a closed tub — tap
   to say what's inside").
3. Fix the list (add/remove/edit/confirm/label). Pantry strip below: staples with
   on/off toggles.
4. Filters row (servings, veg only, max time, spice) → recipe cards appear,
   ranked, each with have/need counts.
5. Open a recipe → detail view: steps, have list (green ticks), need list (with
   quantities), "Add to shopping list" toggle (on by default), "I cooked this".
6. Shopping list tab: combined gap list for selected recipes, check-off boxes,
   copy-as-text, print. A checked item stays checked until the list changes.
7. Settings (gear): Gemini key field, model picker, test key, pantry editor,
   honest-limits panel, clear-all-data.
8. Upload-your-own: pick photo → compressed preview → "Detect with Gemini"
   (key needed) or "Type what you see" → same flow from step 3 with an empty list.

## 7. Screens

1. Home (fridge picker + history + how it works)
2. Fridge view (photo + editable ingredients + pantry)
3. Recipes (filter bar + ranked cards)
4. Recipe detail (steps + have/need + cooked button)
5. Shopping list (combined gaps + copy/print)
6. Settings (key, model, pantry, limits, danger zone)

One page, six views switched in JS; header nav: Cook / Shopping list / Settings.
Mobile: single column, photo first, sticky "Get recipes" button.

## 8. Tech

- Plain HTML + CSS + vanilla JS. No build step, no framework, no backend server.
  Why: a hackathon demo must open from `file://` and from GitHub Pages with zero
  deploy work, and the only network call is the optional Gemini call.
- Self-hosted Fraunces + Inter (woff2 in `assets/fonts/`), self-hosted photos.
- `localStorage` only: Gemini key, pantry, history, checked gap items. No cookies,
  no analytics, no tracking.
- Gemini API: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
  with `responseMimeType: "application/json"`, direct from the browser.
- Tests: Node `node:test` against pure logic in `logic.js` (matching, coverage,
  ranking, gap-list merging, Gemini-response validation, filters).

## 9. 2-minute demo script

- **0:00–0:20** — "Dinner is the question 'what's in the fridge?' — so start there."
  Open Fridge A, the fresh drawer. Point at the photo, then the list: 16 items,
  each with a confidence badge. Tap the one unsure bag: "The photo can't see
  inside that bag, so we say so instead of guessing."
- **0:20–1:00** — Tap "Get recipes". Three cards, ranked. Top card: "You have 9
  of 9 things." Open it: steps, time, have/need split. "No missing items — you
  can cook this now."
- **1:00–1:30** — Tap the stir-fry: two things missing. Open the shopping list:
  soy sauce and spring onions, merged across both selected recipes. Delete one
  wrong detection (the unsure bag) and watch the coverage numbers move.
- **1:30–2:00** — Switch to Fridge B, the leftovers fridge: "Three tubs, no idea
  what's in them — so we ask." Label one tub "Cooked rice" and a second recipe
  appears. Close: "Fewer wasted vegetables, one shopping list, no guessing
  what to cook." If asked about live detection: open Settings, paste a key,
  upload a photo, detect — or say plainly the key is the only missing piece.

## 10. Biggest risk + fallback

The live photo misreads, or the free-tier quota runs out mid-demo. Fallback: the
seeded photo + verified list + cached recipes — the UI, editing, ranking and gap
list are all still live — and, if needed, a recorded video of the best run. Never
claim a guessed ingredient is certain; show confidence and let the user edit it.

## 11. Launch checklist

- [ ] All 3 seeded fridges verified against their photos by eye
- [ ] Tests green, exact count reported
- [ ] Screenshots 1280 px + 390 px, zero horizontal overflow, read by eye
- [ ] No-key demo works end to end; key flow tested against a real key if available
- [ ] README + MIT LICENSE, no secrets in repo, photos credited
- [ ] `git init` + human-style commits; no push (Siva creates the repo)

## 12. v2 ideas

Expiry-date nudges (user-entered dates only); household pantry sync; store
price check on the gap list; scale recipes to servings with quantity maths;
weekly plan from 3 fridges; "use it up first" sorting by what spoils soonest;
voice note ("I bought chicken") to add items; share a fridge by link.
