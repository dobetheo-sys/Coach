/**
 * Sport TRIATHLON (registre R10). Extraction mécanique de la branche `sp === "tri"`.
 * C'est le sport qui portait le plus de passes gardées par un test de sport (brick, C18b,
 * lissage sur métrique nage) : elles sont désormais des garde-fous DÉCLARÉS.
 */
import type { V1Session, V1Step } from "../../engine/types.ts";
import { C21_REPRISE_BRICK_FACTOR } from "../../engine/constraintMatrix.ts";
import { intOf } from "../../generator/renderer.ts";
import { registerSport, type SessionKit, type PredictKit } from "../registry.ts";
import { TRI_SWIM, TRI_BIKE, TRI_RUN } from "../../engine/predictor.ts";

export function buildTriSessions(kit: SessionKit): V1Session[] {
  const { a, fmt, slot, phase, prog, lvl, finisher, beginner, medHold, dbl, sessionScale, inj, noVo2, swimDrillGlossary, S2, W, Wm, C, Cm, B, Bd } = kit;
  const runInj = inj.list.includes("course");
  const PB = ({ base: [0.35, 0.55], dev: [0.55, 0.75], spec: [0.75, 0.9], peak: [0.9, 1], taper: [0.35, 0.45] } as Record<string, [number, number]>)[phase] || [0.5, 0.8];
  const PT = (lo: number, hi: number) => Math.max(1, Math.round((lo + (hi - lo) * (PB[0] + (PB[1] - PB[0]) * prog)) * sessionScale));
  const swimDistCaps = ({ S: { lo: 300, hi: 750 }, M: { lo: 600, hi: 1500 }, "70.3": { lo: 950, hi: 1900 }, Full: { lo: 1600, hi: 3000 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 600, hi: 1500 };
  const swimDist = PT(swimDistCaps.lo, swimDistCaps.hi);
  const triSwimVolCap = ({ S: 1050, M: 2100, "70.3": 3000, Full: 4500 } as Record<string, number>)[fmt] || 2100;
  // C24 — même la nage récup tri : ≥750m pour un non-débutant
  const swShortDist = beginner ? Math.min(600, Math.max(200, Math.round((swimDist * 0.4) / 50) * 50)) : Math.min(1100, Math.max(750, Math.round((swimDist * 0.6) / 50) * 50));
  const swTechDist = Math.max(beginner ? 300 : 750, Math.round((swimDist * 0.5) / 50) * 50);
  let swMain = beginner
    ? { name: "Nage seuil technique (+dist)", note: "Technique d'abord, mais quelques 100m à allure seuil contrôlée pour préparer la course.", steps: [Wm(200, "souple"), Object.assign(Bd(1, swimDist, "sw.css", [0.33, "repos libre entre séries (~20s)"], ", fractionné en séries régulières, éducatifs entre", false, "sw"), { bnd: { floor: swimDistCaps.lo, cap: triSwimVolCap } }), Cm(100, "relâché")] }
    : { name: "Nage seuil (+dist)", note: "Distance cible atteinte, allure régulière. Fractionné = réponse à intensité.", steps: [Wm(300, "+ 4×50m éducatifs"), Object.assign(Bd(1, swimDist, "sw.css", "15-20s", ", fractionné en séries régulières si besoin", false, "sw"), { bnd: { floor: swimDistCaps.lo, cap: triSwimVolCap } }), Cm(200, "souple")] };
  let swTech = beginner
    ? { name: "Nage éducatifs", note: "Zéro chrono ici : uniquement le geste. Alterne les éducatifs, ne les enchaîne pas en force.", steps: [Wm(100, "souple"), Bd(1, swTechDist, "sw.easy", "20-30s", ", par 50m, 1 point technique à la fois — " + swimDrillGlossary, false, "sw"), Cm(100, "dos souple")] }
    : { name: "Nage vitesse", note: "Fréquence et vitesse contrôlées : la technique ne doit pas se dégrader sur les derniers 50m.", steps: [Wm(200, "+ 4×25m accélérations progressives"), Bd(1, swTechDist, "sw.aero", "30-40s sur les 50m rapides", ", dont la moitié en accélérations de 50m", false, "sw"), Cm(150, "souple")] };
  // B1c (audit v6) — l'épaule existait pour les triathlètes dans le QUESTIONNAIRE mais
  // pas dans le générateur (branche morte : le traitement vivait sous sp === "swim").
  // Ici : mêmes substitutions que le nageur, au budget de la séance remplacée (bnd).
  if (inj.shoulder) {
    const shoulderDist = Math.max(swimDistCaps.lo, Math.round((swimDist * 0.8) / 50) * 50);
    swMain = { name: "Nage seuil contrôlé (épaule)", note: "Volume modéré, technique soignée : on épargne l'épaule, on ne cherche pas la performance brute. Arrêt au moindre signal articulaire.", steps: [Wm(200, "souple + éducatifs doux"), Object.assign(Bd(1, shoulderDist, "sw.css", "20-30s", ", fractionné en 100m, amplitude confortable", false, "sw"), { bnd: { floor: swimDistCaps.lo, cap: shoulderDist } }), Cm(100, "souple")] };
    swTech = { name: "Jambes + technique (épaule épargnée)", note: "Le travail passe par les jambes (battements planche) et la technique : la charge articulaire de l'épaule reste minimale.", steps: [Object.assign(Bd(1, swTechDist, null, "", " séries battements planche + éducatifs · épargne épaule", false, "sw"), { bnd: { floor: 300, cap: swTechDist } })] };
  }
  const swShort = { recovery: true, name: "Nage récup", note: "Récupération dans l'eau : relâchement total, respiration ample — le corps absorbe le travail de la semaine.", steps: [Bd(1, swShortDist, "sw.easy", "", " souple, en blocs de 50m, respiration 3 temps · relâchement total", false, "sw")] };
  if (slot === "dur1") {
    if (dbl) S2.push({ d: "sw", name: swMain.name + " (matin)", note: swMain.note, det: "", steps: swMain.steps });
    if (phase === "base") S2.push({ d: "bk", name: "Sweetspot vélo", note: "Cadence 85-95 rpm, soutenu mais maîtrisé.", det: "", steps: [W(15, "montée progressive"), Object.assign(B(PT(2, 3), PT(12, 18), "bk.ss", "5min souple"), { repCap: 4 }), C(10, "décrassage")] });
    else if ((phase === "spec" || phase === "peak") && !noVo2) S2.push({ d: "bk", name: "VO2max vélo", note: "Puissance aérobie maximale, maintenue jusqu'au pic — pas abandonnée en spécifique (la race-pace vélo est travaillée dans le brick).", det: "", steps: [W(20, "progressif + 3 sprints"), Object.assign(B(PT(4, 6), 4, "bk.vo2", "4min récup"), { repCap: 8 }), C(10, "souple")] });
    else if (phase === "taper") S2.push({ d: "bk", name: "Rappel race-pace", note: "Affûtage : on réveille l'allure course sans générer de fatigue. Court et précis.", det: "", steps: [W(10, "progressif"), Object.assign(B(PT(2, 3), PT(6, 10), "bk.rp", "3min souple"), { repCap: 4 }), C(5, "décrassage")] });
    else if (lvl === "debutant" || finisher) S2.push({ d: "bk", name: "Tempo vélo", note: "Confortablement soutenu, jamais dans le rouge.", det: "", steps: [W(15, "souple"), Object.assign(B(PT(2, 3), PT(8, 15), "bk.ss", "4min souple"), { repCap: 4 }), C(10, "décrassage")] });
    else if (!noVo2) S2.push({ d: "bk", name: "VO2max vélo", note: "Intensité max tenable 4min, récup quasi complète entre.", det: "", steps: [W(20, "progressif + 3 sprints"), Object.assign(B(PT(4, 6), 4, "bk.vo2", "4min récup"), { repCap: 8 }), C(10, "souple")] });
    else S2.push({ d: "bk", name: "Tempo vélo", note: "Confortablement soutenu, jamais dans le rouge — la VO2max attendra la majorité (R6.3).", det: "", steps: [W(15, "souple"), Object.assign(B(PT(2, 3), PT(8, 15), "bk.ss", "4min souple"), { repCap: 4 }), C(10, "décrassage")] });
  } else if (slot === "dur2") {
    if (dbl) S2.push({ d: "sw", name: swTech.name, note: swTech.note, det: "", steps: swTech.steps });
    if (phase === "spec" || phase === "peak") S2.push({ d: "rn", name: "Allure course (tri)", note: "L'allure de course du jour J : mémorise la sensation, jambes déjà entamées par le vélo.", det: "", steps: [W(15, "footing progressif"), Object.assign(B(1, PT(20, 40), "rn.mara"), { bnd: { floor: 20, cap: 45 } }), C(8, "retour au calme")] });
    else S2.push({ d: "bk", name: "Force basse cadence", note: "Gros braquet, cadence basse : musculaire, pas cardio. Sans forcer sur les genoux.", det: "", steps: [W(15, "+ montée en intensité"), Object.assign(B(PT(4, 6), ({ S: 5, M: 5, "70.3": 6, Full: 7 } as Record<string, number>)[fmt] || 5, "bk.frc", "3min souple", " à 50-60 rpm"), { repCap: 8 }), C(10, "moulinage")] });
  } else if (slot === "durLong") {
    if (phase === "spec" || phase === "peak") {
      // C21 — brick borné par format, ×0.8 en reprise (appliqué aussi dans blockBounds)
      const rf = a.history === "reprise" ? C21_REPRISE_BRICK_FACTOR : 1;
      const bb = ({ S: { lo: 45, hi: 90 }, M: { lo: 60, hi: 120 }, "70.3": { lo: 90, hi: 180 }, Full: { lo: 150, hi: 300 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 60, hi: 180 };
      const br = ({ S: { lo: 10, hi: 20 }, M: { lo: 12, hi: 24 }, "70.3": { lo: 16, hi: 32 }, Full: { lo: 35, hi: 70 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 15, hi: 30 };
      // Répartition des intensités (manifeste) : le brick roule en Z2, le DERNIER TIERS
      // passe à l'allure course — la spécificité (transition, jambes entamées) est gardée
      // sans transformer 2 à 5h hebdo en zone grise (tri mesuré à 54-67% de temps facile).
      S2.push({ d: "br", long: true, brick: true, name: "Brick vélo+CAP", note: "Le brick simule la course : vélo en endurance, dernier tiers @ allure course, puis enchaînement rapide vélo→course pour habituer tes jambes à la sensation «de coton» du début de CAP.", det: "", steps: [
        { role: "body", leg: "bike", durationMin: PT(bb.lo, Math.round(bb.hi * rf)), zone: "bk.z2", intensity: intOf("bk.z2") as unknown as string } as V1Step,
        { role: "body", leg: "run", durationMin: PT(br.lo, Math.round(br.hi * rf)), d: "rn" } as V1Step,
      ], ...( { runInj } as object) });
    } else {
      const longRunCaps = ({ S: { lo: 30, hi: 60 }, M: { lo: 40, hi: 75 }, "70.3": { lo: 50, hi: 100 }, Full: { lo: 60, hi: 140 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 50, hi: 100 };
      S2.push({ d: "rn", long: true, name: "Sortie longue CAP", note: "Endurance fondamentale, allure facile et conversationnelle.", det: "", steps: [Object.assign(B(1, PT(longRunCaps.lo, longRunCaps.hi), "rn.easy", "", runInj ? " sur surface souple" : ""), { bnd: { floor: longRunCaps.lo, cap: longRunCaps.hi } })], ...( { plainBody: true } as object) });
    }
  } else if (slot === "facileR") {
    const ftCaps = ({ S: { lo: 25, hi: 45 }, M: { lo: 15, hi: 26 }, "70.3": { lo: 14, hi: 22 }, Full: { lo: 50, hi: 100 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 25, hi: 45 };
    // C18 — le créneau course de qualité garanti en tri : VO2 court en peak
    if (phase === "peak" && !runInj && !medHold && !noVo2 && lvl !== "debutant" && !finisher) S2.push({ d: "rn", name: "VO2max course", note: "Rappels de puissance aérobie course, courts et vifs, jambes déjà entamées par le vélo.", det: "", steps: [W(12, "footing progressif + gammes"), Object.assign(B(PT(4, 6), 2, "rn.vo2", "2min trot"), { repCap: 6 }), C(8, "footing très facile")] });
    else if (phase === "peak" && runInj && !medHold) S2.push({ d: "rn", name: "Allure course (tri, surface souple)", note: "Course blessé : allure cible en contrôle, sur surface souple, jamais dans la douleur.", det: "", steps: [W(12, "footing progressif"), B(1, PT(18, 28), "rn.mara", "", ", sur surface souple"), C(8, "footing très facile")] });
    else S2.push({ d: "rn", name: "Footing facile", note: "Course facile : les jambes apprennent à courir « propre » sans fatigue ajoutée.", det: "", steps: [B(1, PT(ftCaps.lo, ftCaps.hi), "rn.easy", "", runInj ? " · surface souple" : "")], ...( { plainBody: true } as object) });
  } else if (slot === "facile2") S2.push({ d: "sw", recovery: true, name: swShort.name + " courte", note: swShort.note, det: "", steps: swShort.steps, ...( { plainBody: true } as object) });
  else if (slot === "recup") S2.push({ d: "rs", name: "Récup active", det: "mobilité", steps: [] });
  else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  return S2;
}


/** Prédiction tri — extraction mécanique de la branche correspondante de `predictRace`. */
export function predictTri(kit: PredictKit): void {
  const { refs, format, items, advice, D, range, runRange, riegelSec, profWhy } = kit;
  const sw = TRI_SWIM[format], bk = TRI_BIKE[format], rn = TRI_RUN[format];
  if (refs.css > 0 && sw) {
    const t = (sw.dist / 100) * refs.css * sw.factor;
    items.push({ leg: "Natation " + sw.dist + "m", value: range(t), why: "CSS × " + sw.factor + " — peloton, combinaison et navigation compris" });
  } else advice.push("CSS manquant → pas de projection natation (test 400/200m).");
  if (refs.ftp > 0 && bk) {
    items.push({ leg: "Vélo", value: Math.round(refs.ftp * bk.lo) + "–" + Math.round(refs.ftp * bk.hi) + "W", why: "puissance normalisée qui laisse des jambes pour courir — dépasser cette bande se paie sur la CAP" });
  } else advice.push("FTP manquante → pas de puissance cible vélo (test 20min × 0.95).");
  if (refs.thrPace > 0 && rn) {
    const t = riegelSec(refs.thrPace, rn.km) * rn.fatigue;
    items.push({ leg: "CAP " + (rn.km >= 21 ? (rn.km > 22 ? "marathon" : "semi") : rn.km + "km"), value: runRange(t), why: "Riegel × " + rn.fatigue + " de fatigue post-vélo (facteur " + format + ")" + profWhy });
  } else advice.push("Allure seuil manquante → pas de projection CAP (test 30min).");
  if (items.length) D("PRED-tri", "Méthode tri", "legs séparés", "Un total additionnerait les incertitudes ; chaque leg a sa méthode et sa fourchette");
}

registerSport({
  id: "tri",
  mainDiscipline: "rn", // la CAP finit la course : c'est la discipline de référence du tri
  disciplines: ["sw", "bk", "rn"],
  easyFallbackSlot: "facileR",
  weekSchema: null,
  buildSessions: buildTriSessions,
  predict: predictTri,
  retestTypes: ["css", "ftp", "thrPace"],
    // Le tri NAGE : il hérite des planchers de séance en mètres (C24/C24b), comme la natation.
  // C'est précisément ce que `sport !== "run"` disait de façon détournée.
  guards: { stripLongOnMedHold: true, singleRunVo2PerWeek: true, smoothOnAuditMetric: true, capacityProbe: true, swimSessionFloors: true },
});
