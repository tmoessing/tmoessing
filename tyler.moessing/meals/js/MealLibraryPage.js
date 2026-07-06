/**
 * The /meal-library grid page: loads meals.json once, renders every meal, and
 * wires the toolbar — instant search, sort, shuffle, grid/list view — plus the
 * "Pick a Meal" button. Search covers name, description, ingredients,
 * instructions, categories, and tags (the body text is indexed too).
 */
import { createMealCard } from "./MealCard.js";
import { sortMeals } from "./util.js";
import { openPicker } from "./PickerModal.js";

const VIEW_KEY = "meal-library-view";
const DATA_URL = "../meals/data/meals.json?v=1";

export class MealLibraryPage {
  constructor() {
    this.meals = [];
    this.categories = [];
    this.query = "";
    this.sortKey = "alpha";
    this.view = localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
    this.bySlug = {};
  }

  async init() {
    this.grid = document.getElementById("meals-grid");
    this.countEl = document.getElementById("meals-count");
    this.searchInput = document.getElementById("meal-search");
    this.sortSel = document.getElementById("meal-sort");
    this.gridBtn = document.getElementById("view-grid");
    this.listBtn = document.getElementById("view-list");

    if (this.gridBtn) this.gridBtn.addEventListener("click", () => this.setView("grid"));
    if (this.listBtn) this.listBtn.addEventListener("click", () => this.setView("list"));
    this.applyView();

    const pickBtn = document.getElementById("pick-a-meal-btn");
    if (pickBtn) pickBtn.addEventListener("click", () => openPicker(this.meals, this.categories));

    const shuffleBtn = document.getElementById("meal-shuffle");
    if (shuffleBtn) {
      shuffleBtn.addEventListener("click", () => {
        this.sortKey = "random";
        if (this.sortSel) this.sortSel.value = "alpha";
        this.render();
      });
    }

    if (this.sortSel) {
      this.sortSel.addEventListener("change", () => {
        this.sortKey = this.sortSel.value;
        this.render();
      });
    }

    if (this.searchInput) {
      this.searchInput.addEventListener("input", () => {
        this.query = this.searchInput.value.trim().toLowerCase();
        this.render();
      });
    }

    await this.load();
    this.render();
  }

  async load() {
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.meals = Array.isArray(data.meals) ? data.meals : [];
      this.categories = Array.isArray(data.categories) ? data.categories : [];
    } catch (err) {
      console.error("Failed to load meals.json", err);
      this.meals = [];
      if (this.grid) {
        this.grid.innerHTML = `<p class="meals-error">Couldn't load the meal library. Make sure <code>meals/data/meals.json</code> exists (run <code>node meals/build.mjs</code>).</p>`;
      }
    }

    // Build a lowercased search index + slug lookup once.
    this.bySlug = {};
    this.meals.forEach((m) => {
      this.bySlug[m.slug] = m;
      m._search = [
        m.title,
        m.description,
        (m.categories || []).join(" "),
        (m.tags || []).join(" "),
        m.body
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    });
  }

  /** Meal lookup by slug — used by meals-main.js for hash deep-links. */
  getBySlug() {
    return this.bySlug;
  }

  visibleMeals() {
    let list = this.meals;
    if (this.query) {
      const terms = this.query.split(/\s+/).filter(Boolean);
      list = list.filter((m) => terms.every((t) => m._search.includes(t)));
    }
    return sortMeals(list, this.sortKey);
  }

  setView(view) {
    if (this.view === view) return;
    this.view = view;
    localStorage.setItem(VIEW_KEY, view);
    this.applyView();
  }

  applyView() {
    const isList = this.view === "list";
    if (this.grid) this.grid.classList.toggle("list-view", isList);
    if (this.gridBtn) {
      this.gridBtn.classList.toggle("active", !isList);
      this.gridBtn.setAttribute("aria-pressed", String(!isList));
    }
    if (this.listBtn) {
      this.listBtn.classList.toggle("active", isList);
      this.listBtn.setAttribute("aria-pressed", String(isList));
    }
  }

  render() {
    if (!this.grid) return;
    const list = this.visibleMeals();
    this.grid.innerHTML = "";

    if (list.length === 0 && this.meals.length > 0) {
      this.grid.innerHTML = `<p class="meals-empty">No meals match “${this.query}”. Try a different search.</p>`;
    } else {
      const frag = document.createDocumentFragment();
      list.forEach((m) => frag.appendChild(createMealCard(m)));
      this.grid.appendChild(frag);
    }

    if (this.countEl) {
      const n = list.length;
      const total = this.meals.length;
      this.countEl.textContent = this.query
        ? `${n} of ${total} meal${total === 1 ? "" : "s"}`
        : `${total} meal${total === 1 ? "" : "s"}`;
    }
  }
}
