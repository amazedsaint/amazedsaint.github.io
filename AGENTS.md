# Repository Guidelines

## Project Structure & Module Organization
- Source: `index.html` (home), `posts/*.html` (articles and simulations).
- Scripts: `js/lattice.js`, `js/matrix.js`, `js/card_creatures.js` (page‑scoped IIFEs; each guards for required DOM).
- Styles: `style.css` (CSS variables, light theme, responsive rules).
- Other: `CNAME` (GitHub Pages), `CLAUDE.md` (assistant notes).

## Build, Test, and Development Commands
- Local preview (no build step):
  - Simple server: `python3 -m http.server 8000` then open `http://localhost:8000`.
  - Or open `index.html` directly in a browser (use a server for canvas/asset paths).
- Lint/format: none enforced; keep diffs minimal and consistent with existing style.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; include semicolons.
- JavaScript: `const`/`let`, arrow functions, camelCase identifiers; files use lower_snake_case (e.g., `card_creatures.js`). Keep modules self‑contained IIFEs.
- CSS/HTML: kebab‑case class names (e.g., `.card-cover`, `.article-grid`). Prefer CSS variables from `:root`.
- Performance/UX: respect `prefers-reduced-motion`; cap work per frame; guard against missing DOM nodes.

## Testing Guidelines
- Framework: none. Verify manually across Chrome/Safari/Firefox and mobile.
- Checks: no console errors, acceptable FPS, responsive layout, readable text, correct behavior of simulations and controls.
- Accessibility: verify focus styles, contrast, and reduced‑motion behavior.
- How to run: start a local server (see above) and navigate to `index.html` and each `posts/*.html`.

## Commit & Pull Request Guidelines
- Messages: imperative and concise. Use optional scope prefixes seen in history:
  - Examples: `Home: refine hero copy`, `Index: tweak cards hover`, `sim(info-flies): fix grid NaN crash`.
- Group related changes; avoid noisy reformatting.
- PRs should include:
  - Clear description and rationale; link issues if applicable.
  - Screenshots or short clips for UI/animation changes.
  - Test notes: browsers tested and any known limitations.

## Security & Configuration Tips
- Static site; no secrets in repo. External scripts (e.g., MathJax) should be `async`/`defer` and from reputable CDNs.
- Keep `CNAME` intact for Pages. Avoid adding heavyweight build tooling unless necessary.

## Architecture Overview
- Lightweight static site. No bundler. Each script initializes only when its target element exists and tears down on resize/visibility appropriately. Follow these patterns for new pages/components.

