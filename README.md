# PeakCraft Chess 2.0

**Strategy Reimagined.**  
An original 3D client-side, offline-capable chess application engineered by **PeakCraft Innovations Limited**.

---

## Intellectual Property & Originality

All 3D piece geometries, procedural marble and wood textures, WebGL lighting shaders, synthesized Web Audio sound effects, vector crests, UI layouts, and the chess rules/search engine in this repository are **100% original works** created specifically for **PeakCraft Chess** by PeakCraft Innovations Limited. No third-party game assets, trademarks, or proprietary codebases are used.

---

## Overview

PeakCraft Chess 2.0 delivers a full-viewport 3D tabletop chess experience with a mathematically verified FIDE rules engine, non-blocking Web Worker computer opponent, and zero-cost Progressive Web App (PWA) offline persistence.

### Key Features

- **Original 3D Tabletop & Procedural Staunton Pieces (`src/scene/`)**
  - Multi-part procedural 3D chess pieces (`LatheGeometry`, bevelled `ExtrudeGeometry`, crenellated parapets, coronet crowns) grounded on raised bevelled squares with flanking 3D capture trays.
  - Three switchable PBR material finishes: **Teal & Gold**, **Alabaster**, and **Royal Walnut**.
  - Smooth parabolic arc flight animations, simultaneous castling rook slides, pooled 3D capture burst particles, and exponentially damped camera presets (**Classic 3/4**, **Low**, **Top**, and **Flip**).
- **Complete FIDE Chess Rules Engine (`src/engine/`)**
  - Legal movement, check, checkmate, stalemate, castling (kingside and queenside), en passant, and pawn promotion (`Q`, `R`, `B`, `N`).
  - Automatic draw detection for **Threefold Repetition**, **Fifty-Move Rule**, and **Insufficient Material**, plus **Draw Offers** and **Resignation**.
  - Standard Algebraic Notation (SAN) move history with ply-by-ply board inspection and **PGN Export**.
- **Three Playable Game Modes**
  - **Player vs Engine**: Choose **Easy**, **Mid**, or **Hard** strength, play as White, Black, or Random, and optionally enable chess clocks (`Untimed`, `5 min`, `10 + 5`, `15 + 10`).
  - **Local Two-Player**: Face-to-face play on one device with optional automatic 3D camera rotation and mutual draw offers.
  - **Practice & Exploration**: Legal move rings, engine-powered 3D arc hints, undo, pause/resume, and FEN import/export.
- **Offline-First Progressive Web App**
  - Pre-cached via Workbox (`vite-plugin-pwa`) for offline playability after initial load.
  - Procedural Web Audio API sound synthesis and `localStorage` match persistence.

---

## Controls & Shortcuts

- **Click Piece & Square**: Select and move pieces
- **Drag Board**: Orbit 3D camera (`OrbitControls`)
- **Scroll**: Zoom in / out
- **`Esc`**: Pause / Resume match (freezes clocks)
- **`Z`**: Undo move
- **`F`**: Flip 3D board orientation
- **`H`**: Hide / Show bottom control dock
- **`M`**: Mute / Unmute sound effects

---

## Local Development & Verification

```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Run TypeScript type check
npm run lint

# Run Perft & rules verification suite
npx tsx src/engine/perft.ts

# Build production bundle
npm run build
```

---

## Deploying to GitHub Pages

1. Push the repository to GitHub.
2. If deploying to a project subpath (`https://<username>.github.io/<repo>/`), set `base: '/<repo>/'` in `vite.config.ts` and update `start_url` / `scope` in the `VitePWA` manifest to match.
3. Build with `npm run build` and publish `dist/` via GitHub Actions or `gh-pages`.

---

© PeakCraft Innovations Limited. All rights reserved.
