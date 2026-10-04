/**
 * Thermal-stress calculations for the UshnaRaksha heat-stress calculator.
 *
 * - wetBulbStull / wbgtEstimate match scripts/generate_risk_data.py exactly (same formulas, same constants).
 * - utci() is a faithful port of the UTCI 6th-order polynomial approximation (Bröde et al. 2012,
 *   https://doi.org/10.1007/s00484-011-0454-1) from the `pythermalcomfort` package (`utci`, v4.6.0),
 *   Copyright (c) 2019 Federico Tartarini, MIT License: https://github.com/CenterForTheBuiltEnvironment/pythermalcomfort
 *   (licence text in THIRD_PARTY_NOTICES.md)
 *   The polynomial coefficients are copied unchanged; only the syntax was translated from Python.
 *
 * Plain functions, no dependencies, so they can be run by Node for testing (see scripts/test-thermal.mjs).
 */

/** Stull (2011) wet-bulb temperature approximation (°C), valid for RH 5–99 % and Ta -20…50 °C. */
export function wetBulbStull(ta: number, rh: number): number {
  return (
    ta * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(ta + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035
  );
}

/** Outdoor WBGT estimate (°C): 0.7·Tw + 0.3·Ta plus a radiant-load term. Same formula as the data generator. */
export function wbgtEstimate(ta: number, rh: number, radiant = 0): number {
  return 0.7 * wetBulbStull(ta, rh) + 0.3 * ta + radiant;
}

export const UTCI_WIND_MIN = 0.5;
export const UTCI_WIND_MAX = 17;

/** Saturation vapour pressure over water (hPa), Hardy (1998) as used by pythermalcomfort's UTCI. */
function saturationVapourPressureHpa(ta: number): number {
  const g = [-2836.5744, -6028.076559, 19.54263612, -0.02737830188, 0.000016261698, 7.0229056 * Math.pow(10, -10), -1.8680009 * Math.pow(10, -13)];
  const tk = ta + 273.15;
  let es = 2.7150305 * Math.log(tk);
  g.forEach((c, i) => {
    es += c * Math.pow(tk, i - 2);
  });
  return Math.exp(es) * 0.01;
}

/**
 * The UTCI polynomial. `dtr` = Tmrt − Ta (°C), `pa` = vapour pressure (kPa), `v` = 10 m wind (m/s).
 * Coefficients are exactly those of pythermalcomfort's `_utci_optimized`.
 */
export function utciPolynomial(tdb: number, v: number, dtr: number, pa: number): number {
  return (
    tdb
    + 0.607562052
    + (-0.0227712343) * tdb
    + (8.06470249 * (10 ** (-4))) * tdb * tdb
    + (-1.54271372 * (10 ** (-4))) * tdb * tdb * tdb
    + (-3.24651735 * (10 ** (-6))) * tdb * tdb * tdb * tdb
    + (7.32602852 * (10 ** (-8))) * tdb * tdb * tdb * tdb * tdb
    + (1.35959073 * (10 ** (-9))) * tdb * tdb * tdb * tdb * tdb * tdb
    + (-2.25836520) * v
    + 0.0880326035 * tdb * v
    + 0.00216844454 * tdb * tdb * v
    + (-1.53347087 * (10 ** (-5))) * tdb * tdb * tdb * v
    + (-5.72983704 * (10 ** (-7))) * tdb * tdb * tdb * tdb * v
    + (-2.55090145 * (10 ** (-9))) * tdb * tdb * tdb * tdb * tdb * v
    + (-0.751269505) * v * v
    + (-0.00408350271) * tdb * v * v
    + (-5.21670675 * (10 ** (-5))) * tdb * tdb * v * v
    + (1.94544667 * (10 ** (-6))) * tdb * tdb * tdb * v * v
    + (1.14099531 * (10 ** (-8))) * tdb * tdb * tdb * tdb * v * v
    + 0.158137256 * v * v * v
    + (-6.57263143 * (10 ** (-5))) * tdb * v * v * v
    + (2.22697524 * (10 ** (-7))) * tdb * tdb * v * v * v
    + (-4.16117031 * (10 ** (-8))) * tdb * tdb * tdb * v * v * v
    + (-0.0127762753) * v * v * v * v
    + (9.66891875 * (10 ** (-6))) * tdb * v * v * v * v
    + (2.52785852 * (10 ** (-9))) * tdb * tdb * v * v * v * v
    + (4.56306672 * (10 ** (-4))) * v * v * v * v * v
    + (-1.74202546 * (10 ** (-7))) * tdb * v * v * v * v * v
    + (-5.91491269 * (10 ** (-6))) * v * v * v * v * v * v
    + 0.398374029 * dtr
    + (1.83945314 * (10 ** (-4))) * tdb * dtr
    + (-1.73754510 * (10 ** (-4))) * tdb * tdb * dtr
    + (-7.60781159 * (10 ** (-7))) * tdb * tdb * tdb * dtr
    + (3.77830287 * (10 ** (-8))) * tdb * tdb * tdb * tdb * dtr
    + (5.43079673 * (10 ** (-10))) * tdb * tdb * tdb * tdb * tdb * dtr
    + (-0.0200518269) * v * dtr
    + (8.92859837 * (10 ** (-4))) * tdb * v * dtr
    + (3.45433048 * (10 ** (-6))) * tdb * tdb * v * dtr
    + (-3.77925774 * (10 ** (-7))) * tdb * tdb * tdb * v * dtr
    + (-1.69699377 * (10 ** (-9))) * tdb * tdb * tdb * tdb * v * dtr
    + (1.69992415 * (10 ** (-4))) * v * v * dtr
    + (-4.99204314 * (10 ** (-5))) * tdb * v * v * dtr
    + (2.47417178 * (10 ** (-7))) * tdb * tdb * v * v * dtr
    + (1.07596466 * (10 ** (-8))) * tdb * tdb * tdb * v * v * dtr
    + (8.49242932 * (10 ** (-5))) * v * v * v * dtr
    + (1.35191328 * (10 ** (-6))) * tdb * v * v * v * dtr
    + (-6.21531254 * (10 ** (-9))) * tdb * tdb * v * v * v * dtr
    + (-4.99410301 * (10 ** (-6))) * v * v * v * v * dtr
    + (-1.89489258 * (10 ** (-8))) * tdb * v * v * v * v * dtr
    + (8.15300114 * (10 ** (-8))) * v * v * v * v * v * dtr
    + (7.55043090 * (10 ** (-4))) * dtr * dtr
    + (-5.65095215 * (10 ** (-5))) * tdb * dtr * dtr
    + (-4.52166564 * (10 ** (-7))) * tdb * tdb * dtr * dtr
    + (2.46688878 * (10 ** (-8))) * tdb * tdb * tdb * dtr * dtr
    + (2.42674348 * (10 ** (-10))) * tdb * tdb * tdb * tdb * dtr * dtr
    + (1.54547250 * (10 ** (-4))) * v * dtr * dtr
    + (5.24110970 * (10 ** (-6))) * tdb * v * dtr * dtr
    + (-8.75874982 * (10 ** (-8))) * tdb * tdb * v * dtr * dtr
    + (-1.50743064 * (10 ** (-9))) * tdb * tdb * tdb * v * dtr * dtr
    + (-1.56236307 * (10 ** (-5))) * v * v * dtr * dtr
    + (-1.33895614 * (10 ** (-7))) * tdb * v * v * dtr * dtr
    + (2.49709824 * (10 ** (-9))) * tdb * tdb * v * v * dtr * dtr
    + (6.51711721 * (10 ** (-7))) * v * v * v * dtr * dtr
    + (1.94960053 * (10 ** (-9))) * tdb * v * v * v * dtr * dtr
    + (-1.00361113 * (10 ** (-8))) * v * v * v * v * dtr * dtr
    + (-1.21206673 * (10 ** (-5))) * dtr * dtr * dtr
    + (-2.18203660 * (10 ** (-7))) * tdb * dtr * dtr * dtr
    + (7.51269482 * (10 ** (-9))) * tdb * tdb * dtr * dtr * dtr
    + (9.79063848 * (10 ** (-11)))
    * tdb
    * tdb
    * tdb
    * dtr
    * dtr
    * dtr
    + (1.25006734 * (10 ** (-6))) * v * dtr * dtr * dtr
    + (-1.81584736 * (10 ** (-9))) * tdb * v * dtr * dtr * dtr
    + (-3.52197671 * (10 ** (-10)))
    * tdb
    * tdb
    * v
    * dtr
    * dtr
    * dtr
    + (-3.36514630 * (10 ** (-8))) * v * v * dtr * dtr * dtr
    + (1.35908359 * (10 ** (-10)))
    * tdb
    * v
    * v
    * dtr
    * dtr
    * dtr
    + (4.17032620 * (10 ** (-10)))
    * v
    * v
    * v
    * dtr
    * dtr
    * dtr
    + (-1.30369025 * (10 ** (-9)))
    * dtr
    * dtr
    * dtr
    * dtr
    + (4.13908461 * (10 ** (-10)))
    * tdb
    * dtr
    * dtr
    * dtr
    * dtr
    + (9.22652254 * (10 ** (-12)))
    * tdb
    * tdb
    * dtr
    * dtr
    * dtr
    * dtr
    + (-5.08220384 * (10 ** (-9)))
    * v
    * dtr
    * dtr
    * dtr
    * dtr
    + (-2.24730961 * (10 ** (-11)))
    * tdb
    * v
    * dtr
    * dtr
    * dtr
    * dtr
    + (1.17139133 * (10 ** (-10)))
    * v
    * v
    * dtr
    * dtr
    * dtr
    * dtr
    + (6.62154879 * (10 ** (-10)))
    * dtr
    * dtr
    * dtr
    * dtr
    * dtr
    + (4.03863260 * (10 ** (-13)))
    * tdb
    * dtr
    * dtr
    * dtr
    * dtr
    * dtr
    + (1.95087203 * (10 ** (-12)))
    * v
    * dtr
    * dtr
    * dtr
    * dtr
    * dtr
    + (-4.73602469 * (10 ** (-12)))
    * dtr
    * dtr
    * dtr
    * dtr
    * dtr
    * dtr
    + 5.12733497 * pa
    + (-0.312788561) * tdb * pa
    + (-0.0196701861) * tdb * tdb * pa
    + (9.99690870 * (10 ** (-4))) * tdb * tdb * tdb * pa
    + (9.51738512 * (10 ** (-6))) * tdb * tdb * tdb * tdb * pa
    + (-4.66426341 * (10 ** (-7))) * tdb * tdb * tdb * tdb * tdb * pa
    + 0.548050612 * v * pa
    + (-0.00330552823) * tdb * v * pa
    + (-0.00164119440) * tdb * tdb * v * pa
    + (-5.16670694 * (10 ** (-6))) * tdb * tdb * tdb * v * pa
    + (9.52692432 * (10 ** (-7))) * tdb * tdb * tdb * tdb * v * pa
    + (-0.0429223622) * v * v * pa
    + 0.00500845667 * tdb * v * v * pa
    + (1.00601257 * (10 ** (-6))) * tdb * tdb * v * v * pa
    + (-1.81748644 * (10 ** (-6))) * tdb * tdb * tdb * v * v * pa
    + (-1.25813502 * (10 ** (-3))) * v * v * v * pa
    + (-1.79330391 * (10 ** (-4))) * tdb * v * v * v * pa
    + (2.34994441 * (10 ** (-6))) * tdb * tdb * v * v * v * pa
    + (1.29735808 * (10 ** (-4))) * v * v * v * v * pa
    + (1.29064870 * (10 ** (-6))) * tdb * v * v * v * v * pa
    + (-2.28558686 * (10 ** (-6))) * v * v * v * v * v * pa
    + (-0.0369476348) * dtr * pa
    + 0.00162325322 * tdb * dtr * pa
    + (-3.14279680 * (10 ** (-5))) * tdb * tdb * dtr * pa
    + (2.59835559 * (10 ** (-6))) * tdb * tdb * tdb * dtr * pa
    + (-4.77136523 * (10 ** (-8))) * tdb * tdb * tdb * tdb * dtr * pa
    + (8.64203390 * (10 ** (-3))) * v * dtr * pa
    + (-6.87405181 * (10 ** (-4))) * tdb * v * dtr * pa
    + (-9.13863872 * (10 ** (-6))) * tdb * tdb * v * dtr * pa
    + (5.15916806 * (10 ** (-7))) * tdb * tdb * tdb * v * dtr * pa
    + (-3.59217476 * (10 ** (-5))) * v * v * dtr * pa
    + (3.28696511 * (10 ** (-5))) * tdb * v * v * dtr * pa
    + (-7.10542454 * (10 ** (-7))) * tdb * tdb * v * v * dtr * pa
    + (-1.24382300 * (10 ** (-5))) * v * v * v * dtr * pa
    + (-7.38584400 * (10 ** (-9))) * tdb * v * v * v * dtr * pa
    + (2.20609296 * (10 ** (-7))) * v * v * v * v * dtr * pa
    + (-7.32469180 * (10 ** (-4))) * dtr * dtr * pa
    + (-1.87381964 * (10 ** (-5))) * tdb * dtr * dtr * pa
    + (4.80925239 * (10 ** (-6))) * tdb * tdb * dtr * dtr * pa
    + (-8.75492040 * (10 ** (-8))) * tdb * tdb * tdb * dtr * dtr * pa
    + (2.77862930 * (10 ** (-5))) * v * dtr * dtr * pa
    + (-5.06004592 * (10 ** (-6))) * tdb * v * dtr * dtr * pa
    + (1.14325367 * (10 ** (-7))) * tdb * tdb * v * dtr * dtr * pa
    + (2.53016723 * (10 ** (-6))) * v * v * dtr * dtr * pa
    + (-1.72857035 * (10 ** (-8))) * tdb * v * v * dtr * dtr * pa
    + (-3.95079398 * (10 ** (-8))) * v * v * v * dtr * dtr * pa
    + (-3.59413173 * (10 ** (-7))) * dtr * dtr * dtr * pa
    + (7.04388046 * (10 ** (-7))) * tdb * dtr * dtr * dtr * pa
    + (-1.89309167 * (10 ** (-8)))
    * tdb
    * tdb
    * dtr
    * dtr
    * dtr
    * pa
    + (-4.79768731 * (10 ** (-7))) * v * dtr * dtr * dtr * pa
    + (7.96079978 * (10 ** (-9)))
    * tdb
    * v
    * dtr
    * dtr
    * dtr
    * pa
    + (1.62897058 * (10 ** (-9)))
    * v
    * v
    * dtr
    * dtr
    * dtr
    * pa
    + (3.94367674 * (10 ** (-8)))
    * dtr
    * dtr
    * dtr
    * dtr
    * pa
    + (-1.18566247 * (10 ** (-9)))
    * tdb
    * dtr
    * dtr
    * dtr
    * dtr
    * pa
    + (3.34678041 * (10 ** (-10)))
    * v
    * dtr
    * dtr
    * dtr
    * dtr
    * pa
    + (-1.15606447 * (10 ** (-10)))
    * dtr
    * dtr
    * dtr
    * dtr
    * dtr
    * pa
    + (-2.80626406) * pa * pa
    + 0.548712484 * tdb * pa * pa
    + (-0.00399428410) * tdb * tdb * pa * pa
    + (-9.54009191 * (10 ** (-4))) * tdb * tdb * tdb * pa * pa
    + (1.93090978 * (10 ** (-5))) * tdb * tdb * tdb * tdb * pa * pa
    + (-0.308806365) * v * pa * pa
    + 0.0116952364 * tdb * v * pa * pa
    + (4.95271903 * (10 ** (-4))) * tdb * tdb * v * pa * pa
    + (-1.90710882 * (10 ** (-5))) * tdb * tdb * tdb * v * pa * pa
    + 0.00210787756 * v * v * pa * pa
    + (-6.98445738 * (10 ** (-4))) * tdb * v * v * pa * pa
    + (2.30109073 * (10 ** (-5))) * tdb * tdb * v * v * pa * pa
    + (4.17856590 * (10 ** (-4))) * v * v * v * pa * pa
    + (-1.27043871 * (10 ** (-5))) * tdb * v * v * v * pa * pa
    + (-3.04620472 * (10 ** (-6))) * v * v * v * v * pa * pa
    + 0.0514507424 * dtr * pa * pa
    + (-0.00432510997) * tdb * dtr * pa * pa
    + (8.99281156 * (10 ** (-5))) * tdb * tdb * dtr * pa * pa
    + (-7.14663943 * (10 ** (-7))) * tdb * tdb * tdb * dtr * pa * pa
    + (-2.66016305 * (10 ** (-4))) * v * dtr * pa * pa
    + (2.63789586 * (10 ** (-4))) * tdb * v * dtr * pa * pa
    + (-7.01199003 * (10 ** (-6))) * tdb * tdb * v * dtr * pa * pa
    + (-1.06823306 * (10 ** (-4))) * v * v * dtr * pa * pa
    + (3.61341136 * (10 ** (-6))) * tdb * v * v * dtr * pa * pa
    + (2.29748967 * (10 ** (-7))) * v * v * v * dtr * pa * pa
    + (3.04788893 * (10 ** (-4))) * dtr * dtr * pa * pa
    + (-6.42070836 * (10 ** (-5))) * tdb * dtr * dtr * pa * pa
    + (1.16257971 * (10 ** (-6))) * tdb * tdb * dtr * dtr * pa * pa
    + (7.68023384 * (10 ** (-6))) * v * dtr * dtr * pa * pa
    + (-5.47446896 * (10 ** (-7))) * tdb * v * dtr * dtr * pa * pa
    + (-3.59937910 * (10 ** (-8))) * v * v * dtr * dtr * pa * pa
    + (-4.36497725 * (10 ** (-6))) * dtr * dtr * dtr * pa * pa
    + (1.68737969 * (10 ** (-7)))
    * tdb
    * dtr
    * dtr
    * dtr
    * pa
    * pa
    + (2.67489271 * (10 ** (-8)))
    * v
    * dtr
    * dtr
    * dtr
    * pa
    * pa
    + (3.23926897 * (10 ** (-9)))
    * dtr
    * dtr
    * dtr
    * dtr
    * pa
    * pa
    + (-0.0353874123) * pa * pa * pa
    + (-0.221201190) * tdb * pa * pa * pa
    + 0.0155126038 * tdb * tdb * pa * pa * pa
    + (-2.63917279 * (10 ** (-4))) * tdb * tdb * tdb * pa * pa * pa
    + 0.0453433455 * v * pa * pa * pa
    + (-0.00432943862) * tdb * v * pa * pa * pa
    + (1.45389826 * (10 ** (-4))) * tdb * tdb * v * pa * pa * pa
    + (2.17508610 * (10 ** (-4))) * v * v * pa * pa * pa
    + (-6.66724702 * (10 ** (-5))) * tdb * v * v * pa * pa * pa
    + (3.33217140 * (10 ** (-5))) * v * v * v * pa * pa * pa
    + (-0.00226921615) * dtr * pa * pa * pa
    + (3.80261982 * (10 ** (-4))) * tdb * dtr * pa * pa * pa
    + (-5.45314314 * (10 ** (-9))) * tdb * tdb * dtr * pa * pa * pa
    + (-7.96355448 * (10 ** (-4))) * v * dtr * pa * pa * pa
    + (2.53458034 * (10 ** (-5))) * tdb * v * dtr * pa * pa * pa
    + (-6.31223658 * (10 ** (-6))) * v * v * dtr * pa * pa * pa
    + (3.02122035 * (10 ** (-4))) * dtr * dtr * pa * pa * pa
    + (-4.77403547 * (10 ** (-6))) * tdb * dtr * dtr * pa * pa * pa
    + (1.73825715 * (10 ** (-6))) * v * dtr * dtr * pa * pa * pa
    + (-4.09087898 * (10 ** (-7)))
    * dtr
    * dtr
    * dtr
    * pa
    * pa
    * pa
    + 0.614155345 * pa * pa * pa * pa
    + (-0.0616755931) * tdb * pa * pa * pa * pa
    + 0.00133374846 * tdb * tdb * pa * pa * pa * pa
    + 0.00355375387 * v * pa * pa * pa * pa
    + (-5.13027851 * (10 ** (-4))) * tdb * v * pa * pa * pa * pa
    + (1.02449757 * (10 ** (-4))) * v * v * pa * pa * pa * pa
    + (-0.00148526421) * dtr * pa * pa * pa * pa
    + (-4.11469183 * (10 ** (-5))) * tdb * dtr * pa * pa * pa * pa
    + (-6.80434415 * (10 ** (-6))) * v * dtr * pa * pa * pa * pa
    + (-9.77675906 * (10 ** (-6))) * dtr * dtr * pa * pa * pa * pa
    + 0.0882773108 * pa * pa * pa * pa * pa
    + (-0.00301859306) * tdb * pa * pa * pa * pa * pa
    + 0.00104452989 * v * pa * pa * pa * pa * pa
    + (2.47090539 * (10 ** (-4))) * dtr * pa * pa * pa * pa * pa
    + 0.00148348065 * pa * pa * pa * pa * pa * pa
  );
}

/**
 * Universal Thermal Climate Index (°C).
 * @param ta air temperature (°C)  @param tr mean radiant temperature (°C)
 * @param v wind speed at 10 m (m/s), clamped to 0.5–17 m/s  @param rh relative humidity (%)
 * Use utciWarnings() to learn whether the inputs lie inside the model's valid range.
 */
export function utci(ta: number, tr: number, v: number, rh: number): number {
  const wind = Math.min(UTCI_WIND_MAX, Math.max(UTCI_WIND_MIN, v));
  const pa = (saturationVapourPressureHpa(ta) * (rh / 100)) / 10; // hPa -> kPa
  return utciPolynomial(ta, wind, tr - ta, pa);
}

/** Human-readable notes about inputs outside the UTCI model's validity range (empty when all is fine). */
export function utciWarnings(ta: number, tr: number, v: number, rh: number): string[] {
  const w: string[] = [];
  if (ta < -50 || ta > 50) w.push("Air temperature is outside −50…50 °C");
  if (tr - ta < -30 || tr - ta > 70) w.push("Tmrt − Ta is outside −30…70 °C");
  if (v < UTCI_WIND_MIN || v > UTCI_WIND_MAX) w.push(`Wind speed is outside ${UTCI_WIND_MIN}–${UTCI_WIND_MAX} m/s; it was clamped`);
  if (rh < 0 || rh > 100) w.push("Relative humidity is outside 0–100 %");
  return w;
}

/** UTCI thermal-stress categories (same thresholds as pythermalcomfort). */
export function utciCategory(value: number): string {
  const bands: [number, string][] = [
    [-40, "Extreme cold stress"], [-27, "Very strong cold stress"], [-13, "Strong cold stress"], [0, "Moderate cold stress"],
    [9, "Slight cold stress"], [26, "No thermal stress"], [32, "Moderate heat stress"], [38, "Strong heat stress"],
    [46, "Very strong heat stress"],
  ];
  for (const [upTo, label] of bands) if (value <= upTo) return label;
  return "Extreme heat stress";
}
