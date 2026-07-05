/**
 * Factory for a single board game card. Mirrors the site's card idiom
 * (build element, set innerHTML, return). The whole card and its button
 * both route to the shared game-details modal.
 */
import {
  getTagStyle,
  placeholderDataURI,
  complexityLabel,
  esc
} from "./filters.js";

function playersLabel(g) {
  return g.minPlayers === g.maxPlayers
    ? `${g.minPlayers}`
    : `${g.minPlayers}–${g.maxPlayers}`;
}

function playtimeLabel(g) {
  return g.playtimeMin === g.playtimeMax
    ? `${g.playtimeMin}`
    : `${g.playtimeMin}–${g.playtimeMax}`;
}

export function createGameCard(game) {
  const card = document.createElement("div");
  card.className = "game-card";
  card.dataset.id = game.id;

  const cover = game.cover || placeholderDataURI(game.title);
  const fallback = placeholderDataURI(game.title);
  const tagsHTML = (game.tags || [])
    .slice(0, 3)
    .map((t) => {
      const s = getTagStyle(t);
      return `<span class="skill-tag" style="background:${s.bg};color:${s.text};border-color:transparent;">${esc(t)}</span>`;
    })
    .join("");

  const CORE_CATEGORIES = [
    "Party",
    "Strategy",
    "Cooperative",
    "Social Deduction",
    "Card Game",
    "Family"
  ];

  const catsHTML = (game.categories || [])
    .filter((c) => CORE_CATEGORIES.includes(c))
    .slice(0, 2)
    .map((c) => `<span class="skill-tag category-tag">${esc(c)}</span>`)
    .join("");

  card.innerHTML = `
    <div class="game-cover-wrap">
      <img class="game-cover" src="${esc(cover)}" alt="${esc(game.title)} cover"
           loading="lazy" onerror="this.onerror=null;this.src='${esc(fallback)}';">
    </div>
    <div class="game-card-body">
      <div class="game-card-main-info">
        <h3 class="game-card-title">${esc(game.title)}</h3>
        <div class="game-meta-row">
          <span class="game-meta" style="display: inline-flex; align-items: center; gap: 4px;">
            <svg class="icon icon-stroke" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:0.85rem; height:0.85rem; stroke:var(--text-muted);"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${playersLabel(game)} players
          </span>
          <span class="game-meta" style="display: inline-flex; align-items: center; gap: 4px;">
            <svg class="icon icon-stroke" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:0.85rem; height:0.85rem; stroke:var(--text-muted);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${playtimeLabel(game)} min
          </span>
        </div>
      </div>
      <p class="game-card-desc">${esc(game.description || "")}</p>
      <div class="game-card-details-section">
        ${catsHTML ? `<div class="game-card-categories card-tags">${catsHTML}</div>` : ""}
        <div class="card-tags game-card-tags">${tagsHTML}</div>
      </div>
      <button class="btn btn-primary btn-sm game-view-btn" type="button">View Details</button>
    </div>
  `;

  const open = () => {
    if (typeof window.__openGameDetails === "function") window.__openGameDetails(game);
  };
  card.addEventListener("click", open);

  return card;
}
