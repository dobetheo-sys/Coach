import "../src/app/bridge.ts";
const base = { vol_max:"10", sessions_max:"6", dispo:"semaine", off_which:"", injury:"", age:"35",
  ftp_known:"oui", ftp:"250", pace_known:"oui", pace:"4:30", css_known:"oui", css:"1:55",
  format:"marathon", history:"confirme", level:"inter", intent:"competition", races:"oui", race1_prio:"A-", race1_format:"semi" };
const cfgs = [
  ["75sem (pass actuelle)", { plan_start:"2026-01-05", race_date:"2027-06-13", race1_date:"2027-04-18" }],
  ["16sem ancré",           { plan_start:"2026-08-31", race_date:"2026-12-20", race1_date:"2026-11-08" }],
  ["16sem sans ancre",      { race_date:"2026-12-20", race1_date:"2026-11-08" }],
  ["24sem ancré",           { plan_start:"2026-08-31", race_date:"2027-02-14", race1_date:"2027-01-03" }],
];
for (const [label, extra] of cfgs) {
  try {
    const p = globalThis.EBV2.buildPlan("run", { ...base, ...extra });
    let out="(aucune A−)";
    for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions||[]) if (s.race && /A−/.test(s.name)) out = /POUR DE VRAI/.test(s.det||"") ? "det AUTEUR intact" : "det ÉCRASÉ : "+String(s.det).slice(0,60);
    console.log(label.padEnd(22)+" → "+out);
  } catch(e){ console.log(label.padEnd(22)+" → REFUS "+String(e.message||e).slice(0,50)); }
}
