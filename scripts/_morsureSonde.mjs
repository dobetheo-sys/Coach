import "../src/app/bridge.ts";
import { profiles } from "./goldenMaster.mjs";
const out = [];
for (const { key, sport, a } of profiles()) {
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  let h = 0;
  for (const w of p.weeks || []) for (const d of w.days || []) for (const s of d.sessions || []) h += (s.min || 0);
  out.push(key + "\t" + Math.round(h));
}
console.log(out.join("\n"));
