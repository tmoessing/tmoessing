/**
 * Pure helpers for the board game library: matching predicate, sort
 * comparators, shuffle, tag styling, and a generated cover placeholder.
 * No DOM, no imports — safe to reuse anywhere.
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

const COMPLEXITY_RANK = { easy: 0, medium: 1, heavy: 2 };
const COMPLEXITY_LABEL = { easy: "Easy", medium: "Medium", heavy: "Heavy" };

export function complexityLabel(c) {
  return COMPLEXITY_LABEL[c] || c || "";
}

/**
 * Resolve a duration filter into a { lo, hi } minute bucket, or null for "any".
 * Buckets: u30 / 30-60 / 60-90 / 90+ / custom / any.
 */
export function durationBucket(filters) {
  switch (filters.duration) {
    case "u30": return { lo: 0, hi: 30 };
    case "30-60": return { lo: 30, hi: 60 };
    case "60-90": return { lo: 60, hi: 90 };
    case "90+": return { lo: 90, hi: Infinity };
    case "custom": {
      const lo = Number.isFinite(filters.customLo) ? filters.customLo : 0;
      const hi = Number.isFinite(filters.customHi) ? filters.customHi : Infinity;
      return { lo, hi };
    }
    default: return null; // "any"
  }
}

/**
 * Does a game satisfy the current filter state?
 *
 * players:
 *   any     -> always
 *   exact   -> game range covers the count (min <= n <= max)
 *   minimum -> game supports at least n players (max >= n)
 *   maximum -> game is playable with at most n players (min <= n)
 * duration: overlap between game [playtimeMin, playtimeMax] and the bucket.
 * categories: OR — game has at least one selected category (empty set => any).
 * complexity: exact match, or "any".
 */
export function matchGame(game, filters) {
  // Players
  const n = Number(filters.playerCount);
  switch (filters.playerMode) {
    case "exact":
      if (!(game.minPlayers <= n && n <= game.maxPlayers)) return false;
      break;
    case "range": {
      const min = Number(filters.playerMin);
      const max = Number(filters.playerMax);
      if (!(game.minPlayers <= max && game.maxPlayers >= min)) return false;
      break;
    }
    case "minimum":
      if (!(game.maxPlayers >= n)) return false;
      break;
    case "maximum":
      if (!(game.minPlayers <= n)) return false;
      break;
    default:
      break; // "any"
  }

  // Duration (overlap of intervals)
  const bucket = durationBucket(filters);
  if (bucket) {
    if (!(game.playtimeMin <= bucket.hi && game.playtimeMax >= bucket.lo)) return false;
  }

  // Categories (OR across the selected set)
  if (filters.categories && filters.categories.size > 0) {
    const has = (game.categories || []).some((c) => filters.categories.has(c));
    if (!has) return false;
  }

  // Complexity
  if (filters.complexity && filters.complexity !== "any") {
    if (game.complexity !== filters.complexity) return false;
  }

  return true;
}

const avgPlaytime = (g) => (g.playtimeMin + g.playtimeMax) / 2;

/** Return a new, sorted array. key: alpha | playtime | players | complexity. */
export function sortGames(games, key) {
  const arr = [...games];
  switch (key) {
    case "playtime":
      arr.sort((a, b) => avgPlaytime(a) - avgPlaytime(b));
      break;
    case "players":
      arr.sort((a, b) => a.maxPlayers - b.maxPlayers || a.minPlayers - b.minPlayers);
      break;
    case "complexity":
      arr.sort((a, b) => COMPLEXITY_RANK[a.complexity] - COMPLEXITY_RANK[b.complexity]);
      break;
    case "alpha":
    default:
      arr.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }
  return arr;
}

/** Fisher-Yates shuffle. Returns a new array. */
export function shuffle(games) {
  const arr = [...games];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Consistent tag colors matching the rest of the site (mirrors
 * Renderer.getTagStyle): a hash maps each tag onto the --tag-1..8 palette.
 */
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
 * Generate an inline SVG data-URI cover from a game's title, so the grid and
 * reveal look complete with zero image files. Real covers drop in later by
 * setting `cover` on the data — no code change needed.
 */
export function placeholderDataURI(title) {
  const t = title || "Game";
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
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},58%,52%)"/>` +
    `<stop offset="1" stop-color="hsl(${(hue + 45) % 360},58%,38%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="300" fill="url(#g)"/>` +
    `<text x="50%" y="50%" font-family="Segoe UI, system-ui, sans-serif" font-size="110" ` +
    `font-weight="700" fill="rgba(255,255,255,0.92)" text-anchor="middle" ` +
    `dominant-baseline="central">${esc(initials)}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
