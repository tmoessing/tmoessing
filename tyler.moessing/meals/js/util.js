/**
 * Pure helpers for the meal library: HTML escaping, tag colors, a generated
 * cover placeholder, the meal match predicate + sort comparators, prep-time /
 * cost buckets, a tiny Markdown renderer, and a Google Calendar link builder.
 * No DOM state, no data imports — safe to reuse anywhere.
 */

/** Escape a string for safe use inside an HTML attribute or text node. */
export function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ---------- display formatting ---------- */

/** "15 min" — blank when unknown. */
export function minutesLabel(mins) {
  const n = num(mins);
  return n > 0 ? `${n} min` : "—";
}

/** "$14" — rounds to whole dollars; blank when unknown. */
export function money(cost) {
  const n = num(cost);
  return n > 0 ? `$${Math.round(n)}` : "—";
}

/** "4 Servings" / "1 Serving". */
export function servingsLabel(servings) {
  const n = num(servings);
  if (n <= 0) return "—";
  return `${n} Serving${n === 1 ? "" : "s"}`;
}

/** Minutes a meal takes end to end (prefers totalTime, falls back to prep+cook). */
export function totalMinutes(meal) {
  const total = num(meal.totalTime);
  if (total > 0) return total;
  return num(meal.prepTime) + num(meal.cookTime);
}

/* ---------- tag colors (mirrors the site's Renderer.getTagStyle) ---------- */

export function getTagStyle(tagName) {
  if (!tagName) return { bg: "var(--bg-tertiary)", text: "var(--text-secondary)" };
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = (Math.abs(hash) % 8) + 1;
  return { bg: `var(--tag-${index}-bg)`, text: `var(--tag-${index}-text)` };
}

/**
 * Generate an inline SVG data-URI cover from a meal's title, so the grid and
 * reveal look complete with zero image files. Real photos drop in later by
 * setting `image` on the data — no code change needed.
 */
export function placeholderDataURI(title) {
  const t = title || "Meal";
  let hash = 0;
  for (let i = 0; i < t.length; i++) hash = t.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  const initials = t
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},58%,52%)"/>` +
    `<stop offset="1" stop-color="hsl(${(hue + 45) % 360},58%,38%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="400" fill="url(#g)"/>` +
    `<text x="50%" y="50%" font-family="Segoe UI, system-ui, sans-serif" font-size="150" ` +
    `font-weight="700" fill="rgba(255,255,255,0.92)" text-anchor="middle" ` +
    `dominant-baseline="central">${esc(initials)}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

/* ---------- shuffle ---------- */

/** Fisher-Yates shuffle. Returns a new array. */
export function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------- filter buckets ---------- */

/** Resolve a time filter into a { lo, hi } minute bucket, or null for "any". */
export function timeBucket(filters) {
  switch (filters.time) {
    case "u15": return { lo: 0, hi: 15 };
    case "15-30": return { lo: 15, hi: 30 };
    case "30-60": return { lo: 30, hi: 60 };
    case "60+": return { lo: 60, hi: Infinity };
    case "custom": {
      const lo = Number.isFinite(filters.timeLo) ? filters.timeLo : 0;
      const hi = Number.isFinite(filters.timeHi) ? filters.timeHi : Infinity;
      return { lo, hi };
    }
    default: return null; // "any"
  }
}

/** Resolve a cost filter into a { lo, hi } dollar bucket, or null for "any". */
export function costBucket(filters) {
  switch (filters.cost) {
    case "budget": return { lo: 0, hi: 8 };
    case "u10": return { lo: 0, hi: 10 };
    case "10-20": return { lo: 10, hi: 20 };
    case "20+": return { lo: 20, hi: Infinity };
    case "custom": {
      const lo = Number.isFinite(filters.costLo) ? filters.costLo : 0;
      const hi = Number.isFinite(filters.costHi) ? filters.costHi : Infinity;
      return { lo, hi };
    }
    default: return null; // "any"
  }
}

/**
 * Does a meal satisfy the current filter state?
 * time: total minutes fall inside the bucket.
 * cost: estimatedCost falls inside the bucket.
 * servings: meal serves at least the requested number.
 * categories: OR — meal has at least one selected category (empty set => any).
 */
export function matchMeal(meal, filters) {
  const t = timeBucket(filters);
  if (t) {
    const mins = totalMinutes(meal);
    if (!(mins >= t.lo && mins <= t.hi)) return false;
  }

  const c = costBucket(filters);
  if (c) {
    const cost = num(meal.estimatedCost);
    if (!(cost >= c.lo && cost <= c.hi)) return false;
  }

  if (filters.servings && filters.servings !== "any") {
    const need = Number(filters.servings);
    if (!(num(meal.servings) >= need)) return false;
  }

  if (filters.categories && filters.categories.size > 0) {
    const has = (meal.categories || []).some((cat) => filters.categories.has(cat));
    if (!has) return false;
  }

  return true;
}

/* ---------- sorting ---------- */

/** Return a new, sorted array. key: alpha | time | cost | servings | random. */
export function sortMeals(meals, key) {
  const arr = [...meals];
  switch (key) {
    case "time":
      arr.sort((a, b) => totalMinutes(a) - totalMinutes(b));
      break;
    case "cost":
      arr.sort((a, b) => num(a.estimatedCost) - num(b.estimatedCost));
      break;
    case "servings":
      arr.sort((a, b) => num(a.servings) - num(b.servings));
      break;
    case "random":
      return shuffle(arr);
    case "alpha":
    default:
      arr.sort((a, b) => String(a.title).localeCompare(String(b.title)));
      break;
  }
  return arr;
}

/* ---------- grocery providers (extensible) ---------- */

/**
 * Resolve a meal's grocery-list link. Today only Walmart, but keyed by provider
 * so more can be added without touching the modal.
 */
export function groceryLink(meal, provider = "walmart") {
  const providers = { walmart: meal.walmartList };
  const url = providers[provider];
  return url && /^https?:\/\//i.test(url) ? url : null;
}

/* ---------- Google Calendar ---------- */

function pad(n) {
  return String(n).padStart(2, "0");
}

function fmtCalDate(d) {
  return (
    String(d.getUTCFullYear()).padStart(4, "0") +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/** Absolute URL back to a meal's deep-linked recipe on this page. */
export function recipeUrl(meal) {
  if (typeof location === "undefined") return "";
  return location.origin + location.pathname + "#" + encodeURIComponent(meal.slug);
}

/**
 * Build a Google Calendar "TEMPLATE" link that pre-fills a meal-prep event:
 * title, a sized time block (defaults to next top-of-hour), and notes with a
 * link back to the recipe. Opens in a new tab — no login, no backend.
 */
export function googleCalendarUrl(meal) {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const durMin = num(meal.prepDuration) || num(meal.prepTime) + num(meal.cookTime) || 60;
  const end = new Date(start.getTime() + durMin * 60000);

  const detailLines = [];
  if (meal.description) detailLines.push(meal.description);
  const link = recipeUrl(meal);
  if (link) detailLines.push(`Recipe: ${link}`);
  const timing = [];
  if (num(meal.prepTime)) timing.push(`Prep ~${num(meal.prepTime)} min`);
  if (num(meal.cookTime)) timing.push(`Cook ~${num(meal.cookTime)} min`);
  if (timing.length) detailLines.push(timing.join(" · "));

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Meal Prep: ${meal.title}`,
    dates: `${fmtCalDate(start)}/${fmtCalDate(end)}`,
    details: detailLines.join("\n\n")
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/* ---------- tiny Markdown renderer ---------- */

function boldAndEsc(raw) {
  return esc(raw).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function inline(raw) {
  let out = "";
  let rest = String(raw);
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/;
  let m;
  while ((m = linkRe.exec(rest))) {
    out += boldAndEsc(rest.slice(0, m.index));
    const text = m[1];
    const url = m[2].trim();
    const safe = /^(https?:|\/|\.\/|\.\.\/|#|mailto:)/i.test(url) ? url : "#";
    out += `<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${boldAndEsc(text)}</a>`;
    rest = rest.slice(m.index + m[0].length);
  }
  out += boldAndEsc(rest);
  return out;
}

/**
 * Render a small, safe subset of Markdown: #/##/### headings, `-`/`*` bullets,
 * `1.` ordered steps, **bold**, and [text](url) links. Everything is escaped;
 * unknown syntax degrades to plain paragraphs. Enough for recipe bodies without
 * pulling in a Markdown dependency.
 */
export function renderMarkdown(md) {
  if (!md) return "";
  const lines = String(md).replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let listType = null;
  let para = [];

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };
  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      closeList();
      continue;
    }
    let m;
    if ((m = /^###\s+(.*)$/.exec(line))) {
      flushPara(); closeList();
      html.push(`<h5 class="recipe-subheading">${inline(m[1])}</h5>`);
    } else if ((m = /^(##|#)\s+(.*)$/.exec(line))) {
      flushPara(); closeList();
      html.push(`<h4 class="recipe-heading" id="recipe-h-${slugify(m[2])}">${inline(m[2])}</h4>`);
    } else if ((m = /^[-*]\s+(.*)$/.exec(line))) {
      flushPara();
      if (listType !== "ul") { closeList(); listType = "ul"; html.push('<ul class="recipe-list">'); }
      html.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = /^\d+\.\s+(.*)$/.exec(line))) {
      flushPara();
      if (listType !== "ol") { closeList(); listType = "ol"; html.push('<ol class="recipe-steps">'); }
      html.push(`<li>${inline(m[1])}</li>`);
    } else {
      para.push(line);
    }
  }
  flushPara();
  closeList();
  return html.join("\n");
}

/** lowercase-hyphen slug, used for in-modal heading anchors. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
