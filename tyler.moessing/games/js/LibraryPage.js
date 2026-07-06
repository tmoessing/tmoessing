/**
 * The /game-library grid page: renders every game, wires the toolbar
 * (sort + shuffle) and the Pick-a-Game button.
 */
import { GAMES } from "../data/games.js";
import { createGameCard } from "./GameCard.js";
import { sortGames, shuffle } from "./filters.js";
import { openPicker } from "./PickerModal.js";

const VIEW_KEY = "library-view";

import { CATEGORIES } from "../data/games.js";

export class LibraryPage {
  constructor() {
    this.games = sortGames(GAMES, "alpha");
    this.searchQuery = "";
    this.activeTags = new Set();
    this.selectedSuggestionIndex = 0;
    this.view = localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  }

  init() {
    this.grid = document.getElementById("games-grid");
    this.countEl = document.getElementById("games-count");
    this.sortSel = document.getElementById("library-sort");
    this.gridBtn = document.getElementById("view-grid");
    this.listBtn = document.getElementById("view-list");
    this.searchInput = document.getElementById("game-search-input");
    this.searchBoxContainer = document.getElementById("game-search-box-container");
    this.suggestionsDiv = document.getElementById("game-search-suggestions");
    this.activeTagsDiv = document.getElementById("game-search-tags");

    // Extract unique tags and categories for autocomplete suggestions
    const tagsSet = new Set();
    GAMES.forEach((g) => {
      if (g.categories) g.categories.forEach((c) => tagsSet.add(c));
      if (g.tags) g.tags.forEach((t) => tagsSet.add(t));
    });
    this.matchableTags = Array.from(tagsSet);

    if (this.gridBtn) this.gridBtn.addEventListener("click", () => this.setView("grid"));
    if (this.listBtn) this.listBtn.addEventListener("click", () => this.setView("list"));
    this.applyView();

    const pickBtn = document.getElementById("pick-a-game-btn");
    if (pickBtn) pickBtn.addEventListener("click", () => openPicker());

    const shuffleBtn = document.getElementById("library-shuffle");
    if (shuffleBtn) {
      shuffleBtn.addEventListener("click", () => {
        const filtered = this.getFilteredGames();
        this.games = shuffle(filtered);
        this.renderFiltered(this.games);
      });
    }

    if (this.sortSel) {
      this.sortSel.addEventListener("change", () => {
        const filtered = this.getFilteredGames();
        this.games = sortGames(filtered, this.sortSel.value);
        this.renderFiltered(this.games);
      });
    }

    if (this.searchBoxContainer && this.searchInput) {
      this.searchBoxContainer.addEventListener("click", () => {
        this.searchInput.focus();
      });
    }

    if (this.searchInput) {
      this.searchInput.addEventListener("input", () => {
        this.searchQuery = this.searchInput.value.toLowerCase().trim();
        this.selectedSuggestionIndex = 0;
        this.renderSuggestions();
        this.updateList();
      });

      this.searchInput.addEventListener("keydown", (e) => {
        const matches = this.getMatchingTags();
        if (matches.length > 0 && this.suggestionsDiv && this.suggestionsDiv.style.display !== "none") {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            this.selectedSuggestionIndex = (this.selectedSuggestionIndex + 1) % matches.length;
            this.highlightSuggestion();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            this.selectedSuggestionIndex = (this.selectedSuggestionIndex - 1 + matches.length) % matches.length;
            this.highlightSuggestion();
          } else if (e.key === "Tab" || e.key === "Enter") {
            e.preventDefault();
            this.addActiveTag(matches[this.selectedSuggestionIndex]);
          }
        } else {
          if (e.key === "Backspace" && !this.searchInput.value) {
            const tagsArray = Array.from(this.activeTags);
            if (tagsArray.length > 0) {
              this.activeTags.delete(tagsArray[tagsArray.length - 1]);
              this.renderActiveTags();
              this.updateList();
            }
          }
        }
      });
    }

    document.addEventListener("click", (e) => {
      const isInside = e.target.closest(".search-container-relative");
      if (!isInside) this.hideSuggestions();
    });

    this.updateList();
  }

  getMatchingTags() {
    const val = this.searchInput ? this.searchInput.value.toLowerCase().trim() : "";
    if (!val) return [];
    return this.matchableTags
      .filter((t) => t.toLowerCase().includes(val) && !this.activeTags.has(t))
      .slice(0, 5);
  }

  renderSuggestions() {
    if (!this.suggestionsDiv) return;
    const matches = this.getMatchingTags();
    if (matches.length === 0) {
      this.hideSuggestions();
      return;
    }

    this.suggestionsDiv.innerHTML = "";
    matches.forEach((tag, index) => {
      const item = document.createElement("div");
      item.className = "suggestion-item" + (index === this.selectedSuggestionIndex ? " active" : "");
      
      const isCategory = CATEGORIES.includes(tag);
      const typeLabel = isCategory ? "Category" : "Tag";

      item.innerHTML = `
        <span>${esc(tag)}</span>
        <span class="suggestion-type">${typeLabel}</span>
      `;

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this.addActiveTag(tag);
      });

      this.suggestionsDiv.appendChild(item);
    });

    this.suggestionsDiv.style.display = "block";
  }

  highlightSuggestion() {
    if (!this.suggestionsDiv) return;
    const items = this.suggestionsDiv.querySelectorAll(".suggestion-item");
    items.forEach((item, index) => {
      item.classList.toggle("active", index === this.selectedSuggestionIndex);
    });
  }

  hideSuggestions() {
    if (this.suggestionsDiv) {
      this.suggestionsDiv.style.display = "none";
    }
    this.selectedSuggestionIndex = 0;
  }

  addActiveTag(tag) {
    this.activeTags.add(tag);
    if (this.searchInput) {
      this.searchInput.value = "";
      this.searchQuery = "";
    }
    this.renderActiveTags();
    this.hideSuggestions();
    this.updateList();
    if (this.searchInput) this.searchInput.focus();
  }

  renderActiveTags() {
    if (!this.activeTagsDiv) return;
    this.activeTagsDiv.innerHTML = "";
    this.activeTags.forEach((tag) => {
      const pill = document.createElement("span");
      pill.className = "skill-tag category-tag";
      pill.style.display = "inline-flex";
      pill.style.alignItems = "center";
      pill.style.gap = "6px";
      pill.style.margin = "0";
      pill.style.padding = "2px 8px";
      pill.style.background = "var(--bg-tertiary)";
      pill.style.border = "1px solid var(--border-color)";
      pill.style.borderRadius = "var(--radius-md)";
      pill.style.fontSize = "0.78rem";
      pill.style.fontWeight = "700";
      pill.style.color = "var(--primary-blue)";

      pill.innerHTML = `
        <span>${esc(tag)}</span>
        <span class="remove-tag-btn" style="cursor:pointer; font-weight:800; opacity:0.6; margin-left: 2px;">✕</span>
      `;

      pill.querySelector(".remove-tag-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        this.activeTags.delete(tag);
        this.renderActiveTags();
        this.updateList();
        if (this.searchInput) this.searchInput.focus();
      });

      this.activeTagsDiv.appendChild(pill);
    });

    if (this.searchInput) {
      if (this.activeTags.size > 0) {
        this.searchInput.placeholder = "";
      } else {
        this.searchInput.placeholder = "Search games...";
      }
    }
  }

  getFilteredGames() {
    let filtered = GAMES;

    // Filter by locked active tags
    if (this.activeTags.size > 0) {
      filtered = filtered.filter((g) => {
        return Array.from(this.activeTags).every((tag) => {
          const inCategories = (g.categories || []).some((c) => c.toLowerCase() === tag.toLowerCase());
          const inTags = (g.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase());
          return inCategories || inTags;
        });
      });
    }

    // Filter by text search query
    if (this.searchQuery) {
      filtered = filtered.filter((g) => {
        const titleMatch = g.title.toLowerCase().includes(this.searchQuery);
        const descMatch = (g.description || "").toLowerCase().includes(this.searchQuery);
        const tagMatch = (g.tags || []).some((t) => t.toLowerCase().includes(this.searchQuery));
        const catMatch = (g.categories || []).some((c) => c.toLowerCase().includes(this.searchQuery));
        return titleMatch || descMatch || tagMatch || catMatch;
      });
    }

    return filtered;
  }

  updateList() {
    const filtered = this.getFilteredGames();
    const sortBy = this.sortSel ? this.sortSel.value : "alpha";
    this.games = sortGames(filtered, sortBy);
    this.render();
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

  renderFiltered(gamesList) {
    if (!this.grid) return;
    this.grid.innerHTML = "";
    if (gamesList.length === 0) {
      const empty = document.createElement("div");
      empty.className = "picker-empty";
      empty.style.width = "100%";
      empty.style.gridColumn = "1 / -1";
      empty.innerHTML = `
        <div class="picker-empty-icon" style="margin-bottom: var(--spacing-md); text-align: center;">
          <svg class="icon icon-stroke" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:3rem; height:3rem; margin:0 auto; stroke:var(--text-muted);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 style="text-align: center; color: var(--text-primary);">No games match your search</h3>
        <p style="text-align: center; color: var(--text-secondary);">Try adjusting your query or keywords</p>
      `;
      this.grid.appendChild(empty);
    } else {
      const frag = document.createDocumentFragment();
      gamesList.forEach((g) => frag.appendChild(createGameCard(g)));
      this.grid.appendChild(frag);
    }
    if (this.countEl) {
      const n = gamesList.length;
      this.countEl.textContent = `${n} game${n === 1 ? "" : "s"}`;
    }
  }

  render() {
    this.renderFiltered(this.games);
  }
}
