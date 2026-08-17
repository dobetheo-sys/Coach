#!/usr/bin/env node
/**
 * §1 — LE RACCOURCI AVANT TOUTE INSTRUMENTATION (TRACE_BLOC_BRICK_ET_SCEAU.md).
 *
 *   node scripts/traceBrick.mjs
 *
 * Le leg vélo du brick passe de 79 à 95 min quand la réallocation est posée, soit ×1,2025,
 * au-dessus de la borne auditée C21b (90). Question unique : de combien le TOTAL de la semaine
 * grandit-il sur ce même profil ?
 *
 *   ≈ +20 %  → une passe PROPORTIONNELLE redistribue sur le total, et « exclu des receveuses »
 *              ne protège de rien contre un rééchelonnement postérieur (suspect : sessionScale)
 *   ≠ +20 %  → ce n'est pas proportionnel, bisection sur les passes (§2)
 *
 * Sonde : `globalThis.EB_NO_REALLOC` court-circuite la restitution dans le générateur.
 * TEMPORAIRE — retirée du générateur une fois la cause trouvée.
 */
import "../src/app/bridge.ts";

const PROFIL = {
  sport: "duathlon", format: "S", history: "ancien", level: "debutant", intent: "finir",
  med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune",
  sessions_max: "5", dispo: "quotidienne", doubles: "non", pace_known: "oui", pace: "5:00",
  terrain: "route", sex: "H", age: "35", vol_max: "8", vol_recent: "3", weight: "75", ftp: "220",
};

const totalOf = (w) => (w.days ?? []).reduce((t, d) => t + (d.sessions ?? []).reduce((u, s) => u + (s.min || 0), 0), 0);
const brickBikeOf = (w) => {
  let max = 0;
  for (const d of w.days ?? []) for (const s of d.sessions ?? []) {
    if (!s.brick || !s.steps) continue;
    const m = s.steps.filter((st) => st.leg === "bike" && st.durationMin != null)
      .reduce((t, st) => t + (st.reps || 1) * (st.durationMin || 0), 0);
    if (m > max) max = m;
  }
  return max;
};

function build(sansRealloc) {
  globalThis.EB_NO_REALLOC = sansRealloc;
  const plan = globalThis.EBV2.buildPlan(PROFIL.sport, PROFIL);
  globalThis.EB_NO_REALLOC = false;
  return (plan.weeks ?? []).map((w) => ({ num: w.num, phase: w.phase?.id, recup: !!w.isRecup, tot: totalOf(w), brick: brickBikeOf(w) }));
}

const sans = build(true);
const avec = build(false);

console.log("§1 — duathlon/S/ancien/debutant/finir : le total de semaine grandit-il de +20 % ?\n");
console.log("  sem  phase       tot(sans)  tot(avec)   ratio   brick(sans)  brick(avec)   ratio");
let pireBrick = null;
for (let i = 0; i < sans.length; i++) {
  const a = sans[i], b = avec[i];
  const rT = a.tot ? b.tot / a.tot : 1;
  const rB = a.brick ? b.brick / a.brick : null;
  if (b.brick > 90 && (!pireBrick || b.brick > pireBrick.b.brick)) pireBrick = { a, b, rT, rB };
  console.log(
    "  " + String(a.num).padStart(3) + "  " + String(a.phase + (a.recup ? "*" : "")).padEnd(10)
    + String(Math.round(a.tot)).padStart(9) + String(Math.round(b.tot)).padStart(11)
    + rT.toFixed(4).padStart(9)
    + String(Math.round(a.brick) || "-").padStart(13) + String(Math.round(b.brick) || "-").padStart(13)
    + (rB ? rB.toFixed(4).padStart(9) : "        -"),
  );
}

console.log("\n  ratio du BLOC observé (rapport) : 95 / 79 = 1,2025");
if (pireBrick) {
  const { a, b, rT, rB } = pireBrick;
  console.log("  semaine du pire brick hors bornes : S" + a.num + " (" + a.phase + ")");
  console.log("    total  " + Math.round(a.tot) + " → " + Math.round(b.tot) + "  (×" + rT.toFixed(4) + ")");
  console.log("    brick  " + Math.round(a.brick) + " → " + Math.round(b.brick) + "  (×" + rB.toFixed(4) + ")");
  const ecart = Math.abs(rT - rB);
  console.log("\n  → " + (ecart < 0.02
    ? "PROPORTIONNEL : le total grandit du même facteur que le bloc → une passe d'échelle (suspect sessionScale)"
    : "NON PROPORTIONNEL (écart " + ecart.toFixed(4) + ") → bisection sur les passes (§2)"));
} else {
  console.log("  → aucun brick au-dessus de 90 sur ce profil : vérifier les paramètres.");
}
