/**
 * The /game-library grid page: renders every game, wires the toolbar
 * (sort + shuffle) and the Pick-a-Game button.
 */
import { GAMES } from "../data/games.js";
import { createGameCard } from "./GameCard.js";
import { sortGames, shuffle } from "./filters.js";
import { openPicker } from "./PickerModal.js";

const VIEW_KEY = "library-view";

export class LibraryPage {
  constructor() {
    this.games = sortGames(GAMES, "alpha");
    this.searchQuery = "";
    this.view = localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  }

  init() {
    this.grid = document.getElementById("games-grid");
    this.countEl = document.getElementById("games-count");
    this.sortSel = document.getElementById("library-sort");
    this.gridBtn = document.getElementById("view-grid");
    this.listBtn = document.getElementById("view-list");
    this.searchInput = document.getElementById("game-search-input");

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

    if (this.searchInput) {
      this.searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.updateList();
      });
    }

    this.updateList();
  }

  getFilteredGames() {
    if (!this.searchQuery) return GAMES;
    return GAMES.filter((g) => {
      const titleMatch = g.title.toLowerCase().includes(this.searchQuery);
      const descMatch = (g.description || "").toLowerCase().includes(this.searchQuery);
      const tagMatch = (g.tags || []).some((t) => t.toLowerCase().includes(this.searchQuery));
      const catMatch = (g.categories || []).some((c) => c.toLowerCase().includes(this.searchQuery));
      return titleMatch || descMatch || tagMatch || catMatch;
    });
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
