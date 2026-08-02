/**
 * feasibility — LE RAISONNEMENT INVERSE (prototype, course à pied).
 *
 * Le moteur construit EN AVANT : d'où tu pars (rampe R10), jusqu'où la courbe peut monter.
 * Ce module prend le problème par l'autre bout — une épreuve, un chrono visé — et déroule à
 * reculons ce que ça EXIGE, jusqu'à aujourd'hui.
 *
 * CE QU'IL NE FAIT PAS, ET C'EST LA RAISON D'ÊTRE DU MODULE :
 * il ne construit AUCUN plan et ne touche à AUCUN plafond. Le chrono visé n'entre que dans un
 * VERDICT. Tout R14/R14.1 existe pour que la performance soit une SORTIE estimée et jamais une
 * cible qui construit — P6 le résume : « le temps se projette, l'intensité s'ancre ». Laisser un
 * objectif de temps augmenter une charge, ce serait la priorité n°5 du manifeste qui écrase les
 * quatre premières. La garde `RV-INVARIANT` mesure cette propriété : le plan émis doit être
 * identique au bit près avec et sans objectif de temps.
 *
 * AUCUN MODÈLE NOUVEAU. Chaque étape INVERSE un modèle déjà sourcé et déjà audité :
 *   · Riegel avec l'exposant piloté par le volume (P5) → allure seuil requise ;
 *   · le modèle de gain P2bis (G∞ = G_plafond × h(marge mesurée) × k_structure × f_volume,
 *     saturant en TAU_WEEKS) → ce que l'horizon disponible peut produire.
 * Un second modèle de performance serait un second jeu de vérités : c'est précisément ce que
 * R11.1, R20.5 et U9 interdisent ailleurs dans le moteur.
 */
import { riegelExponent } from "./predictor.ts";
import {
  G_PLAFOND, GAIN_MAX_ABSOLU, TAU_WEEKS, TAPER_GAIN,
  margeOf, structureFactor, volumeFactor,
} from "./projection.ts";
import type { Decision } from "./types.ts";

/** Distances de référence des formats de course à pied, en km. */
export const RUN_DIST_KM: Record<string, number> = { "5k": 5, "10k": 10, semi: 21.0975, marathon: 42.195 };

export interface FeasibilityInput {
  format: string;              // "10k" | "semi" | "marathon" | "5k"
  targetSec: number;           // le chrono visé, en secondes
  thrPaceSecPerKm: number;     // l'allure seuil MESURÉE aujourd'hui
  horizonWeeks: number;        // semaines disponibles d'ici la course
  runHoursPerWeek?: number | null;   // volume récent (pilote l'exposant de Riegel, P5)
  prescribedMeanH?: number | null;   // volume moyen que le plan prescrirait (P10)
  weightKg?: number | null;
  sex?: string | null;
  age?: number | null;
  trainingStructure?: string | null;
  history?: string;
}

export type FeasibilityVerdict = "atteignable" | "juste" | "hors-horizon" | "hors-modele" | "indeterminable";

export interface FeasibilityResult {
  verdict: FeasibilityVerdict;
  /** L'allure seuil qu'il faudrait avoir le jour J pour tenir le chrono visé (s/km). */
  requiredPaceSecPerKm: number | null;
  /** Le gain nécessaire, en fraction de l'allure actuelle (0.04 = 4 % plus rapide). */
  gainNeeded: number | null;
  /** Le gain que l'horizon disponible peut produire, mêmes règles que la projection. */
  gainAvailable: number | null;
  /** L'asymptote : le gain maximal que ce profil peut produire, quel que soit l'horizon. */
  gainCeiling: number | null;
  /** Nombre de semaines qu'il aurait fallu (null si aucun horizon ne suffit). */
  weeksNeeded: number | null;
  /** Le chrono que l'horizon disponible rend réellement accessible. */
  reachableSec: number | null;
  decisions: Decision[];
  /** Une phrase, celle qu'on montrerait à l'athlète. */
  human: string;
}

const fmtTime = (sec: number): string => {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h > 0 ? h + "h" + String(m).padStart(2, "0") + "'" + String(r).padStart(2, "0") : m + "'" + String(r).padStart(2, "0");
};
const fmtPace = (secPerKm: number): string => {
  const s = Math.round(secPerKm);
  return Math.floor(s / 60) + "'" + String(s % 60).padStart(2, "0") + "/km";
};

/**
 * RV1 — L'INVERSION DE RIEGEL, en forme close.
 * `riegelSecWith` fait T = 3600 × (D / d1h)^e avec d1h = 3600/allure. On isole l'allure :
 *   d1h = D / (T/3600)^(1/e)   →   allure = 3600 × (T/3600)^(1/e) / D
 * Aucune recherche numérique, donc aucune tolérance à régler et aucun cas de non-convergence.
 */
export function requiredThresholdPace(targetSec: number, distKm: number, exponent: number): number | null {
  if (!(targetSec > 0) || !(distKm > 0) || !(exponent > 0)) return null;
  return (3600 * Math.pow(targetSec / 3600, 1 / exponent)) / distKm;
}

/** Le chrono qu'une allure seuil donnée permet — le sens direct, pour rendre le verdict lisible. */
export function timeFromThresholdPace(thrPaceSecPerKm: number, distKm: number, exponent: number): number {
  const d1h = 3600 / thrPaceSecPerKm;
  return 3600 * Math.pow(distKm / d1h, exponent);
}

export function assessFeasibility(input: FeasibilityInput): FeasibilityResult {
  const decisions: Decision[] = [];
  const D = (id: string, what: string, val: string, why: string) => decisions.push({ id, what, val, why });
  const vide = (human: string): FeasibilityResult => ({
    verdict: "indeterminable", requiredPaceSecPerKm: null, gainNeeded: null, gainAvailable: null,
    gainCeiling: null, weeksNeeded: null, reachableSec: null, decisions, human,
  });

  const dist = RUN_DIST_KM[input.format];
  if (!dist) return vide("Format de course inconnu — aucun verdict.");
  if (!(input.thrPaceSecPerKm > 0))
    return vide("Sans allure seuil mesurée, on ne peut rien dire de ton objectif — et te répondre quand même serait inventer.");
  if (!(input.targetSec > 0)) return vide("Aucun chrono visé.");

  // ---- RV1 : ce que le chrono visé EXIGE, en allure seuil ----
  const expo = riegelExponent(input.runHoursPerWeek ?? undefined);
  const paceReq = requiredThresholdPace(input.targetSec, dist, expo);
  if (paceReq == null) return vide("Chrono ou distance hors domaine.");
  D("RV1", "Allure seuil requise le jour J", fmtPace(paceReq),
    "Riegel inversé, avec l'exposant piloté par ton volume (" + expo.toFixed(3) + ", règle P5) — c'est le "
    + "MÊME modèle que celui qui te prédit ton chrono, lu dans l'autre sens. Aucun second modèle : "
    + "deux modèles de performance, ce serait deux vérités.");

  // ---- RV2 : l'écart avec ce que tu es aujourd'hui ----
  const gainNeeded = 1 - paceReq / input.thrPaceSecPerKm;
  D("RV2", "Écart à combler", (gainNeeded * 100).toFixed(1) + " %",
    "Ton allure seuil mesurée est " + fmtPace(input.thrPaceSecPerKm) + " ; l'objectif en demande "
    + fmtPace(paceReq) + ". C'est de ça qu'on parle — pas d'un pourcentage de motivation.");

  if (gainNeeded <= 0) {
    const dejaSec = timeFromThresholdPace(input.thrPaceSecPerKm, dist, expo);
    D("RV6", "Verdict", "déjà atteint", "Ta forme actuelle tient déjà ce chrono.");
    return {
      verdict: "atteignable", requiredPaceSecPerKm: paceReq, gainNeeded, gainAvailable: null,
      gainCeiling: null, weeksNeeded: 0, reachableSec: dejaSec, decisions,
      human: "Ta forme d'aujourd'hui tient déjà cet objectif (elle donne " + fmtTime(dejaSec) + "). "
        + "Le plan sert alors à consolider et à arriver frais, pas à combler un écart.",
    };
  }

  // ---- RV3 : ce que ce profil peut produire, mêmes règles que la projection ----
  const refs = { ftp: 0, thrPace: input.thrPaceSecPerKm, css: 0 };
  const marge = margeOf("thrPace", refs, input.weightKg, input.sex, input.age);
  if (marge == null) return vide("Marge non calculable sur ton allure — pas de verdict inventé.");
  const { k } = structureFactor(input.trainingStructure, input.history);
  const fVol = volumeFactor(input.prescribedMeanH, input.runHoursPerWeek) ?? 1;
  const gInf = Math.min(GAIN_MAX_ABSOLU, G_PLAFOND.thrPace * marge * k * fVol);
  D("RV3", "Gain maximal de ton profil", (gInf * 100).toFixed(1) + " %",
    "G∞ = plafond de la discipline (" + (G_PLAFOND.thrPace * 100).toFixed(0) + " %, Barnes & Kilding 2015) "
    + "× ta marge MESURÉE (" + (marge * 100).toFixed(0) + " %) × structure (" + k.toFixed(2) + ") "
    + "× volume (" + fVol.toFixed(2) + "). C'est une ASYMPTOTE : aucun horizon ne la dépasse.");

  // ---- RV4 : au-delà de ce que le modèle sait CHIFFRER (et non « impossible ») ----
  //
  // ERREUR CORRIGÉE, ET ELLE VAUT D'ÊTRE ÉCRITE. Ma première version concluait ici « quelle que
  // soit la durée de préparation » — c'est-à-dire qu'elle lisait `G_PLAFOND` comme un plafond de
  // CARRIÈRE. Or sa provenance dit exactement autre chose : Barnes & Kilding 2015 mesure ce que
  // gagne l'économie de course **sur un cycle**, et la projection l'utilise sur l'horizon d'UNE
  // préparation. Rien dans ce dépôt ne mesure « de combien cette personne peut progresser, un
  // jour ».
  //
  // Mesuré, avec la lecture fautive : un marathon de 4 h 01 visé en 3 h 30 sur 16 semaines —
  // objectif banal, atteint par des milliers de coureurs — sortait « impossible quel que soit
  // l'horizon ». Un verdict faux dans ce sens-là est pire que pas de verdict : il décourage
  // quelqu'un dont l'objectif tient debout.
  //
  // Même famille que R14.1 : une table lue comme décrivant ce qu'elle ne décrit pas. La
  // réponse honnête est celle que P7/P8 emploient déjà ailleurs — **refuser d'estimer**, en
  // disant pourquoi, plutôt que d'estimer mal.
  const gainAvecAffutage = (g: number): number => Math.min(GAIN_MAX_ABSOLU, g + TAPER_GAIN);
  if (gainNeeded > gainAvecAffutage(gInf)) {
    const surCycle = timeFromThresholdPace(input.thrPaceSecPerKm * (1 - gainAvecAffutage(gInf)), dist, expo);
    D("RV6", "Verdict", "hors de portée du modèle",
      "L'écart dépasse ce qu'un CYCLE de préparation sait produire. Le modèle ne dit pas que c'est "
      + "impossible : il dit qu'il ne sait pas le chiffrer, parce qu'aucune de ses sources ne "
      + "mesure une progression sur plusieurs saisons.");
    return {
      verdict: "hors-modele", requiredPaceSecPerKm: paceReq, gainNeeded, gainAvailable: gainAvecAffutage(gInf),
      gainCeiling: gInf, weeksNeeded: null, reachableSec: surCycle, decisions,
      human: "Cet objectif demande " + (gainNeeded * 100).toFixed(1) + " % de gain, quand **un cycle de "
        + "préparation** en produit au plus " + (gainAvecAffutage(gInf) * 100).toFixed(1) + " % pour ton profil. "
        + "Ça ne veut pas dire que c'est hors d'atteinte — ça veut dire que ça se joue sur **plusieurs saisons**, "
        + "et que ce modèle ne sait pas chiffrer ça honnêtement. Sur cette préparation-ci, ce qui est "
        + "défendable : **" + fmtTime(surCycle) + "**.",
    };
  }

  // ---- RV5 : combien de semaines il aurait fallu (inversion de la saturation) ----
  // g(w) = G∞ × (1 − e^(−w/τ)) + affûtage   →   w = −τ × ln(1 − (g − affûtage)/G∞)
  const cible = Math.max(0, gainNeeded - TAPER_GAIN);
  const ratio = cible / gInf;
  const weeksNeeded = ratio >= 1 ? null : Math.ceil(-TAU_WEEKS * Math.log(1 - ratio));
  const w = Math.max(0, input.horizonWeeks);
  const gainAvailable = gainAvecAffutage(gInf * (1 - Math.exp(-w / TAU_WEEKS)));
  const reachableSec = timeFromThresholdPace(input.thrPaceSecPerKm * (1 - gainAvailable), dist, expo);
  D("RV5", "Semaines nécessaires", weeksNeeded == null ? "aucun horizon ne suffit" : weeksNeeded + " semaines",
    "Inversion de la courbe de saturation (constante de temps " + TAU_WEEKS + " semaines) : les premières "
    + "semaines rapportent bien plus que les dernières, donc doubler la durée ne double pas le gain.");
  D("RV4", "Ce que ton horizon rend accessible", fmtTime(reachableSec) + " (" + (gainAvailable * 100).toFixed(1) + " % de gain)",
    "Sur " + w + " semaines, affûtage conforme compris (+" + (TAPER_GAIN * 100).toFixed(1) + " %, Bosquet 2007).");

  if (weeksNeeded != null && weeksNeeded > w) {
    D("RV6", "Verdict", "hors horizon", "Atteignable, mais pas d'ici là.");
    return {
      verdict: "hors-horizon", requiredPaceSecPerKm: paceReq, gainNeeded, gainAvailable, gainCeiling: gInf,
      weeksNeeded, reachableSec, decisions,
      human: "Cet objectif est atteignable pour ton profil — mais il demande environ **" + weeksNeeded
        + " semaines** et il t'en reste **" + w + "**. D'ici la course, ce qui est honnête, c'est **"
        + fmtTime(reachableSec) + "**. Deux issues : viser ce chrono-là maintenant, ou garder l'objectif "
        + "pour une course dans " + (weeksNeeded - w) + " semaines de plus.",
    };
  }

  const marge_rel = (gainAvailable - gainNeeded) / Math.max(1e-9, gainNeeded);
  const juste = marge_rel < 0.15;
  D("RV6", "Verdict", juste ? "juste" : "atteignable",
    juste ? "L'objectif tient, mais sans marge : tout doit se passer bien." : "L'horizon couvre l'écart avec de la marge.");
  return {
    verdict: juste ? "juste" : "atteignable",
    requiredPaceSecPerKm: paceReq, gainNeeded, gainAvailable, gainCeiling: gInf,
    weeksNeeded: weeksNeeded ?? 0, reachableSec, decisions,
    human: juste
      ? "Cet objectif tient sur " + w + " semaines, **mais sans marge** : il demande "
        + (gainNeeded * 100).toFixed(1) + " % et l'horizon en donne " + (gainAvailable * 100).toFixed(1)
        + " %. Il faudra que la préparation se déroule bien — une blessure ou trois semaines creuses le mettent hors de portée."
      : "Cet objectif est **atteignable** : il demande " + (gainNeeded * 100).toFixed(1) + " % de gain, et "
        + w + " semaines t'en donnent " + (gainAvailable * 100).toFixed(1) + " %. Il te reste même de la marge — "
        + "ton horizon rend " + fmtTime(reachableSec) + " accessible.",
  };
}
