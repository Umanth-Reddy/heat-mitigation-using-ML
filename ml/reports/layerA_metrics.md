# Layer A: heat-stress forecaster, test-set metrics

Data: ERA5 via Open-Meteo, New Delhi, daily max WBGT/UTCI, March–June. Train 2015–2022 (944 issue days), validate 2023 (118), test 2024–2026 (354).
NWP subset: test issue days from 2025 with archived NWP forecasts (236); NWP post-processing is trained on 2024 only.
Local P95 (training years, Mar–Jun daily max): WBGT 31.59 °C, UTCI 45.74 °C.

## WBGT · Test 2024–2026

| Model | Lead | MAE | RMSE | R² | Pinball | 80% cov. |
|---|---|---|---|---|---|---|
| Persistence | 1 | 0.906 | 1.179 | 0.885 | 0.292 | 0.77 |
| Persistence | 2 | 1.302 | 1.649 | 0.773 | 0.407 | 0.77 |
| Persistence | 3 | 1.574 | 1.933 | 0.684 | 0.478 | 0.78 |
| Persistence | 4 | 1.743 | 2.147 | 0.604 | 0.531 | 0.76 |
| Persistence | 5 | 1.865 | 2.281 | 0.538 | 0.565 | 0.74 |
| Climatology | 1 | 1.380 | 1.801 | 0.731 | 0.444 | 0.77 |
| Climatology | 2 | 1.382 | 1.804 | 0.728 | 0.445 | 0.77 |
| Climatology | 3 | 1.387 | 1.809 | 0.723 | 0.446 | 0.77 |
| Climatology | 4 | 1.381 | 1.803 | 0.721 | 0.445 | 0.76 |
| Climatology | 5 | 1.358 | 1.768 | 0.722 | 0.437 | 0.77 |
| LightGBM quantile | 1 | 0.840 | 1.119 | 0.896 | 0.292 | 0.68 |
| LightGBM quantile | 2 | 1.100 | 1.446 | 0.825 | 0.372 | 0.67 |
| LightGBM quantile | 3 | 1.264 | 1.619 | 0.779 | 0.419 | 0.61 |
| LightGBM quantile | 4 | 1.328 | 1.697 | 0.752 | 0.456 | 0.63 |
| LightGBM quantile | 5 | 1.335 | 1.694 | 0.745 | 0.452 | 0.66 |
| LSTM quantile | 1 | 0.882 | 1.133 | 0.894 | 0.286 | 0.72 |
| LSTM quantile | 2 | 1.160 | 1.509 | 0.810 | 0.376 | 0.69 |
| LSTM quantile | 3 | 1.351 | 1.714 | 0.752 | 0.436 | 0.67 |
| LSTM quantile | 4 | 1.461 | 1.838 | 0.710 | 0.473 | 0.64 |
| LSTM quantile | 5 | 1.483 | 1.854 | 0.694 | 0.480 | 0.67 |

## WBGT · NWP subset (2025 →)

| Model | Lead | MAE | RMSE | R² | Pinball | 80% cov. |
|---|---|---|---|---|---|---|
| Persistence | 1 | 0.926 | 1.201 | 0.857 | 0.298 | 0.78 |
| Persistence | 2 | 1.323 | 1.670 | 0.723 | 0.415 | 0.78 |
| Persistence | 3 | 1.584 | 1.936 | 0.624 | 0.481 | 0.78 |
| Persistence | 4 | 1.755 | 2.154 | 0.532 | 0.534 | 0.74 |
| Persistence | 5 | 1.903 | 2.313 | 0.453 | 0.575 | 0.72 |
| Climatology | 1 | 1.426 | 1.853 | 0.661 | 0.459 | 0.76 |
| Climatology | 2 | 1.421 | 1.850 | 0.660 | 0.457 | 0.76 |
| Climatology | 3 | 1.420 | 1.850 | 0.656 | 0.457 | 0.75 |
| Climatology | 4 | 1.419 | 1.847 | 0.655 | 0.457 | 0.75 |
| Climatology | 5 | 1.404 | 1.827 | 0.659 | 0.451 | 0.75 |
| NWP raw (as issued) | 1 | 0.792 | 1.083 | 0.884 | – | – |
| NWP raw (as issued) | 2 | 0.810 | 1.056 | 0.889 | – | – |
| NWP raw (as issued) | 3 | 1.098 | 1.436 | 0.793 | – | – |
| NWP raw (as issued) | 4 | 1.104 | 1.473 | 0.781 | – | – |
| NWP raw (as issued) | 5 | 1.031 | 1.299 | 0.828 | – | – |
| LightGBM quantile | 1 | 0.850 | 1.129 | 0.874 | 0.288 | 0.71 |
| LightGBM quantile | 2 | 1.117 | 1.461 | 0.788 | 0.376 | 0.68 |
| LightGBM quantile | 3 | 1.271 | 1.619 | 0.737 | 0.420 | 0.61 |
| LightGBM quantile | 4 | 1.345 | 1.709 | 0.705 | 0.461 | 0.63 |
| LightGBM quantile | 5 | 1.355 | 1.728 | 0.695 | 0.460 | 0.64 |
| LightGBM NWP post-proc. | 1 | 0.774 | 0.987 | 0.904 | 0.269 | 0.49 |
| LightGBM NWP post-proc. | 2 | 0.923 | 1.174 | 0.863 | 0.328 | 0.50 |
| LightGBM NWP post-proc. | 3 | 0.979 | 1.249 | 0.843 | 0.356 | 0.46 |
| LightGBM NWP post-proc. | 4 | 0.877 | 1.140 | 0.869 | 0.326 | 0.54 |
| LightGBM NWP post-proc. | 5 | 0.944 | 1.228 | 0.846 | 0.340 | 0.52 |
| LSTM quantile | 1 | 0.926 | 1.170 | 0.865 | 0.297 | 0.69 |
| LSTM quantile | 2 | 1.236 | 1.584 | 0.751 | 0.402 | 0.64 |
| LSTM quantile | 3 | 1.450 | 1.821 | 0.667 | 0.471 | 0.64 |
| LSTM quantile | 4 | 1.569 | 1.962 | 0.611 | 0.512 | 0.60 |
| LSTM quantile | 5 | 1.593 | 1.982 | 0.598 | 0.521 | 0.62 |

## UTCI · Test 2024–2026

| Model | Lead | MAE | RMSE | R² | Pinball | 80% cov. |
|---|---|---|---|---|---|---|
| Persistence | 1 | 1.952 | 2.600 | 0.822 | 0.648 | 0.75 |
| Persistence | 2 | 2.682 | 3.481 | 0.676 | 0.862 | 0.78 |
| Persistence | 3 | 3.178 | 4.016 | 0.553 | 1.000 | 0.76 |
| Persistence | 4 | 3.604 | 4.514 | 0.420 | 1.123 | 0.75 |
| Persistence | 5 | 3.969 | 4.827 | 0.306 | 1.212 | 0.73 |
| Climatology | 1 | 3.213 | 3.997 | 0.580 | 1.000 | 0.73 |
| Climatology | 2 | 3.236 | 4.025 | 0.567 | 1.008 | 0.73 |
| Climatology | 3 | 3.244 | 4.036 | 0.548 | 1.012 | 0.72 |
| Climatology | 4 | 3.245 | 4.039 | 0.536 | 1.013 | 0.72 |
| Climatology | 5 | 3.217 | 4.012 | 0.521 | 1.006 | 0.72 |
| LightGBM quantile | 1 | 1.862 | 2.503 | 0.835 | 0.654 | 0.64 |
| LightGBM quantile | 2 | 2.457 | 3.167 | 0.732 | 0.835 | 0.66 |
| LightGBM quantile | 3 | 2.774 | 3.475 | 0.665 | 0.927 | 0.67 |
| LightGBM quantile | 4 | 2.975 | 3.670 | 0.617 | 0.986 | 0.66 |
| LightGBM quantile | 5 | 3.145 | 3.882 | 0.551 | 1.043 | 0.62 |

## UTCI · NWP subset (2025 →)

| Model | Lead | MAE | RMSE | R² | Pinball | 80% cov. |
|---|---|---|---|---|---|---|
| Persistence | 1 | 2.072 | 2.795 | 0.731 | 0.700 | 0.72 |
| Persistence | 2 | 2.807 | 3.637 | 0.535 | 0.898 | 0.76 |
| Persistence | 3 | 3.348 | 4.187 | 0.365 | 1.045 | 0.72 |
| Persistence | 4 | 3.807 | 4.711 | 0.182 | 1.178 | 0.69 |
| Persistence | 5 | 4.263 | 5.084 | 0.015 | 1.289 | 0.69 |
| Climatology | 1 | 3.398 | 4.168 | 0.402 | 1.034 | 0.72 |
| Climatology | 2 | 3.397 | 4.169 | 0.389 | 1.034 | 0.72 |
| Climatology | 3 | 3.404 | 4.178 | 0.368 | 1.037 | 0.71 |
| Climatology | 4 | 3.406 | 4.182 | 0.356 | 1.039 | 0.71 |
| Climatology | 5 | 3.389 | 4.163 | 0.340 | 1.033 | 0.71 |
| NWP raw (as issued) | 1 | 1.412 | 1.950 | 0.869 | – | – |
| NWP raw (as issued) | 2 | 1.445 | 1.956 | 0.865 | – | – |
| NWP raw (as issued) | 3 | 1.696 | 2.297 | 0.809 | – | – |
| NWP raw (as issued) | 4 | 1.713 | 2.365 | 0.794 | – | – |
| NWP raw (as issued) | 5 | 1.959 | 2.576 | 0.747 | – | – |
| LightGBM quantile | 1 | 1.865 | 2.547 | 0.777 | 0.650 | 0.63 |
| LightGBM quantile | 2 | 2.502 | 3.235 | 0.632 | 0.830 | 0.67 |
| LightGBM quantile | 3 | 2.837 | 3.521 | 0.551 | 0.928 | 0.69 |
| LightGBM quantile | 4 | 3.052 | 3.707 | 0.494 | 0.983 | 0.69 |
| LightGBM quantile | 5 | 3.229 | 3.886 | 0.425 | 1.049 | 0.62 |
| LightGBM NWP post-proc. | 1 | 1.906 | 2.355 | 0.809 | 0.685 | 0.50 |
| LightGBM NWP post-proc. | 2 | 1.883 | 2.440 | 0.790 | 0.701 | 0.46 |
| LightGBM NWP post-proc. | 3 | 2.190 | 2.811 | 0.714 | 0.762 | 0.52 |
| LightGBM NWP post-proc. | 4 | 1.947 | 2.532 | 0.764 | 0.719 | 0.50 |
| LightGBM NWP post-proc. | 5 | 2.297 | 2.907 | 0.678 | 0.871 | 0.44 |

## Event skill · WBGT ≥ local P95 (31.59 °C) · Test 2024–2026

| Model | Lead | Events | Hits | Misses | False alarms | Hit rate | FAR | CSI |
|---|---|---|---|---|---|---|---|---|
| Persistence | 1 | 21 | 9 | 12 | 11 | 0.43 | 0.55 | 0.28 |
| Persistence | 2 | 22 | 7 | 15 | 13 | 0.32 | 0.65 | 0.20 |
| Persistence | 3 | 24 | 4 | 20 | 16 | 0.17 | 0.80 | 0.10 |
| Persistence | 4 | 25 | 4 | 21 | 16 | 0.16 | 0.80 | 0.10 |
| Persistence | 5 | 25 | 4 | 21 | 16 | 0.16 | 0.80 | 0.10 |
| Climatology | 1 | 21 | 0 | 21 | 0 | 0.00 | – | 0.00 |
| Climatology | 2 | 22 | 0 | 22 | 0 | 0.00 | – | 0.00 |
| Climatology | 3 | 24 | 0 | 24 | 0 | 0.00 | – | 0.00 |
| Climatology | 4 | 25 | 0 | 25 | 0 | 0.00 | – | 0.00 |
| Climatology | 5 | 25 | 0 | 25 | 0 | 0.00 | – | 0.00 |
| LightGBM quantile | 1 | 21 | 1 | 20 | 1 | 0.05 | 0.50 | 0.05 |
| LightGBM quantile | 2 | 22 | 0 | 22 | 0 | 0.00 | – | 0.00 |
| LightGBM quantile | 3 | 24 | 0 | 24 | 0 | 0.00 | – | 0.00 |
| LightGBM quantile | 4 | 25 | 0 | 25 | 0 | 0.00 | – | 0.00 |
| LightGBM quantile | 5 | 25 | 0 | 25 | 0 | 0.00 | – | 0.00 |
| LSTM quantile | 1 | 21 | 4 | 17 | 0 | 0.19 | 0.00 | 0.19 |
| LSTM quantile | 2 | 22 | 0 | 22 | 0 | 0.00 | – | 0.00 |
| LSTM quantile | 3 | 24 | 0 | 24 | 0 | 0.00 | – | 0.00 |
| LSTM quantile | 4 | 25 | 0 | 25 | 0 | 0.00 | – | 0.00 |
| LSTM quantile | 5 | 25 | 0 | 25 | 0 | 0.00 | – | 0.00 |

## Event skill · WBGT ≥ local P95 · warning when the 90 % quantile reaches it · Test 2024–2026

Added after the median-trigger results above showed that median forecasts rarely reach the threshold. The rule (q = 0.9) is fixed, not tuned on any data.

| Model | Lead | Events | Hits | Misses | False alarms | Hit rate | FAR | CSI |
|---|---|---|---|---|---|---|---|---|
| Persistence | 1 | 21 | 18 | 3 | 36 | 0.86 | 0.67 | 0.32 |
| Persistence | 2 | 22 | 17 | 5 | 65 | 0.77 | 0.79 | 0.20 |
| Persistence | 3 | 24 | 23 | 1 | 87 | 0.96 | 0.79 | 0.21 |
| Persistence | 4 | 25 | 24 | 1 | 98 | 0.96 | 0.80 | 0.20 |
| Persistence | 5 | 25 | 23 | 2 | 103 | 0.92 | 0.82 | 0.18 |
| Climatology | 1 | 21 | 16 | 5 | 69 | 0.76 | 0.81 | 0.18 |
| Climatology | 2 | 22 | 17 | 5 | 71 | 0.77 | 0.81 | 0.18 |
| Climatology | 3 | 24 | 19 | 5 | 72 | 0.79 | 0.79 | 0.20 |
| Climatology | 4 | 25 | 20 | 5 | 74 | 0.80 | 0.79 | 0.20 |
| Climatology | 5 | 25 | 20 | 5 | 77 | 0.80 | 0.79 | 0.20 |
| LightGBM quantile | 1 | 21 | 10 | 11 | 14 | 0.48 | 0.58 | 0.29 |
| LightGBM quantile | 2 | 22 | 7 | 15 | 16 | 0.32 | 0.70 | 0.18 |
| LightGBM quantile | 3 | 24 | 3 | 21 | 10 | 0.12 | 0.77 | 0.09 |
| LightGBM quantile | 4 | 25 | 1 | 24 | 8 | 0.04 | 0.89 | 0.03 |
| LightGBM quantile | 5 | 25 | 2 | 23 | 7 | 0.08 | 0.78 | 0.06 |
| LSTM quantile | 1 | 21 | 11 | 10 | 19 | 0.52 | 0.63 | 0.28 |
| LSTM quantile | 2 | 22 | 12 | 10 | 28 | 0.55 | 0.70 | 0.24 |
| LSTM quantile | 3 | 24 | 13 | 11 | 34 | 0.54 | 0.72 | 0.22 |
| LSTM quantile | 4 | 25 | 12 | 13 | 37 | 0.48 | 0.76 | 0.19 |
| LSTM quantile | 5 | 25 | 14 | 11 | 48 | 0.56 | 0.77 | 0.19 |

## Versus baselines · WBGT · Test 2024–2026 (✓ = better than the baseline, ✗ = worse)

| Model | Lead | MAE vs persistence | MAE vs climatology | Pinball vs persistence | Pinball vs climatology |
|---|---|---|---|---|---|
| LightGBM quantile | 1 | ✓ 0.840 vs 0.906 | ✓ 0.840 vs 1.380 | ✓ 0.2916 vs 0.2923 | ✓ 0.2916 vs 0.4441 |
| LightGBM quantile | 2 | ✓ 1.100 vs 1.302 | ✓ 1.100 vs 1.382 | ✓ 0.3716 vs 0.4071 | ✓ 0.3716 vs 0.4446 |
| LightGBM quantile | 3 | ✓ 1.264 vs 1.574 | ✓ 1.264 vs 1.387 | ✓ 0.4193 vs 0.4781 | ✓ 0.4193 vs 0.4462 |
| LightGBM quantile | 4 | ✓ 1.328 vs 1.743 | ✓ 1.328 vs 1.381 | ✓ 0.4564 vs 0.5312 | ✗ 0.4564 vs 0.4450 |
| LightGBM quantile | 5 | ✓ 1.335 vs 1.865 | ✓ 1.335 vs 1.358 | ✓ 0.4516 vs 0.5654 | ✗ 0.4516 vs 0.4365 |
| LSTM quantile | 1 | ✓ 0.882 vs 0.906 | ✓ 0.882 vs 1.380 | ✓ 0.2858 vs 0.2923 | ✓ 0.2858 vs 0.4441 |
| LSTM quantile | 2 | ✓ 1.160 vs 1.302 | ✓ 1.160 vs 1.382 | ✓ 0.3763 vs 0.4071 | ✓ 0.3763 vs 0.4446 |
| LSTM quantile | 3 | ✓ 1.351 vs 1.574 | ✓ 1.351 vs 1.387 | ✓ 0.4360 vs 0.4781 | ✓ 0.4360 vs 0.4462 |
| LSTM quantile | 4 | ✓ 1.461 vs 1.743 | ✗ 1.461 vs 1.381 | ✓ 0.4735 vs 0.5312 | ✗ 0.4735 vs 0.4450 |
| LSTM quantile | 5 | ✓ 1.483 vs 1.865 | ✗ 1.483 vs 1.358 | ✓ 0.4798 vs 0.5654 | ✗ 0.4798 vs 0.4365 |

## Event skill at the dashboard's IMD-tier WBGT cut-offs

Observed test-set days at or above each cut-off (lead 1 rows): Yellow ≥ 31.5 °C: 22, Orange ≥ 33.5 °C: 0, Red ≥ 35.5 °C: 0.
Cut-offs with no observed events cannot be scored; per-model scores for every cut-off are in ml/outputs/layerA.json.

## Quantile crossing (rows where raw 10/50/90 % predictions crossed, before sorting)

lgbm_wbgt_lead1: 19, nwp_pp_wbgt_lead1: 67, lgbm_wbgt_lead2: 17, nwp_pp_wbgt_lead2: 92, lgbm_wbgt_lead3: 16, nwp_pp_wbgt_lead3: 84, lgbm_wbgt_lead4: 14, nwp_pp_wbgt_lead4: 97, lgbm_wbgt_lead5: 3, nwp_pp_wbgt_lead5: 63, lgbm_utci_lead1: 2, nwp_pp_utci_lead1: 86, lgbm_utci_lead2: 3, nwp_pp_utci_lead2: 100, lgbm_utci_lead3: 1, nwp_pp_utci_lead3: 65, lgbm_utci_lead4: 0, nwp_pp_utci_lead4: 92, lgbm_utci_lead5: 2, nwp_pp_utci_lead5: 87, lstm_wbgt_lead1: 0, lstm_wbgt_lead2: 0, lstm_wbgt_lead3: 0, lstm_wbgt_lead4: 0, lstm_wbgt_lead5: 0

LSTM: {'epochs_trained': 56, 'best_val_pinball_std_units': 0.0598, 'hidden': 32, 'window_days': 14, 'params': 5999}

## SHAP · LightGBM median (q=0.5), WBGT, lead 3 days

Top global features (mean |SHAP|, °C): doy_cos 1.107, doy_sin 0.616, wbgt_max_lag0 0.385, tmax_lag0 0.098, sw_max_lag0 0.077, wbgt_max_lag1 0.069, rh_mean_lag0 0.066, utci_max_lag0 0.065

Hottest test target day 2025-06-13 (issued 2025-06-10): actual 33.03 °C, predicted 30.18 °C, base 27.029 °C. Top contributions: doy_cos=-0.93 (+1.38), doy_sin=0.36 (+1.03), wbgt_max_lag0=30.5 (+0.46), tmax_lag0=43.2 (+0.11), rh_mean_lag1=27.67 (-0.10)
