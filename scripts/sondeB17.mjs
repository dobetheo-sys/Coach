#!/usr/bin/env node
/**
 * B-17 §14 — LA SONDE DES DEUX DÉFAUTS, ET LE CRITÈRE D'ACCEPTATION EXACT.
 *
 *   node scripts/sondeB17.mjs
 *
 * Deux moitiés, toutes deux EXACTES (arbitrage du fondateur : « un bloc dont la distance porte un
 * sens ne tolère pas de tolérance ») :
 *
 *   D1 — au plus UNE nage continue par semaine. On compte les occurrences PAR SEMAINE.
 *   D2 — les paliers LIVRÉS valent EXACTEMENT leurs cibles. La cible est lue dans le NOM de la
 *        séance (le générateur l'y écrit), le livré est la somme des mètres du bloc `body`.
 *        `livré == cible` sur les quatre ; toute différence, même d'un mètre, signifie qu'une
 *        passe non identifiée touche encore le bloc.
 *
 * ⚠ MA PREMIÈRE ÉCRITURE A RENDU « LES DEUX CRITÈRES SONT TENUS » SUR UN PLAN QUI N'ÉTAIT PAS
 * CELUI QU'ELLE NOMMAIT. Elle déclarait `longest_swim_m: "800"` pour les quatre formats : à
 * 1'50/100 m cela vaut 14,7 min de continuité, ce qui satisfait le gate du SPRINT et d'aucun
 * autre — le gate rabat donc le format, et les douze lignes du balayage mesuraient toutes un
 * `tri/S` à 750 m. D1 et D2 étaient verts parce que la population qui les porte n'était pas dans
 * la mesure. C'est la SECONDE fois dans ce ticket (`mesureB17.mjs` mesurait des horizons où le
 * Full était refusé), et c'est le test de dépistage de la règle 15 : un résultat SATURÉ — ici
 * « 750 m » sur toutes les lignes et zéro palier sur Full — accuse l'instrument.
 * La sonde ASSERTE désormais sa propre prémisse : si le gate rabat le format, la ligne est
 * marquée PRÉMISSE ROMPUE et ne compte pour aucun verdict.
 *
 * Et une observation à consigner sans la traiter (§1 de l'arbitrage) : le créneau `facile2`
 * est-il une CATÉGORIE (plusieurs jours par semaine peuvent le porter) ou une POSITION ?
 * On le lit sur le plan livré, on ne le déduit pas d'un gabarit.
 */
import "../src/app/bridge.ts";
import { MIN_WEEKS } from "../src/engine/constraintMatrix.ts";

// 1 650 m à 1'50/100 m = 30,25 min : au-dessus du plancher S10 de 30 min, donc le gate est
// satisfait pour les QUATRE formats et aucun n'est rabattu. C'est le plus petit choix qui
// laisse le Full porter ses quatre paliers (écart 30 → 75 min).
const LONGEST_SWIM_M = "1650";
const BASE = {
  intent: "competition", level: "inter", history: "confirme", dispo: "quotidienne", doubles: "non",
  sessions_max: "6", age: "35", sex: "H", weight: "75", vol_max: "12", vol_recent: "6",
  injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non",
  pace_known: "oui", pace: "5:00", ftp_known: "oui", ftp: "220", css_known: "oui", css: "1:50",
  terrain: "route", milieu: "bassin", longest_swim_m: LONGEST_SWIM_M,
};
const lundi = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
const courseDans = (n) => { const d = lundi(); d.setDate(d.getDate() + n * 7 - 1); return d.toISOString().slice(0, 10); };

const CONTINUE = /^Nage continue/;
const metres = (s) => (s.steps || []).filter((st) => st.role === "body")
  .reduce((t, st) => t + (st.distanceM || 0) * (st.reps || 1), 0);
const cibleDuNom = (s) => { const m = String(s.name || "").match(/(\d+)\s*m d'affilée/); return m ? +m[1] : null; };

let d1 = 0, d2 = 0, total = 0, lignes = 0, rompues = 0, slot2Multi = 0, slot2Sem = 0;
const vides = [];
for (const format of ["S", "M", "70.3", "Full"]) {
  const mw = MIN_WEEKS.tri?.[format] ?? 20;
  for (const h of [mw, mw + 6, mw + 14]) {
    let p;
    try { p = globalThis.EBV2.buildPlan("tri", { ...BASE, sport: "tri", format, race_date: courseDans(h) }); }
    catch (e) { console.log(`\n  ${format}/${h} sem — REFUS (${String(e.message || e).slice(0, 50)})`); continue; }
    // PRÉMISSE : le gate n'a pas rabattu le format. Sinon la ligne mesure un AUTRE format.
    const rabat = (p._v2?.decisions || []).find((x) => x.id === "B17-continuite" && /rabattu/i.test(String(x.what || "")));
    if (rabat) { rompues++; console.log(`\n  ${format}/${h} sem — ⚠ PRÉMISSE ROMPUE : ${rabat.val} — ligne écartée`); continue; }
    lignes++;
    const det = [];
    let doublons = 0, ecarts = 0;
    for (const w of p.weeks ?? []) {
      const conts = [];
      let slot2 = 0;
      for (const d of w.days ?? []) {
        if (d.slot === "facile2") slot2++;
        for (const s of d.sessions ?? []) if (s.d === "sw" && CONTINUE.test(String(s.name || ""))) conts.push(s);
      }
      slot2Sem++;
      if (slot2 > 1) slot2Multi++;
      if (!conts.length) continue;
      if (conts.length > 1) doublons++;
      for (const s of conts) {
        const cible = cibleDuNom(s), livre = metres(s);
        total++;
        if (cible != null && livre !== cible) ecarts++;
        det.push(`      S${String(w.num ?? "?").padStart(2)} · cible ${String(cible).padStart(5)} m · livré ${String(livre).padStart(5)} m${cible != null && livre !== cible ? `  ✖ écart ${livre - cible}` : "  ✓"}${conts.length > 1 ? "  ⚠ DOUBLON dans la semaine" : ""}`);
      }
    }
    d1 += doublons; d2 += ecarts;
    // ⚠ CRITÈRE DE NON-VACUITÉ — SANS LUI CETTE SONDE EST SATISFAITE PAR LA SUPPRESSION DE LA
    // RÈGLE. Trouvé en contre-preuve : décaler le rang de départage d'un cran fait tomber la
    // prescription à ZÉRO palier, et les deux compteurs rendaient alors `0 / 0` sous un verdict
    // « LES DEUX CRITÈRES SONT TENUS ». C'est la règle 19 appliquée à mon propre instrument —
    // *quel est le correctif le moins coûteux qui ferait passer ce test ?* Ici : effacer la
    // fonctionnalité. Le Full doit porter ses QUATRE paliers, les autres formats au moins un.
    const attendus = format === "Full" ? 4 : 1;
    if (det.length < attendus) vides.push(`${format}/${h} : ${det.length} palier(s) au lieu de ${attendus}`);
    console.log(`\n  ${format}/${h} sem — ${det.length} nage(s) continue(s) · ${doublons} semaine(s) à doublon · ${ecarts} écart(s) cible↔livré`);
    for (const l of det) console.log(l);
  }
}

console.log(`\n  lignes MESURÉES : ${lignes} · prémisse rompue : ${rompues}`);
console.log(`  observation (hors périmètre B-17) : ${slot2Multi} / ${slot2Sem} semaines portent DEUX jours \`facile2\` → le créneau est une CATÉGORIE, pas une position.`);
console.log(`  non-vacuité : ${vides.length ? "✖ " + vides.join(" · ") : "✓ chaque format porte ses paliers (Full : 4)"}`);
console.log(`\n  D1 — semaines portant plus d'une nage continue : ${d1}`);
console.log(`  D2 — paliers dont le livré diffère de la cible : ${d2} / ${total}`);
console.log(`\n  → ${lignes === 0 ? "AUCUNE LIGNE MESURÉE — la sonde ne dit rien."
  : vides.length ? "VERDICT VACUEUX — la règle ne prescrit rien là où elle le doit : les compteurs sont à zéro\n    parce qu'il n'y a rien à compter, pas parce que tout est juste."
  : d1 === 0 && d2 === 0
  ? "LES DEUX CRITÈRES SONT TENUS : au plus une par semaine, et livré == cible au mètre près."
  : "AU MOINS UN CRITÈRE EST ROMPU — voir les lignes ✖ / ⚠ ci-dessus."}`);
