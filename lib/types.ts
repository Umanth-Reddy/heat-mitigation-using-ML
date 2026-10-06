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
  /** How the tier cut-offs were set from real data (ml/outputs/tiers.json); absent in older data. */
  tier_calibration?: { source: string; period: string; rule: string; percentiles: Record<string, number>; n_days: number };
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

export type AlertStatus = "pending_approval" | "draft" | "approved" | "dispatching" | "sent" | "rejected";
export type Channel = "sms" | "whatsapp" | "cap" | "chw_relay";
export interface PendingAlert { id: string; ward_id: string; ward_name: string; day_index: number; date: string;
  tier: TierId; wbgt: number; utci: number; status: AlertStatus;
  confidence: number; channels: Channel[]; reach: { sms: number; whatsapp: number; chw_relay: number };
  triggered_by: string;
  messages: { sms_en: string; sms_hi: string; whatsapp_en: string; whatsapp_hi: string }; cap_xml: string; }
export interface SentAlert { id: string; ward_id: string; ward_name: string; date: string; tier: TierId;
  approved_by: string; sent_at: string; delivered: number; read_rate: number; channels: Channel[]; }
export interface AlertsData { generated_at: string; pending: PendingAlert[]; history: SentAlert[];
  settings: { threshold_method: string; wbgt_p95: number; min_consecutive_days: number; require_human_approval: boolean;
    languages: string[]; quiet_hours: string; channels: Record<Channel, boolean> }; }

export type ResultsStatus = "illustrative" | "trained";
export type ModelSectionId = "dlnm" | "forecast" | "baselines" | "shap" | "history";
export interface SectionMeta { dataset: string; evaluated_on: string | null; }
export interface ModelsData { simulated: boolean;
  /** "illustrative" until real trained results replace the placeholder values; drives labels in Model Insights. */
  results_status: ResultsStatus; dataset: string; evaluated_on: string | null;
  sections: Record<ModelSectionId, SectionMeta>;
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

// ---- Operations & impact add-on (scripts/generate_ops_data.py) ----

export interface CoolingCentreDay { open: boolean; hours: string | null; expected_visitors: number; occupancy_pct: number; }
export interface CoolingCentre { id: string; kind: "cooling_centre"; name: string; ward_id: string; position: [number, number];
  capacity: number; amenities: string[]; days: CoolingCentreDay[]; }

export type HospitalStatus = "normal" | "high" | "surge";
export interface HospitalDay { expected_admissions: number; admissions_hi: number; occupied: number; occupancy_pct: number; status: HospitalStatus; }
export interface Hospital { id: string; kind: "hospital"; name: string; type: string; position: [number, number];
  beds_total: number; heat_beds: number; days: HospitalDay[]; }

export interface FacilitiesData { simulated: boolean; note: string; cooling_centres: CoolingCentre[]; hospitals: Hospital[]; }

export interface ScenarioDay { day_index: number; deaths: number; admissions: number; }
export interface Scenario { id: "none" | "conventional" | "ushnaraksha"; label: string; lead_days: number | null;
  deaths: number; admissions: number; per_day: ScenarioDay[]; deaths_averted: number; admissions_averted: number; }
export interface ImpactData { simulated: boolean; window: string; note: string;
  benchmark: { name: string; deaths_avoided_per_year: number; source: string };
  actions: { id: string; label: string; max_reduction: number; min_tier: number; max_reduction_pct: number }[];
  lead_realisation: { lead_days: number; fraction: number }[];
  scenarios: Scenario[];
  lead_curve: { lead_days: number; deaths_averted: number; pct_reduction: number }[];
  wards: { ward_id: string; short_name: string; deaths_no_action: number; deaths_with_ushnaraksha: number; deaths_averted: number }[];
  annualised: { heatwave_episodes_per_year: number; deaths_averted_per_year_pilot: number; admissions_averted_per_year_pilot: number }; }

// ---- Real ML pipeline results (ml/06_export.py → public/data/risk/model_results.json) ----

export interface LeadMetrics { mae: number; rmse: number; r2: number; bias: number; pinball?: number; cov80?: number; }
export type PerLead<T> = Record<string, T>; // keyed by lead "1"…"5"
export interface EventScore { events: number; hits: number; misses: number; false_alarms: number;
  hit_rate: number | null; far: number | null; csi: number | null; }
export interface BacktestPoint { date: string; actual: number; median: number; lo: number; hi: number; }
export interface RiskEngineDay { date: string; lead: number; deaths_q10: number; deaths_q50: number; deaths_q90: number;
  deaths_coef_lo: number; deaths_coef_hi: number; deaths_observed: number; admissions_q50: number; }
export interface ModelResults {
  results_status: ResultsStatus; dataset: string; evaluated_on: string;
  tiers: { source: string; period: string; n_days: number; rule: string; percentiles: Record<string, number>;
    cutoffs: { yellow: number; orange: number; red: number }; alert_threshold: number };
  data: { source: string; location: string; split: { train: string; validation: string; test: string; n_train: number; n_val: number;
    n_test: number; n_nwp_subset: number }; p95: { wbgt: number; utci: number };
    tier_cutoffs: { tier: string; wbgt_min: number }[]; test_tier_events: Record<string, number> };
  layerA: {
    target: string; models: Record<string, string>;
    metrics: Record<string, PerLead<LeadMetrics>>; nwp_subset: Record<string, PerLead<LeadMetrics>>;
    events: Record<string, PerLead<{ p95: EventScore; p95_q90_trigger?: EventScore }>>;
    beats_baselines: Record<string, PerLead<Record<string, boolean>>>;
    calibration: Record<string, PerLead<{ Q: number; n_cal: number; method: string }>>;
    improvement: Record<string, Record<string, PerLead<{ vs_persistence_pct: number; vs_climatology_pct: number }>>>;
    metrics_nwp_subset_all: Record<string, PerLead<LeadMetrics>>;
    events_nwp_subset: Record<string, PerLead<{ p95: EventScore; p95_q90_trigger?: EventScore }>>;
    backtest: { window: string; model: string; leads: Record<string, BacktestPoint[]> };
    shap: { model: string; global: { feature: string; mean_abs_shap: number }[];
      local: { issue_date: string; target_date: string; actual: number; predicted: number; base_value: number;
        contributions: { feature: string; shap: number; value: number }[] } };
    lstm: { epochs_trained: number; params: number; window_days: number };
  };
  layerB: { label: string; citation: string; doi: string; pmid: string;
    values: { threshold_c: number; pct_increase_per_c: number; ci95_pct: [number, number]; lag_window_days: number; exposure_metric_as_stated: string };
    mapping: { a: number; b: number; r2_train: number; resid_sd_train_c: number; resid_sd_test_c: number; description: string };
    curve_by_wbgt: { wbgt: number; tmean: number; rr: number; lo: number; hi: number }[]; note: string;
    secondary: { citation: string; doi: string; values: Record<string, unknown> } };
  layerC: { level_achieved: string; source: { table: string; publisher: string; url: string }; indicators: Record<string, string>;
    not_available: string[]; pca: { kept_components: number[]; explained_variance_ratio: number[]; weights: number[] };
    units: { unit: string; subdistrict: string; population: number; hvi: number }[];
    subdistrict_hvi_pop_weighted: Record<string, number>; pilot_anchor: { subdistrict: string; hvi: number; population_2011: number };
    pilot_wards: string };
  risk_engine: { window: { start: string; end: string; issue_date: string; mean_observed_wbgt: number };
    city_wbgt: { date: string; lead: number; observed: number; q10: number; q50: number; q90: number }[];
    city_totals: RiskEngineDay[];
    inputs: { baseline_deaths_per_person_day: number; baseline_source: string; population_total: number; population_source: string;
      vulnerability_anchor: number; vulnerability_anchor_source: string; admissions_per_death: number };
    labels: { real: string[]; simulated: string[]; assumption: string[] }; interpretation: string };
  not_done: Record<string, string>;
}
