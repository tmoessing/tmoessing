/**
 * Standalone entry point for the /meal-library page.
 *
 * Deliberately self-contained: it does NOT reuse the resume's initApp(). It only
 * shares the theme via localStorage['theme'] so dark/light stays in sync across
 * pages, and it keeps a meal's details modal in sync with the URL hash so
 * recipes are shareable / deep-linkable (meal-library/#chicken-alfredo).
 */
import { MealLibraryPage } from "./MealLibraryPage.js";
import { openMealDetails, closeMeal, getOpenSlug } from "./MealDetailsModal.js";

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

function syncFromHash(bySlug) {
  const slug = decodeURIComponent(location.hash.replace(/^#/, ""));
  const open = getOpenSlug();
  if (slug && bySlug[slug]) {
    if (open !== slug) openMealDetails(bySlug[slug], { fromHash: true });
  } else if (open) {
    closeMeal({ fromHash: true });
  }
}

initTheme();

const page = new MealLibraryPage();
page.init().then(() => {
  const bySlug = page.getBySlug();
  window.addEventListener("hashchange", () => syncFromHash(bySlug));
  syncFromHash(bySlug); // honor a deep-link on first load
});
