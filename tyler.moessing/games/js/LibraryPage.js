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
    this.view = localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  }

  init() {
    this.grid = document.getElementById("games-grid");
    this.countEl = document.getElementById("games-count");
    this.sortSel = document.getElementById("library-sort");
    this.gridBtn = document.getElementById("view-grid");
    this.listBtn = document.getElementById("view-list");

    if (this.gridBtn) this.gridBtn.addEventListener("click", () => this.setView("grid"));
    if (this.listBtn) this.listBtn.addEventListener("click", () => this.setView("list"));
    this.applyView();

    const pickBtn = document.getElementById("pick-a-game-btn");
    if (pickBtn) pickBtn.addEventListener("click", () => openPicker());

    const shuffleBtn = document.getElementById("library-shuffle");
    if (shuffleBtn) {
      shuffleBtn.addEventListener("click", () => {
        this.games = shuffle(this.games);
        this.render();
      });
    }

    if (this.sortSel) {
      this.sortSel.addEventListener("change", () => {
        this.games = sortGames(this.games, this.sortSel.value);
        this.render();
      });
    }

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

  render() {
    if (!this.grid) return;
    this.grid.innerHTML = "";
    const frag = document.createDocumentFragment();
    this.games.forEach((g) => frag.appendChild(createGameCard(g)));
    this.grid.appendChild(frag);
    if (this.countEl) {
      const n = this.games.length;
      this.countEl.textContent = `${n} game${n === 1 ? "" : "s"}`;
    }
  }
}
