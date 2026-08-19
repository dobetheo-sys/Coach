/**
 * §5 — LA CIRCULARITÉ EST-ELLE PROPRE À LA NAGE ? (question de cadrage du fondateur, 19/08/2026)
 *
 * Elle décide entre « une conversion » et « une réarchitecture », et elle se mesure AVANT
 * d'écrire O-43, pas après — le même geste qui a évité de traiter T-16c comme un chantier.
 *
 * Le chemin, tel qu'il s'EXÉCUTE (`stepWorkMin`) :
 *
 *   bloc prescrit en MINUTES  →  `reps × durationMin`            aucune conversion
 *   bloc prescrit en MÈTRES   →  distance ÷ (repère × ratio de ZONE)   ← la circularité
 *
 * Deux moitiés, parce qu'une seule ne tranche pas :
 *   §A STRUCTURE    quelle part des minutes de corps de chaque discipline passe par une
 *                   conversion de zone ? (ce qui est ÉCRIT)
 *   §B COMPORTEMENT on perturbe UNE définition de zone (+16 %, une re-tarification pure) et on
 *                   regarde si le PLAN LIVRÉ bouge — c'est la même expérience que `T-34`,
 *                   étendue aux trois disciplines. (ce qui s'EXÉCUTE, règle 15)
 *
 *   npm run mesure:circularite
 */
import "../src/app/bridge.ts";
import { ZDEF } from "../src/generator/renderer.ts";
import { profiles } from "./goldenMaster.mjs";

// ─── §A — la structure : d'où viennent les minutes de corps, par discipline ────────────────
const parDisc = new Map();
let profils = 0;
for (const { sport, a } of profiles()) {
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  profils++;
  for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) {
    if (s.d === "rs") continue;
    for (const b of s.steps || []) {
      if (b.role !== "body") continue;
      const disc = b.d || s.d;
      const e = parDisc.get(disc) || { minutes: 0, minutesConverties: 0, blocs: 0, blocsConvertis: 0 };
      // On ne recalcule pas la conversion : on lit ce que le moteur a émis (`_min`, R5.6a) et
      // on regarde par quelle BRANCHE le bloc y est passé — sa PRESCRIPTION, pas notre modèle.
      const min = b._min ?? 0;
      e.minutes += min; e.blocs++;
      if (b.distanceM != null) { e.minutesConverties += min; e.blocsConvertis++; }
      parDisc.set(disc, e);
    }
  }
}
if (!profils) { console.error("✖ sonde vide"); process.exit(1); }

console.log("§A — STRUCTURE : quelle part des minutes de corps passe par une conversion de ZONE ?\n");
console.log("  disc   blocs   dont en mètres      minutes   dont converties");
const DISC = { sw: "nage", bk: "vélo", rn: "course", br: "brick", tr: "trail" };
for (const [d, e] of [...parDisc].sort((x, y) => y[1].minutes - x[1].minutes)) {
  const pctB = 100 * e.blocsConvertis / Math.max(1, e.blocs);
  const pctM = 100 * e.minutesConverties / Math.max(1, e.minutes);
  console.log("  " + String(DISC[d] || d).padEnd(7) + String(e.blocs).padStart(6)
    + String(e.blocsConvertis).padStart(9) + " (" + pctB.toFixed(0).padStart(3) + " %)"
    + String(Math.round(e.minutes / 60)).padStart(11) + " h"
    + String(Math.round(e.minutesConverties / 60)).padStart(9) + " h (" + pctM.toFixed(0).padStart(3) + " %)");
}

// ─── §B — le comportement : re-tarifer UNE zone déplace-t-il le PLAN LIVRÉ ? ───────────────
// Une re-tarification est un changement de COMPTABILITÉ, pas d'entraînement : le plan livré ne
// devrait pas bouger. C'est le critère de T-34, appliqué aux trois disciplines.
const CAS = [
  { sport: "swim",  zone: "sw.easy", a: { format: "fond", history: "reprise", level: "debutant", intent: "finir",
      sessions_max: "6", dispo: "quotidienne", doubles: "non", age: "35", sex: "H", css: "2:00", css_known: "oui",
      vol_max: "10", vol_recent: "0", injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non",
      milieu: "bassin", swim_limit: "technique" } },
  { sport: "bike",  zone: "bk.z2", a: { format: "cyclo", history: "confirme", level: "inter", intent: "competition",
      sessions_max: "6", dispo: "quotidienne", doubles: "non", age: "35", sex: "H", ftp: "230", ftp_known: "oui",
      vol_max: "10", vol_recent: "6", injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non", terrain: "plat" } },
  { sport: "run",   zone: "rn.easy", a: { format: "marathon", history: "confirme", level: "inter", intent: "competition",
      sessions_max: "6", dispo: "quotidienne", doubles: "non", age: "35", sex: "H", pace: "4:30", pace_known: "oui",
      vol_max: "10", vol_recent: "6", injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non", terrain: "route" } },
];

const lire = (sport, a) => {
  const p = globalThis.EBV2.buildPlan(sport, a);
  const jours = Math.max(...(p.weeks ?? []).map((w) => (w.days ?? []).filter((d) => (d.sessions ?? []).some((s) => s.d !== "rs" && s.min > 0)).length));
  const ch = {};
  for (const x of p._r202?.plafonds ?? []) ch[String(x.id ?? x.nom)] = x.livre;
  return { pic: p.volPeak, jours, ch };
};

console.log("\n§B — COMPORTEMENT : re-tarifer une zone de +16 % (comptabilité pure) déplace-t-il le plan ?\n");
console.log("  sport   zone        pic livré      jours   maillons de la chaîne R20.2 qui bougent");
const verdicts = [];
for (const { sport, zone, a } of CAS) {
  const memo = { ...ZDEF[zone] };
  let avant, apres;
  try { avant = lire(sport, a); } catch (e) { console.log("  " + sport + " : " + String(e.message).slice(0, 60)); continue; }
  ZDEF[zone].lo = memo.lo * 1.16; ZDEF[zone].hi = memo.hi * 1.16;
  try { apres = lire(sport, a); } finally { ZDEF[zone].lo = memo.lo; ZDEF[zone].hi = memo.hi; }
  const dPic = avant.pic > 0 ? Math.abs(apres.pic - avant.pic) / avant.pic : 0;
  const maillons = Object.keys(avant.ch)
    .filter((k) => avant.ch[k] > 0 && Math.abs((apres.ch[k] ?? 0) - avant.ch[k]) / avant.ch[k] > 0.01)
    .map((k) => k + " " + avant.ch[k].toFixed(2) + "→" + (apres.ch[k] ?? 0).toFixed(2));
  const bouge = dPic > 0.01 || avant.jours !== apres.jours;
  verdicts.push({ sport, bouge });
  console.log("  " + sport.padEnd(8) + zone.padEnd(11)
    + (avant.pic + " → " + apres.pic + " h").padEnd(15)
    + (avant.jours + " → " + apres.jours).padEnd(8)
    + (maillons.join(" · ") || "aucun") + (bouge ? "   ← BOUGE" : ""));
}

console.log("\n" + "─".repeat(78));
const bougent = verdicts.filter((v) => v.bouge).map((v) => v.sport);
if (!verdicts.length) { console.error("✖ aucun cas mesuré — le verdict n'a pas de base"); process.exit(1); }
console.log(bougent.length === 1 && bougent[0] === "swim"
  ? "→ LA CIRCULARITÉ EST PROPRE À LA NAGE : seule elle est prescrite en mètres, donc seule elle\n"
    + "  traverse une conversion de zone. La redécoupe d'O-43 est une CONVERSION UNIQUE au repère\n"
    + "  déclaré — le petit correctif, pas la réarchitecture."
  : bougent.length === 0
    ? "→ AUCUN plan ne bouge : la circularité ne s'exprime plus sur ces profils — re-mesurer avant\n  de conclure (le cas de T-34 est peut-être le seul, ou la sonde ne mord pas ici)."
    : "→ LA CIRCULARITÉ N'EST PAS PROPRE À LA NAGE (" + bougent.join(", ") + ") : la sonde entière lit une\n"
      + "  grandeur composition-dépendante, et le correctif change de nature.");
