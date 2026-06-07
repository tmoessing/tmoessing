# Project Instructions: Tyler Moessing Resume

## Design & UI Constraints
- **Sidebar:**
    - The sidebar MUST NOT require scrolling on standard displays.
    - Keep sidebar links small enough to fit within the viewport.
    - Social/Contact links should be placed as a **footer** at the bottom of the sidebar section.
- **Icons:**
    - Ensure **Kaggle** and **Venmo** icons are included and high-quality.
    - Pay special attention to the alignment of the Venmo "V" icon; it should be perfectly centered and fully visible (not cut off).
- **Responsive Design:** Prioritize vertical space efficiency in the sidebar.

## Content Management
- Resume content is managed via `professional_content.md` and `personal_content.md`.
- `index.html` and `content-loader.js` should not be modified for simple content updates.
- If a new section type is added to the markdown files, `content-loader.js` must be updated to handle the parsing and rendering.

## Development Workflow
- **No HTML Edits:** Avoid editing `index.html` for content changes.
- **CSS Styling:** Use `styles.css` for all visual adjustments.
- **Verification:** After CSS changes, verify that the sidebar still fits without scrolling.
