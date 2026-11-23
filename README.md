# Fridge Chef

Photograph your fridge, get recipes you can actually cook from what's inside
it, and one shopping list for what's missing. Nothing guessed, nothing faked.

## What it does

1. **Pick a fridge** — three real fridges, photographed and listed by hand, or
   upload your own photo (shrunk to 1024 px in the browser first).
2. **See what's inside** — every item carries a confidence badge
   (Sure / Likely / Unsure). Closed tubs say "contents unknown" instead of
   guessing; label one and recipes that need it appear.
3. **Fix the list** — add, remove, edit quantities, confirm unsure items.
   A pantry list (salt, oil, garlic, rice…) is assumed already owned and never
   reaches the shopping list.
4. **Get recipes** — ranked by what you can cook right now (most ingredients
   already in the fridge first), with a have/need split, steps, time, and an
   estimated kcal per serving. Filters: servings, vegetarian only, max time,
   spice.
5. **Shopping list** — pick up to three recipes; the gap list merges everything
   missing, de-duplicates quantities, and can be ticked off, copied as text,
   or printed.

## No key needed — and no faking

There is no API key in this build. Without one, everything runs on the seeded
fridges: hand-verified ingredient lists (checked against the actual photos)
and hand-written recipes. The app says so on every screen.

With your own free Gemini key (Settings → paste key, stored in `localStorage`
only), two live features unlock:

- **Detect from photo** — Gemini looks at your uploaded photo and returns an
  ingredient list with confidence. Bad rows are dropped, never shown.
- **Generate recipes** — Gemini writes 3 recipes from your confirmed list,
  ranked by the same coverage logic as the saved ones.

Model: `gemini-3.8-flash` by default (current free-tier Flash model, verified
23 Nov 2026 against Google's model docs), with `gemini-3.5-flash-lite` as a
fallback. `gemini-2.5-flash` is deliberately not offered — Google deprecated
it on 2 Nov 2026 and routes it to 3.5 Flash-Lite from 1 Dec 2026.

## Honest limits

- A photo cannot see inside closed containers, behind items, or into the
  freezer drawer, and it cannot read expiry dates.
- Vision can misidentify items and guess quantities. The list is always
  editable, and unsure items never count as "have".
- Recipes are generated or hand-written, not tested in a kitchen. Nutrition
  figures are estimates.
- The gap list only knows about the fridge and the pantry list you confirm.

## Run it

No build step, no server. Open `index.html` in a browser, or serve the folder
statically (e.g. `python3 -m http.server`) — it is GitHub Pages-ready.

## Tests

```sh
node --test tests/logic.test.js
```

26 tests, 0 failures. They cover name matching/synonyms, quantity maths,
coverage ranking, tub-gated recipes, gap-list merging, Gemini-response
validation, and seeded-data sanity.

## Screenshots

In `screenshots/` — desktop 1280 px and mobile 390 px, zero horizontal
overflow (verified with the CDP probe: `scrollWidth == innerWidth` on every
capture):

- `home-desktop.png`, `fridge-desktop.png`, `recipes-desktop.png`,
  `leftovers-desktop.png`, `settings-desktop.png`
- `home-mobile.png`, `recipes-mobile.png`, `shopping-mobile.png`

## Design

Leaf green `#2D6A4F` + Fraunces (display) + Inter (text), both self-hosted in
`assets/fonts/`. Warm paper background, one accent, no gradients, no glows.
References: NYT Cooking (recipe-card hierarchy), Mobbin pantry/recipe flows,
Minimal Gallery (clean editorial layout).

## Photos

The three seeded fridge photos are public-domain USDA photos via Wikimedia
Commons, bundled in `assets/` and credited on each fridge screen:

- The fresh drawer — USDA photo by Margaret Barse
- Weekend leftovers — USDA Food Safety and Inspection Service photo
- The veg bin — USDA photo

## Stack

Plain HTML + CSS + vanilla JS. No framework, no backend, no database.
`localStorage` only (key, pantry, history, ticked items). The only network
call is the optional Gemini call, made directly from the browser.

## License

MIT — see `LICENSE`.
