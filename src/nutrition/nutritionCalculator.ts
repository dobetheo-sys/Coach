/**
 * nutritionCalculator — ravitaillement d'effort (ROADMAP « Nutrition », périmètre prudent).
 *
 * PÉRIMÈTRE VOLONTAIREMENT LIMITÉ (frontière du conseil diététique, note.md priorité n°1) :
 * le module couvre UNIQUEMENT le ravitaillement lié à la séance — glucides pendant l'effort,
 * hydratation selon durée/température, collation de récupération, dépense estimée.
 * Il ne prescrit JAMAIS d'apport calorique journalier, de macros de régime, ni de
 * restriction/déficit : cette partie reste bloquée tant qu'un(e) nutritionniste n'a pas
 * validé l'approche (RESTE-A-FAIRE « À TOI »). Chaque conseil sort avec l'avertissement
 * DISCLAIMER — l'UI doit l'afficher, la démo CI (demo:nutrition) le vérifie.
 *
 * Sources des repères (consensus publiés, pas d'invention maison) :
 * - Glucides/heure par durée d'effort : position ACSM/AND/DC 2016 & Jeukendrup 2014
 *   (<~1h : rien de nécessaire ; 1–2h : 30–60 g/h ; >2h : 60–90 g/h, mix glucose:fructose
 *   au-delà de 60 g/h, tube digestif à entraîner progressivement).
 * - Hydratation : boire à la soif, ~400–800 ml/h ; chaleur → haut de fourchette + sodium
 *   (ACSM 2007 fluid replacement). Plafond dur 1000 ml/h (hyponatrémie).
 * - Récupération : fenêtre 30–60 min après séance dure ou longue, ~1–1.2 g/kg glucides
 *   + ~0.3 g/kg protéines (ISSN 2017, nutrient timing).
 * Chaque règle porte un identifiant N1…N7 (même format {id, what, val, why} que le reste
 * du moteur), registre dans ARCHITECTURE.md.
 */
import { intensitySplit, type RawSession } from "../engine/loadModel.ts";

export interface NutritionDecision {
  id: string;
  what: string;
  val: string | number;
  why: string;
}

export type EffortIntensity = "facile" | "moyenne" | "dure";

export interface NutritionInput {
  d: string; // rn | bk | sw | br (rs → pas de conseil)
  minutes: number;
  intensity: EffortIntensity;
  long?: boolean;
  tempC?: number | null; // météo du jour si disponible (Open-Meteo déjà intégré)
  weightKg?: number | null; // optionnel — affine récupération et dépense
}

export interface NutritionAdvice {
  before: string; // sécurité : jamais à jeun sur dur/long
  during: {
    carbsGPerH: [number, number] | null; // null = pas nécessaire (eau suffit)
    drinkMlPerH: [number, number];
    sodium: boolean;
    text: string;
  };
  after: string | null; // null = pas de fenêtre spécifique (séance courte facile)
  kcal: [number, number]; // dépense ESTIMÉE de la séance (information, pas prescription)
  decisions: NutritionDecision[];
  disclaimer: string;
}

/** Avertissement obligatoire — l'UI l'affiche tel quel, la démo CI le vérifie. */
export const DISCLAIMER =
  "Repères généraux issus des consensus de nutrition sportive (ACSM/ISSN) — " +
  "à adapter à ta tolérance. Ne remplace pas l'avis d'un professionnel de santé " +
  "ou d'un(e) nutritionniste, en particulier en cas de pathologie ou de trouble alimentaire.";

/** Mots interdits en sortie (le module ne conseille JAMAIS de restriction) — testé en CI. */
export const FORBIDDEN_OUTPUT = ["déficit", "perte de poids", "maigrir", "restriction", "brûler des graisses"];

/** N7 — dépense estimée : MET moyens publiés (compendium Ainsworth) par sport × intensité.
 *  Fourchette [min, max] de MET ; sans poids connu on élargit avec un gabarit 60–80 kg. */
const METS: Record<string, Record<EffortIntensity, [number, number]>> = {
  rn: { facile: [8, 10], moyenne: [10, 12], dure: [11.5, 14] },
  bk: { facile: [6, 8], moyenne: [8, 10], dure: [10, 13] },
  sw: { facile: [6, 8], moyenne: [8, 9.8], dure: [9.8, 11] },
  br: { facile: [7, 9], moyenne: [9, 11], dure: [10.5, 13] },
};

const r5 = (v: number): number => Math.round(v / 5) * 5;
const r50 = (v: number): number => Math.max(50, Math.round(v / 50) * 50);

/** Classement d'intensité d'une séance générée — réutilise intensitySplit (SEUL
 *  classificateur d'intensité du moteur, dashboard 80/20) : pas de deuxième chemin. */
export function classifyIntensity(s: RawSession): EffortIntensity {
  const sp = intensitySplit(s);
  if (sp.hardMin >= 8) return "dure";
  if (sp.modMin >= 10) return "moyenne";
  return "facile";
}

/** Conseil de ravitaillement d'une séance. Bornes dures : glucides ≤90 g/h, boisson ≤1000 ml/h. */
export function sessionNutrition(input: NutritionInput): NutritionAdvice {
  const D: NutritionDecision[] = [];
  const min = Math.max(0, Math.round(input.minutes || 0));
  const hot = input.tempC != null && input.tempC >= 25;
  const veryHot = input.tempC != null && input.tempC >= 28;
  const hard = input.intensity === "dure";
  const longish = !!input.long || min > 90;

  // — N1/N2/N3 : glucides pendant l'effort, par durée (et intensité pour la zone grise)
  let carbs: [number, number] | null = null;
  let carbsTxt: string;
  if (min < 60 || (min < 75 && !hard)) {
    carbs = null;
    carbsTxt = hard
      ? "Pas besoin de glucides sur une séance aussi courte — un simple rinçage de bouche glucidique peut aider sur le très intense."
      : "De l'eau suffit — pas besoin de glucides sur une sortie courte et facile.";
    D.push({ id: "N1", what: "Glucides pendant l'effort", val: "aucun nécessaire", why: "séance courte (<1 h" + (hard ? "" : "15 à intensité facile") + ") : les réserves de glycogène suffisent largement (ACSM 2016)" });
  } else if (min <= 150) {
    carbs = [30, 60];
    carbsTxt = "Vise 30–60 g de glucides par heure (boisson, gel ou solide au choix — ce que tu digères bien).";
    D.push({ id: "N2", what: "Glucides pendant l'effort", val: "30–60 g/h", why: (hard && min < 75 ? "séance courte mais intense" : "effort de 1 h à 2 h 30") + " : un apport régulier maintient la qualité de fin de séance (Jeukendrup 2014)" });
  } else {
    carbs = [60, 90];
    carbsTxt = "Vise 60–90 g de glucides par heure — au-delà de 60 g/h, mélange glucose + fructose, et entraîne ton tube digestif à l'entraînement, jamais de nouveauté le jour J.";
    D.push({ id: "N3", what: "Glucides pendant l'effort", val: "60–90 g/h", why: "effort >2 h 30 : l'oxydation plafonne vers 60 g/h pour le glucose seul, le mix glucose:fructose repousse la limite (Jeukendrup 2014)" });
  }

  // — N4 : hydratation par durée + température (plafond dur 1000 ml/h, hyponatrémie)
  let drink: [number, number] = min < 60 ? [0, 500] : [400, 800];
  let sodium = false;
  if (hot) {
    drink = [Math.min(600, drink[0] + 200), Math.min(1000, drink[1] + 200)];
    sodium = min > 60;
  }
  if (veryHot) sodium = min > 45;
  const drinkTxt =
    (min < 60 ? "Bois à la soif (jusqu'à ~500 ml)" : "Bois régulièrement, " + drink[0] + "–" + drink[1] + " ml/h à la soif") +
    (sodium ? ", avec du sodium (boisson d'effort ou pastille, ~300–600 mg/L) vu la chaleur" : "") +
    (input.d === "sw" ? " — oui, même en natation : on ne sent pas la sueur dans l'eau" : "") +
    ". Jamais plus d'1 L/h.";
  D.push({ id: "N4", what: "Hydratation", val: drink[0] + "–" + drink[1] + " ml/h" + (sodium ? " + sodium" : ""), why: (hot ? "chaleur (" + Math.round(input.tempC as number) + "°C) : pertes sudorales accrues, le sodium évite l'hyponatrémie de dilution" : "boire à la soif couvre l'essentiel d'un effort tempéré") + " (ACSM 2007)" });

  // — N6 : jamais à jeun sur dur/long (sécurité — priorité n°1 du manifeste)
  const before = hard || longish
    ? "Ne pars pas à jeun : un vrai repas 2–3 h avant, ou une collation glucidique 30–60 min avant. Une séance " + (hard ? "intense" : "longue") + " à jeun dégrade la qualité et augmente le risque de malaise."
    : "Pars comme tu le sens — sur une séance courte et facile, à jeun ou non, les deux se défendent.";
  if (hard || longish) D.push({ id: "N6", what: "Avant la séance", val: "jamais à jeun", why: "séance " + (hard ? "intense" : "longue") + " : l'hypoglycémie d'effort est un risque évitable — la santé passe avant tout" });

  // — N5 : fenêtre de récupération après dur/long
  let after: string | null = null;
  if (hard || longish) {
    const w = input.weightKg && input.weightKg > 0 ? input.weightKg : null;
    after = w
      ? "Dans les 30–60 min : ~" + r5(w * 1.0) + "–" + r5(w * 1.2) + " g de glucides + ~" + r5(w * 0.25) + "–" + r5(w * 0.35) + " g de protéines (pour " + Math.round(w) + " kg), puis un vrai repas."
      : "Dans les 30–60 min : une collation glucides + protéines (ex. banane + yaourt, riz + œufs), puis un vrai repas dans les 2 h.";
    D.push({ id: "N5", what: "Récupération", val: w ? "~1–1.2 g/kg glucides + ~0.3 g/kg protéines" : "collation glucides + protéines sous 60 min", why: "après une séance " + (hard ? "intense" : "longue") + ", la fenêtre 30–60 min accélère la resynthèse de glycogène et la réparation musculaire (ISSN 2017)" });
  }

  // — N7 : dépense estimée (information, jamais une cible d'apport ni de déficit)
  const mets = METS[input.d] || METS.rn;
  const [m1, m2] = mets[input.intensity] || mets.facile;
  const [w1, w2] = input.weightKg && input.weightKg > 0 ? [input.weightKg, input.weightKg] : [60, 80];
  const kcal: [number, number] = [r50((m1 * w1 * min) / 60), r50((m2 * w2 * min) / 60)];
  D.push({ id: "N7", what: "Dépense estimée", val: "~" + kcal[0] + "–" + kcal[1] + " kcal", why: "MET publiés (compendium Ainsworth) × " + (input.weightKg ? "ton poids" : "gabarit 60–80 kg") + " × durée — une estimation pour comprendre, pas une cible à compenser ni à creuser" });

  return {
    before,
    during: { carbsGPerH: carbs, drinkMlPerH: drink, sodium, text: carbsTxt + " " + drinkTxt },
    after,
    kcal,
    decisions: D,
    disclaimer: DISCLAIMER,
  };
}

/** Point d'entrée UI : conseil pour une séance générée (V1Session-compatible).
 *  Retourne null pour le repos/renfo (rs) — pas de ravitaillement d'effort à conseiller. */
export function nutritionForSession(
  s: RawSession & { long?: boolean },
  opts?: { tempC?: number | null; weightKg?: number | null },
): NutritionAdvice | null {
  if (!s || s.d === "rs") return null;
  return sessionNutrition({
    d: s.d,
    minutes: Math.round(s.min || 0),
    intensity: classifyIntensity(s),
    long: !!s.long,
    tempC: opts?.tempC ?? null,
    weightKg: opts?.weightKg ?? null,
  });
}
