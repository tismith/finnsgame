# Finn's Game (Farm Quest Prototype)

A compact web-based prototype inspired by Zelda + Stardew style progression.

Live site: https://tismith.id.au/finnsgame/

## What this is

This project is a canvas game built with React + TypeScript + Vite.
You can:

- farm and harvest crops
- gather wood/stone
- buy/sell in the shop
- repair the bridge
- explore forest and dungeon areas
- fight slimes and a dragon boss

## Controls

- Move: `WASD` or arrow keys
- Interact/use: `E`
- Tools:
  - `1` hoe
  - `2` seeds
  - `3` water
  - `4` axe
  - `5` pickaxe
- Swap seed type: `T`
- Shop actions:
  - `B` buy carrot seed
  - `N` buy pumpkin seed
  - `S` sell goods
  - `D` donate wood
- Attack: `Space`
- Reset position: `R`

## Local development

### Requirements

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Run dev server

```bash
npm run dev
```

Default URL: `http://localhost:4173`

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Deployment

GitHub Pages deployment is handled by the workflow in `.github/workflows/deploy-pages.yml`.
It deploys on pushes to the `main` branch.

The Vite `base` is configured for repository hosting at `/finnsgame/`.
