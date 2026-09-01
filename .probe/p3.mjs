import "../src/app/bridge.ts";
const a = JSON.parse(process.argv[2]);
const p = globalThis.EBV2.buildPlan("duathlon", a);
const dec=(p._v2?.decisions||[]).find(d=>d.id==="R6.1b"); console.log("R6.1b:", dec?dec.val:"—");
let worst=null;
for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions||[]) for (const b of s.steps||[])
  if (/rp|thr|vo2/.test(String(b.zone||""))) { const t=(b.reps||1)*(b.durationMin||0); if(!worst||t>worst.t) worst={t,z:b.zone,n:s.name,w:w.num}; }
console.log("pire dose qualité:", worst);
for (const w of p.weeks.slice(36,39)) console.log("S"+w.num, w.days.map(d=>(d.sessions||[]).map(s=>s.d+":"+s.name+"("+Math.round(s.min||0)+")").join("+")).filter(x=>x).join(" | "));
