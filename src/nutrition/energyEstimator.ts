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
  training: [number, number]; // dépense d'entraînement du jour, BRUTE (MET publiés)
  /** N11 — le repos de ces heures-là, déjà compté dans `daily` : `training` − `restOverlap`. */
  restOverlap: number;
  trainingNet: [number, number]; // ce que l'entraînement AJOUTE à la journée
  total: [number, number]; // daily + trainingNet — jamais daily + training (N11)
  macros: {
    proteinG: [number, number];
    fatG: [number, number];
    carbsG: [number, number];
    text: string;
    /** R16.6 — la même information, une ligne par macro (lisible sur mobile). */
    lines: string[];
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

/**
 * N11 — 1 MET ≈ 1 kcal par kilo et par heure (3,5 mL O₂/kg/min). C'est la définition même du
 * MET, donc la quantité exacte que les tables de MET incluent au titre du repos.
 */
export const REST_MET_KCAL_PER_KG_H = 1;

const eRound10 = (v: number): number => Math.round(v / 10) * 10;
const eRound5 = (v: number): number => Math.round(v / 5) * 5;

/** E4 (audit v6) — garde IMC : hors [15, 45], les équations de dépense ne sont pas
 * validées, et un tableau calorique propre et autoritaire est exactement le mauvais
 * objet à mettre sous les yeux de quelqu'un dans cette situation. On n'affiche RIEN
 * (pas d'estimation dégradée), et l'UI peut afficher ce message à la place. */
export const BMI_VALID_RANGE: [number, number] = [15, 45];
export function bmiGuardNotice(weightKg?: number | null, heightCm?: number | null): string | null {
  if (!weightKg || !heightCm || !(weightKg > 0) || !(heightCm > 0)) return null;
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  if (bmi >= BMI_VALID_RANGE[0] && bmi <= BMI_VALID_RANGE[1]) return null;
  return "Les chiffres saisis sortent des bornes sur lesquelles les équations de dépense énergétique sont validées : aucune estimation n'est affichée. Si ces valeurs sont exactes, un accompagnement médical ou diététique sera plus utile qu'un calculateur.";
}

/**
 * O-16 — GARDE D'ÂGE. Mifflin-St Jeor est validée chez l'ADULTE, et le NAP de la FAO décrit
 * une dépense d'adulte : ni l'une ni l'autre ne s'applique à un organisme en croissance, dont
 * la dépense de base rapportée au poids est plus élevée et surtout beaucoup plus variable d'un
 * individu à l'autre. Le moteur ne leur opposait pourtant AUCUNE borne — un profil de 12 ans
 * recevait « 1 750–2 480 kcal » et « protéines 60–90 g/j », un chiffre qui a l'air précis alors
 * que l'équation est hors de son domaine (à 12 ans, l'âge sort même de la bande 14–90 de
 * `basalRange` : le moteur retombait sur l'enveloppe 25–55 ans sans le dire).
 *
 * La garde IMC ne voyait rien ici : l'IMC d'un adolescent de gabarit normal l'est aussi.
 *
 * Ce qui est coupé et ce qui ne l'est pas — décision du fondateur (02/08/2026), en attendant la
 * réponse du dossier de relecture diététique (question 3) : on coupe l'ESTIMATION JOURNALIÈRE
 * (N8–N11) et les macros, on garde le RAVITAILLEMENT D'EFFORT (N1–N7). Un adolescent qui roule
 * trois heures a besoin de savoir quoi boire ; il n'a besoin d'aucun tableau calorique. Le sens
 * de l'erreur tranche : ne rien afficher coûte moins cher qu'un chiffre faux, et c'est déjà le
 * choix fait pour l'IMC.
 *
 * Refus seulement si l'âge est CONNU et sous la borne — un âge absent n'est pas une preuve de
 * minorité, et couper dessus retirerait l'écran à des adultes qui n'ont pas rempli le champ.
 */
export const MIN_AGE_FOR_ENERGY_ESTIMATE = 16;
export function ageGuardNotice(age?: number | null): string | null {
  if (age == null || !isFinite(age) || !(age > 0)) return null;
  if (age >= MIN_AGE_FOR_ENERGY_ESTIMATE) return null;
  return "Les équations de dépense énergétique utilisées ici sont validées chez l'adulte : avant " + MIN_AGE_FOR_ENERGY_ESTIMATE + " ans, elles donneraient un chiffre qui a l'air précis sans l'être. Aucune estimation n'est affichée. Les conseils de ravitaillement de chaque séance, eux, restent valables. Pour des repères d'apport à cet âge, un(e) diététicien(ne) est le bon interlocuteur.";
}

/**
 * Le motif du refus, quand il y en a un. La garde IMC portait ce message depuis l'audit v6 et
 * son commentaire disait « l'UI peut afficher ce message à la place » — l'UI ne l'a jamais
 * affiché, elle montrait le repli « renseigne ton poids », c'est-à-dire une invitation à
 * corriger une donnée qui n'était pas en cause. Un point unique, lu par la carte 🔥.
 */
export function energyRefusalNotice(input: { weightKg?: number | null; heightCm?: number | null; age?: number | null }): string | null {
  return ageGuardNotice(input.age) ?? bmiGuardNotice(input.weightKg, input.heightCm);
}

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
  if (energyRefusalNotice({ weightKg: w, heightCm: input.heightCm, age: input.age })) return null; // E4 + O-16
  const D: NutritionDecision[] = [];
  const { bmr, approximate } = basalRange(w, input.heightCm, input.age, input.sex);
  D.push({ id: "N8", what: "Métabolisme de base", val: bmr[0] + "–" + bmr[1] + " kcal/j", why: "équation de Mifflin-St Jeor (la mieux validée, ADA 2005)" + (approximate ? " — fourchette élargie car taille/âge/sexe incomplets au Profil" : " avec tes données du Profil") + " ; ce que ton corps dépense au repos complet" });

  // N9 — vie quotidienne hors entraînement : NAP 1.35–1.55 (assis à modérément actif).
  const daily: [number, number] = [eRound10(bmr[0] * 1.35), eRound10(bmr[1] * 1.55)];
  const training: [number, number] = input.trainingKcal && input.trainingKcal[1] > 0 ? [eRound10(input.trainingKcal[0]), eRound10(input.trainingKcal[1])] : [0, 0];

  // N11 — LE REPOS DES HEURES D'ENTRAÎNEMENT N'EST PAS COMPTÉ DEUX FOIS.
  //
  // `training` vient des MET (N7), et un MET est une dépense BRUTE : par définition, 1 MET est
  // le métabolisme de repos. Une heure de course à 10 MET coûte donc 10 × poids kcal, dont
  // 1 × poids que la personne aurait dépensés de toute façon, allongée sur son canapé.
  //
  // Or `daily` (BMR × NAP) couvre déjà les 24 HEURES de la journée, entraînement compris — le
  // NAP de la FAO est le rapport de la dépense TOTALE au métabolisme de base. Additionner les
  // deux comptait donc deux fois le repos des heures d'entraînement.
  //
  // Mesuré avant correction, sur 75 kg : **+75 kcal sur 1 h, +150 sur 2 h, +375 sur 5 h**, soit
  // **2,1 % à 5,8 % du total affiché** — et toujours dans le sens qui GONFLE la dépense. Sur un
  // écran de nutrition, c'est le sens qui compte : une dépense surestimée est une dépense qu'on
  // peut lire comme une autorisation.
  //
  // On retire donc le recouvrement : 1 MET × poids × heures d'entraînement. Ce n'est pas de la
  // diététique, c'est de l'arithmétique — compter deux fois le même repos est faux quel que
  // soit l'avis du professionnel, et la correction ne dépend d'aucun arbitrage.
  //
  // Ce qui NE change PAS : la dépense affichée pour UNE SÉANCE (N7) reste brute. C'est la bonne
  // réponse à « combien coûte cette séance » — le recouvrement n'existe que lorsqu'on l'ajoute
  // à une journée déjà comptée en entier. `training` reste donc BRUT dans la sortie, et le
  // recouvrement est PUBLIÉ (`restOverlap`, `trainingNet`) au lieu d'être retranché en
  // silence : une carte où les trois lignes affichées ne s'additionnent pas est une carte
  // qu'on soupçonne. La ligne se lit, elle s'explique, et le total tombe juste.
  const heures = Math.max(0, input.trainingMin || 0) / 60;
  const recouvrement = training[1] > 0 ? eRound10(REST_MET_KCAL_PER_KG_H * w * heures) : 0;
  const trainingNet: [number, number] = [Math.max(0, training[0] - recouvrement), Math.max(0, training[1] - recouvrement)];
  const total: [number, number] = [daily[0] + trainingNet[0], daily[1] + trainingNet[1]];
  D.push({ id: "N9", what: "Dépense du jour (estimée)", val: total[0] + "–" + total[1] + " kcal", why: "base × 1.35–1.55 (vie quotidienne hors sport, FAO/WHO 2001) + " + (training[1] ? "l'entraînement du jour (~" + training[0] + "–" + training[1] + " kcal bruts, MET publiés)" : "aucun entraînement prévu aujourd'hui") + " — une information pour comprendre, jamais une cible à atteindre ni à creuser" });
  if (recouvrement > 0)
    D.push({ id: "N11", what: "Repos compté une seule fois", val: "−" + recouvrement + " kcal", why: "les MET incluent le métabolisme de repos, et ta journée le compte déjà sur 24 h : on retire ce que tu aurais dépensé pendant ces " + (Math.round(heures * 10) / 10) + " h même sans bouger, sinon la dépense affichée serait gonflée" });

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
  // R16.6 — LES MACROS SE LISENT EN TROIS LIGNES, PAS EN UN PAVÉ.
  // `text` reste la phrase continue (contrat existant, asserté par `demo:nutrition`) ; on
  // ajoute la MÊME information découpée par macro, parce qu'un paragraphe de six lignes
  // enchaînées se lit comme un mur sur mobile — et parce que c'est une estimation qu'on
  // consulte, pas un texte qu'on lit. La source et l'avertissement ne bougent pas : c'est la
  // mise en forme qui était en cause, pas le contenu.
  const jourLbl = tMin >= 90 ? "un gros jour d'entraînement" : tMin >= 45 ? "un jour d'entraînement modéré" : "un jour léger ou de repos";
  const macroLines: string[] = [
    "Protéines ~" + proteinG[0] + "–" + proteinG[1] + " g/j — 1,2 à 1,7 g/kg (ACSM/AND/DC 2016)",
    "Lipides ~" + fatG[0] + "–" + fatG[1] + " g/j — 20 à 35 % de l'énergie, jamais moins de 20 % (AMDR)",
    "Glucides ~" + carbsG[0] + "–" + carbsG[1] + " g/j — " + carbsPerKg[0] + " à " + carbsPerKg[1] + " g/kg pour " + jourLbl + " (Burke 2011)",
  ];
  D.push({ id: "N10", what: "Macros (répartition indicative)", val: "P " + proteinG[0] + "–" + proteinG[1] + " g · L " + fatG[0] + "–" + fatG[1] + " g · G " + carbsG[0] + "–" + carbsG[1] + " g", why: "protéines ACSM/AND/DC 2016, lipides AMDR (plancher 20 % — santé hormonale), glucides selon le volume du jour (Burke 2011)" });

  return { bmr, daily, training, restOverlap: recouvrement, trainingNet, total, macros: { proteinG, fatG, carbsG, text: macroText, lines: macroLines }, approximate, decisions: D, disclaimer: ENERGY_DISCLAIMER };
}
