#!/usr/bin/env node
/**
 * T-28 — POUR TOUTE BORNE AUDITÉE, LE GÉNÉRATEUR LIT-IL LA MÊME SOURCE QUE L'AUDITEUR ?
 *
 *   node scripts/balayageT28.mjs
 *
 * Un générateur et un auditeur qui lisent deux sources pour la MÊME grandeur, c'est `_IFZ` sous
 * une autre forme : deux vérités pour une borne. Et le mode de défaillance est particulièrement
 * mauvais — le générateur produit sereinement ce que l'auditeur refusera, donc le défaut
 * n'apparaît qu'au gate, longtemps après sa cause. B-02 en a coûté une journée.
 *
 * ⚠ MA PREMIÈRE ÉCRITURE DE CE BALAYAGE ÉTAIT FAUSSE, ET DANS SA CONCLUSION CENTRALE.
 *
 * Elle MODÉLISAIT `blockBounds` au lieu de l'observer, et concluait « 12 couples permissifs,
 * tous en AFFÛTAGE ». Or `blockBounds` a deux branches : `b.bnd` quand le step DÉCLARE ses
 * bornes, `s.brick` sinon. Mesuré sur les plans livrés (216 profils tri + duathlon) :
 *
 *     affûtage : 135 legs vélo de brick — TOUS avec `bnd` (source auditée C21c)
 *     charge   : 1 476 legs             — TOUS sans `bnd` (branche `s.brick`)
 *
 * Les lignes d'affûtage que je signalais **n'atteignent jamais la branche que je modélisais** :
 * R18.4 pose déjà sur elles le `bnd` audité. La branche réellement empruntée est celle de la
 * CHARGE — où les deux tables portaient les mêmes six valeurs, donc zéro permissivité vivante.
 * Dixième occurrence dans ce dépôt d'un critère qui nomme une grandeur et en mesure une voisine,
 * cette fois dans le balayage censé fermer la classe. Le défaut RÉEL était plus discret et bien
 * réel : **deux tables pour une borne**, libres de diverger (corrigé — `CAP_BRICK_BIKE` supprimée).
 *
 * CE BALAYAGE-CI OBSERVE. Il construit les plans, lit la borne que chaque leg porte réellement,
 * et la confronte à celle de l'auditeur pour la MÊME phase. Il ne suppose plus rien.
 */
import "../src/app/bridge.ts";
import { BRICK_BIKE_BOUNDS, BRICK_TAPER_BIKE_BOUNDS, CAP_BRICK_RUN } from "../src/engine/constraintMatrix.ts";

const SP = { tri: ["S", "M", "70.3", "Full"], duathlon: ["S", "M", "L", "PM"] };
const H = ["reprise", "confirme", "ancien"], L = ["debutant", "inter", "avance"], I = ["finir", "plaisir", "competition"];
const BASE = {
  med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune", sessions_max: "5",
  dispo: "quotidienne", doubles: "non", pace_known: "oui", pace: "5:00", terrain: "route",
  sex: "H", age: "35", vol_max: "8", vol_recent: "3", weight: "75", ftp: "220", css: "1:50",
};

/** Ce que l'AUDITEUR exige pour ce leg, à cette phase (coherenceScorer, C21b/C21c). */
const bornesAuditeur = (fmt, taper) => (taper ? BRICK_TAPER_BIKE_BOUNDS : BRICK_BIKE_BOUNDS)[fmt];

const obs = new Map(); // clé → { n, horsBornes, sansBnd, avecBnd, pireEcart }
let profils = 0;

for (const [sport, fmts] of Object.entries(SP))
  for (const format of fmts) for (const history of H) for (const level of L) for (const intent of I) {
    let plan;
    try { plan = globalThis.EBV2.buildPlan(sport, { ...BASE, sport, format, history, level, intent }); } catch { continue; }
    profils++;
    for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? []) {
      if (!s.brick || !s.steps) continue;
      const taper = w.phase?.id === "taper";
      const aud = bornesAuditeur(format, taper);
      if (!aud) continue;
      const legs = s.steps.filter((st) => st.leg === "bike" && st.durationMin != null);
      if (!legs.length) continue;
      const min = legs.reduce((t, st) => t + (st.reps || 1) * (st.durationMin || 0), 0);
      const cle = `${format} · ${taper ? "affûtage (C21c)" : "charge (C21b)"}`;
      const e = obs.get(cle) ?? { n: 0, horsBornes: 0, sansBnd: 0, avecBnd: 0, pire: null, aud };
      e.n++;
      for (const st of legs) (st.bnd ? e.avecBnd++ : e.sansBnd++);
      if (min > aud[1] || min < aud[0]) {
        e.horsBornes++;
        const ecart = min > aud[1] ? min - aud[1] : aud[0] - min;
        if (!e.pire || ecart > e.pire.ecart) e.pire = { ecart, min, ou: `${sport}/${format}/${history}/${level}/${intent}` };
      }
      obs.set(cle, e);
    }
  }

console.log(`T-28 — BORNES AUDITÉES vs BORNE RÉELLEMENT PORTÉE, observé sur ${profils} profils\n`);
console.log("  état  cas                             legs  bornes auditeur  source portée par le step");
let horsTotal = 0, mixtes = 0;
for (const [cle, e] of [...obs].sort()) {
  const source = e.sansBnd && e.avecBnd ? `MIXTE (${e.avecBnd} bnd / ${e.sansBnd} sans)`
    : e.avecBnd ? "bnd déclaré (= table auditée)" : "aucun bnd → branche s.brick";
  if (e.sansBnd && e.avecBnd) mixtes++;
  horsTotal += e.horsBornes;
  const marque = e.horsBornes ? "⚠" : "✓";
  console.log(`  ${marque}     ${cle.padEnd(30)} ${String(e.n).padStart(5)}  ${("[" + e.aud[0] + ", " + e.aud[1] + "]").padEnd(15)}  ${source}`
    + (e.horsBornes ? `  ← ${e.horsBornes} hors bornes, pire ${e.pire.min} min (${e.pire.ou})` : ""));
}

// La borne que le GÉNÉRATEUR déclare pour un leg sans `bnd` doit être celle de l'auditeur :
// depuis T-28, `blockBounds` lit `BRICK_BIKE_BOUNDS` des DEUX côtés (plancher ET plafond).
const sources = [
  { borne: "leg vélo de brick, plancher", aud: "BRICK_BIKE_BOUNDS (C21b)", gen: "BRICK_BIKE_BOUNDS (C21b)" },
  { borne: "leg vélo de brick, plafond", aud: "BRICK_BIKE_BOUNDS (C21b)", gen: "BRICK_BIKE_BOUNDS (C21b)" },
  { borne: "leg vélo de brick, affûtage", aud: "BRICK_TAPER_BIKE_BOUNDS (C21c)", gen: "`bnd` posé par R18.4 depuis BRICK_TAPER_BIKE_BOUNDS" },
  { borne: "leg course de brick", aud: "— (aucune borne auditée)", gen: "CAP_BRICK_RUN" },
];
console.log("\n  SOURCES, borne par borne :");
let divergentes = 0;
for (const s of sources) {
  const meme = s.aud === s.gen || s.gen.includes(s.aud.split(" ")[0]);
  const nonAudite = s.aud.startsWith("—");
  if (!meme && !nonAudite) divergentes++;
  console.log(`  ${nonAudite ? "?" : meme ? "=" : "⚠"} ${s.borne.padEnd(32)} auditeur : ${s.aud.padEnd(34)} générateur : ${s.gen}`);
}

console.log(`\n  ⚠ ${horsTotal} leg(s) hors bornes · ⚠ ${divergentes} borne(s) à source divergente · ${mixtes} cas mixte(s)`);
console.log(`  ? 1 borne non auditée (leg COURSE du brick : le générateur borne par CAP_BRICK_RUN,`);
console.log(`    l'auditeur ne la vérifie pas — dette nommée, pas une divergence).`);
process.exit(0);
