// Evaluates lib/thermal.ts on the input sets passed as JSON on stdin; prints JSON results.
import { radiantTermFromShortwave, tmrtFromShortwave, utci, wbgtEstimate, wetBulbStull } from "../../lib/thermal.ts";
let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const out = JSON.parse(raw).map(([ta, rh, wind, sw]) => ({
  tw: wetBulbStull(ta, rh),
  wbgt: wbgtEstimate(ta, rh, radiantTermFromShortwave(sw)),
  utci: utci(ta, tmrtFromShortwave(ta, sw), wind, rh),
}));
console.log(JSON.stringify(out));
