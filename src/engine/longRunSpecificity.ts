/**
 * C30 — LA SORTIE LONGUE EST SPÉCIFIQUE DE L'ÉPREUVE, PAS SEULEMENT DU BUDGET.
 *
 * Décision du fondateur (04/08/2026), en réponse à la question posée par O-21 (« la sortie
 * longue se prescrit-elle en distance ou en temps ? ») :
 *
 *   « il faudrait quelque chose entre les deux : se rapprocher du temps visé sur l'épreuve
 *     a minima, et au moins 70 % de la distance »
 *
 * ─── CE QUE LA MESURE A DIT AVANT D'ÉCRIRE UNE LIGNE ───────────────────────────────────────
 *
 * La prémisse d'O-21 était fausse, et c'est écrit ici plutôt qu'effacé : la sortie longue est
 * prescrite en TEMPS depuis toujours (`durCaps` en minutes dans chaque module de sport). Entre
 * 5:45/km et 7:00/km sur un 10 km, elle fait **178 min contre 176** — l'écart est nul, et
 * l'inversion résiduelle d'O-21 (6 min sur 790) vient du SEUIL, pas d'elle.
 *
 * Ce que la règle du fondateur corrige est donc un AUTRE défaut, réel et non couvert : la
 * longue ne connaissait pas l'épreuve. Mesuré sur les quatre formats × trois allures, le
 * coureur LENT était systématiquement le plus mal servi — c'est lui qui passe le plus de temps
 * sur son épreuve, et c'est sa longue qui en couvrait la plus petite part :
 *
 *   10 km à 7:00/km  → longue 47-50 min pour une course de 71 min et 59 min de « 70 % »
 *   semi  à 7:00/km  → longue 115-125 min pour une course de 156 min
 *
 * ─── LA RÈGLE ──────────────────────────────────────────────────────────────────────────────
 *
 * Le PLANCHER de la sortie longue au pic devient le plus exigeant des deux repères, et
 * JAMAIS au-dessus du plafond existant :
 *
 *   plancher = min( plafond , max( plancher d'origine , T_SPEC × temps de course ,
 *                                  temps pour couvrir PART_DIST × la distance en Z2 ) )
 *
 * `min(plafond, …)` n'est pas un détail d'implémentation, c'est la règle de sécurité du
 * chapitre. Sur marathon, « se rapprocher du temps de course » voudrait dire une sortie longue
 * de 3 h 20 à 5 h 25 : C23 plafonne à 180 min, et c'est le consensus de tous les plans marathon
 * sérieux. **Un plancher ne passe jamais devant un plafond** — priorités 1 et 2 du manifeste.
 * Le plafond qui mord est REMONTÉ à l'appelant (`capped`) pour que le plan puisse le nommer,
 * au lieu de livrer un chiffre plus petit que la promesse sans un mot (R20.2).
 *
 * ─── CE QUI N'ENTRE PAS DANS LE CALCUL, DÉLIBÉRÉMENT ───────────────────────────────────────
 *
 * **Le `target_time` de la carte « chrono visé » n'est PAS lu ici, et ne le sera jamais.** Le
 * temps de course utilisé est celui que le moteur PRÉDIT depuis les références mesurées de
 * l'athlète. Laisser un objectif de chrono augmenter une charge, c'est la priorité n°5 du
 * manifeste qui écrase les quatre premières — et c'est exactement ce que `RV-INVARIANT`
 * (gate CI) interdit : le plan émis est identique au bit près avec et sans objectif de temps.
 *
 * Sans allure seuil mesurée, il n'y a pas de temps de course : la règle ne s'applique pas et
 * les bornes d'origine tiennent (P7/P8 — pas d'estimation sans matière, et on ne devine pas
 * une charge).
 */
import { RUN_KM, riegelExponent, riegelSecWith } from "./predictor.ts";
import { ZDEF } from "../generator/renderer.ts";

/** Part du temps de course que la sortie longue vise « a minima » (décision fondateur).
 *  0,90 et non 1,00 : « se rapprocher de » — la longue se court en Z2, pas à l'allure de
 *  course, et l'égaler en durée coûterait plus de fatigue qu'elle n'apporte de spécificité. */
export const C30_PART_TEMPS_COURSE = 0.9;
/** Part de la distance de course que la sortie longue couvre au minimum (décision fondateur). */
export const C30_PART_DISTANCE = 0.7;

/** C31 — la durée MINIMALE d'un « jour 2 » de back-to-back (min). En dessous, ce n'est pas
 *  la moitié d'une très longue sortie, c'est un footing avec un nom d'emprunt : on ne pose
 *  pas la paire (et le filet du point fixe déclasse tout jour 2 qui serait retombé sous ce
 *  seuil). UNE constante pour les deux — deux seuils divergeraient à la première retouche. */
export const C31_MIN_JOUR2_MIN = 45;

export interface LongRunFloor {
  /** Le plancher à appliquer, déjà borné par le plafond. */
  floor: number;
  /** La cible AVANT bornage — utile pour dire de combien le plafond a mordu. */
  target: number;
  /** Le plafond a-t-il mordu ? (alors le plan doit le NOMMER — R20.2) */
  capped: boolean;
  /** Le repère qui a fixé la cible, pour l'explication : temps de course ou distance. */
  driver: "temps" | "distance" | "aucun";
}

/**
 * C30 — le plancher spécifique de la sortie longue d'une COURSE À PIED sur distance connue.
 * Rend `null` quand la règle n'a pas d'objet : pas de format à distance connue, pas d'allure
 * seuil mesurée, ou cible déjà atteinte par les bornes d'origine.
 *
 * @param fmt          format de course (`5k`, `10k`, `semi`, `marathon`)
 * @param thrPaceSecPerKm allure seuil MESURÉE (0 = inconnue → règle sans objet)
 * @param floorMin     plancher d'origine du créneau, en minutes
 * @param capMin       plafond d'origine du créneau, en minutes (C23, blessures… déjà appliqués)
 * @param runHoursPerWeek volume de course hebdomadaire, pour l'exposant de Riegel (P5)
 */
export function longRunSpecificityFloor(
  fmt: string | undefined,
  thrPaceSecPerKm: number,
  floorMin: number,
  capMin: number,
  runHoursPerWeek?: number
): LongRunFloor | null {
  const km = fmt ? RUN_KM[fmt] : 0;
  if (!(km > 0) || !(thrPaceSecPerKm > 0) || !(capMin > 0)) return null;

  // Repère 1 — le TEMPS de course, prédit depuis la référence mesurée (jamais un objectif).
  const courseMin = riegelSecWith(riegelExponent(runHoursPerWeek), thrPaceSecPerKm, km) / 60;
  const parTemps = C30_PART_TEMPS_COURSE * courseMin;

  // Repère 2 — la DISTANCE, convertie en minutes à l'allure à laquelle la longue se court
  // vraiment. `ZDEF["rn.easy"]` est la seule définition de cette allure (R11.1) ; on prend le
  // BAS de la bande (le plus rapide) — un plancher se calcule sur l'hypothèse la moins
  // gourmande, sinon il gonfle par le seul jeu de l'incertitude.
  const easy = ZDEF["rn.easy"];
  const parDistance = (C30_PART_DISTANCE * km * thrPaceSecPerKm * easy.lo) / 60;

  const target = Math.max(parTemps, parDistance);
  if (!(target > floorMin)) return null; // les bornes d'origine suffisent déjà

  const floor = Math.min(capMin, target);
  return {
    floor: Math.round(floor),
    target: Math.round(target),
    capped: target > capMin,
    driver: parTemps >= parDistance ? "temps" : "distance",
  };
}
