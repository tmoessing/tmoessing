/**
 * "Pick a Meal" decision helper.
 *
 * A stateful modal with four views that swap inside one overlay:
 *   filters  -> choose total time / cost / servings + categories (live count)
 *   result   -> a random pick revealed via a shuffle-reel + confetti
 *   matching -> the full grid of meals that match, sortable + shuffleable
 *   empty    -> friendly message + broaden suggestions + Clear Filters
 *
 * Filter state persists across views so "Back" preserves the user's choices.
 * Respects prefers-reduced-motion (skips reel + confetti).
 */
import {
  matchMeal,
  sortMeals,
  shuffle,
  getTagStyle,
  placeholderDataURI,
  minutesLabel,
  money,
  servingsLabel,
  esc
} from "./util.js";
import { createMealCard } from "./MealCard.js";
import { lockScroll, unlockScroll, openMealDetails } from "./MealDetailsModal.js";

const TIMES = [
  ["any", "Any"],
  ["u15", "Under 15"],
  ["15-30", "15–30"],
  ["30-60", "30–60"],
  ["60+", "60+"],
  ["custom", "Custom"]
];
const COSTS = [
  ["any", "Any"],
  ["budget", "Budget"],
  ["u10", "Under $10"],
  ["10-20", "$10–20"],
  ["20+", "$20+"],
  ["custom", "Custom"]
];
const SERVINGS = [
  ["any", "Any"],
  ["1", "1"],
  ["2", "2"],
  ["3", "3"],
  ["4", "4"],
  ["6", "6"],
  ["8", "8+"]
];
const CORE_CATEGORIES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "High Protein",
  "Vegetarian",
  "Quick Meals"
];

const CONFETTI_COLORS = [
  "var(--tag-1-text)", "var(--tag-2-text)", "var(--tag-3-text)", "var(--tag-4-text)",
  "var(--tag-5-text)", "var(--tag-6-text)", "var(--tag-7-text)", "var(--tag-8-text)"
];

let overlay = null;
let state = null;
let MEALS = [];
let CATEGORIES = [];

function defaultState() {
  return {
    step: 1,
    time: "any",
    timeLo: 15,
    timeHi: 45,
    cost: "any",
    costLo: 5,
    costHi: 20,
    servings: "any",
    categories: new Set(),
    categoriesExpanded: false,
    matchSort: "alpha"
  };
}

const reduceMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function content() {
  return overlay.querySelector(".picker-content");
}

function currentMatches() {
  return MEALS.filter((m) => matchMeal(m, state));
}

/* ---------- open / close ---------- */

export function openPicker(meals, categories) {
  if (overlay) return;
  MEALS = meals || MEALS;
  CATEGORIES = categories || CATEGORIES;
  state = defaultState();

  overlay = document.createElement("div");
  overlay.className = "meal-modal-overlay picker-overlay";
  overlay.innerHTML = `
    <div class="meal-modal picker-modal" role="dialog" aria-modal="true" aria-label="Pick a meal">
      <button class="meal-modal-close" type="button" aria-label="Close">✕</button>
      <div class="picker-content"></div>
    </div>`;
  document.body.appendChild(overlay);
  lockScroll();

  requestAnimationFrame(() => overlay.classList.add("open"));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePicker();
  });
  overlay.querySelector(".meal-modal-close").addEventListener("click", closePicker);
  document.addEventListener("keydown", onEsc);

  renderFilters();
}

function onEsc(e) {
  // Let a stacked details modal handle Escape first.
  if (e.key === "Escape" && !window.__mealDetailsOpen) closePicker();
}

export function closePicker() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
  unlockScroll();
  document.removeEventListener("keydown", onEsc);
  document.querySelectorAll(".confetti-piece").forEach((c) => c.remove());
}

/* ---------- helpers ---------- */

function pillRow(items, activeValue, attr = "data-val") {
  return items
    .map(
      ([val, label]) =>
        `<button type="button" class="picker-pill${val === activeValue ? " active" : ""}" ${attr}="${esc(val)}">${esc(label)}</button>`
    )
    .join("");
}

function updateCount() {
  const n = currentMatches().length;
  const countEl = overlay.querySelector("#picker-count");
  if (countEl) countEl.textContent = `${n} meal${n === 1 ? "" : "s"} match`;
  ["#picker-pick-btn", "#picker-view-btn"].forEach((sel) => {
    const b = overlay.querySelector(sel);
    if (b) b.disabled = n === 0;
  });
}

function stepsHeader() {
  return `
    <div class="picker-steps-header">
      <div class="step-indicator ${state.step === 1 ? "active" : "completed"}">
        <span class="step-num">1</span><span class="step-text">Time</span>
      </div>
      <div class="step-line ${state.step > 1 ? "completed" : ""}"></div>
      <div class="step-indicator ${state.step === 2 ? "active" : state.step > 2 ? "completed" : ""}">
        <span class="step-num">2</span><span class="step-text">Cost</span>
      </div>
      <div class="step-line ${state.step > 2 ? "completed" : ""}"></div>
      <div class="step-indicator ${state.step === 3 ? "active" : ""}">
        <span class="step-num">3</span><span class="step-text">Meal</span>
      </div>
    </div>`;
}

const titleBlock = `
  <h2 class="picker-title">🍽 Pick a Meal</h2>
  <p class="picker-sub">Answer a few quick questions and I'll help you land on something to cook.</p>`;

/* ---------- view: filters ---------- */

function renderFilters() {
  if (state.step === 1) {
    const showCustom = state.time === "custom";
    content().innerHTML = `
      ${titleBlock}
      ${stepsHeader()}
      <div class="picker-step-card">
        <div class="picker-section" style="margin-bottom: 0;">
          <div class="picker-section-title">Total Time</div>
          <div class="pill-row" id="picker-time">${pillRow(TIMES, state.time)}</div>
          <div class="picker-inline" id="picker-time-custom" style="${showCustom ? "" : "display:none;"}">
            <label>From <input type="number" min="0" class="picker-number" id="picker-time-lo" value="${esc(state.timeLo)}"></label>
            <label>to <input type="number" min="0" class="picker-number" id="picker-time-hi" value="${esc(state.timeHi)}"></label>
            <span class="picker-unit">min</span>
          </div>
        </div>
      </div>
      <div class="picker-footer">
        <span class="picker-count" id="picker-count"></span>
        <button type="button" class="btn btn-primary" id="picker-next-btn">Next: Cost</button>
      </div>`;
  } else if (state.step === 2) {
    const showCustom = state.cost === "custom";
    content().innerHTML = `
      ${titleBlock}
      ${stepsHeader()}
      <div class="picker-step-card">
        <div class="picker-section" style="margin-bottom: 0;">
          <div class="picker-section-title">Estimated Cost</div>
          <div class="pill-row" id="picker-cost">${pillRow(COSTS, state.cost)}</div>
          <div class="picker-inline" id="picker-cost-custom" style="${showCustom ? "" : "display:none;"}">
            <span class="picker-unit">$</span>
            <label>From <input type="number" min="0" class="picker-number" id="picker-cost-lo" value="${esc(state.costLo)}"></label>
            <label>to <input type="number" min="0" class="picker-number" id="picker-cost-hi" value="${esc(state.costHi)}"></label>
          </div>
        </div>
      </div>
      <div class="picker-footer">
        <button type="button" class="btn btn-outline" id="picker-prev-btn">← Back</button>
        <span class="picker-count" id="picker-count"></span>
        <button type="button" class="btn btn-primary" id="picker-next-btn">Next: Meal</button>
      </div>`;
  } else {
    const visibleCategories = state.categoriesExpanded ? CATEGORIES : CORE_CATEGORIES;
    content().innerHTML = `
      ${titleBlock}
      ${stepsHeader()}
      <div class="picker-step-card">
        <div class="picker-section">
          <div class="picker-section-title">Servings (at least)</div>
          <div class="pill-row" id="picker-servings">${pillRow(SERVINGS, state.servings, "data-serv")}</div>
        </div>
        <div class="picker-section" style="margin-bottom: 0;">
          <div class="picker-section-title">Categories</div>
          <div class="pill-row" id="picker-categories">
            ${visibleCategories
              .map(
                (c) =>
                  `<button type="button" class="picker-pill${state.categories.has(c) ? " active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`
              )
              .join("")}
            <button type="button" class="picker-pill picker-expand-btn" id="picker-toggle-categories">
              ${state.categoriesExpanded ? "– Show Less" : "+ Show More"}
            </button>
          </div>
        </div>
      </div>
      <div class="picker-footer">
        <button type="button" class="btn btn-outline" id="picker-prev-btn">← Back</button>
        <span class="picker-count" id="picker-count"></span>
        <button type="button" class="btn btn-secondary" id="picker-view-btn">View Matching</button>
        <button type="button" class="btn btn-primary" id="picker-pick-btn">🎲 Pick Random Meal</button>
      </div>`;
  }

  wireFilters();
  updateCount();
}

function activate(container, val, attr = "val") {
  container.querySelectorAll(".picker-pill").forEach((b) =>
    b.classList.toggle("active", b.dataset[attr] === val)
  );
}

function wireFilters() {
  if (state.step === 1) {
    const time = content().querySelector("#picker-time");
    time.addEventListener("click", (e) => {
      const btn = e.target.closest(".picker-pill");
      if (!btn) return;
      state.time = btn.dataset.val;
      activate(time, state.time);
      content().querySelector("#picker-time-custom").style.display =
        state.time === "custom" ? "" : "none";
      updateCount();
    });
    content().querySelector("#picker-time-lo").addEventListener("input", (e) => {
      state.timeLo = parseInt(e.target.value, 10);
      if (!Number.isFinite(state.timeLo)) state.timeLo = 0;
      updateCount();
    });
    content().querySelector("#picker-time-hi").addEventListener("input", (e) => {
      state.timeHi = parseInt(e.target.value, 10);
      if (!Number.isFinite(state.timeHi)) state.timeHi = Infinity;
      updateCount();
    });
    content().querySelector("#picker-next-btn").addEventListener("click", () => {
      state.step = 2;
      renderFilters();
    });
  } else if (state.step === 2) {
    const cost = content().querySelector("#picker-cost");
    cost.addEventListener("click", (e) => {
      const btn = e.target.closest(".picker-pill");
      if (!btn) return;
      state.cost = btn.dataset.val;
      activate(cost, state.cost);
      content().querySelector("#picker-cost-custom").style.display =
        state.cost === "custom" ? "" : "none";
      updateCount();
    });
    content().querySelector("#picker-cost-lo").addEventListener("input", (e) => {
      state.costLo = parseInt(e.target.value, 10);
      if (!Number.isFinite(state.costLo)) state.costLo = 0;
      updateCount();
    });
    content().querySelector("#picker-cost-hi").addEventListener("input", (e) => {
      state.costHi = parseInt(e.target.value, 10);
      if (!Number.isFinite(state.costHi)) state.costHi = Infinity;
      updateCount();
    });
    content().querySelector("#picker-prev-btn").addEventListener("click", () => {
      state.step = 1;
      renderFilters();
    });
    content().querySelector("#picker-next-btn").addEventListener("click", () => {
      state.step = 3;
      renderFilters();
    });
  } else {
    const serv = content().querySelector("#picker-servings");
    serv.addEventListener("click", (e) => {
      const btn = e.target.closest(".picker-pill");
      if (!btn) return;
      state.servings = btn.dataset.serv;
      activate(serv, state.servings, "serv");
      updateCount();
    });
    const cats = content().querySelector("#picker-categories");
    cats.addEventListener("click", (e) => {
      const btn = e.target.closest(".picker-pill");
      if (!btn || btn.id === "picker-toggle-categories") return;
      const c = btn.dataset.cat;
      if (state.categories.has(c)) state.categories.delete(c);
      else state.categories.add(c);
      btn.classList.toggle("active");
      updateCount();
    });
    content().querySelector("#picker-toggle-categories").addEventListener("click", () => {
      state.categoriesExpanded = !state.categoriesExpanded;
      renderFilters();
    });
    content().querySelector("#picker-prev-btn").addEventListener("click", () => {
      state.step = 2;
      renderFilters();
    });
    content().querySelector("#picker-pick-btn").addEventListener("click", pickRandom);
    content().querySelector("#picker-view-btn").addEventListener("click", renderMatching);
  }
}

/* ---------- view: random pick (reel + reveal) ---------- */

function pickRandom() {
  const matches = currentMatches();
  if (matches.length === 0) {
    renderEmpty();
    return;
  }
  const chosen = matches[Math.floor(Math.random() * matches.length)];
  if (matches.length === 1 || reduceMotion()) {
    renderResult(chosen, matches.length === 1);
    return;
  }
  runReel(matches, chosen);
}

function runReel(matches, chosen) {
  content().innerHTML = `
    <div class="picker-reel-wrap">
      <div class="picker-reel">
        <img class="reel-cover" alt="">
        <div class="reel-title"></div>
      </div>
      <p class="reel-caption">Simmering down the options…</p>
    </div>`;

  const reel = content().querySelector(".picker-reel");
  const img = reel.querySelector(".reel-cover");
  const title = reel.querySelector(".reel-title");

  let delay = 60;
  let elapsed = 0;
  const total = 1600;

  const tick = () => {
    if (!overlay) return; // closed mid-animation
    const m = matches[Math.floor(Math.random() * matches.length)];
    img.src = m.image || placeholderDataURI(m.title);
    title.textContent = m.title;
    reel.classList.remove("cycle");
    void reel.offsetWidth; // restart animation
    reel.classList.add("cycle");

    elapsed += delay;
    delay *= 1.18;
    if (elapsed < total) {
      setTimeout(tick, delay);
    } else {
      renderResult(chosen, false);
    }
  };
  tick();
}

function renderResult(meal, singleMatch) {
  const cover = meal.image || placeholderDataURI(meal.title);
  const fallback = placeholderDataURI(meal.title);
  const chips = `
    <span class="meal-chip">⏱ ${esc(minutesLabel(meal.prepTime))}</span>
    <span class="meal-chip">💲 ${esc(money(meal.estimatedCost))}</span>
    <span class="meal-chip">🍽 ${esc(servingsLabel(meal.servings))}</span>`;

  content().innerHTML = `
    <div class="picker-result">
      ${singleMatch ? `<p class="picker-note">Only one meal matches — it was meant to be.</p>` : ""}
      <img class="picker-result-cover" src="${esc(cover)}" alt="${esc(meal.title)}"
           onerror="this.onerror=null;this.src='${esc(fallback)}';">
      <h2 class="picker-result-title">${esc(meal.title)}</h2>
      <p class="picker-result-desc">${esc(meal.description || "")}</p>
      <div class="meal-chips picker-result-chips">${chips}</div>
      <div class="picker-result-actions">
        <button type="button" class="btn btn-primary" id="picker-view-recipe">📖 View Recipe</button>
        <button type="button" class="btn btn-secondary" id="picker-again">🎲 Pick Again</button>
        <button type="button" class="btn btn-outline" id="picker-back">Back to Filters</button>
      </div>
    </div>`;

  content().querySelector("#picker-view-recipe").addEventListener("click", () => openMealDetails(meal));
  content().querySelector("#picker-again").addEventListener("click", pickRandom);
  content().querySelector("#picker-back").addEventListener("click", renderFilters);

  if (!reduceMotion()) spawnConfetti();
}

function spawnConfetti() {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "%";
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const dur = 1.8 + Math.random() * 1.4;
    piece.style.animationDuration = dur + "s";
    piece.style.animationDelay = Math.random() * 0.4 + "s";
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    piece.addEventListener("animationend", () => piece.remove());
    frag.appendChild(piece);
  }
  document.body.appendChild(frag);
}

/* ---------- view: matching grid ---------- */

function renderMatching() {
  const matches = sortMeals(currentMatches(), state.matchSort);
  if (matches.length === 0) {
    renderEmpty();
    return;
  }

  content().innerHTML = `
    <div class="picker-matching-head">
      <div>
        <button type="button" class="btn btn-outline btn-sm" id="picker-match-back">← Filters</button>
        <span class="picker-match-count">${matches.length} meal${matches.length === 1 ? "" : "s"} found</span>
      </div>
      <div class="picker-match-controls">
        <label>Sort
          <select id="picker-match-sort">
            <option value="alpha">Alphabetical</option>
            <option value="time">Prep Time</option>
            <option value="cost">Cost</option>
            <option value="servings">Servings</option>
            <option value="random">Random</option>
          </select>
        </label>
      </div>
    </div>
    <div class="meals-grid picker-grid" id="picker-match-grid"></div>`;

  const sel = content().querySelector("#picker-match-sort");
  sel.value = state.matchSort;

  const fill = (list) => {
    const grid = content().querySelector("#picker-match-grid");
    grid.innerHTML = "";
    const frag = document.createDocumentFragment();
    list.forEach((m) => frag.appendChild(createMealCard(m)));
    grid.appendChild(frag);
  };
  fill(matches);

  content().querySelector("#picker-match-back").addEventListener("click", renderFilters);
  sel.addEventListener("change", () => {
    state.matchSort = sel.value;
    fill(sortMeals(currentMatches(), state.matchSort));
  });
}

/* ---------- view: empty state ---------- */

function renderEmpty() {
  const suggestions = [];
  if (state.time !== "any") suggestions.push("Widen the total time.");
  if (state.cost !== "any") suggestions.push("Raise the cost ceiling.");
  if (state.servings !== "any") suggestions.push("Lower the servings requirement.");
  if (state.categories.size > 0) suggestions.push("Remove a category or two.");
  if (suggestions.length === 0) suggestions.push("Add some meals to the library!");

  content().innerHTML = `
    <div class="picker-empty">
      <div class="picker-empty-emoji">🍽️</div>
      <h3>No meals match those filters</h3>
      <p>Nothing in the library fits every constraint. Try broadening:</p>
      <ul>${suggestions.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      <div class="picker-result-actions">
        <button type="button" class="btn btn-outline" id="picker-empty-back">Back to Filters</button>
        <button type="button" class="btn btn-primary" id="picker-empty-clear">Clear Filters</button>
      </div>
    </div>`;

  content().querySelector("#picker-empty-back").addEventListener("click", renderFilters);
  content().querySelector("#picker-empty-clear").addEventListener("click", () => {
    state = defaultState();
    renderFilters();
  });
}
