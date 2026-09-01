import { readFileSync } from "node:fs";
import { profiles } from "../scripts/goldenMaster.mjs";
import { intensitySplit } from "../src/engine/loadModel.ts";
import { HARD_DISC_WEIGHT } from "../src/engine/constraintMatrix.ts";
// Mesure APRÈS sur les plans reconstruits en direct (pas la photo, qui est l'AVANT).
const cibles = [...profiles()].filter(({a}) => parseInt(a.age||"99") < 18);
for (const { key, sport, a } of cibles) {
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch(e){ console.log(key.padEnd(42)+" REFUS"); continue; }
  let best=0,bestW=0,vo2=0,tot=0;
  for (const w of p.weeks||[]) { let h=0,hw=0;
    for (const d of w.days||[]) for (const s of d.sessions||[]) { tot+=s.min||0;
      try{const sp=intensitySplit(s); h+=sp.hardMin; for(const k2 in sp.hardByDisc) hw+=sp.hardByDisc[k2]*(HARD_DISC_WEIGHT[k2]??1);}catch{}
      for (const b of s.steps||[]) if(/\.vo2$/.test(String(b.zone||""))) vo2+=(b.reps||1)*(b.durationMin||0);
    }
    if (hw>bestW){bestW=hw;best=h;}
  }
  console.log(key.padEnd(42)+" âge "+String(a.age).padStart(3)+" · dur max "+bestW.toFixed(0)+"' pondéré ("+best.toFixed(0)+"' brut) · VO2 "+vo2+"' · total "+(tot/60).toFixed(1)+" h");
}
