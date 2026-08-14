<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

**Project Overview**

 - **Purpose:** Interactive Next.js web app for exploring building- and block-level heat data, visualizing interventions, and supporting judge/demo workflows.
 - **Stack:** Next.js (app router), React, TypeScript, MapLibre, Deck.gl for geospatial visualizations, Tailwind/PostCSS for styling.

**How To Run**
 - **Dev:** `npm run dev` (starts Next.js dev server)
 - **Build:** `npm run build` then `npm run start`
 - See runtime configuration in [package.json](package.json).

**Implemented Pages & Layout**
 - **App shell:** [app/layout.tsx](app/layout.tsx) — global layout, meta, and root providers.
 - **Home / Map view:** [app/page.tsx](app/page.tsx) — main entry, renders the map and surrounding UI.
 - **Global styles:** [app/globals.css](app/globals.css).

**Main Components**
 - **Header:** [components/Header.tsx](components/Header.tsx) — top navigation and global controls.
 - **MapView:** [components/MapView.tsx](components/MapView.tsx) — MapLibre integration, dataset layers, hover/click handling, and viewport state.
 - **ObjectPopup:** [components/ObjectPopup.tsx](components/ObjectPopup.tsx) — contextual popup for buildings/objects when clicked.
 - **SidebarOverview:** [components/SidebarOverview.tsx](components/SidebarOverview.tsx) — overview, filters, and global stats.
 - **BlockDetailPanel:** [components/BlockDetailPanel.tsx](components/BlockDetailPanel.tsx) — detailed view for a selected grid cell (uses `public/data/blocks/CELL_*.json`).
 - **InterventionsDrawer:** [components/InterventionsDrawer.tsx](components/InterventionsDrawer.tsx) — lists recommended interventions and toggles to preview them on-map.
 - **ReadMoreDrawer:** [components/ReadMoreDrawer.tsx](components/ReadMoreDrawer.tsx) — supplementary content and references.
 - **JudgeDemoGuide:** [components/JudgeDemoGuide.tsx](components/JudgeDemoGuide.tsx) — guided walkthrough and judge-facing notes for demos.

**Data & Static Assets**
 - **Primary datasets:** stored under `public/data/`:
	 - `all_buildings.json` — building-level geo/features and attributes.
	 - `grid.geojson` — domain grid used to segment the area.
	 - `summary.json` — precomputed summary statistics.
	 - `interventions.json` — catalog of possible interventions and metadata.
	 - `blocks/CELL_*.json` — per-grid-cell precomputed data tiles (many files).
 - **Map runtime files:** `public/maplibre-gl-shared.mjs` and `public/maplibre-worker.mjs` provide a split worker/shared build for MapLibre used by [components/MapView.tsx](components/MapView.tsx).
 - **Data generator:** [scripts/generate_data.py](scripts/generate_data.py) — script used to synthesize or preprocess datasets in `public/data/`.

**Visualization & Interaction**
 - **Map layers:** A combination of MapLibre vector/raster layers and Deck.gl layers provide choropleths, building symbols, and aggregated overlays.
 - **Selection model:** Click to select blocks or buildings, opening `BlockDetailPanel` or `ObjectPopup` respectively; hover shows brief tooltips.
 - **Intervention preview:** Toggle interventions in `InterventionsDrawer` to visualize proposed changes on the map and recompute lightweight visuals locally.
 - **Performance:** Data is sharded into block tiles (`public/data/blocks`) to keep initial load small and lazy-load details on demand.

**Tooling & Dependencies**
 - Key dependencies are declared in [package.json](package.json): `next`, `react`, `maplibre-gl`, `react-map-gl`, `deck.gl`, `recharts`, and styling/tooling (`tailwindcss`, `postcss`).
 - Scripts: `dev`, `build`, `start`, and `lint` are available; use `npm run dev` for local development.

**Developer Notes & Conventions**
 - Project uses the Next.js `app` directory and TypeScript types via `tsconfig.json`.
 - Keep large per-block JSON files under `public/data/blocks/` and avoid committing generative intermediate files — regenerate via [scripts/generate_data.py](scripts/generate_data.py) when needed.
 - Map worker and shared module files in `public/` are prebuilt and referenced directly by the app to avoid bundling complexities with MapLibre.

**What To Look For / Future Work**
 - Server-side endpoints for on-demand aggregations (not implemented) could replace some client-side precomputation.
 - Add tests and CI steps for data generation and build validation.

**References & Quick Links**
 - App entry: [app/page.tsx](app/page.tsx)
 - Main map component: [components/MapView.tsx](components/MapView.tsx)
 - Data generator: [scripts/generate_data.py](scripts/generate_data.py)
 - Package manifest: [package.json](package.json)



## Plan: UI Polish & Vercel Readiness

TL;DR - Prepare the app for showcase by improving typography, theme, responsive layouts, component polish, visual assets wiring, animations, and deployment hardening so it can be confidently deployed to Vercel.

**Steps**
1. Audit & baseline (quick) — confirm visual gaps, missing assets, and runtime risks. *depends on none*
2. Typography & theme tokens — centralize colors, spacing, and fonts in `app/globals.css` (and a small `styles/theme.css` if needed). *parallel with step 3*
3. Responsive layout & spacing — refactor `app/page.tsx`, `components/Header.tsx`, and drawer components to use responsive CSS utilities and fluid widths.
4. Component polish — refine `components/SidebarOverview.tsx`, `BlockDetailPanel.tsx`, `ObjectPopup.tsx`, and `InterventionsDrawer.tsx` with consistent cards, shadows, and microcopy. Add focused mobile behavior.
5. Visual assets & legend — wire existing raster heatmaps (`public/data/heatmap_*.png`), add a color scale legend, and ensure `MapView` toggles between layers.
6. Animations & micro-interactions — enable Tailwind plugins or add CSS transitions for panel entrance, hover states, and map popups.
7. Data-loading UX & fallbacks — implement skeletons/placeholders when lazy-loading `public/data/blocks/CELL_*.json` and show friendly messages if external tiles fail.
8. Build & Vercel prep — ensure `next.config.ts` and `public/` assets are deployment-friendly; add an optional `vercel.json` and small `README` or `DEV_NOTES` with deploy steps.
9. Verification & QA — run `npm run dev`, `npm run build`, manual visual checks, Lighthouse snapshots, and a short demo script.
10. Handoff — update `AGENTS.md` (done), add `CONTRIBUTING.md` or `DEV_NOTES`, and capture any remaining TODOs.

**Relevant files**
- [app/layout.tsx](app/layout.tsx) — root metadata and font imports
- [app/page.tsx](app/page.tsx) — main orchestrator and layout
- [app/globals.css](app/globals.css) — global theme and utilities
- [components/Header.tsx](components/Header.tsx)
- [components/MapView.tsx](components/MapView.tsx)
- [components/SidebarOverview.tsx](components/SidebarOverview.tsx)
- [components/BlockDetailPanel.tsx](components/BlockDetailPanel.tsx)
- [components/InterventionsDrawer.tsx](components/InterventionsDrawer.tsx)
- [components/ObjectPopup.tsx](components/ObjectPopup.tsx)
- [public/data/](public/data/) — datasets and raster overlays
- [public/maplibre-worker.mjs](public/maplibre-worker.mjs) and [public/maplibre-gl-shared.mjs](public/maplibre-gl-shared.mjs)
- [next.config.ts](next.config.ts)
- [package.json](package.json)
- [scripts/generate_data.py](scripts/generate_data.py)

**Verification**
1. Local dev: run `npm run dev` and walkthrough the main flows (map, selection, drawers).
2. Build test: run `npm run build` then `npm run start` to verify production behavior.
3. Visual QA: take screenshots of key states (desktop, tablet, mobile) and run Lighthouse or quick accessibility checks.
4. Deployment smoke: deploy to a Vercel preview and verify assets (map tiles, heatmap pngs) load and worker files are served.

**Decisions / Assumptions**
- The app is a client-side showcase; server endpoints are out of scope for now.
- Use Tailwind utilities and small CSS modules rather than adding a full component library.
- Keep data files in `public/data/`; do not migrate to a backend for the demo.

**Further Considerations**
1. Add `vercel.json` only if rewrites/headers are required; otherwise rely on standard Vercel defaults.
2. Optionally create a `DEV_NOTES.md` with exact `npm` commands and known external tile endpoints.
3. If you want, I can now create the first PR that implements step 2 (typography & theme tokens) and step 5 (wire heatmap pngs) as small, reviewable commits.

