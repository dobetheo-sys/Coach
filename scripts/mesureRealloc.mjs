#!/usr/bin/env node
/**
 * §3 — QUAND LE PLAFOND DE TEMPS DUR RETIRE UN BLOC, LA SEMAINE RÉTRÉCIT-ELLE OU RÉALLOUE-T-ELLE ?
 *
 *   node scripts/mesureRealloc.mjs
 *
 * L'hypothèse du fondateur (arbitrage du 14/08, §3) : « retirer de l'intensité devrait LIBÉRER
 * de la capacité pour du volume facile, pas en supprimer. C'est ce que ferait un entraîneur :
 * la séance de qualité tombe, elle est remplacée par de l'endurance de durée au moins égale. »
 *
 * Le test est direct et ne dépend d'aucune règle intermédiaire : on prend un profil, on
 * DESSERRE le plafond de temps dur (en le rendant inatteignable), et on compare le plan obtenu
 * à celui du plafond normal. Si la seule différence est « moins de dur », la semaine a rétréci
 * d'autant → il manque une règle de réallocation. Si le total tient, la réallocation existe.
 *
 * ⚠ CETTE VERSION COMPARE `reprise` ET `confirme` POUR OBTENIR DEUX PLAFONDS, ET C'EST UNE
 * MAUVAISE ISOLATION — gardée écrite parce que c'est ce qu'elle a coûté : l'historique change
 * AUSSI `HISTORY_CAPS` et `RECUP_EVERY`, donc trois grandeurs bougent ensemble et le verdict
 * sortait « partielle » partout, ce qui ne veut rien dire.
 *
 * LA MESURE QUI COMPTE (RAPPORT_REALLOCATION.md) a été faite autrement : même profil, même
 * historique, seul le plafond change (override temporaire de `hardTimeCapMin`, retiré après).
 * Verdict : le plafond retire 11 min de dur et la semaine en perd 21 — la coupe emporte du
 * FACILE avec elle. Sur les 949 : ratio médian 1,27, moyenne 1,61, max 2,43.
 */
import "../src/app/bridge.ts";
import { intensitySplit } from "../src/engine/loadModel.ts";
import { weightedHardMin, hardTimeCapMin } from "../src/engine/constraintMatrix.ts";
import { estCharge } from "./lib/planMetrics.mjs";

const BASE = {
  intent: "competition", med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune",
  sessions_max: "5", dispo: "quotidienne", doubles: "oui", pace_known: "oui", vol_recent: "3",
  terrain: "route", sex: "H", age: "35", vol_max: "8",
};

/** Le détail d'une semaine : total, dur pondéré, modéré, facile. */
function bilan(w) {
  let e = 0, m = 0, h = 0, hp = 0;
  for (const d of w.days ?? []) for (const s of d.sessions ?? []) {
    const sp = intensitySplit(s);
    e += sp.easyMin; m += sp.modMin; h += sp.hardMin; hp += weightedHardMin(sp.hardByDisc);
  }
  return { tot: e + m + h, easy: e, mod: m, hard: h, hardPond: hp, n: (w.days ?? []).flatMap((d) => d.sessions ?? []).filter((s) => s.d !== "rs").length };
}

const CAS = [
  { nom: "semi/inter/4:30 (le témoin du §3)", over: { format: "semi", level: "inter", pace: "4:30" } },
  { nom: "10k/inter/4:30", over: { format: "10k", level: "inter", pace: "4:30" } },
  { nom: "5k/inter/8:30", over: { format: "5k", level: "inter", pace: "8:30" } },
];

console.log("§3 — RÉALLOCATION : le plafond de temps dur retire-t-il, ou remplace-t-il ?\n");
console.log("On compare le MÊME profil sous deux plafonds (C26b : reprise 35 min · confirme 60 min).");
console.log("Si la réallocation existe, le TOTAL de la semaine de pic ne doit pas suivre le plafond.\n");

for (const { nom, over } of CAS) {
  console.log(nom);
  const lignes = [];
  for (const history of ["reprise", "confirme"]) {
    const plan = globalThis.EBV2.buildPlan("run", { ...BASE, ...over, history });
    const charge = (plan.weeks ?? []).filter(estCharge).map(bilan);
    if (!charge.length) continue;
    const pic = charge.reduce((x, y) => (y.tot > x.tot ? y : x));
    const cap = hardTimeCapMin({ history, level: over.level });
    lignes.push({ history, cap, ...pic });
  }
  console.log("  historique   plafond   total   facile   modéré   dur(pond.)   séances");
  for (const l of lignes)
    console.log(`  ${l.history.padEnd(12)} ${String(l.cap).padStart(5)} ${Math.round(l.tot).toString().padStart(8)} ${Math.round(l.easy).toString().padStart(8)} ${Math.round(l.mod).toString().padStart(8)} ${Math.round(l.hardPond).toString().padStart(10)} ${String(l.n).padStart(10)}`);
  if (lignes.length === 2) {
    const [r, c] = lignes;
    const dDur = c.hardPond - r.hardPond;
    const dTot = c.tot - r.tot;
    const dFacile = c.easy - r.easy;
    const verdict = Math.abs(dTot - dDur) < 5
      ? "⚠ RÉTRÉCISSEMENT — le total suit le dur minute pour minute : rien ne remplace ce qui est retiré"
      : Math.abs(dTot) < 5
        ? "✓ RÉALLOCATION — le total tient, le facile a pris la place"
        : `~ PARTIELLE — dur ${dDur > 0 ? "+" : ""}${Math.round(dDur)} min, total ${dTot > 0 ? "+" : ""}${Math.round(dTot)}, facile ${dFacile > 0 ? "+" : ""}${Math.round(dFacile)}`;
    console.log("  → " + verdict + "\n");
  }
}
