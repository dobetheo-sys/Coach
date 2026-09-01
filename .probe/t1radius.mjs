import { readFileSync } from "node:fs";
import { profiles } from "../scripts/goldenMaster.mjs";
const photo = JSON.parse(readFileSync("golden/plans.full.json", "utf8"));
const maxSw = (p) => { let m=0; for(const w of p.weeks||[]) for(const d of w.days||[]) for(const s of d.sessions||[]) if(s.d==="sw"){let x=0;for(const b of s.steps||[])if(b.distanceM)x+=(b.reps||1)*b.distanceM;m=Math.max(m,x);} return m; };
let grow=[];
for (const { key, sport, a } of profiles()) {
  if (a.level !== "debutant" || !photo[key] || photo[key].REFUS) continue;
  if (!/swim|tri/.test(sport)) continue;
  let p2; try { p2 = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  const av = maxSw(photo[key]), ap = maxSw(p2);
  if (ap > av + 25) grow.push(key+" : "+av+" → "+ap+" m");
}
console.log("débutants dont la plus grosse séance de nage GRANDIT : "+grow.length);
for (const g of grow.slice(0,10)) console.log("  "+g);
