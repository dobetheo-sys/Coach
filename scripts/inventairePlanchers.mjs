#!/usr/bin/env node
/**
 * L'INVENTAIRE DES PLANCHERS — L'ORDRE DE COMPRESSION, MESURÉ SUR LE LIVRÉ.
 *
 *   node scripts/inventairePlanchers.mjs [sport]
 *
 * Retour du fondateur (« L'INVENTAIRE DES PLANCHERS *EST* LA POLITIQUE », 18/08/2026) :
 *
 *   « qui a un plancher ne paie pas · qui n'en a pas paie tout »
 *   → l'ordre de compression n'est écrit nulle part et il est pourtant complet :
 *     il se lit dans la liste des planchers.
 *
 * CE SCRIPT NE LIT PAS LE CODE. `blockBounds` est la seule source de bornes du moteur, mais
 * l'inventorier en le GREPANT donnerait la liste DÉCLARÉE, pas l'ordre RÉEL — c'est la faute
 * que la règle 15 nomme (« mesurer ce qui est ÉCRIT au lieu de ce qui s'EXÉCUTE donne un
 * rapport faux avec un raisonnement juste »). On mesure donc par le COMPORTEMENT : même
 * athlète, enveloppe qu'on SERRE, et on regarde ce que le plan livré fait de chaque type.
 *
 * UN SEUL FACTEUR BOUGE : `vol_max`. Tout le reste est constant, et `vol_recent` est épinglé
 * BAS (3 h) pour que le plancher O-69 ne s'active jamais — sans quoi deux forces bougeraient
 * ensemble et l'ordre mesuré serait leur somme. La contrainte `vol_max < vol_recent` (qui
 * DÉSACTIVE O-69) ne peut donc pas se déclencher non plus.
 *
 * Ce qu'on lit dans la sortie :
 *   · un type dont les minutes/séance s'arrêtent net sur une valeur et n'en bougent plus
 *     A un plancher — il cesse de payer, la compression va chercher ailleurs ;
 *   · un type dont les minutes descendent sans butée, ou dont le NOMBRE d'occurrences tombe,
 *     n'en a pas — c'est lui qui paie.
 * La distinction minutes/occurrences est celle d'O-66 : un type peut payer en RÉTRÉCISSANT
 * ou en DISPARAISSANT, et ce ne sont pas les mêmes protections.
 */
import "../src/app/bridge.ts";

const SPORT = process.argv[2] || "tri";
const PROFILS = {
  tri: {
    sport: "tri", intent: "competition", format: "70.3", history: "confirme", level: "inter",
    sessions_max: "12", dispo: "quotidienne", shift_ok: "oui", off_days: "non", doubles: "oui",
    injury: "aucune", age: "35", sex: "H", weight: "85", med_pain: "non", med_dizzy: "non",
    med_treat: "non", terrain: "vallonne", leg_swim_env: "lac", milieu: "bassin",
    longest_swim_m: "1000", longest_swim_known: "oui", pace_known: "oui", pace: "4:42",
    ftp_known: "oui", ftp: "236", css_known: "oui", css: "2:02",
    plan_start: "2026-08-17", race_date: "2027-05-23",
  },
  run: {
    sport: "run", intent: "competition", format: "marathon", history: "confirme", level: "inter",
    sessions_max: "6", dispo: "quotidienne", shift_ok: "oui", off_days: "non", doubles: "non",
    injury: "aucune", age: "35", sex: "H", weight: "72", med_pain: "non", med_dizzy: "non",
    med_treat: "non", terrain: "vallonne", pace_known: "oui", pace: "4:42",
    plan_start: "2026-08-17", race_date: "2027-05-23",
  },
};
const BASE = { ...PROFILS[SPORT], vol_recent: "3" };
const PRESSIONS = ["20", "16", "13", "11", "9", "7", "6", "5", "4"];

/** La FAMILLE d'un type de séance : le nom, débarrassé de ce qui varie avec l'occurrence
 *  (« (matin) », « (+dist) », les chiffres). Deux « Nage seuil » de deux semaines sont le même
 *  type ; « Nage seuil » et « Nage vitesse » ne le sont pas. */
const famille = (nom) => String(nom || "")
  .replace(/\s*\([^)]*\)/g, "").replace(/\d+/g, "").replace(/\s+/g, " ").trim();

const mesure = (volMax) => {
  const p = globalThis.EBV2.buildPlan(BASE.sport, { ...BASE, vol_max: volMax });
  const t = new Map();
  let semaines = 0;
  for (const w of p.weeks) {
    if (w.isRecup || w.phase?.id === "taper") continue;   // les décharges ont leurs propres règles
    semaines++;
    for (const d of w.days) for (const s of d.sessions) {
      if (s.d === "rs" || s.race) continue;
      const f = famille(s.name);
      const e = t.get(f) || { n: 0, min: 0, plusPetite: Infinity, durees: [] };
      e.n++; e.min += s.min || 0; e.plusPetite = Math.min(e.plusPetite, s.min || 0);
      e.durees.push(Math.round(s.min || 0));
      t.set(f, e);
    }
  }
  return { t, semaines, total: [...t.values()].reduce((a, e) => a + e.min, 0) };
};

const cols = PRESSIONS.map((v) => ({ v, ...mesure(v) }));
const types = [...new Set(cols.flatMap((c) => [...c.t.keys()]))].sort();

console.log(`INVENTAIRE DES PLANCHERS — ${SPORT} / ${BASE.format} · un seul facteur bouge : vol_max`);
console.log(`(semaines de CHARGE uniquement · vol_recent épinglé à 3 h : le plancher O-69 ne s'active jamais)\n`);
console.log("vol_max déclaré       " + PRESSIONS.map((v) => v.padStart(6)).join(""));
console.log("volume de charge livré" + cols.map((c) => (c.total / 60 / c.semaines).toFixed(1).padStart(6)).join("") + "   h/sem");
console.log("");
console.log("PAR TYPE — minutes de la PLUS PETITE occurrence  (× = le type n'existe plus)");
for (const f of types) {
  const l = cols.map((c) => { const e = c.t.get(f); return (e ? String(Math.round(e.plusPetite)) : "×").padStart(6); }).join("");
  console.log("  " + f.padEnd(34).slice(0, 34) + l);
}
console.log("\nPAR TYPE — nombre d'occurrences sur les semaines de charge");
for (const f of types) {
  const l = cols.map((c) => { const e = c.t.get(f); return (e ? String(e.n) : "×").padStart(6); }).join("");
  console.log("  " + f.padEnd(34).slice(0, 34) + l);
}

// ---- LE VERDICT — DEUX AXES, ET MA PREMIÈRE ÉCRITURE MESURAIT UNE GRANDEUR VOISINE ----
//
// ⚠ FAUTE D'INSTRUMENT, PUBLIÉE. Ma première version cherchait le plancher dans la CONSTANCE de
// la plus petite occurrence sous pression. C'est faux, et la table ci-dessus le montre : « Force
// basse cadence » passe de 31 à 67 min quand on serre — la plus petite MONTE, parce que les
// petites occurrences DISPARAISSENT et que la statistique porte sur une population qui rétrécit.
// Je nommais « le plancher » et je mesurais « le minimum des survivants ». Onzième occurrence de
// cette famille dans ce dépôt.
//
// La signature d'un plancher n'est pas une constante, c'est un ENTASSEMENT : une borne basse fait
// s'empiler les occurrences SUR sa valeur (elles y sont arrêtées), là où un type libre étale sa
// queue basse. On mesure donc, sur toutes les occurrences de toutes les pressions, la part qui
// vit à ±1 min du minimum observé.
//
// Et le second axe est celui d'O-66, indépendant : un type peut payer en RÉTRÉCISSANT ou en
// DISPARAISSANT. Un plancher de MINUTES ne protège en rien du retrait d'une occurrence.
const pct = (x) => (x * 100).toFixed(0) + " %";

// ⚠ SECONDE FAUTE D'INSTRUMENT, PUBLIÉE AUSSI. L'entassement non plus ne mesurait pas le
// plancher : il rendait 0 type sur 12 — un taux SATURÉ, donc l'instrument est en cause avant
// le moteur (règle 15). La cause est réelle et évidente après coup : les occurrences d'un même
// type ont des tailles DIFFÉRENTES selon la phase (base ≠ pic), donc agréger 9 pressions × 40
// semaines dilue n'importe quel empilement. Un plancher ne se voit pas non plus là.
//
// Ce qui se voit, et qui EST la question posée (« l'ordre de compression réel ») : l'ÉLASTICITÉ.
// L'enveloppe perd 60 % entre vol_max 20 et 4. Un type qui perd 5 % RÉSISTE — quelque chose le
// tient. Un type qui perd 60 % ou plus paie sa part, ou davantage.
const ELAST = [];
for (const f of types) {
  const haut = cols[0].t.get(f), bas = [...cols].reverse().find((c) => c.t.get(f))?.t.get(f);
  if (!haut || !bas) continue;
  const mHaut = haut.min / haut.n, mBas = bas.min / bas.n;
  const nHaut = haut.n, nBas = cols.at(-1).t.get(f)?.n || 0;
  ELAST.push({ f, mHaut, mBas, taille: mBas / mHaut, nHaut, nBas, survie: nHaut ? nBas / nHaut : 0 });
}
const envHaut = cols[0].total / cols[0].semaines, envBas = cols.at(-1).total / cols.at(-1).semaines;
console.log(`\n══ AXE 1 — ÉLASTICITÉ DE LA TAILLE : l'enveloppe perd ${pct(1 - envBas / envHaut)}, et chaque type ? ══\n`);
for (const l of [...ELAST].sort((a, b) => b.taille - a.taille))
  console.log(`  ${l.taille >= 0.9 ? "RÉSISTE" : l.taille >= 0.6 ? " cède  " : "  PAIE  "}  ${l.f.padEnd(32).slice(0, 32)} ${l.mHaut.toFixed(0).padStart(4)} → ${l.mBas.toFixed(0).padStart(4)} min/occurrence  (${pct(l.taille)} de sa taille)`);
console.log("\n══ AXE 2 — SURVIE DES OCCURRENCES (l'axe d'O-66) : un type paie aussi en DISPARAISSANT ══\n");
for (const l of [...ELAST].sort((a, b) => a.survie - b.survie))
  console.log(`  ${l.survie === 0 ? "DISPARAÎT" : l.survie >= 0.9 ? " INTACT  " : "  cède   "}  ${l.f.padEnd(32).slice(0, 32)} ${String(l.nHaut).padStart(3)} → ${String(l.nBas).padStart(3)} occurrences  (${pct(l.survie)})`);
console.log("\n══ L'ORDRE DE COMPRESSION RÉEL — les deux listes ══");
console.log("\n  A. CE QUI NE PAIE PAS  (taille ≥ 90 % ET occurrences ≥ 90 %) :");
for (const l of ELAST.filter((x) => x.taille >= 0.9 && x.survie >= 0.9)) console.log(`     · ${l.f}`);
console.log("\n  B. CE QUI PAIE — et par quel canal :");
for (const l of ELAST.filter((x) => !(x.taille >= 0.9 && x.survie >= 0.9)).sort((a, b) => (a.taille * a.survie) - (b.taille * b.survie)))
  console.log(`     · ${l.f.padEnd(30).slice(0, 30)} taille ${pct(l.taille).padStart(5)} · occurrences ${pct(l.survie).padStart(5)}`);
