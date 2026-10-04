# UshnaRaksha: prompts for Claude Code

## Before you start (once)

1. In your project folder, create the new branch:
   ```
   git checkout showcase-heat && git pull && git checkout -b ushnaraksha
   ```
2. Copy the two files I sent you into the repo:
   - `USHNARAKSHA_SPEC.md` → `docs/USHNARAKSHA_SPEC.md`
   - `generate_risk_data.py` → `scripts/generate_risk_data.py`
3. Run the prompts **one at a time, in order**, in a fresh Claude Code session each time (or `/clear` between
   them). After each one, run `npm run dev`, open http://localhost:3000 at full screen and **send me
   screenshots** of the screens listed under "Send me". I'll review them and give you fix-up prompts if needed.

---

## Prompt 1: Foundation (data, types, store, app shell)

```
Read docs/USHNARAKSHA_SPEC.md completely, then AGENTS.md. We are building the UshnaRaksha frontend prototype in phases. Do PHASE 1 ONLY: the foundation. Do not build the map, panels, alerts or model charts yet.

1. Run `python scripts/generate_risk_data.py` (use python3 if python isn't found). Confirm it wrote 6 files to public/data/risk/ and that the printed story table matches spec section 1. Do NOT run scripts/generate_data.py.
2. Create lib/types.ts with exactly the types in spec section 2.
3. Create lib/data.ts with a cached useRiskData() hook that loads all six public/data/risk files once (spec section 2), with loading and error states.
4. `npm install zustand`, then create lib/store.ts as described in spec section 4, including goToAlert(wardId, dayIndex) and the alertOverrides map.
5. Design tokens and fonts: add the @theme tokens from spec section 3 to app/globals.css, wire Geist and Geist Mono through @theme inline, remove the system-font override on body, and add small CSS keyframes for fade/slide-in (no plugin). Keep the existing .panel-black / .btn-black classes working.
6. Update the app/layout.tsx title and description (spec section 4).
7. Move the whole current experience from app/page.tsx into components/planning/PlanningView.tsx with UNCHANGED behaviour. Move the old Header's heatmap controls into a slim toolbar inside PlanningView. The old Header.tsx can then be deleted or reduced.
8. Build the new app shell: components/shell/AppHeader.tsx (brand mark, 4 tabs with an alert badge, disabled Phase-2 cities in the city switcher, issued time, "Simulated data" pill) and app/page.tsx rendering only the active tab. For now, Early Warning, Alerts and Model Insights are placeholder panels showing their title plus a few numbers from the loaded data, so we can prove data loading works. Urban Planning renders PlanningView.
9. Add the keyboard shortcuts from spec section 4 (tabs 1–4, arrows for the day, Space play/pause, Esc). Show the current day somewhere in the Early Warning placeholder so the arrows can be checked.
10. Add a branded full-screen loading state and an error card for the risk data.

Then run `npx tsc --noEmit`, `npm run lint` and `npm run build`, and fix everything until all three pass. Commit to the `ushnaraksha` branch: "Phase 1: UshnaRaksha shell, types, data, store". Do not push.
Finish with a short report: files created or changed, any deviation from the spec and why, and anything left stubbed.
```

**Send me:** the header and the Urban Planning tab (to check nothing broke there), plus the Early Warning placeholder.

---

## Prompt 2: Early Warning map, timeline, layers and legend

```
Read docs/USHNARAKSHA_SPEC.md sections 3 and 5 (and section 2 for the data). Phase 1 is done: lib/types.ts, lib/data.ts, lib/store.ts and the app shell exist. Do PHASE 2 ONLY: the Early Warning MAP and its on-map controls. The left "City outlook" panel and the right "Ward detail" panel come in phase 3, so leave room for them (left 360px, right 420px).

Build components/warning/RiskMap.tsx (reuse the DeckGL + react-map-gl + setWorkerUrl pattern from components/MapView.tsx, with the CARTO Dark Matter basemap), plus:
- the zones layer for all 4 layer modes, 2D/3D extrusion, colour and elevation transitions, and dimming when a ward is selected
- ward outlines from public/data/risk/ward_outlines.geojson (selected ward in amber) and ward labels with TextLayer
- the hover tooltip and click-to-select-ward with fit-to-bbox
- components/warning/ForecastTimeline.tsx (6 day cards plus play/pause, 1.6s per day, stops at day 5)
- components/warning/LayerControls.tsx (segmented layer switch plus the 2D/3D toggle) and components/warning/Legend.tsx (changes with the layer)
Everything reads and writes the zustand store. Do not use a requestAnimationFrame loop that rebuilds layers. Memoise the layers properly with useMemo and updateTriggers.

Check: on day 0 the map is mostly green with some yellow. On day 3 there are clearly 3 red wards (Barakhamba Road, Janpath–Tolstoy Marg, Gole Market). Pressing Space plays through the days smoothly.
Run `npx tsc --noEmit`, `npm run lint` and `npm run build`, and fix until they pass. Commit "Phase 2: risk map, forecast timeline, layers, legend". Do not push. Finish with a short report.
```

**Send me:** the map on day 0 and on day 3, 3D mode, the Vulnerability layer, and a hover tooltip.

---

## Prompt 3: City outlook panel and Ward detail panel

```
Read docs/USHNARAKSHA_SPEC.md sections 3 and 5. Phases 1–2 are done. Do PHASE 3 ONLY.

1. components/warning/CityOutlook.tsx (left, 360px): the data-generated headline sentence, the 2×2 KPI tiles, the 6-day ComposedChart (admissions bars coloured by worst ward tier with error bars, and a WBGT-max line on the right axis, highlighting the selected day), the ranked ward list (clicking selects a ward) and the Resources card with the grid-load bar.
2. components/warning/WardDetail.tsx (right, 420px, slides in): the header with Hindi name, tier badge and radial risk gauge; the WBGT forecast chart with tier ReferenceArea bands, dashed UTCI line and selected-day marker; the health-impact chart (admissions band and mean line, plus deaths); the SHAP "why flagged" bars; the 3 "who's at risk" tiles; the actions checklist with resource numbers; and the "Review alert →" button calling goToAlert (disabled with "No alert needed (below threshold)" if no alert exists for that ward and day).
3. Create components/charts/theme.ts (shared Recharts colours, axis, grid and tooltip styling from spec section 7) and use it in both panels.
All numbers come from the data. Nothing is hard-coded except labels. Numbers use font-mono tabular-nums. Minimum text size is 12px.

Check: on day 3, click Barakhamba Road and confirm the panel shows a RED badge, a risk score around 94 and "Peak WBGT" as the top SHAP bar.
Run `npx tsc --noEmit`, `npm run lint` and `npm run build`, and fix until they pass. Commit "Phase 3: city outlook and ward detail panels". Do not push. Finish with a short report.
```

**Send me:** the full Early Warning screen on day 3 with Barakhamba Road open, and the ward panel scrolled to the bottom.

---

## Prompt 4: Alerts Centre

```
Read docs/USHNARAKSHA_SPEC.md sections 3, 4 and 6. Phases 1–3 are done. Do PHASE 4 ONLY: the Alerts tab.

Build components/alerts/AlertsCentre.tsx with three columns:
- AlertQueue: grouped by date, with tier and status chips (respecting store.alertOverrides), confidence, and counts at the top.
- AlertPreview: SMS / WhatsApp / CAP XML channel tabs and an EN/हिंदी toggle. Build a PhoneMockup component. The WhatsApp style renders *bold* and keeps emoji and line breaks. The CAP view is a syntax-coloured XML code block with a Copy button. Show the trigger, channels and reach below the preview.
- ApprovalPanel: the human-in-the-loop review card; Approve & dispatch with staggered per-channel progress counters (~2.5s) ending in "Sent ✓" plus a timestamp; Edit message (local-only textarea); Reject with a reason. Below it, the History table (seed data plus anything sent this session) and the Settings card.
All state changes go through the zustand store, so the header badge count updates. Make sure goToAlert("W01", 3) from the ward panel lands here with UR-DEL-20260521-W01 selected. Expose an `approveSelected()` store action, because the demo guide will call it in phase 6.
Devanagari text must render properly. Check that the Geist font fallback covers Hindi; if it doesn't, add Noto Sans Devanagari via next/font/google for the Hindi text.

Run `npx tsc --noEmit`, `npm run lint` and `npm run build`, and fix until they pass. Commit "Phase 4: alerts centre with approval flow". Do not push. Finish with a short report.
```

**Send me:** the WhatsApp preview in Hindi, the CAP XML view, the moment during dispatch, and the screen after "Sent ✓".

---

## Prompt 5: Model Insights

```
Read docs/USHNARAKSHA_SPEC.md sections 3 and 7. Phases 1–4 are done. Do PHASE 5 ONLY: the Model Insights tab, reading public/data/risk/models.json through useRiskData().

Build components/models/ModelInsights.tsx: the muted "illustrative results on simulated data" line, the 4 KPI tiles, the pipeline diagram, DLNM exposure–response (band, RR=1 reference, MMT marker), lag–response bars with error bars, the TFT backtest (actual vs predicted with band), skill by lead day (MAE bars and R² line), the comparison against baselines (UshnaRaksha in amber, others grey), global SHAP bars, and the heat-mortality history scatter plus annual excess-death bars. Use components/charts/theme.ts for every chart. The page may scroll inside the tab, but each row must look good at 1920×1080. Charts should animate in once, when first shown.

Run `npx tsc --noEmit`, `npm run lint` and `npm run build`, and fix until they pass. Commit "Phase 5: model insights". Do not push. Finish with a short report.
```

**Send me:** the full Model Insights page (2–3 screenshots while scrolling).

---

## Prompt 6: Planning fixes, demo guide, polish, README

```
Read docs/USHNARAKSHA_SPEC.md sections 8, 9 and 10. Phases 1–5 are done. Do PHASE 6.

1. Urban Planning fixes, exactly as listed in spec section 8 (legends, data-driven recommended intervention, ObjectPopup drivers, ₹1 Cr filter, the 256-cells and LST labels, BlockDetailPanel skeleton, removing the per-frame pulse, the heading strip).
2. Replace JudgeDemoGuide with components/shell/DemoGuide.tsx: the 8 steps in spec section 9, toggled with G and opened by ?guide=1. Each Run button drives the store (step 6 calls approveSelected()). Test every step in order AND in random order: no step may depend on data that hasn't loaded yet. Wait or guard where needed.
3. Polish pass over all 4 tabs at 1920×1080: consistent card style, no text under 12px, no overlapping panels, smooth panel enter animations, and no console errors or warnings on first load of each tab.
4. Deployment hygiene: remove `outputFileTracingRoot` from next.config.ts if the build still passes without it. Delete the unused create-next-app SVGs in public/. Rewrite README.md (what UshnaRaksha is, the 4 tabs, how to run, how to regenerate the risk data, and that all data is simulated for the prototype).
Run `npx tsc --noEmit`, `npm run lint` and `npm run build`, and fix until they pass. Commit "Phase 6: planning fixes, demo guide, polish, README". Do not push. Finish with a short report, including a list of anything still rough.
```

**Send me:** the Urban Planning tab with a building selected, and the demo guide open.

---

## Optional, Prompt 7: deploy the "Prototype Link"

```
Push the ushnaraksha branch to origin. Then help me deploy it on Vercel: check the build works from a clean clone (rm -rf node_modules .next && npm ci && npm run build), and tell me the exact Vercel settings to use (framework preset, build command `npm run build`, root directory). Confirm the map tiles, data files and the maplibre worker all load on the deployed URL.
```
