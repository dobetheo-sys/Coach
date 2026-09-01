import "../src/app/bridge.ts";
const A = JSON.parse(process.argv[2]);
const p = globalThis.EBV2.buildPlan("swimrun", A);
for (const w of p.weeks.slice(0,2)) console.log("S"+w.num, w.days.map(d=>`[${d.slot||"-"}/${d.charge||"-"}]`+(d.sessions||[]).map(s=>s.d+":"+s.name).join("+")).join(" | "));
