// Run: npm run test:thermal   (Node 22.18+/24 import .ts files natively)
// Reference values:
//  - UTCI: pythermalcomfort docs and its validation table (FedericoTartarini/validation-data-comfort-models v1.0.0,
//    ts_utci.json, MIT; tolerance 0.1 °C), shared with jsthermalcomfort and the R calcUTCI().
//  - WBGT: values computed by scripts/generate_risk_data.py's own wbgt_estimate() / wet_bulb_stull() (the dashboard's formula).
//  - Stull (2011): T = 20 °C, RH = 50 % gives Tw ≈ 13.7 °C.
import { utci, utciCategory, utciPolynomial, utciWarnings, wbgtEstimate, wetBulbStull } from "../lib/thermal.ts";

let failed = 0;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`);
}
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

// --- UTCI: documented examples
check("utci(25, 25, 1.0, 50) = 24.6 (pythermalcomfort docs)", r1(utci(25, 25, 1.0, 50)) === 24.6, `got ${r1(utci(25, 25, 1.0, 50))}`);
check("utci(40, 25, 1.0, 50) = 40.4 (docs: utci(tdb=[25, 40], tr=25, ...))", r1(utci(40, 25, 1.0, 50)) === 40.4, `got ${r1(utci(40, 25, 1.0, 50))}`);
check("polynomial(25, v=1, dTr=1, pa=1.5) = 24.73 (_utci_optimized test)", r2(utciPolynomial(25, 1, 1, 1.5)) === 24.73, `got ${utciPolynomial(25, 1, 1, 1.5).toFixed(2)}`);
check("polynomial(27, v=1, dTr=1, pa=1.5) = 26.57 (_utci_optimized test)", r2(utciPolynomial(27, 1, 1, 1.5)) === 26.57, `got ${utciPolynomial(27, 1, 1, 1.5).toFixed(2)}`);

// --- UTCI: validation table from ts_utci.json, [tdb, tr, v, rh, expected, expectedCategory?]
// pythermalcomfort returns NaN for out-of-range inputs; this port clamps wind and flags instead, so for those rows we
// check that utciWarnings() flags the input (expected = null).
const table = [
  [25, 27, 1, 50, 25.2],
  [19, 24, 1, 50, 20.0],
  [19, 14, 1, 50, 16.8],
  [27, 22, 1, 50, 25.5],
  [27, 22, 10, 50, 20.0],
  [27, 22, 16, 50, 15.8],
  [51, 22, 16, 50, null],
  [27, 22, 0, 50, null],
  [30, 27, 1, 50, 29.6, "Moderate heat stress"],
  [9, 9, 1, 50, 8.7, "Slight cold stress"],
  [25, 25, 1, 50, 24.6, "No thermal stress"],
];
for (const [ta, tr, v, rh, want, cat] of table) {
  if (want === null) {
    check(`utci(${ta}, ${tr}, ${v}, ${rh}): out-of-range input is flagged`, utciWarnings(ta, tr, v, rh).length > 0, utciWarnings(ta, tr, v, rh).join("; "));
    continue;
  }
  const got = utci(ta, tr, v, rh);
  check(`utci(${ta}, ${tr}, ${v}, ${rh}) = ${want} (+/-0.1)`, near(got, want, 0.1), `got ${got.toFixed(2)}`);
  if (cat) check(`  category of ${want} is '${cat}'`, utciCategory(got) === cat, utciCategory(got));
}
// Imperial row of the table: 77 F, 77 F, 3.28 ft/s, 50 % -> 76.4 F
{
  const c = (f) => (f - 32) / 1.8;
  const got = utci(c(77), c(77), 3.28 * 0.3048, 50) * 1.8 + 32;
  check("utci(77 F, 77 F, 3.28 ft/s, 50 %) = 76.4 F (+/-0.2)", near(got, 76.4, 0.2), `got ${got.toFixed(2)} F`);
}

// --- UTCI: wind clamp, warnings, categories
check("wind below 0.5 m/s is clamped to 0.5", utci(30, 30, 0.1, 50) === utci(30, 30, 0.5, 50), "");
check("wind above 17 m/s is clamped to 17", utci(30, 30, 40, 50) === utci(30, 30, 17, 50), "");
check("warnings flag out-of-range wind only when needed", utciWarnings(30, 30, 0.1, 50).length === 1 && utciWarnings(30, 30, 1, 50).length === 0, "");
check("category of 24.6 is 'No thermal stress'", utciCategory(24.6) === "No thermal stress", utciCategory(24.6));
check("category of 40.4 is 'Very strong heat stress'", utciCategory(40.4) === "Very strong heat stress", utciCategory(40.4));

// --- WBGT
check("Stull wet bulb at 20 C / 50 % = 13.7 (Stull 2011)", near(wetBulbStull(20, 50), 13.7, 0.1), `got ${wetBulbStull(20, 50).toFixed(2)}`);
const wbgtRef = [[20, 50, 0, 15.5895, 13.6993], [40, 30, 0, 30.1436, 25.9194], [35, 60, 1.5, 31.9418, 28.4883], [44, 20, 2.0, 32.9975, 25.425], [30, 80, 0.5, 28.4908, 27.1297], [25, 25, 0, 17.0165, 13.5949]]; // [ta, rh, radiant, wbgt, wetBulb] from generate_risk_data.py
for (const [ta, rh, rad, want, wantTw] of wbgtRef) {
  const got = wbgtEstimate(ta, rh, rad);
  check(`wbgtEstimate(${ta}, ${rh}, ${rad}) = ${want} (generator formula)`, near(got, want, 1e-3) && near(wetBulbStull(ta, rh), wantTw, 1e-3), `got ${got.toFixed(4)}`);
}
check("WBGT rises with air temperature", wbgtEstimate(40, 40) > wbgtEstimate(35, 40), "");
check("WBGT rises with humidity", wbgtEstimate(38, 60) > wbgtEstimate(38, 20), "");
check("WBGT is below air temperature in dry heat (40 C, 15 %)", wbgtEstimate(40, 15) < 40, `got ${wbgtEstimate(40, 15).toFixed(1)}`);

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
