/**
 * Factory for a single meal card. Cover on the left, info on the right, with
 * emoji info-chips (prep time / cost / servings) and colored category chips.
 * The whole card is a keyboard-operable button that opens the details modal.
 */
import {
  esc,
  getTagStyle,
  placeholderDataURI,
  minutesLabel,
  money,
  servingsLabel
} from "./util.js";

export function createMealCard(meal) {
  const card = document.createElement("article");
  card.className = "meal-card";
  card.dataset.slug = meal.slug;
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `View recipe for ${meal.title}`);

  const cover = meal.image || placeholderDataURI(meal.title);
  const fallback = placeholderDataURI(meal.title);

  const cats = (meal.categories || [])
    .slice(0, 3)
    .map((c) => {
      const s = getTagStyle(c);
      return `<span class="skill-tag" style="background:${s.bg};color:${s.text};border-color:transparent;">🏷 ${esc(c)}</span>`;
    })
    .join("");

  card.innerHTML = `
    <div class="meal-cover-wrap">
      <img class="meal-cover" src="${esc(cover)}" alt="${esc(meal.title)}"
           loading="lazy" onerror="this.onerror=null;this.src='${esc(fallback)}';">
    </div>
    <div class="meal-card-body">
      <h3 class="meal-title">${esc(meal.title)}</h3>
      <p class="meal-desc">${esc(meal.description || "")}</p>
      <div class="meal-chips">
        <span class="meal-chip" title="Prep time">⏱ ${esc(minutesLabel(meal.prepTime))}</span>
        <span class="meal-chip" title="Estimated cost">💲 ${esc(money(meal.estimatedCost))}</span>
        <span class="meal-chip" title="Servings">🍽 ${esc(servingsLabel(meal.servings))}</span>
      </div>
      ${cats ? `<div class="meal-cat-chips card-tags">${cats}</div>` : ""}
      <button class="btn btn-primary btn-sm meal-view-btn" type="button">📖 View Recipe</button>
    </div>
  `;

  const open = () => {
    if (typeof window.__openMealDetails === "function") window.__openMealDetails(meal);
  };
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });

  return card;
}
