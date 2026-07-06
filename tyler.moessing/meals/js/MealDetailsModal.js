/**
 * Shared modal layer for the meal library.
 *
 * - openModal(html) / closeModal(): generic overlay with backdrop + Escape +
 *   close-button dismissal and a fade/scale-in via the `.open` class.
 * - openMealDetails(meal): renders the recipe view and is exposed as
 *   window.__openMealDetails for cards to call. It also keeps the URL hash in
 *   sync (meal-library/#slug) so recipes are shareable and deep-linkable.
 * - lockScroll() / unlockScroll(): ref-counted body scroll lock, shared with
 *   the picker so stacked modals don't unlock the page prematurely.
 */
import {
  esc,
  getTagStyle,
  placeholderDataURI,
  renderMarkdown,
  minutesLabel,
  money,
  servingsLabel,
  totalMinutes,
  groceryLink,
  googleCalendarUrl
} from "./util.js";

let scrollLocks = 0;
export function lockScroll() {
  scrollLocks += 1;
  document.body.style.overflow = "hidden";
}
export function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = "";
}

let overlay = null;
let openSlug = null;

/** Slug of the meal whose details are currently open, or null. */
export function getOpenSlug() {
  return openSlug;
}

function onEsc(e) {
  if (e.key === "Escape") closeMeal();
}

function openModal(html) {
  destroyOverlay();
  overlay = document.createElement("div");
  overlay.className = "meal-modal-overlay details-overlay";
  overlay.innerHTML = `
    <div class="meal-modal" role="dialog" aria-modal="true" aria-label="Meal details">
      <button class="meal-modal-close" type="button" aria-label="Close">✕</button>
      <div class="meal-modal-body">${html}</div>
    </div>`;
  document.body.appendChild(overlay);
  lockScroll();
  window.__mealDetailsOpen = true;

  requestAnimationFrame(() => overlay.classList.add("open"));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeMeal();
  });
  overlay.querySelector(".meal-modal-close").addEventListener("click", () => closeMeal());
  document.addEventListener("keydown", onEsc);
}

function destroyOverlay() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
  window.__mealDetailsOpen = false;
  unlockScroll();
  document.removeEventListener("keydown", onEsc);
}

function metaRow(meal) {
  const items = [];
  if (Number(meal.prepTime) > 0) items.push(`⏱ Prep ${minutesLabel(meal.prepTime)}`);
  if (Number(meal.cookTime) > 0) items.push(`🔥 Cook ${minutesLabel(meal.cookTime)}`);
  const total = totalMinutes(meal);
  if (total > 0) items.push(`⏲ Total ${minutesLabel(total)}`);
  if (Number(meal.estimatedCost) > 0) items.push(`💲 ${money(meal.estimatedCost)}`);
  if (Number(meal.servings) > 0) items.push(`🍽 ${servingsLabel(meal.servings)}`);
  return items.map((t) => `<span class="meal-meta">${esc(t)}</span>`).join("");
}

function nutritionRow(meal) {
  const n = meal.nutrition;
  if (!n || typeof n !== "object") return "";
  const parts = Object.entries(n)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `<span class="nutrition-item"><strong>${esc(v)}</strong> ${esc(k)}</span>`);
  if (!parts.length) return "";
  return `<div class="meal-nutrition">${parts.join("")}</div>`;
}

function detailsHTML(meal) {
  const cover = meal.image || placeholderDataURI(meal.title);
  const fallback = placeholderDataURI(meal.title);

  const cats = (meal.categories || [])
    .map((c) => `<span class="skill-tag category-tag">${esc(c)}</span>`)
    .join("");
  const tags = (meal.tags || [])
    .map((t) => {
      const s = getTagStyle(t);
      return `<span class="skill-tag" style="background:${s.bg};color:${s.text};border-color:transparent;">${esc(t)}</span>`;
    })
    .join("");

  const walmart = groceryLink(meal, "walmart");
  const source = meal.recipeSource && /^https?:\/\//i.test(meal.recipeSource) ? meal.recipeSource : null;
  const calUrl = googleCalendarUrl(meal);

  const actions = `
    <div class="meal-details-actions">
      <button type="button" class="btn btn-primary btn-sm" id="meal-view-recipe">📖 View Recipe</button>
      ${walmart ? `<a href="${esc(walmart)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">🛒 Walmart Grocery List</a>` : ""}
      <a href="${esc(calUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">📅 Plan Meal Prep</a>
      ${source ? `<a href="${esc(source)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">🌐 Original Recipe</a>` : ""}
    </div>`;

  return `
    <div class="meal-details">
      <div class="meal-details-cover-wrap">
        <img class="meal-details-cover" src="${esc(cover)}" alt="${esc(meal.title)}"
             onerror="this.onerror=null;this.src='${esc(fallback)}';">
      </div>
      <div class="meal-details-info">
        <h2 class="meal-details-title">${esc(meal.title)}</h2>
        <p class="meal-details-desc">${esc(meal.description || "")}</p>
        <div class="meal-meta-row">${metaRow(meal)}</div>
        ${nutritionRow(meal)}
        ${actions}
        ${cats ? `<div class="meal-details-section"><h4>Categories</h4><div class="card-tags">${cats}</div></div>` : ""}
        ${tags ? `<div class="meal-details-section"><h4>Tags</h4><div class="card-tags">${tags}</div></div>` : ""}
      </div>
    </div>
    <div class="meal-recipe" id="meal-recipe-body">${renderMarkdown(meal.body)}</div>`;
}

/**
 * Open the details modal for a meal.
 * @param {object} opts.fromHash - true when triggered by hash navigation, so we
 *   don't push another hash entry (avoids a sync loop).
 */
export function openMealDetails(meal, opts = {}) {
  if (!meal) return;
  openModal(detailsHTML(meal));
  openSlug = meal.slug;

  const viewBtn = overlay.querySelector("#meal-view-recipe");
  if (viewBtn) {
    viewBtn.addEventListener("click", () => {
      const body = overlay.querySelector("#meal-recipe-body");
      if (body) body.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (!opts.fromHash) {
    const current = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (current !== meal.slug) location.hash = encodeURIComponent(meal.slug);
  }
}

/** Close the details modal and clear the hash. */
export function closeMeal(opts = {}) {
  if (!overlay) return;
  destroyOverlay();
  openSlug = null;
  if (!opts.fromHash && location.hash) {
    history.replaceState(null, "", location.pathname + location.search);
  }
}

// Cards call this globally so they don't each need an import wire-up.
window.__openMealDetails = openMealDetails;
