# Data sources

Every dataset used by the ML pipeline, with where and when it was fetched. Sections are written by the scripts.

<!-- obs -->
## Observations: ERA5 reanalysis via the Open-Meteo Historical Weather API

- Endpoint: `https://archive-api.open-meteo.com/v1/archive`
- Query: latitude=28.63, longitude=77.22, hourly=temperature_2m,relative_humidity_2m,dew_point_2m,wind_speed_10m,shortwave_radiation, timezone=Asia/Kolkata, wind_speed_unit=ms, yearly chunks 2015→2026
- Grid point returned: 28.646748, 77.17218 (elevation 220.0 m)
- Coverage used: 2015-01-01 00:00 → 2026-10-05 23:00 local time (103,104 complete hours)
- Fetched: 2026-10-06
- Licence: CC BY 4.0. Attribution: Open-Meteo.com (https://open-meteo.com/) and ERA5 / ERA5-Land, Copernicus Climate Change Service (C3S), Hersbach et al. (2020), doi:10.1002/qj.3803.
- Note: reanalysis is a gridded best estimate (~0.25° ERA5 / ~0.1° ERA5-Land), not a station record.
<!-- /obs -->

<!-- nwp -->
## Archived NWP forecasts: Open-Meteo Previous Runs API

- Endpoint: `https://previous-runs-api.open-meteo.com/v1/forecast` (model: Open-Meteo `best_match` for this location)
- Variables: temperature_2m, relative_humidity_2m, wind_speed_10m, shortwave_radiation as `<var>_previous_day1…5` = value forecast by the run issued 1–5 days before each valid hour
- Coverage used: 2024-03-01 → 2026-10-05. Probed availability at this point: temperature from 2021; humidity, radiation and wind only from March 2024, so WBGT/UTCI forecasts start in March 2024.
- Fetched: 2026-10-06
- Licence: CC BY 4.0, attribution Open-Meteo.com; underlying model data from national weather services as listed by Open-Meteo.
<!-- /nwp -->

<!-- literature -->
## Published coefficients (Layer B)

- **Primary:** Hajat S, Armstrong BG, Gouveia N, Wilkinson P (2005). Mortality displacement of heat-related deaths: a comparison of Delhi, São Paulo, and London. *Epidemiology* 16(5):613–620. doi:10.1097/01.ede.0000164559.41092.2a, PMID 16135936. Values quoted from the PubMed abstract (full text paywalled, not consulted).
- **Secondary:** de Bont J, et al. (2024). Impact of heatwaves on all-cause mortality in India: a comprehensive multi-city study. *Environment International* 184:108461. doi:10.1016/j.envint.2024.108461, PMC11790314 (CC BY 4.0). Full text consulted; Delhi baseline deaths from Table 1.
- Exact quotes and locations: `ml/data/literature_coefficients.json`. Retrieved 2026-10-07.
<!-- /literature -->
