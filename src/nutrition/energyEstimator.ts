/**
 * energyEstimator — estimation de la dépense énergétique journalière + répartition
 * indicative des macros. Débloqué par DÉCISION UTILISATEUR (28/07/2026) : « une
 * estimation des calories dépensées de base + calories entraînement + macros, jamais
 * de conseil de nutrition à proprement parler ».
 *
 * FRONTIÈRE STRICTE (note.md priorité n°1, invariants testés par demo:nutrition) :
 * - Tout ce qui sort est une DÉPENSE estimée ou une RÉPARTITION OBSERVÉE dans les
 *   consensus — jamais une cible d'apport, jamais un « mange X », jamais un déficit.
 * - Les mots interdits (FORBIDDEN_OUTPUT) restent bannis de toute sortie.
 * - L'avertissement (ENERGY_DISCLAIMER) est obligatoire et plus explicite encore que
 *   celui du ravitaillement : estimation ≠ prescription, voir un(e) diététicien(ne)
 *   pour des cibles d'apport.
 *
 * Sources (consensus publiés, pas d'invention maison) :
 * - N8 métabolisme de base : équation de Mifflin-St Jeor (1990), la mieux validée en
 *   population générale (ADA 2005). Taille absente → enveloppe sur gabarits publiés.
 * - N9 dépense journalière : BMR × NAP hors entraînement 1.35–1.55 (vie quotidienne
 *   assise à modérément active, FAO/WHO/UNU 2001) + dépense d'entraînement (N7, MET).
 * - N10 macros indicatives : protéines 1.2–1.7 g/kg/j (ACSM/AND/DC 2016, endurance),
 *   lipides 20–35 % de l'énergie (AMDR), glucides selon le volume d'entraînement
 *   quotidien (Burke 2011 : ~1 h/j → 5–7 g/kg ; léger → 3–5 ; lourd → 6–10).
 */
import { DISCLAIMER, FORBIDDEN_OUTPUT, type NutritionDecision } from "./nutritionCalculator.ts";

export interface EnergyInput {
  weightKg: number; // requis — sans poids on ne calcule RIEN (dailyEnergy retourne null)
  heightCm?: number | null;
  age?: number | null;
  sex?: string | null; // "H" | "F" | autre/inconnu → enveloppe des deux
  trainingKcal?: [number, number] | null; // somme des dépenses N7 des séances du jour
  trainingMin?: number; // minutes d'entraînement du jour (pilote la fourchette glucides)
}

export interface DailyEnergyEstimate {
  bmr: [number, number]; // métabolisme de base (kcal/j)
  daily: [number, number]; // base + vie quotidienne HORS entraînement
  training: [number, number]; // dépense d'entraînement du jour
  total: [number, number]; // daily + training
  macros: {
    proteinG: [number, number];
    fatG: [number, number];
    carbsG: [number, number];
    text: string;
  };
  approximate: boolean; // true si taille/âge/sexe manquants (fourchette élargie)
  decisions: NutritionDecision[];
  disclaimer: string;
}

/** Avertissement spécifique aux estimations journalières — l'UI l'affiche tel quel. */
export const ENERGY_DISCLAIMER =
  "Ces chiffres sont une ESTIMATION de ta dépense, pas une consigne d'apport : " +
  "aucun objectif calorique, aucun régime. La répartition des macros est une photographie " +
  "des consensus de nutrition sportive, pas un menu. Pour des cibles d'apport personnalisées, " +
  "vois un(e) diététicien(ne)-nutritionniste. " + DISCLAIMER;

const eRound10 = (v: number): number => Math.round(v / 10) * 10;
const eRound5 = (v: number): number => Math.round(v / 5) * 5;

/** N8 — métabolisme de base (Mifflin-St Jeor), en enveloppe [min, max] honnête :
 *  chaque donnée manquante élargit la fourchette au lieu d'inventer une précision. */
export function basalRange(weightKg: number, heightCm?: number | null, age?: number | null, sex?: string | null): { bmr: [number, number]; approximate: boolean } {
  const heights = heightCm && heightCm >= 120 && heightCm <= 220 ? [heightCm, heightCm] : sex === "F" ? [158, 172] : sex === "H" ? [170, 185] : [158, 185];
  const ages = age && age >= 14 && age <= 90 ? [age, age] : [25, 55];
  const sexes = sex === "H" ? [5] : sex === "F" ? [-161] : [-161, 5];
  let lo = Infinity, hi = -Infinity;
  for (const h of heights) for (const a of ages) for (const s of sexes) {
    const v = 10 * weightKg + 6.25 * h - 5 * a + s;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  // Mifflin-St Jeor a ~±10 % d'erreur individuelle même complet — on l'affiche.
  const approximate = heights[0] !== heights[1] || ages[0] !== ages[1] || sexes.length > 1;
  return { bmr: [eRound10(Math.max(800, lo * 0.95)), eRound10(hi * 1.05)], approximate };
}

/** Estimation journalière complète. Retourne null sans poids valide — on n'estime
 *  jamais sur du vide, et l'UI renvoie vers le Profil. */
export function dailyEnergy(input: EnergyInput): DailyEnergyEstimate | null {
  const w = input.weightKg;
  if (!w || !(w > 25) || !(w < 300)) return null;
  const D: NutritionDecision[] = [];
  const { bmr, approximate } = basalRange(w, input.heightCm, input.age, input.sex);
  D.push({ id: "N8", what: "Métabolisme de base", val: bmr[0] + "–" + bmr[1] + " kcal/j", why: "équation de Mifflin-St Jeor (la mieux validée, ADA 2005)" + (approximate ? " — fourchette élargie car taille/âge/sexe incomplets au Profil" : " avec tes données du Profil") + " ; ce que ton corps dépense au repos complet" });

  // N9 — vie quotidienne hors entraînement : NAP 1.35–1.55 (assis à modérément actif).
  const daily: [number, number] = [eRound10(bmr[0] * 1.35), eRound10(bmr[1] * 1.55)];
  const training: [number, number] = input.trainingKcal && input.trainingKcal[1] > 0 ? [eRound10(input.trainingKcal[0]), eRound10(input.trainingKcal[1])] : [0, 0];
  const total: [number, number] = [daily[0] + training[0], daily[1] + training[1]];
  D.push({ id: "N9", what: "Dépense du jour (estimée)", val: total[0] + "–" + total[1] + " kcal", why: "base × 1.35–1.55 (vie quotidienne hors sport, FAO/WHO 2001) + " + (training[1] ? "l'entraînement du jour (~" + training[0] + "–" + training[1] + " kcal, MET publiés)" : "aucun entraînement prévu aujourd'hui") + " — une information pour comprendre, jamais une cible à atteindre ni à creuser" });

  // N10 — macros indicatives : une RÉPARTITION observée dans les consensus, pas un menu.
  const tMin = Math.max(0, input.trainingMin || 0);
  const carbsPerKg: [number, number] = tMin >= 90 ? [6, 10] : tMin >= 45 ? [5, 7] : [3, 5];
  const proteinG: [number, number] = [eRound5(1.2 * w), eRound5(1.7 * w)];
  const fatG: [number, number] = [eRound5((total[0] * 0.2) / 9), eRound5((total[1] * 0.35) / 9)];
  const carbsG: [number, number] = [eRound5(carbsPerKg[0] * w), eRound5(carbsPerKg[1] * w)];
  const macroText =
    "À titre indicatif, les consensus de nutrition sportive observent chez les sportifs d'endurance : " +
    "protéines ~" + proteinG[0] + "–" + proteinG[1] + " g/j (1.2–1.7 g/kg), " +
    "lipides ~" + fatG[0] + "–" + fatG[1] + " g/j (20–35 % de l'énergie — jamais moins de 20 %), " +
    "glucides ~" + carbsG[0] + "–" + carbsG[1] + " g/j (" + carbsPerKg[0] + "–" + carbsPerKg[1] + " g/kg pour " + (tMin >= 90 ? "un gros jour d'entraînement" : tMin >= 45 ? "un jour d'entraînement modéré" : "un jour léger ou de repos") + ", Burke 2011). " +
    "C'est une photographie de la littérature, pas un menu ni une consigne.";
  D.push({ id: "N10", what: "Macros (répartition indicative)", val: "P " + proteinG[0] + "–" + proteinG[1] + " g · L " + fatG[0] + "–" + fatG[1] + " g · G " + carbsG[0] + "–" + carbsG[1] + " g", why: "protéines ACSM/AND/DC 2016, lipides AMDR (plancher 20 % — santé hormonale), glucides selon le volume du jour (Burke 2011)" });

  return { bmr, daily, training, total, macros: { proteinG, fatG, carbsG, text: macroText }, approximate, decisions: D, disclaimer: ENERGY_DISCLAIMER };
}
