# UshnaRaksha — Frontend Prototype Spec

SIH 2026 · Problem Statement SIH26083 · Team "Good Team"
Purpose: a **frontend-only prototype for the YouTube demo video** (desktop, 1920×1080, dark theme).
All data is static JSON in `public/data/`. No backend. Every number is simulated.

> Implementation agents: read this whole file before starting any phase. Follow the phase you were asked
> to do and do not start later phases. This repo uses Next.js 16 — read `AGENTS.md` and the relevant
> guide in `node_modules/next/dist/docs/` before touching Next-specific APIs. `dev`/`build` must keep `--webpack`.

---

## 1. The story the prototype must tell (in ≈2–3 minutes of video)

1. **Today looks manageable.** Early Warning tab, day = Today: the pilot area (New Delhi, Connaught Place
   central zone, 6 wards, 256 × 100 m zones) is mostly **green**, with one ward in yellow.
2. **But a heatwave is coming.** Press ▶ on the forecast timeline: the map recolours day by day and peaks on
   **Thu 21 May (day 3)** with **3 red wards**. That shows the **3–5 day lead time**.
3. **Why this ward?** Click **Barakhamba Road (W01)** on day 3 to see the WBGT/UTCI forecast, predicted
   hospital admissions and deaths with uncertainty, a **SHAP "why flagged"** chart, who's at risk, and
   the actions to trigger.
4. **Who is vulnerable?** Switch the map layer to **Vulnerability** to see elderly people, outdoor workers and
   informal settlements.
5. **Act early, with a human in the loop.** Choose "Review alert" to open the **Alerts Centre** with the
   day-3 W01 alert selected. Show the SMS, WhatsApp (English/Hindi) and **CAP XML** versions. Choose
   **Approve & dispatch** to show delivery counters running.
6. **Is the model credible?** In **Model Insights**, show the DLNM exposure–response curve, the TFT
   backtest, forecast skill by lead day, a comparison against a temperature-only baseline, and SHAP
   importance.
7. **Long-term planning.** In **Urban Planning** (the existing 3D heat-attribution tool), show cool roofs and
   green cover interventions.

The data generator (`scripts/generate_risk_data.py`) is already tuned to produce exactly this story:

| Day | Date | Wards green/yellow/orange/red | City admissions (mean) |
|---|---|---|---|
| 0 | Mon 18 May (Today) | 5/1/0/0 | 12.8 |
| 1 | Tue 19 May | 1/5/0/0 | 26.0 |
| 2 | Wed 20 May | 1/0/5/0 | 47.1 |
| 3 | Thu 21 May | 0/1/2/3 | 74.2 |
| 4 | Fri 22 May | 1/0/4/1 | 59.6 |
| 5 | Sat 23 May | 3/3/0/0 | 17.7 |

---

## 2. Data (generated — do not hand-edit)

Run `python scripts/generate_risk_data.py` from the project root. It reads only `public/data/grid.geojson`,
uses only the standard library, needs no network and writes to `public/data/risk/`. **Never re-run
`scripts/generate_data.py`**: it downloads from OSM and would change the Planning data.

Types to put in `lib/types.ts` (they match the generated JSON exactly):

```ts
export type TierId = 0 | 1 | 2 | 3; // 0 green, 1 yellow, 2 orange, 3 red (IMD colour code)

export interface Tier { id: TierId; key: "green"|"yellow"|"orange"|"red"; label: string; imd: string;
  color: string; wbgt_min: number|null; wbgt_max: number|null; meaning: string; }

export interface CityDay { index: number; date: string; weekday: string; label: string; short: string;
  ta_max: number; rh: number; tmin: number; wind: number; wbgt_max: number; utci_max: number;
  wards_by_tier: number[]; cells_by_tier: number[]; people_orange_plus: number;
  admissions: number; admissions_lo: number; admissions_hi: number;
  deaths: number; deaths_lo: number; deaths_hi: number;
  beds_needed: number; ambulances: number; cooling_centres_active: number; grid_peak_mw: number; }

export interface RiskMeta { product: string; tagline: string; simulated: boolean; simulated_note: string;
  city: { id: string; name: string; pilot_area: string; population: number; n_wards: number; n_zones: number; zone_size_m: number };
  cities: { id: string; name: string; status: "pilot"|"phase2" }[];
  issued_at: string; next_update: string; days: CityDay[]; tiers: Tier[];
  utci_categories: { min: number; max: number; label: string }[];
  threshold: { method: string; wbgt_p95: number; min_consecutive_days: number };
  actions_by_tier: Record<string, string[]>; grid_capacity_mw: number; sources: string[]; }

export interface CellDay { ta: number; rh: number; tmin: number; wbgt: number; utci: number; tier: TierId; }
export interface RiskCell { cell_id: string; ward_id: string; center: [number, number]; population: number;
  elderly_pct: number; outdoor_worker_pct: number; slum_pct: number; canopy_pct: number;
  vulnerability: number; days: CellDay[]; }
export type RiskCells = Record<string, RiskCell>; // keyed by cell_id (same ids as grid.geojson)

export interface Range { mean: number; lo: number; hi: number; }
export interface WardDay { wbgt_mean: number; wbgt_p90: number; wbgt: number; utci_max: number; utci_category: string;
  tmin: number; tier: TierId; risk_score: number; cells_by_tier: number[]; people_orange_plus: number;
  admissions: Range; deaths: Range; beds_needed: number; ambulances: number; }
export interface ShapItem { feature: string; value: string; contribution: number; }
export interface Ward { ward_id: string; name: string; short_name: string; name_hi: string; cell_ids: string[];
  n_cells: number; population: number; centroid: [number, number]; bbox: [number, number, number, number];
  vulnerability: number;
  groups: { elderly_pct: number; outdoor_worker_pct: number; slum_pct: number; canopy_pct: number };
  groups_people: { elderly: number; outdoor_workers: number; slum_residents: number };
  cooling_centre: string; peak_day: number; why_flagged: ShapItem[]; days: WardDay[]; }

export type Channel = "sms" | "whatsapp" | "cap" | "chw_relay";
export interface PendingAlert { id: string; ward_id: string; ward_name: string; day_index: number; date: string;
  tier: TierId; wbgt: number; utci: number; status: "pending_approval"|"draft"|"approved"|"sent"|"rejected";
  confidence: number; channels: Channel[]; reach: { sms: number; whatsapp: number; chw_relay: number };
  triggered_by: string;
  messages: { sms_en: string; sms_hi: string; whatsapp_en: string; whatsapp_hi: string }; cap_xml: string; }
export interface SentAlert { id: string; ward_id: string; ward_name: string; date: string; tier: TierId;
  approved_by: string; sent_at: string; delivered: number; read_rate: number; channels: Channel[]; }
export interface AlertsData { generated_at: string; pending: PendingAlert[]; history: SentAlert[];
  settings: { threshold_method: string; wbgt_p95: number; min_consecutive_days: number; require_human_approval: boolean;
    languages: string[]; quiet_hours: string; channels: Record<Channel, boolean> }; }

export interface ModelsData { simulated: boolean;
  dlnm: { name: string; purpose: string; mmt: number;
    exposure_response: { wbgt: number; rr: number; lo: number; hi: number }[];
    lag_response: { lag: number; rr: number; lo: number; hi: number }[];
    summary: { rr_at_p99: number; attributable_fraction_pct: number; calibration_period: string } };
  vulnerability_model: { name: string; purpose: string;
    metrics: { auc: number; precision: number; recall: number; f1: number };
    shap_global: { feature: string; importance: number }[] };
  forecast_model: { name: string; purpose: string; backtest_label: string;
    backtest: { date: string; actual: number; predicted: number; lo: number; hi: number; wbgt: number }[];
    skill_by_lead: { lead_days: number; mae: number; mape: number; r2: number }[]; coverage_80pct_interval: number };
  baseline_comparison: { system: string; hit_rate: number; false_alarm_ratio: number; lead_days: number; ward_level: boolean }[];
  historical: { date: string; year: number; wbgt: number; deaths: number }[];
  annual: { year: number; heat_days: number; excess_deaths: number }[];
  pipeline: { stage: string; items: string[] }[]; }
```

`public/data/risk/ward_outlines.geojson` is a FeatureCollection of `MultiLineString` ward boundaries with
properties `{ ward_id, name, short_name }`. Draw it with a deck.gl `GeoJsonLayer` (stroked lines).

Load all six risk files once through a small cached loader in `lib/data.ts` (`useRiskData()` returns
`{ meta, cells, wards, outlines, alerts, models, loading, error }`). Show a branded loading screen while
they load, and a visible error card if one fails.

---

## 3. Visual direction

- **Mood:** a calm, dark "heat operations room". Near-black surfaces; the **only** strong colours are the
  four IMD tier colours and one brand accent. Everything else is neutral zinc.
- **Tokens:** put them in `app/globals.css` with a Tailwind v4 `@theme` block:
  - `--color-bg #07090c`, `--color-panel rgba(12,14,18,0.92)`, `--color-border #23262d`,
    `--color-muted #8a8f98`, `--color-text #ededef`
  - Brand accent `--color-brand #ff7a1a` (heat amber)
  - Tiers: green `#22c55e`, yellow `#facc15`, orange `#f97316`, red `#dc2626`. Use them for the map, chips,
    legends and chart bands. **Never use these colours for decoration.**
- **Type:** wire up the already-loaded Geist (`--font-geist-sans`) and Geist Mono via `@theme inline`
  (`--font-sans`, `--font-mono`). Remove the system-font override on `body`. Numbers use the
  `font-mono tabular-nums` classes. Minimum text size is **12px**; KPI numbers are 28–36px.
- **Panels:** 12px radius, 1px border, backdrop blur, generous padding (16–20px). Use one card style everywhere.
- **Motion:** 150–250ms ease-out fades and slides on panels (write the keyframes in CSS yourself, with no
  plugin). Map colours transition over ~600ms when the day changes (deck.gl `transitions`). Remove the
  existing `animate-in` classes or define them.
- **Icons:** `lucide-react` (already installed). Brand mark: the lucide `Sun` icon inside a rounded
  square with an amber gradient, next to the word **UshnaRaksha** (semibold), and a Devanagari subtitle
  `उष्णरक्षा` in muted text.
- **Simulated-data label:** a small, unobtrusive pill reading "Simulated data" in the header, plus one line of
  muted text at the top of Model Insights. Keep it subtle.

---

## 4. App shell

- `app/layout.tsx`: title "UshnaRaksha — Heat-Health Early Warning", with a matching description.
- **State:** add `zustand` (the only new dependency allowed). `lib/store.ts` holds:
  `activeTab: "warning"|"alerts"|"models"|"planning"`, `dayIndex: number` (0–5), `layer: "wbgt"|"utci"|"vulnerability"|"exposure"`,
  `is3D: boolean`, `selectedWardId: string|null`, `selectedAlertId: string|null`, `playing: boolean`,
  `alertOverrides: Record<string, { status: PendingAlert["status"]; approvedBy?: string; sentAt?: string }>`,
  `alertLang: "en"|"hi"`, `alertChannel: "sms"|"whatsapp"|"cap"`, and the actions to change them. Also
  `goToAlert(wardId, dayIndex)`, which picks the matching alert, switches to the Alerts tab and selects it.
- **Header (56px):**
  - Left: the brand mark and wordmark, plus the subtitle "Heat-Health Early Warning".
  - Centre: the 4 tabs: **Early Warning** · **Alerts** (with an amber badge counting alerts still awaiting
    approval) · **Model Insights** · **Urban Planning**.
  - Right: a city switcher (New Delhi selected; Ahmedabad and Chennai shown disabled, labelled
    "Phase 2"), "Issued 18 May, 06:00 IST" in muted mono text, and the "Simulated data" pill.
- **Tabs** are client-side state, not routes. Render only the active tab. Only one map is mounted at a time.
- **Keyboard shortcuts** (for recording): `1`–`4` switch tabs, `←`/`→` change the forecast day, `Space` plays
  or pauses the forecast, `G` toggles the demo guide, `Esc` closes the ward panel. Ignore keys while focus is
  in an input.

---

## 5. Tab 1 — Early Warning (default)

**Map** (`components/warning/RiskMap.tsx`). Reuse the MapView skeleton: DeckGL + react-map-gl `<Map>`, a
controlled view state, and `setWorkerUrl("/maplibre-worker.mjs")`.
- Basemap: CARTO Dark Matter raster tiles `https://{a,b,c,d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png`
  (attribution "© OpenStreetMap contributors © CARTO"). The view centres on the grid at zoom ≈ 14.6, pitch 0
  in 2D mode and 45 in 3D mode, with a small bearing.
- **Zones layer:** a `GeoJsonLayer` over `grid.geojson`, filled from `cells[cell_id]` and the current layer:
  - `wbgt`: the tier colour of `days[dayIndex].tier` (alpha ≈ 170).
  - `utci`: a sequential amber→red→deep-red ramp across 36–50 °C.
  - `vulnerability`: a sequential violet ramp (`#2e1065`→`#a78bfa`→`#f5f3ff`) across 0.2–0.9.
  - `exposure`: tier colour, but alpha scaled by population (shows where many people meet high risk).
  - 3D mode extrudes zones by WBGT (`(wbgt-26)*60` metres) with the same colours.
  - `updateTriggers` on `dayIndex`/`layer`/`selectedWardId`, plus `transitions: { getFillColor: 600, getElevation: 600 }`.
  - When a ward is selected, other wards drop to alpha ≈ 60.
- **Ward outlines:** `ward_outlines.geojson` drawn with white lines at 1.5px, or 3px in amber for the selected ward.
- **Ward labels:** a `TextLayer` at each ward centroid showing `short_name`, white with a dark outline, 13px.
- **Hover tooltip:** zone id, ward name, WBGT (with the tier label and colour dot), UTCI with its category,
  air temperature and humidity, population and vulnerability.
- **Click** selects the ward (`selectedWardId`) and smoothly fits the view to the ward bbox.
- **Do not** keep the old `requestAnimationFrame` pulse that rebuilt layers every frame.

**Left panel "City outlook"** (360px, scrolls):
1. A headline sentence for the selected day, generated from data, e.g. "Thu 21 May · 3 wards at RED. Heat
   stress peaks in Barakhamba Road", or for Today: "Today · Low risk. Heatwave building, peak expected Thu 21 May".
2. KPI tiles (2×2): wards at orange or red, people in orange+ zones, predicted heat admissions (mean and
   range), predicted excess deaths (mean and range).
3. A 6-day mini chart (Recharts `ComposedChart`): admissions as bars coloured by that day's worst ward
   tier, with error bars (lo–hi), and WBGT max as a line on the right axis. The selected day is highlighted.
4. A ranked list of wards (by `risk_score` for the selected day): tier dot, short name, WBGT, a
   risk-score bar. Clicking a row selects the ward.
5. "Resources needed": beds, ambulances, cooling centres active, and the grid peak MW against
   `grid_capacity_mw` as a progress bar that turns red above 95%.

**Bottom-centre forecast timeline** (floats over the map):
- A ▶/❚❚ button, then 6 day cards (Today, Tue 19, …). Each card shows the date, a colour bar of the
  worst ward tier that day, and the max WBGT. The selected card is raised with an amber border.
- Play advances one day every 1.6s and stops on the last day.
- Text under it: "Forecast issued 18 May 06:00 · 3–5 day lead time".

**Top-right controls:** a segmented layer switch (Heat stress (WBGT) · UTCI · Vulnerability · Exposure)
and a 2D/3D toggle. **Bottom-right legend** that changes with the layer. For WBGT it shows the 4 IMD tiers
with their WBGT ranges and labels, plus "Thresholds: local 95th percentile".

**Right panel "Ward detail"** (420px, slides in when a ward is selected; `Esc` or ✕ closes it):
1. Header: ward name, Hindi name, a tier badge for the selected day, and a risk score (0–100) as a small radial gauge.
2. **Heat-stress forecast:** a 6-day line chart of WBGT, with `ReferenceArea` bands in the four tier
   colours at low opacity, a dashed UTCI line on the second axis, and a vertical marker on the selected day.
3. **Health impact:** admissions (Area band lo–hi plus a mean line) and deaths (small bars), labelled
   "TFT forecast · 80% interval".
4. **Why is this ward flagged?** Horizontal SHAP bars from `why_flagged`: red for positive, green for
   negative, with the feature value text beside each. Caption: "SHAP attribution · peak day".
5. **Who's at risk:** three tiles (elderly, outdoor workers, informal settlements), each with a count and a %.
6. **Actions for this day:** a checklist from `actions_by_tier[tier]`, plus beds needed, ambulances and the
   cooling-centre name.
7. A primary button **"Review alert →"** that calls `goToAlert(wardId, dayIndex)`. If no alert exists for that
   ward and day, the button is disabled and says "No alert needed (below threshold)".

---

## 6. Tab 2 — Alerts Centre

Three columns at full height:

**Left: queue (320px).** Pending alerts grouped by date ("Wed 20 May", "Thu 21 May", …). Each item shows
a tier chip, the ward short name, WBGT, a status chip (Awaiting approval / Draft / Sent / Rejected,
taking `alertOverrides` into account) and the model confidence %. Clicking selects the alert. Above the
list: counts for Awaiting, Sent today and Rejected.

**Centre: preview.**
- Channel tabs SMS · WhatsApp · CAP XML, and a language toggle EN / हिंदी (hidden for CAP).
- SMS and WhatsApp show a **phone mockup** (≈320×640, dark bezel, status bar "9:41"). The SMS bubble is
  grey. WhatsApp uses its chat look: green-tinted header "UshnaRaksha Alerts ✓", bubble on a dark wallpaper,
  `*bold*` rendered as bold, emoji kept and line breaks kept.
- CAP XML shows a mono code block with simple syntax colouring (tags muted, values bright) and a Copy
  button. Caption: "CAP 1.2 · compatible with NDMA SACHET".
- Below the preview: what triggered the alert (`triggered_by`), the channels, and reach per channel.

**Right: approval (340px).**
- "Human-in-the-loop review" card: model confidence bar, triggered rule, the ward's admissions forecast for
  that day, and a reviewer field prefilled with "R. Sharma — Heat Cell Nodal Officer".
- Buttons: **Approve & dispatch** (primary amber), **Edit message** (opens the preview text in an editable
  textarea held in local state only), **Reject** (asks for a one-line reason).
- On approve: the status becomes "Dispatching…" and each channel row shows a progress bar counting up to its
  reach number over ~2.5s, staggered. Then the status becomes "Sent ✓" with a timestamp, the item moves to
  history and the header badge count goes down. Everything stays in memory only.
- Underneath: a **History** table (date, ward, tier, approved by, delivered, read rate) from
  `alerts.history` plus anything dispatched in this session. Also a **Settings** card showing the threshold
  method and P95 value, minimum consecutive days, "Human approval required" (locked on), channel toggles,
  languages and quiet hours. These are display only, apart from the channel toggles.

---

## 7. Tab 3 — Model Insights

Muted line at the top: "Illustrative results on simulated data — pipeline and evaluation design for the pilot."
Row of 4 KPI tiles: Forecast lead time **3.6 days**; Hit rate **88%** vs 69% (temperature-only); False alarm
ratio **18%** vs 41%; Vulnerability model AUC **0.87**.

1. **Pipeline** (full width): 5 stage cards (Ingest → Compute → Model → Decide → Act) joined by arrows,
   each listing its items from `models.pipeline`.
2. **DLNM: exposure–response** (½ width): relative risk against WBGT, an Area band lo–hi with the RR
   line, a dashed reference line at RR = 1, and a vertical marker at MMT labelled "Minimum-mortality
   WBGT". Caption with `rr_at_p99` and the attributable fraction.
   **DLNM: lag–response** (½ width): bars of RR by lag 0–5 days with error bars. Caption: "Most risk
   arrives within 0–2 days, which is why a 3–5 day lead matters."
3. **TFT backtest** (⅔ width): actual daily admissions as dots or a thin line, predicted as an amber line
   with an 80% band. Title from `backtest_label`.
   **Skill by lead day** (⅓ width): MAE as bars and R² as a line, for leads 1–5.
4. **Versus baselines** (½ width): grouped horizontal bars for hit rate, false alarm ratio and lead days for
   the 3 systems, with UshnaRaksha highlighted in amber and the others grey.
   **What drives risk (global SHAP)** (½ width): horizontal bars from `shap_global`.
5. **Heat and mortality history** (full width): a scatter of daily deaths against WBGT, coloured by year
   (use a neutral sequential palette, not the tier colours), next to a small bar chart of excess deaths by year.

Charts use one shared Recharts theme (`components/charts/theme.ts`): gridlines `#23262d`, axis text
`#8a8f98` at 12px, a dark tooltip card, and amber as the "our model" colour.

---

## 8. Tab 4 — Urban Planning (the existing tool)

Move the current `app/page.tsx` experience into `components/planning/PlanningView.tsx` with **unchanged
behaviour**. Move the old Header's heatmap controls (overlay toggle, Dynamic/Raster mode, opacity,
Baseline/After toggle, interventions button) into a slim toolbar inside this view. Then fix:
- Legends: the sidebar legend and histogram use the same ramp as the map (`THERMAL_COLOR_RANGE`).
- `ReadMoreDrawer`'s recommended intervention comes from `interventions.json`. Prefer one for the same
  `cell_id`; otherwise take the best cooling-per-rupee of the matching type ("Cool Roof" for buildings,
  "Tree Canopy" for trees). Remove the hard-coded −3.8 °C / ₹8.5 L.
- `ObjectPopup` "Primary drivers" text is built from the object's largest attribution values.
- The `InterventionsDrawer` "₹1 Cr" tier filters `cost_lakhs <= 100`. Rename "Budget Tier Slider" to "Budget tier".
- "256 Cells" comes from `summary.total_cells`. "Landsat 8 LST" becomes "Downscaled LST · 100 m".
- `BlockDetailPanel` shows a skeleton while block data loads instead of rendering nothing.
- Remove the per-frame `activePulse` re-render. A static highlight, or deck.gl transitions, is enough.
- Add a heading strip: "Long-term planning · Where to invest in cool roofs & green cover".

---

## 9. Demo guide (rewrite `JudgeDemoGuide` → `DemoGuide`)

A floating card at bottom right, toggled with `G`, hidden by default. Each step has a title, one line of
narration and a **Run** button that sets the store:
1. "Today looks calm": warning tab, day 0, layer wbgt, 2D, no ward selected.
2. "A heatwave is coming": start playback from day 0 (it stops on day 5), then set day 3.
3. "Why Barakhamba Road?": day 3, select W01.
4. "Who is vulnerable?": layer vulnerability.
5. "Draft the alert": `goToAlert("W01", 3)`, channel whatsapp, language hi.
6. "Human approves": trigger approve on the selected alert.
7. "Is the model credible?": models tab.
8. "Plan for next summer": planning tab, open interventions.

Also add `?guide=1` to show the guide on load.

---

## 10. Definition of done (every phase)
- `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass.
- No `console.error` on first load of any tab.
- Everything fits a 1920×1080 viewport with no page scroll (panels may scroll inside themselves).
- Commit to branch `ushnaraksha` with a clear message. Do not push unless asked.
