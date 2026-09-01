import { readFileSync } from "node:fs";
import { profiles } from "../scripts/goldenMaster.mjs";
const photo = JSON.parse(readFileSync("golden/plans.full.json", "utf8"));
const NOM2ID={"Base":"base","Développement":"dev","Spécifique":"spec","Peak":"peak","Affûtage":"taper"};
const tapers = (p) => { const wk=(p.weeks||[]).map(w=>{let t=0;for(const d of w.days||[])for(const s of d.sessions||[])t+=s.min||0;return{n:w.num,r:!!w.isRecup,ph:NOM2ID[w.phase?.nom]||w.phase?.id,t};});
  const pic=Math.max(0,...wk.filter(x=>!x.r&&x.ph!=="taper").map(x=>x.t));
  return wk.filter(x=>x.ph==="taper"&&x.t>0).map(x=>({n:x.n,r:x.t/pic})); };
let worstAv=[], worstAp=[], over=0, n=0;
for (const { key, sport, a } of profiles()) {
  if (sport!=="trail" || !photo[key] || photo[key].REFUS) continue;
  let p2; try { p2=globalThis.EBV2.buildPlan(sport,a); } catch { continue; }
  for (const t of tapers(photo[key])) worstAv.push({key,...t});
  for (const t of tapers(p2)) { n++; worstAp.push({key,...t}); if (t.r>0.551) over++; }
}
worstAv.sort((a,b)=>b.r-a.r); worstAp.sort((a,b)=>b.r-a.r);
console.log("AVANT — pires ratios affûtage/pic :"); for (const w of worstAv.slice(0,4)) console.log("  "+w.key+" S"+w.n+" "+w.r.toFixed(2));
console.log("APRÈS — pires :"); for (const w of worstAp.slice(0,4)) console.log("  "+w.key+" S"+w.n+" "+w.r.toFixed(2));
console.log("semaines d'affûtage > 0,55 après : "+over+"/"+n);
