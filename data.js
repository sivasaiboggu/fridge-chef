/* Fridge Chef — seeded data.
   Ingredient lists were verified by a human looking at each photo.
   Quantities are estimates from the photo ("~" where guessed).
   Recipes are hand-written and cookable; kcal figures are estimates. */
(function (root) {
  'use strict';

  var DEFAULT_PANTRY = [
    'Salt', 'Black pepper', 'Cooking oil', 'Garlic', 'Ginger',
    'Cumin seeds', 'Turmeric', 'Red chilli powder', 'Garam masala',
    'Chilli flakes', 'Rice', 'Dried pasta', 'Ice'
  ];

  var TUB_LABELS = ['Cooked rice', 'Cooked dal', 'Cooked vegetables', 'Soup or stew', 'Bread or sandwiches', 'Something else'];

  var FRIDGES = [
    {
      id: 'fresh-drawer',
      name: 'The fresh drawer',
      blurb: 'Eggs, greens and a full veg drawer. The easiest fridge to cook from.',
      photo: 'assets/fridge-veg.jpg',
      photoCredit: 'USDA photo by Margaret Barse, via Wikimedia Commons (public domain).',
      ingredients: [
        { name: 'Eggs', qty: '12', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: 'Yellow carton, top shelf.' },
        { name: 'White onion', qty: '1', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Cherry tomatoes', qty: '1 punnet', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Spinach', qty: '1 box', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: 'Baby spinach box.' },
        { name: 'Baby carrots', qty: '1 bag', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Milk', qty: '~1 L', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: 'Carton behind the juice.' },
        { name: 'Orange juice', qty: '~1 L', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Grapefruit juice', qty: '~1 L', confidence: 'medium', unsure: false, tub: false, label: null, source: 'verified', note: 'Pink bottle; flavour not fully readable.' },
        { name: 'Broccoli', qty: '1 head', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Courgette', qty: '2', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Aubergine', qty: '2', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Tomatoes on the vine', qty: '4', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Lemon', qty: '1', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Grapefruit', qty: '2', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Kiwi', qty: '1', confidence: 'medium', unsure: false, tub: false, label: null, source: 'verified', note: 'One visible behind the grapefruit.' },
        { name: 'Limes', qty: '4', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Bag under the tomatoes', qty: '1 bag', confidence: 'low', unsure: true, tub: false, label: null, source: 'verified', note: 'Partly hidden under the tomato drawer — cannot tell what is inside.' }
      ],
      cachedRecipes: [
        {
          id: 'a-frittata', title: 'Spinach & cherry tomato frittata',
          blurb: 'One pan, fifteen minutes of hands-on time, and it uses the eggs before they age.',
          minutes: 25, difficulty: 'Easy', servings: 2, spice: 'Mild', veg: true, kcalPerServing: 320,
          needs: [
            { name: 'Eggs', qty: '6' }, { name: 'Spinach', qty: '100 g' },
            { name: 'Cherry tomatoes', qty: '150 g' }, { name: 'White onion', qty: '1' },
            { name: 'Milk', qty: '60 ml' }
          ],
          steps: [
            'Heat a spoon of oil in an oven-proof pan over medium heat. Soften the sliced onion for 3 minutes.',
            'Add the cherry tomatoes, halved, and cook 2 minutes until they start to soften.',
            'Wilt the spinach in handfuls, about 1 minute, then spread everything evenly.',
            'Whisk the eggs with the milk, salt and pepper, pour over, and cook on the hob for 4 minutes until the edges set.',
            'Finish under a hot grill for 2–3 minutes until the top is just set. Rest 2 minutes, slice, serve.'
          ],
          requiresLabel: null, source: 'cached'
        },
        {
          id: 'a-traybake', title: 'Roasted aubergine, courgette & tomato tray',
          blurb: 'Everything from the bottom drawer on one tray. The lemon at the end is what makes it.',
          minutes: 40, difficulty: 'Easy', servings: 2, spice: 'Medium', veg: true, kcalPerServing: 260,
          needs: [
            { name: 'Aubergine', qty: '2' }, { name: 'Courgette', qty: '2' },
            { name: 'Tomatoes', qty: '3' }, { name: 'Garlic', qty: '3 cloves' },
            { name: 'Olive oil', qty: '2 tbsp' }, { name: 'Lemon', qty: '1' },
            { name: 'Cumin', qty: '1 tsp' }
          ],
          steps: [
            'Heat the oven to 200°C. Cut the aubergine and courgette into thick chunks, quarter the tomatoes.',
            'Toss with oil, crushed garlic, cumin, salt and pepper on a large tray. Spread out — crowded veg steams, it does not roast.',
            'Roast 30 minutes, turning once halfway, until the edges brown.',
            'Squeeze the lemon over the hot tray, toss once, and serve with bread or rice.'
          ],
          requiresLabel: null, source: 'cached'
        },
        {
          id: 'a-stirfry', title: 'Broccoli & carrot stir-fry with egg-fried rice',
          blurb: 'The fastest way to clear the drawer. Rice from the pantry, veg from the fridge.',
          minutes: 20, difficulty: 'Easy', servings: 2, spice: 'Medium', veg: true, kcalPerServing: 420,
          needs: [
            { name: 'Broccoli', qty: '1 head' }, { name: 'Baby carrots', qty: '150 g' },
            { name: 'Eggs', qty: '2' }, { name: 'Rice', qty: '200 g' },
            { name: 'Soy sauce', qty: '2 tbsp' }, { name: 'Spring onions', qty: '2' },
            { name: 'Ginger', qty: '1 tsp' }, { name: 'Garlic', qty: '2 cloves' }
          ],
          steps: [
            'Cook the rice, spread it on a plate and let it cool — warm rice clumps in the pan.',
            'Heat oil on high. Fry the broccoli and halved baby carrots for 3 minutes until bright and just tender.',
            'Push the veg aside, scramble the eggs in the empty space, then mix through.',
            'Add the rice, soy sauce, grated ginger and garlic. Toss on high heat for 2 minutes.',
            'Serve scattered with sliced spring onions.'
          ],
          requiresLabel: null, source: 'cached'
        }
      ]
    },
    {
      id: 'leftovers',
      name: 'Weekend leftovers',
      blurb: 'Mostly drinks and closed tubs. This fridge tests the honest part: what we cannot see, we ask about.',
      photo: 'assets/fridge-mixed.jpg',
      photoCredit: 'USDA Food Safety and Inspection Service photo, via Wikimedia Commons (public domain).',
      ingredients: [
        { name: 'Orange juice', qty: '~1 L', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Sparkling lemon drink', qty: '1 can', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: 'Foil over the top; can underneath.' },
        { name: 'Orange soda', qty: '1 bottle', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: 'Orange-label bottle.' },
        { name: 'Iced coffee', qty: '1 cup', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: 'Takeaway cup with a straw.' },
        { name: 'Sauce or dressing jar', qty: '1 jar', confidence: 'low', unsure: true, tub: false, label: null, source: 'verified', note: 'Label not readable in the photo.' },
        { name: 'Closed tub 1', qty: '1 tub', confidence: 'low', unsure: true, tub: true, label: null, source: 'verified', note: 'Contents unknown — tap to say what is inside.' },
        { name: 'Closed tub 2', qty: '1 tub', confidence: 'low', unsure: true, tub: true, label: null, source: 'verified', note: 'Contents unknown — tap to say what is inside.' },
        { name: 'Closed tub 3', qty: '1 tub', confidence: 'low', unsure: true, tub: true, label: null, source: 'verified', note: 'Contents unknown — tap to say what is inside.' }
      ],
      cachedRecipes: [
        {
          id: 'b-cooler', title: 'Citrus cooler',
          blurb: 'Not a meal — but it is the one thing this fridge can make right now, and it uses the juice before it goes flat.',
          minutes: 5, difficulty: 'Easy', servings: 2, spice: 'Mild', veg: true, kcalPerServing: 90,
          needs: [
            { name: 'Orange juice', qty: '500 ml' }, { name: 'Sparkling lemon drink', qty: '1 can' },
            { name: 'Ice', qty: '1 handful' }, { name: 'Mint leaves', qty: '6' }
          ],
          steps: [
            'Fill two glasses with ice.',
            'Pour the orange juice halfway, then top with the sparkling lemon drink.',
            'Stir once, slap the mint leaves between your palms to wake them up, and drop them in.'
          ],
          requiresLabel: null, source: 'cached'
        },
        {
          id: 'b-friedrice', title: 'Fridge-clear fried rice',
          blurb: 'Yesterday’s rice, fried hard with egg. Only appears once you tell us a tub holds cooked rice.',
          minutes: 15, difficulty: 'Easy', servings: 2, spice: 'Medium', veg: true, kcalPerServing: 380,
          needs: [
            { name: 'Cooked rice', qty: '2 cups', fridgeOnly: true }, { name: 'Eggs', qty: '2' },
            { name: 'Soy sauce', qty: '2 tbsp' }, { name: 'Spring onions', qty: '2' },
            { name: 'Cooking oil', qty: '1 tbsp' }, { name: 'Garlic', qty: '1 clove' }
          ],
          steps: [
            'Cold rice works best. Break up any clumps with a fork before it hits the pan.',
            'Heat oil on high. Scramble the eggs, remove, and set aside.',
            'Fry the garlic for 30 seconds, add the rice, and toss for 3 minutes until it crackles.',
            'Add soy sauce and the scrambled egg. Toss once more and serve with spring onions.'
          ],
          requiresLabel: 'Cooked rice', source: 'cached'
        },
        {
          id: 'b-soup', title: 'Soup & toast',
          blurb: 'Reheated soup with proper toast. Only appears once you tell us a tub holds soup or stew.',
          minutes: 10, difficulty: 'Easy', servings: 2, spice: 'Mild', veg: true, kcalPerServing: 320,
          needs: [
            { name: 'Soup or stew', qty: '2 bowls', fridgeOnly: true }, { name: 'Bread', qty: '2 slices' },
            { name: 'Butter', qty: '20 g' }, { name: 'Black pepper', qty: 'to taste' }
          ],
          steps: [
            'Tip the soup into a pan and heat gently. Do not let it boil hard — it dulls the flavour.',
            'Toast the bread, butter it while hot.',
            'Ladle the soup into bowls, grind pepper over the top, and serve with the toast for dipping.'
          ],
          requiresLabel: 'Soup or stew', source: 'cached'
        }
      ]
    },
    {
      id: 'veg-bin',
      name: 'The veg bin',
      blurb: 'One drawer, five vegetables. Cooked Indian-style, it feeds two with one shop run.',
      photo: 'assets/fridge-bin.jpg',
      photoCredit: 'USDA photo, via Wikimedia Commons (public domain).',
      ingredients: [
        { name: 'Aubergine', qty: '2', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Courgette', qty: '2', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Broccoli', qty: '2 heads', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Tomatoes on the vine', qty: '5', confidence: 'high', unsure: false, tub: false, label: null, source: 'verified', note: '' },
        { name: 'Baby carrots', qty: '1 pack', confidence: 'medium', unsure: true, tub: false, label: null, source: 'verified', note: 'Pack is partly hidden under the tomatoes — quantity is a guess.' }
      ],
      cachedRecipes: [
        {
          id: 'c-bharta', title: 'Smoky aubergine & tomato mash (baingan bharta style)',
          blurb: 'Roast the aubergine over a flame if you can; the oven works too. Mash with tomato and spices.',
          minutes: 35, difficulty: 'Medium', servings: 2, spice: 'Hot', veg: true, kcalPerServing: 210,
          needs: [
            { name: 'Aubergine', qty: '2' }, { name: 'Tomatoes', qty: '3' },
            { name: 'Onion', qty: '1' }, { name: 'Garlic', qty: '3 cloves' },
            { name: 'Ginger', qty: '1 tsp' }, { name: 'Green chilli', qty: '1' },
            { name: 'Cumin', qty: '1 tsp' }, { name: 'Turmeric', qty: '1/2 tsp' },
            { name: 'Garam masala', qty: '1 tsp' }, { name: 'Cooking oil', qty: '2 tbsp' },
            { name: 'Lemon', qty: '1' }
          ],
          steps: [
            'Prick the aubergines and roast at 220°C for 25 minutes, turning once, until the skin blackens and the flesh collapses.',
            'Cool, peel off the skin, and mash the flesh roughly with a fork.',
            'Heat oil, fry cumin, then onion until golden. Add garlic, ginger and green chilli.',
            'Add chopped tomatoes, turmeric and garam masala. Cook 5 minutes until the oil separates.',
            'Stir in the aubergine, cook 3 minutes more, finish with lemon juice and salt.'
          ],
          requiresLabel: null, source: 'cached'
        },
        {
          id: 'c-pasta', title: 'Broccoli & tomato pasta',
          blurb: 'The broccoli goes soft into the sauce and the tomatoes stay bright. Weeknight food.',
          minutes: 25, difficulty: 'Easy', servings: 2, spice: 'Mild', veg: true, kcalPerServing: 480,
          needs: [
            { name: 'Broccoli', qty: '1 head' }, { name: 'Tomatoes', qty: '3' },
            { name: 'Dried pasta', qty: '200 g' }, { name: 'Garlic', qty: '2 cloves' },
            { name: 'Olive oil', qty: '2 tbsp' }, { name: 'Chilli flakes', qty: '1 tsp' },
            { name: 'Parmesan', qty: '30 g' }
          ],
          steps: [
            'Boil the pasta in salted water. Two minutes before it is done, drop the broccoli florets in the same pot.',
            'Meanwhile, warm the oil, soften the garlic and chilli flakes, and add the chopped tomatoes. Cook 5 minutes.',
            'Drain the pasta and broccoli, saving a cup of the cooking water.',
            'Toss everything in the tomato pan with a splash of pasta water until it clings.',
            'Serve with parmesan over the top.'
          ],
          requiresLabel: null, source: 'cached'
        },
        {
          id: 'c-tray', title: 'Roasted courgette & carrot tray',
          blurb: 'Cut thick, roast hot, lemon at the end. Good on its own or next to rice.',
          minutes: 30, difficulty: 'Easy', servings: 2, spice: 'Mild', veg: true, kcalPerServing: 180,
          needs: [
            { name: 'Courgette', qty: '2' }, { name: 'Baby carrots', qty: '200 g' },
            { name: 'Lemon', qty: '1' }, { name: 'Olive oil', qty: '2 tbsp' },
            { name: 'Garlic', qty: '2 cloves' }, { name: 'Cumin', qty: '1 tsp' }
          ],
          steps: [
            'Heat the oven to 210°C. Cut the courgette into thick half-moons, halve the carrots lengthways.',
            'Toss with oil, crushed garlic, cumin, salt and pepper.',
            'Roast 20 minutes until the edges catch and the carrots bend.',
            'Squeeze the lemon over the tray and serve.'
          ],
          requiresLabel: null, source: 'cached'
        }
      ]
    }
  ];

  var DATA = { FRIDGES: FRIDGES, DEFAULT_PANTRY: DEFAULT_PANTRY, TUB_LABELS: TUB_LABELS };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  root.FCDATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
