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

const RUN_KM: Record<string, number> = { "5k": 5, "10k": 10, semi: 21.0975, marathon: 42.195 };
const SWIM_RACE: Record<string, { dist: number; factor: number }> = {
  sprint: { dist: 100, factor: 0.9 },
  demifond: { dist: 400, factor: 0.94 },
  fond: { dist: 1500, factor: 1.0 },
  ow: { dist: 1500, factor: 1.05 },
};
const BIKE_POWER: Record<string, { lo: number; hi: number; note: string }> = {
  crit: { lo: 0.95, hi: 1.05, note: "critérium : au seuil et au-dessus par relances" },
  clm: { lo: 0.93, hi: 1.0, note: "CLM : effort au seuil, régulier du départ à la ligne" },
  route: { lo: 0.8, hi: 0.9, note: "course sur route : puissance normalisée, les pointes en plus" },
  cyclo: { lo: 0.7, hi: 0.8, note: "cyclosportive : tempo durable, garder du grain pour la fin" },
  gravel: { lo: 0.65, hi: 0.75, note: "gravel/ultra : endurance, la régularité bat la vitesse" },
};
const TRI_SWIM: Record<string, { dist: number; factor: number }> = {
  S: { dist: 750, factor: 1.04 },
  M: { dist: 1500, factor: 1.05 },
  "70.3": { dist: 1900, factor: 1.06 },
  Full: { dist: 3800, factor: 1.08 },
};
const TRI_BIKE: Record<string, { lo: number; hi: number }> = {
  S: { lo: 0.82, hi: 0.88 },
  M: { lo: 0.78, hi: 0.85 },
  "70.3": { lo: 0.72, hi: 0.8 },
  Full: { lo: 0.65, hi: 0.73 },
};
const TRI_RUN: Record<string, { km: number; fatigue: number }> = {
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

  if (sport === "run") {
    if (refs.thrPace > 0 && RUN_KM[format]) {
      const t = riegelSec(refs.thrPace, RUN_KM[format]);
      items.push({ leg: "Course", value: runRange(t), why: "Riegel depuis ton allure seuil (~1h), exposant 1.06 — la référence des prédictions route" + profWhy });
      D("PRED-run", "Méthode course", "Riegel ^1.06", "Extrapolation standard depuis l'allure tenable une heure");
    } else if (format === "trail") {
      advice.push("Trail : le chrono dépend du D+ et du terrain — repère fiable : allure Z2 à plat, marche assumée dans les pentes raides.");
    } else advice.push("Renseigne ton allure seuil (test : 30min à fond, allure moyenne) pour obtenir une projection chiffrée.");
  } else if (sport === "bike") {
    const b = BIKE_POWER[format];
    if (refs.ftp > 0 && b) {
      items.push({ leg: "Vélo", value: Math.round(refs.ftp * b.lo) + "–" + Math.round(refs.ftp * b.hi) + "W", why: b.note + " — le chrono dépend du parcours, la puissance cible ne ment pas" });
      D("PRED-bike", "Méthode vélo", "% FTP par format", "Prédire un chrono sans connaître le parcours serait mentir ; la puissance cible est transférable partout");
    } else advice.push("Renseigne ta FTP (test 20min × 0.95) pour obtenir tes puissances cibles de course.");
  } else if (sport === "swim") {
    const sw = SWIM_RACE[format];
    if (refs.css > 0 && sw) {
      const t = (sw.dist / 100) * refs.css * sw.factor;
      items.push({ leg: "Natation (" + sw.dist + "m)", value: range(t), why: "CSS × " + sw.factor + (sw.factor < 1 ? " (les distances courtes se nagent plus vite que le seuil)" : sw.factor > 1 ? " (eau libre : navigation et peloton ralentissent)" : " (le 1500m se nage à l'allure CSS)") });
      D("PRED-swim", "Méthode natation", "CSS × facteur distance", "Le Critical Swim Speed est l'allure soutenable — chaque distance de course a son facteur validé");
    } else advice.push("Renseigne ton CSS (test : 400m et 200m chrono → CSS = 200m ÷ (t400−t200)) pour une projection chiffrée.");
  } else if (sport === "tri") {
    const sw = TRI_SWIM[format], bk = TRI_BIKE[format], rn = TRI_RUN[format];
    if (refs.css > 0 && sw) {
      const t = (sw.dist / 100) * refs.css * sw.factor;
      items.push({ leg: "Natation " + sw.dist + "m", value: range(t), why: "CSS × " + sw.factor + " — peloton, combinaison et navigation compris" });
    } else advice.push("CSS manquant → pas de projection natation (test 400/200m).");
    if (refs.ftp > 0 && bk) {
      items.push({ leg: "Vélo", value: Math.round(refs.ftp * bk.lo) + "–" + Math.round(refs.ftp * bk.hi) + "W", why: "l'intensité qui laisse des jambes pour courir — dépasser cette bande se paie sur la CAP" });
    } else advice.push("FTP manquante → pas de puissance cible vélo (test 20min × 0.95).");
    if (refs.thrPace > 0 && rn) {
      const t = riegelSec(refs.thrPace, rn.km) * rn.fatigue;
      items.push({ leg: "CAP " + (rn.km >= 21 ? (rn.km > 22 ? "marathon" : "semi") : rn.km + "km"), value: runRange(t), why: "Riegel × " + rn.fatigue + " de fatigue post-vélo (facteur " + format + ")" + profWhy });
    } else advice.push("Allure seuil manquante → pas de projection CAP (test 30min).");
    if (items.length) D("PRED-tri", "Méthode tri", "legs séparés", "Un total additionnerait les incertitudes ; chaque leg a sa méthode et sa fourchette");
  }

  return { items, advice, decisions };
}
