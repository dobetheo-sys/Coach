import "../src/app/bridge.ts";
const A = JSON.parse(process.argv[2]);
const p = globalThis.EBV2.buildPlan("swimrun", A);
const dec = (p._v2?.decisions||[]).filter(d=>/R6\.1b|R6\.1|R6\.3/.test(d.id));
console.log("décisions:", JSON.stringify(dec));
let maxCont=0, vo2=0;
for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions||[]) {
  for (const b of (s.steps||[])) {
    if (/vo2/.test(String(b.zone||""))) vo2++;
    if ((b.d||s.d)==="sw" && (b.reps||1)===1 && b.distanceM) maxCont=Math.max(maxCont,b.distanceM);
  }
}
console.log("maxCont(sw continu)=",maxCont," blocs vo2=",vo2);
for (const w of p.weeks.slice(0,4)) console.log("S"+w.num, w.days.map(d=>(d.sessions||[]).map(s=>s.d+":"+s.name).join("+")).join(" | "));
