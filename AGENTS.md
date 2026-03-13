# AGENTS.md

Instructions for future coding sessions in this repository.

## Project overview

- Stack: React + TypeScript + Vite
- Main game implementation: `src/App.tsx`
- App entrypoint: `src/main.tsx`
- Static shell: `index.html`
- Base styling: `src/styles.css`
- Deployment workflow: `.github/workflows/deploy-pages.yml`

## Development workflow

1. Install dependencies:
   - `npm install` (or `npm ci` in CI)
2. Validate changes:
   - `npm run build`
3. For UI/visual changes, run locally:
   - `npm run dev`

## Code guidance

- Keep gameplay logic in `src/App.tsx` unless there is a clear reason to split modules.
- Preserve current keyboard controls unless explicitly changing UX.
- Prefer small, focused commits.
- Do not commit generated artifacts like `dist/` or `node_modules/`.

## GitHub Pages notes

- The app is expected to run under `/finnsgame/`.
- If repo path changes, update `base` in `vite.config.ts`.
- Pages deploy is intended to trigger from `main` branch pushes.

## PR expectations

When making changes, include:

- a concise summary of what changed
- commands used to validate (at minimum `npm run build`)
- mention of any environment limitations if validation cannot run
