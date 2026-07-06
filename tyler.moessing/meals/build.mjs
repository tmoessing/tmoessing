/**
 * meals/build.mjs — regenerate meals/data/meals.json from the Markdown sources.
 *
 * Reads every meals/data/*.md, splits the `--- ... ---` YAML frontmatter from
 * the Markdown body, parses the documented YAML subset (scalars, `- ` lists,
 * one level of nested map for `nutrition`), derives `slug` + `totalTime`, and
 * writes a single bundle the page fetches once.
 *
 * IMPORTANT: every frontmatter key is copied through verbatim, so future fields
 * (rating, timesCooked, lastCooked, difficulty, favorite, macros, …) ride along
 * with no code change — the UI just reads them where it's wired.
 *
 * Run:  node meals/build.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, "data");
const OUT = join(DATA_DIR, "meals.json");

// Canonical category taxonomy — the single source the picker + validation read.
const CATEGORIES = [
  "Breakfast", "Lunch", "Dinner", "Snack", "Dessert",
  "High Protein", "Low Carb", "Vegetarian", "Vegan", "Gluten Free",
  "Chicken", "Beef", "Pork", "Seafood",
  "Pasta", "Rice",
  "Mexican", "Italian", "Asian", "American",
  "Healthy", "Comfort Food",
  "Slow Cooker", "Air Fryer", "Grill",
  "Meal Prep", "Budget Friendly", "Quick Meals"
];

function stripQuotes(v) {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function stripComment(v) {
  // Drop trailing "# ..." comments on unquoted scalars (e.g. TODO placeholders).
  const t = v.trim();
  if (t.startsWith("#")) return "";
  if (t.startsWith('"') || t.startsWith("'")) return t; // keep quoted values intact
  const i = t.indexOf(" #");
  return i === -1 ? t : t.slice(0, i).trim();
}

function coerce(raw) {
  const v = stripQuotes(raw);
  if (v === "") return "";
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
  return v;
}

function parseFrontmatter(fm) {
  const lines = fm.split("\n");
  const obj = {};
  let curKey = null;
  let curType = null; // "array" | "object" | null

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const line = rawLine.trim();

    if (indent === 0) {
      const m = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
      if (!m) continue;
      const key = m[1];
      const val = stripComment(m[2]);
      if (val === "") {
        obj[key] = null; // container to be filled by nested lines
        curKey = key;
        curType = null;
      } else {
        obj[key] = coerce(val);
        curKey = null;
        curType = null;
      }
    } else if (curKey) {
      const li = /^-\s+(.*)$/.exec(line);
      if (li) {
        if (curType !== "array") { obj[curKey] = []; curType = "array"; }
        obj[curKey].push(coerce(stripComment(li[1])));
      } else {
        const mm = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
        if (mm) {
          if (curType !== "object") { obj[curKey] = {}; curType = "object"; }
          obj[curKey][mm[1]] = coerce(stripComment(mm[2]));
        }
      }
    }
  }
  return obj;
}

function parseMeal(file, text) {
  const slug = file.replace(/\.md$/i, "");
  const normalized = text.replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(normalized);
  if (!m) {
    console.warn(`  ! ${file}: no frontmatter block, skipping`);
    return null;
  }
  const meal = parseFrontmatter(m[1]);
  meal.slug = slug;
  meal.body = m[2].trim();

  const prep = Number(meal.prepTime) || 0;
  const cook = Number(meal.cookTime) || 0;
  if (!meal.totalTime) meal.totalTime = prep + cook;

  // normalize empty container keys
  if (meal.categories == null) meal.categories = [];
  if (meal.tags == null) meal.tags = [];
  // drop empty-string optional links so the UI hides those buttons
  if (!meal.walmartList) delete meal.walmartList;
  if (!meal.recipeSource) delete meal.recipeSource;

  return meal;
}

function build() {
  const files = readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith(".md"));
  const meals = [];
  const unknownCats = new Set();

  for (const file of files) {
    const text = readFileSync(join(DATA_DIR, file), "utf8");
    const meal = parseMeal(file, text);
    if (!meal) continue;
    if (!meal.title) {
      console.warn(`  ! ${file}: missing title, skipping`);
      continue;
    }
    (meal.categories || []).forEach((c) => {
      if (!CATEGORIES.includes(c)) unknownCats.add(c);
    });
    meals.push(meal);
  }

  meals.sort((a, b) => String(a.title).localeCompare(String(b.title)));

  const bundle = {
    generatedAt: new Date().toISOString(),
    categories: CATEGORIES,
    meals
  };
  writeFileSync(OUT, JSON.stringify(bundle, null, 2) + "\n", "utf8");

  console.log(`✓ Wrote ${meals.length} meal(s) to ${OUT}`);
  if (unknownCats.size) {
    console.warn(`  ⚠ categories not in the taxonomy: ${[...unknownCats].join(", ")}`);
  }
}

build();
