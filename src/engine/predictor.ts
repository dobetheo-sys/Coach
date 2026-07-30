/**
 * Prédiction de course — projection chiffrée en compétition (roadmap « dashboard »).
 *
 * Principes : un entraîneur ne promet jamais un chrono sec → FOURCHETTES, hypothèses
 * affichées, et pas de chiffre quand la donnée manque (conseil de test à la place).
 * Méthodes : course = Riegel (exposant 1.06) depuis l'allure seuil (~1h) ; natation =
 * CSS × facteur de distance ; vélo = PUISSANCES cibles (le chrono dépend du parcours,
 * on ne l'invente pas) ; tri = legs séparés avec facteur de fatigue par format.
 * La fourchette se resserre si le plan est bien suivi (streak + charge accomplie).
 */
import type { Decision } from "./types.ts";
import { sportModule } from "../sports/registry.ts";
import { T5_HIKE_SHARE, TRAIL_TECHNICITY, type TrailObjective } from "./trailModel.ts";

export interface PredictionItem {
  leg: string; // "Course", "Natation", "Vélo", "CAP (tri)"…
  value: string; // "3h25–3h34" ou "225–245W"
  why: string;
}
export interface Prediction {
  items: PredictionItem[];
  advice: string[]; // tests à faire quand une référence manque
  decisions: Decision[];
}
export interface PredictOpts {
  pctLoad?: number; // % de charge du plan accomplie
  streakWeeks?: number;
  courseProfile?: string; // "plat" | "vallonne" | "montagneux" — profil du parcours visé
  /** R7 TRAIL — objectif décodé (distance, D+, catégorie, VAM) : Riegel ne s'applique pas. */
  trail?: TrailObjective;
}

// R6 — profil du parcours : un chrono à plat ne vaut rien sur un parcours vallonné.
// Facteurs de temps course à pied (littérature GAP/expérience course sur route) :
// vallonné ~+3–6 %, montagneux ~+8–15 % — appliqués en ÉLARGISSANT la fourchette
// (l'incertitude monte avec le relief, on ne fait pas semblant du contraire).
const COURSE_PROFILE_RUN: Record<string, { lo: number; hi: number; label: string }> = {
  plat: { lo: 1.0, hi: 1.0, label: "parcours plat" },
  vallonne: { lo: 1.03, hi: 1.06, label: "parcours vallonné" },
  montagneux: { lo: 1.08, hi: 1.15, label: "parcours montagneux" },
};

export const RUN_KM: Record<string, number> = { "5k": 5, "10k": 10, semi: 21.0975, marathon: 42.195 };
export const SWIM_RACE: Record<string, { dist: number; factor: number }> = {
  sprint: { dist: 100, factor: 0.9 },
  demifond: { dist: 400, factor: 0.94 },
  fond: { dist: 1500, factor: 1.0 },
  ow: { dist: 1500, factor: 1.05 },
};
// R10 — recalées sur les facteurs d'intensité de référence (Coggan) et exprimées en
// puissance NORMALISÉE : un ami coureur lisait « 80% FTP » comme une cible molle — c'est
// la moyenne pondérée d'un effort où les pointes montent bien au-dessus du seuil.
export const BIKE_POWER: Record<string, { lo: number; hi: number; note: string }> = {
  crit: { lo: 0.95, hi: 1.05, note: "critérium : au seuil et au-dessus par relances" },
  clm: { lo: 0.95, hi: 1.02, note: "CLM : effort au seuil, régulier du départ à la ligne" },
  route: { lo: 0.85, hi: 0.95, note: "course sur route : les attaques et bosses montent bien au-dessus du seuil" },
  cyclo: { lo: 0.73, hi: 0.83, note: "cyclosportive : tempo durable, garder du grain pour la fin" },
  gravel: { lo: 0.68, hi: 0.78, note: "gravel/ultra : endurance, la régularité bat la vitesse" },
};
export const TRI_SWIM: Record<string, { dist: number; factor: number }> = {
  S: { dist: 750, factor: 1.04 },
  M: { dist: 1500, factor: 1.05 },
  "70.3": { dist: 1900, factor: 1.06 },
  Full: { dist: 3800, factor: 1.08 },
};
export const TRI_BIKE: Record<string, { lo: number; hi: number }> = {
  S: { lo: 0.85, hi: 0.93 },
  M: { lo: 0.82, hi: 0.88 },
  "70.3": { lo: 0.76, hi: 0.83 },
  Full: { lo: 0.7, hi: 0.76 },
};
export const TRI_RUN: Record<string, { km: number; fatigue: number }> = {
  S: { km: 5, fatigue: 1.03 },
  M: { km: 10, fatigue: 1.05 },
  "70.3": { km: 21.0975, fatigue: 1.08 },
  Full: { km: 42.195, fatigue: 1.13 },
};

const fmtT = (sec: number): string => {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h > 0 ? h + "h" + String(m).padStart(2, "0") : m + "'" + String(r).padStart(2, "0");
};

/** Riegel : temps sur D depuis l'allure seuil (tenable ~1h), t = 3600 × (D/D₁ₕ)^1.06 */
function riegelSec(thrPaceSecPerKm: number, distKm: number): number {
  const d1h = 3600 / thrPaceSecPerKm;
  return 3600 * Math.pow(distKm / d1h, 1.06);
}

/** Minutes → « 9h20 » : une durée de trail se lit en heures, pas en minutes. */
function fmtHM(min: number): string {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h > 0 ? h + "h" + String(m).padStart(2, "0") : m + "min";
}

export function predictRace(
  sport: string,
  format: string,
  intent: string | undefined,
  refs: { ftp: number; thrPace: number; css: number },
  opts: PredictOpts = {}
): Prediction {
  const items: PredictionItem[] = [];
  const advice: string[] = [];
  const decisions: Decision[] = [];
  const D = (id: string, what: string, val: string, why: string) => decisions.push({ id, what, val, why });

  // Fourchette : ±3% de base ; ±2% si le plan est bien suivi ; décalée +3% en mode finisher.
  const followed = (opts.pctLoad ?? 0) >= 60 && (opts.streakWeeks ?? 0) >= 3;
  const spread = followed ? 0.02 : 0.03;
  const shift = intent === "finir" ? 0.03 : 0;
  if (followed) D("PRED-forme", "Fourchette resserrée", "±2%", "Plan bien suivi (streak ≥3 semaines, charge accomplie ≥60%) : la projection est plus fiable");
  if (shift > 0) D("PRED-finisher", "Pacing conservateur", "+3%", "Objectif finisher : on vise l'arrivée en forme, pas la marge d'erreur");
  const range = (sec: number) => fmtT(sec * (1 + shift - spread)) + "–" + fmtT(sec * (1 + shift + spread));
  // Fourchette COURSE À PIED avec profil de parcours (R6) — le relief élargit et décale.
  const prof = opts.courseProfile && COURSE_PROFILE_RUN[opts.courseProfile] ? COURSE_PROFILE_RUN[opts.courseProfile] : null;
  if (prof && prof.hi > 1) D("PRED-parcours", "Profil du parcours", prof.label, "Le relief ralentit et augmente l'incertitude : fourchette ×" + prof.lo + "–" + prof.hi + " sur les temps de course à pied");
  const runRange = (sec: number) => prof
    ? fmtT(sec * prof.lo * (1 + shift - spread)) + "–" + fmtT(sec * prof.hi * (1 + shift + spread))
    : range(sec);
  const profWhy = prof && prof.hi > 1 ? " · " + prof.label + " (+" + Math.round((prof.lo - 1) * 100) + "–" + Math.round((prof.hi - 1) * 100) + "%)" : "";

  // ---- R7 TRAIL : Riegel est INAPPLICABLE (un km de trail n'est pas un km de route).
  // Modèle à deux composantes : temps à plat + temps vertical (VAM), pénalisés par la
  // technicité et la nuit. Fourchette LARGE et annoncée comme telle : sur un ultra, ±20%
  // est une estimation honnête — afficher une fourchette serrée serait le mensonge.
  if (sport === "trail" && opts.trail) {
    const obj = opts.trail;
    const tech = TRAIL_TECHNICITY[obj.technicity] || TRAIL_TECHNICITY.mixte;
    const kmEffH = obj.kmEffort / Math.max(0.5, obj.raceMinMid / 60);
    const one = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");
    items.push({ leg: "Temps estimé", value: fmtHM(obj.raceMinLo) + "–" + fmtHM(obj.raceMinHi),
      why: obj.why + " · fourchette large assumée : sur ce format, le terrain et la gestion pèsent plus que la condition physique" });
    items.push({ leg: "Vitesse cible", value: one(kmEffH) + " km-effort/h",
      why: "Le km-effort (distance + D+/100) se suit sur un relief irrégulier, là où l'allure au sol ne veut rien dire" });
    items.push({ leg: "En montée", value: Math.round((obj.vam * 0.7) / 10) * 10 + "–" + Math.round((obj.vam * 0.82) / 10) * 10 + " m/h de D+",
      why: "Ta vitesse ascensionnelle de course (70-82% de ta VAM seuil)" + (obj.vamKnown ? "" : " — estimée d'après ton niveau, fais le test pour l'affiner") + " : LA donnée à suivre dans les montées" });
    const hike = T5_HIKE_SHARE[obj.category] ?? 0.15;
    if (hike >= 0.1) items.push({ leg: "Part de marche", value: "~" + Math.round(hike * 100) + "% du temps",
      why: "Sur ce relief, la marche rapide sera une part majeure de ta course : ce n'est pas un échec, c'est la stratégie qui économise le plus d'énergie dans les pentes raides" });
    // §6.3 — l'erreur n°1 en ultra est le départ trop rapide : l'outil est bien placé pour le dire
    advice.push("Répartition conseillée : premier tiers à " + one(kmEffH * 0.92) + " km-effort/h (volontairement en dessous — tu dois te sentir « trop tranquille »), deuxième tiers à " + one(kmEffH) + ", dernier tiers selon ce qu'il reste. Partir 5 % trop vite coûte 20 % sur la fin.");
    if (obj.cutoffH && obj.raceMinHi > obj.cutoffH * 60) advice.unshift("⏱ Barrière horaire à " + obj.cutoffH + "h : notre estimation haute (" + fmtHM(obj.raceMinHi) + ") la dépasse. Vise le bas de la fourchette, contrôle ton départ et limite le temps passé aux ravitaillements.");
    D("PRED-trail", "Méthode trail", "temps à plat + temps vertical (VAM)", "Riegel ne s'applique pas au trail : on additionne le temps horizontal et le temps d'ascension, puis on pénalise selon la technicité (" + tech.label + ") et la nuit");
    return { items, advice, decisions };
  }

  // R10 phase 1 — DISPATCH : chaque sport porte SA méthode de prédiction dans son module
  // (`src/sports/<sport>/`). Ce qui reste ici est commun : fourchettes, profil de parcours,
  // formatage, journal de décisions. Un sport sans méthode ne PRÉDIT RIEN plutôt que de
  // sortir un chiffre inventé — la fourchette honnête est la seule sortie acceptable.
  const mod = sportModule(sport);
  if (mod.predict) {
    mod.predict({ format, refs, items, advice, D, range, runRange, riegelSec, profWhy });
  } else {
    advice.push("La prédiction de temps n'est pas encore disponible pour ce sport : nous préférons ne rien afficher plutôt qu'un chiffre que nous ne pourrions pas défendre.");
  }

  return { items, advice, decisions };
}
