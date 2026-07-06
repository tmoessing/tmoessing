---
name: add-meal
description: >-
  Add a recipe to Tyler's Meal Library. Given a meal or recipe name (or a recipe
  URL), research it and write a schema-valid Markdown file to meals/data/<slug>.md
  with full frontmatter + body, then regenerate meals/data/meals.json. Trigger on
  "add a meal", "add recipe", "populate <dish> for the meal library", or a pasted
  recipe link to import.
---

# Add Meal skill

Turn a meal name (or recipe URL) into a complete `meals/data/<slug>.md` file that
drops into the Meal Library at `/meal-library/` with little or no manual editing,
then refresh the generated bundle.

## Steps

1. **Identify the meal.** Take the dish name (or fetch the given recipe URL).
   Pick a `slug`: lowercase, hyphenated, no punctuation (e.g. `chicken-alfredo`).
   The filename is the slug: `meals/data/<slug>.md`.

2. **Research** with WebSearch / WebFetch (skip anything already provided). Gather:
   - short one-line description
   - ingredient list (with quantities)
   - step-by-step instructions
   - prep time, cook time (minutes); total = prep + cook unless told otherwise
   - **estimated total ingredient cost** in whole USD — this is an *estimate*;
     base it on typical US grocery prices and say so is unnecessary in the file,
     just give a reasonable number
   - servings (number)
   - 3–8 categories drawn ONLY from the taxonomy below
   - nutrition per serving if available (calories, protein, …) — optional
   - the original recipe URL if you used one → `recipeSource`
   - optional tips and substitutions for the body

3. **Write the file** exactly in this shape (order of keys can vary; types matter):

   ```markdown
   ---
   title: Chicken Alfredo
   description: Creamy homemade fettuccine alfredo with seared chicken.
   prepTime: 15
   cookTime: 20
   totalTime: 35
   estimatedCost: 14
   servings: 4
   categories:
     - Dinner
     - Pasta
     - Chicken
   tags:
     - Weeknight
   image: ../meals/images/chicken-alfredo.jpg
   walmartList: # TODO paste Walmart grocery list URL
   recipeSource: https://example.com/original
   prepDuration: 45
   nutrition:
     calories: 650
     protein: 42g
   ---

   ## Ingredients
   - ...

   ## Instructions
   1. ...

   ## Notes
   ...

   ## Tips
   ...

   ## Variations
   ...
   ```

   Rules:
   - Numbers (`prepTime`, `cookTime`, `totalTime`, `estimatedCost`, `servings`,
     `prepDuration`, `nutrition.calories`) are bare numbers, no units or `$`.
     Nutrition values like protein keep their unit as a string (`42g`).
   - `image:` always `../meals/images/<slug>.jpg` even though the file may not
     exist yet — a placeholder auto-renders until Tyler drops a photo in.
   - `walmartList:` leave as the literal `# TODO paste Walmart grocery list URL`
     placeholder unless a real Walmart list URL is provided. The generator drops
     the placeholder so the button stays hidden until it's filled.
   - Omit `recipeSource` (or leave it blank) if there's no single source URL.
   - Body uses `##` section headings and `-` / numbered lists. `**bold**` and
     `[text](url)` links are supported; keep it plain otherwise.
   - `prepDuration` (optional) is the minutes to block on the calendar for meal
     prep; defaults to prepTime + cookTime if omitted.

4. **Regenerate the bundle:** run `node meals/build.mjs`. It reparses every `.md`
   and rewrites `meals/data/meals.json` (the file the page fetches). Confirm it
   prints `✓ Wrote N meal(s)` and warns for no unknown categories.

5. **Report** to Tyler what still needs a human touch: the Walmart list URL and a
   cover photo at `meals/images/<slug>.jpg` (optional — a generated placeholder
   shows until then). Flag any category you had to drop because it wasn't in the
   taxonomy.

## Category taxonomy (use these exact strings)

Breakfast, Lunch, Dinner, Snack, Dessert, High Protein, Low Carb, Vegetarian,
Vegan, Gluten Free, Chicken, Beef, Pork, Seafood, Pasta, Rice, Mexican, Italian,
Asian, American, Healthy, Comfort Food, Slow Cooker, Air Fryer, Grill, Meal Prep,
Budget Friendly, Quick Meals.

Free-form descriptors that aren't in this list (e.g. "Weeknight", "Family
Favorite", "Spicy") go under `tags:` instead — they're searchable and shown on
the card, but they aren't picker filters.
