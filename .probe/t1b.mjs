import "../src/app/bridge.ts";
const base = { vol_max:"10", sessions_max:"6", dispo:"semaine", off_which:"", injury:"", age:"35",
  ftp_known:"oui", ftp:"250", pace_known:"oui", pace:"4:30", css_known:"oui", css:"1:55",
  format:"marathon", history:"confirme", level:"inter", intent:"competition", races:"oui", race1_prio:"A-", race1_format:"semi" };
// Émule ce que la fixture RELATIVE donnait le 25/08 : ancre au lundi de cette semaine-là.
const cfgs = [
  ["ancre 24/08 (émule le 25/08)", { plan_start:"2026-08-24", race_date:"2026-12-15", race1_date:"2026-11-03" }],
  ["ancre 24/08, course dim",      { plan_start:"2026-08-24", race_date:"2026-12-13", race1_date:"2026-11-01" }],
  ["ancre 31/08, course mar",      { plan_start:"2026-08-31", race_date:"2026-12-22", race1_date:"2026-11-10" }],
];
for (const [label, extra] of cfgs) {
  try {
    const p = globalThis.EBV2.buildPlan("run", { ...base, ...extra });
    let out="(aucune A−)";
    for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions||[]) if (s.race && /A−/.test(s.name)) out = /POUR DE VRAI/.test(s.det||"") ? "AUTEUR intact" : "ÉCRASÉ : "+String(s.det).slice(0,55);
    console.log(label.padEnd(30)+" → "+out);
  } catch(e){ console.log(label.padEnd(30)+" → REFUS "+String(e.message||e).slice(0,40)); }
}
