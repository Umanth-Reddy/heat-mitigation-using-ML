# Changes Made

## Rollback / Restoration

- Removed the floating sector-chip UI from `app/page.tsx`.
- Removed the sector constants and active-sector state from `app/page.tsx`.
- Removed the delayed heatmap reveal timer logic from `app/page.tsx`.
- Removed the `lucide-react` sector-chip imports from `app/page.tsx`.
- Restored `showHeatmapOverlay` to start as `true` so the existing heatmap behavior is active on load.
- Restored parent-owned Deck.gl `viewState` state in `app/page.tsx`.
- Restored `MapView` props to use `viewState` and `onViewStateChange` from `app/page.tsx`.
- Restored `handleSelectCell` to update `viewState` directly.
- Restored `handleBackToCity` to reset active cell, block data, selected object, read-more drawer, and view state directly.
- Restored block data clearing when no cell is active.
- Removed the local camera-state refactor from `components/MapView.tsx`.
- Removed `FlyToInterpolator`, `useEffect`, and `useRef` from `components/MapView.tsx`.
- Restored Deck.gl `onViewStateChange` to call the parent `onViewStateChange` directly.
- Restored the `selectedObject` prop path into `BlockDetailPanel`.

## Heatmap Visual Improvements

- Updated the thermal color ramp in `components/MapView.tsx` to a cleaner premium ramp: emerald, lime, yellow, orange, rose, and deep crimson.
- Reduced heatmap opacity so 3D buildings remain visible above the thermal overlay.
- Adjusted heatmap opacity when a cell is active to avoid hiding block-level 3D details.
- Tuned heatmap radius for smoother city-scale blending and slightly wider selected-block coverage.
- Tuned heatmap intensity for baseline and after-intervention modes.
- Lowered heatmap threshold for a smoother, less patchy visual result.

## 3D Building Visual Improvements

- Updated building colors to use warmer, more material-like thermal tones while preserving data-driven heat intensity.
- Increased building elevation scale from the previous base behavior so extrusions read more clearly.
- Improved building material lighting with lower ambient, higher diffuse, higher shininess, and clearer specular color.
- Changed selected building fill to a softer blue-white highlight instead of pure white.
- Added selected-building outline emphasis while keeping non-selected building outlines darker and cleaner.
- Kept the existing building click, hover, popup, and attribution interactions intact.

## Block Panel Improvement

- Added a small selected-object indicator in `BlockDetailPanel` when a building or tree is currently being inspected.

## Kept From Previous Polish

- Kept the updated app metadata in `app/layout.tsx`.
- Kept the polished dark radial/linear page background in `app/globals.css`.
- Kept `color-scheme: dark` in `app/globals.css`.

## Tooling Changes

- Kept ESLint ignores for generated `public/data/**`, prebuilt `public/maplibre-*.mjs`, and dependency/build folders.
- Kept `@typescript-eslint/no-explicit-any` disabled because the existing demo codebase already uses `any` widely and the rule prevented useful validation.

## Functionality Preserved

- Header heatmap toggle remains available.
- Baseline vs after-interventions toggle remains available.
- City overview sidebar remains available.
- Top hotspot cell selection remains available.
- Block detail panel remains available.
- Building and tree click selection remains available.
- Object popup remains available.
- Read-more attribution drawer remains available.
- Interventions drawer remains available.
- Judge demo guide remains available.
- Static/demo data fetching flow remains unchanged.

## Validation

- `npm run lint` was run after the rollback and visual changes.
- `npm run build` should be run after this file is added to confirm the final deploy state.
