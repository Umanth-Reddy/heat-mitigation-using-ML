import { useEffect, useState } from "react";
import type { AlertsData, FacilitiesData, ImpactData, ModelsData, RiskCells, RiskMeta, Ward } from "./types";

export interface RiskData {
  meta: RiskMeta;
  cells: RiskCells;
  wards: Ward[];
  outlines: GeoJSON.FeatureCollection;
  alerts: AlertsData;
  models: ModelsData;
  facilities: FacilitiesData;
  impact: ImpactData;
}

type NoData = { [K in keyof RiskData]: null };
export type RiskDataState =
  | ({ loading: true; error: null } & NoData)
  | ({ loading: false; error: string } & NoData)
  | ({ loading: false; error: null } & RiskData);

const BASE = "/data/risk";
let cache: RiskData | null = null;
let inflight: Promise<RiskData> | null = null;

async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

function loadRiskData(): Promise<RiskData> {
  if (cache) return Promise.resolve(cache);
  inflight ??= Promise.all([
    getJson<RiskMeta>("meta.json"),
    getJson<RiskCells>("cells.json"),
    getJson<Ward[]>("wards.json"),
    getJson<GeoJSON.FeatureCollection>("ward_outlines.geojson"),
    getJson<AlertsData>("alerts.json"),
    getJson<ModelsData>("models.json"),
    getJson<FacilitiesData>("facilities.json"),
    getJson<ImpactData>("impact.json"),
  ])
    .then(([meta, cells, wards, outlines, alerts, models, facilities, impact]) => (cache = { meta, cells, wards, outlines, alerts, models, facilities, impact }))
    .catch((err) => {
      inflight = null; // allow a retry on the next mount
      throw err;
    });
  return inflight;
}

/** Synchronous access for non-React code (the store). Null until the first load completes. */
export function getRiskDataSync(): RiskData | null {
  return cache;
}

const NO_DATA: NoData = { meta: null, cells: null, wards: null, outlines: null, alerts: null, models: null, facilities: null, impact: null };
const LOADING: RiskDataState = { loading: true, error: null, ...NO_DATA };

export function useRiskData(): RiskDataState {
  const [state, setState] = useState<RiskDataState>(() =>
    cache ? { loading: false, error: null, ...cache } : LOADING
  );

  useEffect(() => {
    if (cache) return;
    let live = true;
    loadRiskData()
      .then((d) => live && setState({ loading: false, error: null, ...d }))
      .catch((e: unknown) =>
        live &&
        setState({ loading: false, error: e instanceof Error ? e.message : String(e), ...NO_DATA })
      );
    return () => {
      live = false;
    };
  }, []);

  return state;
}

let gridCache: GeoJSON.FeatureCollection | null = null;

/** The 256-zone grid (shared with the Planning tab). Null until loaded. */
export function useGridGeoJson(): GeoJSON.FeatureCollection | null {
  const [grid, setGrid] = useState<GeoJSON.FeatureCollection | null>(gridCache);
  useEffect(() => {
    if (gridCache) return;
    let live = true;
    fetch("/data/grid.geojson")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`grid.geojson: HTTP ${r.status}`))))
      .then((g: GeoJSON.FeatureCollection) => {
        gridCache = g;
        if (live) setGrid(g);
      })
      .catch((e) => console.error(e));
    return () => {
      live = false;
    };
  }, []);
  return grid;
}
