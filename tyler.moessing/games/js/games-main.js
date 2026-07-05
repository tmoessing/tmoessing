/**
 * Standalone entry point for the /game-library page.
 *
 * Deliberately self-contained: it does NOT reuse the resume's initApp()
 * (which would force the resume hash routing). It only shares the theme via
 * localStorage['theme'] so dark/light stays in sync across pages.
 */
import { LibraryPage } from "./LibraryPage.js";
import "./GameDetailsModal.js"; // registers window.__openGameDetails

function initTheme() {
  const body = document.body;
  const moon = document.querySelector(".moon-icon");
  const sun = document.querySelector(".sun-icon");

  const apply = (theme) => {
    const dark = theme === "dark";
    body.classList.toggle("dark-mode", dark);
    body.classList.toggle("light-mode", !dark);
    if (moon) moon.style.display = dark ? "block" : "none";
    if (sun) sun.style.display = dark ? "none" : "block";
    localStorage.setItem("theme", theme);
  };

  apply(localStorage.getItem("theme") === "dark" ? "dark" : "light");

  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.addEventListener("click", () =>
      apply(body.classList.contains("dark-mode") ? "light" : "dark")
    );
  }
}

initTheme();
new LibraryPage().init();
