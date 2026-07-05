/**
 * "Pick a Game" decision helper.
 *
 * A stateful modal with four views that swap inside one overlay:
 *   filters  -> choose players / duration / categories / complexity (live count)
 *   result   -> a random pick revealed via a shuffle-reel + confetti
 *   matching -> the full grid of games that match, sortable + shuffleable
 *   empty    -> friendly message + broaden suggestions + Clear Filters
 *
 * Filter state persists across views so "Back" preserves the user's choices.
 * Respects prefers-reduced-motion (skips reel + confetti).
 */
import { GAMES, CATEGORIES } from "../data/games.js";
import {
  matchGame,
  sortGames,
  shuffle,
  getTagStyle,
  placeholderDataURI,
  complexityLabel,
  esc
} from "./filters.js";
import { createGameCard } from "./GameCard.js";
import { lockScroll, unlockScroll, openGameDetails } from "./GameDetailsModal.js";

const PLAYER_NUMBERS = [
  ["any", "Any"],
  ["1", "1"],
  ["2", "2"],
  ["3", "3"],
  ["4", "4"],
  ["5", "5"],
  ["6", "6"],
  ["7", "7"],
  ["8", "8"],
  ["9", "9"],
  ["10", "10"],
  ["other", "Other"]
];
const DURATIONS = [
  ["any", "Any"],
  ["u30", "Under 30"],
  ["30-60", "30–60"],
  ["60-90", "60–90"],
  ["90+", "90+"],
  ["custom", "Custom"]
];

const CONFETTI_COLORS = [
  "var(--tag-1-text)", "var(--tag-2-text)", "var(--tag-3-text)", "var(--tag-4-text)",
  "var(--tag-5-text)", "var(--tag-6-text)", "var(--tag-7-text)", "var(--tag-8-text)"
];

let overlay = null;
let state = null;

function defaultState() {
  return {
    step: 1,
    playerMode: "any",
    playerCount: 4,
    playerMin: 4,
    playerMax: 4,
    playerRangePending: false,
    duration: "any",
    customLo: 30,
    customHi: 90,
    categories: new Set(),
    categoriesExpanded: false,
    complexity: "any",
    matchSort: "alpha"
  };
}

const reduceMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function content() {
  return overlay.querySelector(".picker-content");
}

function currentMatches() {
  return GAMES.filter((g) => matchGame(g, state));
}

/* ---------- open / close ---------- */

export function openPicker() {
  if (overlay) return;
  state = defaultState();

  overlay = document.createElement("div");
  overlay.className = "game-modal-overlay picker-overlay";
  overlay.innerHTML = `
    <div class="game-modal picker-modal" role="dialog" aria-modal="true">
      <button class="game-modal-close" type="button" aria-label="Close">✕</button>
      <div class="picker-content"></div>
    </div>`;
  document.body.appendChild(overlay);
  lockScroll();

  requestAnimationFrame(() => overlay.classList.add("open"));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePicker();
  });
  overlay.querySelector(".game-modal-close").addEventListener("click", closePicker);
  document.addEventListener("keydown", onEsc);

  renderFilters();
}

function onEsc(e) {
  // Let a stacked details modal handle Escape first.
  if (e.key === "Escape" && !window.__gameDetailsOpen) closePicker();
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

function pillRow(items, activeValue, extraClass = "") {
  return items
    .map(
      ([val, label]) =>
        `<button type="button" class="picker-pill ${extraClass}${val === activeValue ? " active" : ""}" data-val="${esc(val)}">${esc(label)}</button>`
    )
    .join("");
}

function updateCount() {
  const n = currentMatches().length;
  const countEl = overlay.querySelector("#picker-count");
  if (countEl) countEl.textContent = `${n} game${n === 1 ? "" : "s"} match`;
  const pickBtn = overlay.querySelector("#picker-pick-btn");
  const viewBtn = overlay.querySelector("#picker-view-btn");
  [pickBtn, viewBtn].forEach((b) => {
    if (b) b.disabled = n === 0;
  });
}

/* ---------- view: filters ---------- */

function renderFilters() {
  const showCustom = state.duration === "custom";

  const isPillActive = (val) => {
    if (val === "any") return state.playerMode === "any";
    if (val === "other") return state.playerMode === "exact" && (state.playerCount < 1 || state.playerCount > 10);

    const num = parseInt(val, 10);
    if (state.playerMode === "exact") return state.playerCount === num;
    if (state.playerMode === "range") return num >= state.playerMin && num <= state.playerMax;
    return false;
  };

  const showCustomInput = state.playerMode === "exact" && (state.playerCount < 1 || state.playerCount > 10);

  const subText = state.playerRangePending
    ? "Click a second number to define a range of players."
    : "Let's find the perfect game for your group (click two numbers to select a range).";

  const headerHtml = `
    <div class="picker-steps-header">
      <div class="step-indicator ${state.step === 1 ? "active" : "completed"}">
        <span class="step-num">1</span>
        <span class="step-text">Players</span>
      </div>
      <div class="step-line ${state.step > 1 ? "completed" : ""}"></div>
      <div class="step-indicator ${state.step === 2 ? "active" : state.step > 2 ? "completed" : ""}">
        <span class="step-num">2</span>
        <span class="step-text">Duration</span>
      </div>
      <div class="step-line ${state.step > 2 ? "completed" : ""}"></div>
      <div class="step-indicator ${state.step === 3 ? "active" : ""}">
        <span class="step-num">3</span>
        <span class="step-text">Categories</span>
      </div>
    </div>
  `;

  if (state.step === 1) {
    content().innerHTML = `
      <h2 class="picker-title" style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <svg class="icon icon-stroke" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:1.6rem; height:1.6rem; stroke:var(--text-primary);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M12 12h.01M16 8h.01M8 16h.01M8 8h.01M16 16h.01"/></svg>
        Pick a Game
      </h2>
      <p class="picker-sub" style="margin-bottom: 24px;">${subText}</p>

      ${headerHtml}

      <div class="picker-step-card">
        <div class="picker-section" style="margin-bottom: 0;">
          <div class="picker-section-title">Players</div>
          <div class="pill-row" id="picker-players">
            ${PLAYER_NUMBERS.map(([val, label]) => 
              `<button type="button" class="picker-pill ${isPillActive(val) ? "active" : ""}" data-val="${esc(val)}">${esc(label)}</button>`
            ).join("")}
          </div>
          <div class="picker-inline" id="picker-count-wrap" style="${showCustomInput ? "margin-top: var(--spacing-md);" : "display:none;"}">
            <label style="display: flex; align-items: center; gap: 8px;">Enter player count:
              <div class="picker-number-stepper" style="display: inline-flex; align-items: center; gap: 8px;">
                <button type="button" class="picker-pill stepper-btn" id="picker-stepper-minus" style="padding: 4px 12px; min-width: 32px; font-weight: 800; font-size: 1.1rem; line-height: 1; border-color: var(--border-color); color: var(--text-secondary);">−</button>
                <input type="number" min="1" max="100" class="picker-number" id="picker-player-count" value="${esc(state.playerCount)}" style="width: 60px; text-align: center; margin: 0;">
                <button type="button" class="picker-pill stepper-btn" id="picker-stepper-plus" style="padding: 4px 12px; min-width: 32px; font-weight: 800; font-size: 1.1rem; line-height: 1; border-color: var(--border-color); color: var(--text-secondary);">+</button>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div class="picker-footer">
        <span class="picker-count" id="picker-count"></span>
        <button type="button" class="btn btn-primary" id="picker-next-btn">Next: Duration</button>
      </div>
    `;
  } else if (state.step === 2) {
    content().innerHTML = `
      <h2 class="picker-title" style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <svg class="icon icon-stroke" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:1.6rem; height:1.6rem; stroke:var(--text-primary);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M12 12h.01M16 8h.01M8 16h.01M8 8h.01M16 16h.01"/></svg>
        Pick a Game
      </h2>
      <p class="picker-sub" style="margin-bottom: 24px;">Let's find the perfect game for your group.</p>

      ${headerHtml}

      <div class="picker-step-card">
        <div class="picker-section" style="margin-bottom: 0;">
          <div class="picker-section-title">Duration</div>
          <div class="pill-row" id="picker-duration">${pillRow(DURATIONS, state.duration)}</div>
          <div class="picker-inline picker-custom" id="picker-custom-wrap" style="${showCustom ? "margin-top: var(--spacing-md);" : "display:none;"}">
            <label>From <input type="number" min="0" class="picker-number" id="picker-custom-lo" value="${esc(state.customLo)}"></label>
            <label>to <input type="number" min="0" class="picker-number" id="picker-custom-hi" value="${esc(state.customHi)}"></label>
            <span class="picker-unit">min</span>
          </div>
        </div>
      </div>

      <div class="picker-footer">
        <button type="button" class="btn btn-outline" id="picker-prev-btn">← Back</button>
        <span class="picker-count" id="picker-count"></span>
        <button type="button" class="btn btn-primary" id="picker-next-btn">Next: Categories</button>
      </div>
    `;
  } else {
    const CORE_CATEGORIES = [
      "Party",
      "Strategy",
      "Cooperative",
      "Social Deduction",
      "Card Game",
      "Family"
    ];
    const visibleCategories = state.categoriesExpanded ? CATEGORIES : CORE_CATEGORIES;

    content().innerHTML = `
      <h2 class="picker-title" style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <svg class="icon icon-stroke" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:1.6rem; height:1.6rem; stroke:var(--text-primary);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M12 12h.01M16 8h.01M8 16h.01M8 8h.01M16 16h.01"/></svg>
        Pick a Game
      </h2>
      <p class="picker-sub" style="margin-bottom: 24px;">Let's find the perfect game for your group.</p>

      ${headerHtml}

      <div class="picker-step-card">
        <div class="picker-section" style="margin-bottom: 0;">
          <div class="picker-section-title">Categories</div>
          <div class="pill-row" id="picker-categories">
            ${visibleCategories.map(
              (c) =>
                `<button type="button" class="picker-pill${state.categories.has(c) ? " active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`
            ).join("")}
            <button type="button" class="picker-pill picker-expand-btn" id="picker-toggle-categories" style="border-style: dashed; color: var(--primary-blue); font-weight: bold;">
              ${state.categoriesExpanded ? "– Show Less" : "+ Show More"}
            </button>
          </div>
        </div>
      </div>

      <div class="picker-footer">
        <button type="button" class="btn btn-outline" id="picker-prev-btn">← Back</button>
        <span class="picker-count" id="picker-count"></span>
        <button type="button" class="btn btn-secondary" id="picker-view-btn">View Matching</button>
        <button type="button" class="btn btn-primary" id="picker-pick-btn">Pick Random Game</button>
      </div>
    `;
  }

  wireFilters();
  updateCount();
}

function activate(container, val) {
  container.querySelectorAll(".picker-pill").forEach((b) =>
    b.classList.toggle("active", b.dataset.val === val)
  );
}

function wireFilters() {
  if (state.step === 1) {
    const players = content().querySelector("#picker-players");
    players.addEventListener("click", (e) => {
      const btn = e.target.closest(".picker-pill");
      if (!btn) return;
      const val = btn.dataset.val;

      if (val === "any") {
        state.playerMode = "any";
        state.playerRangePending = false;
        renderFilters();
      } else if (val === "other") {
        state.playerMode = "exact";
        state.playerRangePending = false;
        if (state.playerCount >= 1 && state.playerCount <= 10) {
          state.playerCount = 12;
        }
        renderFilters();
      } else {
        const num = parseInt(val, 10);
        if (!state.playerRangePending) {
          state.playerMode = "range";
          state.playerMin = num;
          state.playerMax = num;
          state.playerCount = num;
          state.playerRangePending = true;
        } else {
          if (num < state.playerMin) {
            state.playerMax = state.playerMin;
            state.playerMin = num;
          } else {
            state.playerMax = num;
          }
          state.playerRangePending = false;
        }
        renderFilters();
      }
      updateCount();
    });

    const inputEl = content().querySelector("#picker-player-count");
    if (inputEl) {
      content().querySelector("#picker-stepper-minus").addEventListener("click", () => {
        let val = parseInt(inputEl.value, 10) || 1;
        if (val > 1) {
          val -= 1;
          inputEl.value = val;
          state.playerCount = val;
          updateCount();
        }
      });

      content().querySelector("#picker-stepper-plus").addEventListener("click", () => {
        let val = parseInt(inputEl.value, 10) || 1;
        val += 1;
        inputEl.value = val;
        state.playerCount = val;
        updateCount();
      });

      inputEl.addEventListener("input", (e) => {
        state.playerCount = parseInt(e.target.value, 10) || 0;
        updateCount();
      });
    }

    content().querySelector("#picker-next-btn").addEventListener("click", () => {
      state.playerRangePending = false;
      state.step = 2;
      renderFilters();
    });
  } else if (state.step === 2) {
    const duration = content().querySelector("#picker-duration");
    duration.addEventListener("click", (e) => {
      const btn = e.target.closest(".picker-pill");
      if (!btn) return;
      state.duration = btn.dataset.val;
      activate(duration, state.duration);
      content().querySelector("#picker-custom-wrap").style.display =
        state.duration === "custom" ? "" : "none";
      updateCount();
    });
    content().querySelector("#picker-custom-lo").addEventListener("input", (e) => {
      state.customLo = parseInt(e.target.value, 10) || 0;
      updateCount();
    });
    content().querySelector("#picker-custom-hi").addEventListener("input", (e) => {
      state.customHi = parseInt(e.target.value, 10) || 0;
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
  } else if (state.step === 3) {
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
      <p class="reel-caption">Rolling the dice…</p>
    </div>`;

  const reel = content().querySelector(".picker-reel");
  const img = reel.querySelector(".reel-cover");
  const title = reel.querySelector(".reel-title");

  let delay = 60;
  let elapsed = 0;
  const total = 1600;

  const tick = () => {
    if (!overlay) return; // closed mid-animation
    const g = matches[Math.floor(Math.random() * matches.length)];
    img.src = g.cover || placeholderDataURI(g.title);
    title.textContent = g.title;
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

function renderResult(game, singleMatch) {
  const cover = game.cover || placeholderDataURI(game.title);
  const fallback = placeholderDataURI(game.title);
  const tags = (game.tags || [])
    .map((t) => {
      const s = getTagStyle(t);
      return `<span class="skill-tag" style="background:${s.bg};color:${s.text};border-color:transparent;">${esc(t)}</span>`;
    })
    .join("");

  content().innerHTML = `
    <div class="picker-result">
      ${singleMatch ? `<p class="picker-note">Only one game matches — it was meant to be.</p>` : ""}
      <img class="picker-result-cover" src="${esc(cover)}" alt="${esc(game.title)} cover"
           onerror="this.onerror=null;this.src='${esc(fallback)}';">
      <h2 class="picker-result-title">${esc(game.title)}</h2>
      <p class="picker-result-desc">${esc(game.description || "")}</p>
      <div class="card-tags picker-result-tags">${tags}</div>
      <div class="picker-result-actions">
        <button type="button" class="btn btn-primary" id="picker-play-now" style="display: inline-flex; align-items: center; gap: 6px;">
          <svg class="icon icon-stroke" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:0.95rem; height:0.95rem;"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Play Now
        </button>
        <button type="button" class="btn btn-secondary" id="picker-again" style="display: inline-flex; align-items: center; gap: 6px;">
          <svg class="icon icon-stroke" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:0.95rem; height:0.95rem;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          Pick Again
        </button>
        <button type="button" class="btn btn-outline" id="picker-back">Back to Filters</button>
      </div>
    </div>`;

  content().querySelector("#picker-play-now").addEventListener("click", () => openGameDetails(game));
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
  // Fixed-position, on <body>: full-screen effect with no modal scroll expansion.
  document.body.appendChild(frag);
}

/* ---------- view: matching grid ---------- */

function renderMatching() {
  const matches = sortGames(currentMatches(), state.matchSort);
  if (matches.length === 0) {
    renderEmpty();
    return;
  }

  content().innerHTML = `
    <div class="picker-matching-head">
      <div>
        <button type="button" class="btn btn-outline btn-sm" id="picker-match-back">← Filters</button>
        <span class="picker-match-count">${matches.length} game${matches.length === 1 ? "" : "s"} found</span>
      </div>
      <div class="picker-match-controls">
        <label>Sort
          <select id="picker-match-sort">
            <option value="alpha">A–Z</option>
            <option value="playtime">Playtime</option>
            <option value="players">Players</option>
          </select>
        </label>
        <button type="button" class="btn btn-secondary btn-sm" id="picker-match-shuffle" style="display: inline-flex; align-items: center; gap: 6px;">
          <svg class="icon icon-stroke" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:0.85rem; height:0.85rem;"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
          Shuffle
        </button>
      </div>
    </div>
    <div class="games-grid picker-grid" id="picker-match-grid"></div>`;

  const sel = content().querySelector("#picker-match-sort");
  sel.value = state.matchSort;

  const fill = (list) => {
    const grid = content().querySelector("#picker-match-grid");
    grid.innerHTML = "";
    const frag = document.createDocumentFragment();
    list.forEach((g) => frag.appendChild(createGameCard(g)));
    grid.appendChild(frag);
  };
  fill(matches);

  content().querySelector("#picker-match-back").addEventListener("click", renderFilters);
  sel.addEventListener("change", () => {
    state.matchSort = sel.value;
    fill(sortGames(currentMatches(), state.matchSort));
  });
  content().querySelector("#picker-match-shuffle").addEventListener("click", () => {
    fill(shuffle(currentMatches()));
  });
}

/* ---------- view: empty state ---------- */

function renderEmpty() {
  const suggestions = [];
  if (state.playerMode !== "any")
    suggestions.push("Loosen the player count (try “Any”).");
  if (state.duration !== "any")
    suggestions.push("Widen the play time.");
  if (state.categories.size > 0)
    suggestions.push("Remove a category or two.");
  if (suggestions.length === 0)
    suggestions.push("Add some games to the library!");

  content().innerHTML = `
    <div class="picker-empty">
      <div class="picker-empty-icon" style="margin-bottom: var(--spacing-md);">
        <svg class="icon icon-stroke" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:3rem; height:3rem; margin:0 auto; stroke:var(--text-muted);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h3>No games match those filters</h3>
      <p>Nothing in the collection fits every constraint. Try broadening:</p>
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
