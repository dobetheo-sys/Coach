#!/usr/bin/env node
/**
 * B-17 §1 — LA PHASE SPÉCIFIQUE PORTE-T-ELLE TOUJOURS 4 « Nage seuil (+dist) » ?
 *
 *   node scripts/mesureB17.mjs
 *
 * La progression de B-17 demande QUATRE occurrences (~50 → 70 → 90 → 100 % de la distance de
 * course). Si la phase `spec` n'en porte pas quatre, la progression ne se comprime PAS — elle
 * devient une condition du même gate (une prépa trop étroite pour construire la continuité est
 * trop courte pour ce format, et R11.4 refuse déjà sur ce motif).
 *
 * On mesure AVANT de câbler : le cas peut-il seulement se produire ? On balaie chaque format de
 * triathlon depuis SON horizon minimal (`EBV2.minWeeks`) jusqu'à un horizon confortable.
 */
import "../src/app/bridge.ts";
import { MIN_WEEKS } from "../src/engine/constraintMatrix.ts";

const BASE = {
  intent: "competition", level: "inter", history: "confirme", dispo: "quotidienne", doubles: "non",
  sessions_max: "6", age: "35", sex: "H", weight: "75", vol_max: "12", vol_recent: "6",
  injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non",
  pace_known: "oui", pace: "5:00", ftp_known: "oui", ftp: "220", css_known: "oui", css: "1:50",
  terrain: "route",
};
const lundi = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
const courseDans = (n) => { const d = lundi(); d.setDate(d.getDate() + n * 7 - 1); return d.toISOString().slice(0, 10); };

const NOM = /Nage seuil/;
console.log("B-17 §1 — « Nage seuil (+dist) » DANS LA PHASE SPÉCIFIQUE  (axe : formats de TRIATHLON)\n");
console.log("  format │ minWeeks │ horizon │ semaines spec │ occurrences dans spec │ ≥ 4 ?");
let jamaisSous4 = true;
for (const format of ["S", "M", "70.3", "Full"]) {
  // ⚠ MA PREMIÈRE ÉCRITURE APPELAIT `EBV2.minWeeks(...)` — c'est un OBJET, pas une fonction :
  // `mw` valait `?`, mes horizons étaient arbitraires (20 à 34), et le Full — le format que la
  // question visait — était REFUSÉ aux quatre, donc jamais mesuré. Le verdict « le cas existe »
  // ne reposait alors que sur `tri/S`. La table est lue à sa source.
  const mw = MIN_WEEKS.tri?.[format] ?? null;
  const base = typeof mw === "number" ? mw : 20;
  for (const h of [base, base + 2, base + 6, base + 14]) {
    let p;
    try { p = globalThis.EBV2.buildPlan("tri", { ...BASE, sport: "tri", format, race_date: courseDans(h) }); }
    catch (e) { console.log(`  ${format.padEnd(6)} │ ${String(mw ?? "?").padStart(8)} │ ${String(h).padStart(7)} │ REFUS D'ENTRÉE (${String(e.message || e).slice(0, 40)})`); continue; }
    const spec = (p.weeks ?? []).filter((w) => w.phase?.id === "spec");
    let n = 0;
    for (const w of spec) for (const d of w.days ?? []) for (const s of d.sessions ?? [])
      if (s.d === "sw" && NOM.test(String(s.name || ""))) n++;
    if (n < 4) jamaisSous4 = false;
    console.log(`  ${format.padEnd(6)} │ ${String(mw ?? "?").padStart(8)} │ ${String(h).padStart(7)} │ ${String(spec.length).padStart(13)} │ ${String(n).padStart(21)} │ ${n >= 4 ? "oui" : "NON"}`);
  }
}
console.log(`\n  → ${jamaisSous4
  ? "LE CAS NE SE PRODUIT PAS sur ce balayage : dès l'horizon MINIMAL de chaque format, la phase\n    spécifique porte au moins quatre « Nage seuil ». La branche « progression qui ne tient pas »\n    est donc à ASSERTER au sceau plutôt qu'à implémenter."
  : "LE CAS EXISTE : la branche « progression qui ne tient pas → condition du gate » doit être\n    câblée, et jamais une compression des paliers."}`);
