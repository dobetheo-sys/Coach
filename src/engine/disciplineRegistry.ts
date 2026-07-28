/**
 * Registre de disciplines (spec rétention R4.1) — la COUTURE D'EXTENSIBILITÉ du moteur.
 *
 * Le trio natation/vélo/course était codé en dur ; le trail était traité comme de la
 * course route (faux : métriques, charge musculaire excentrique, compétences distinctes).
 * Ce registre déclare chaque discipline comme DONNÉE : métrique primaire, source de
 * zones (test de référence + protocole de retest), type de volume (distance vs durée),
 * compétences trackées, règles de charge propres.
 *
 * Décision d'architecture (documentée dans RAPPORT-R4-RETENTION.md) : le registre est la
 * source déclarative que consultent générateur et UI ; les disciplines historiques
 * (sw/bk/rn) gardent leurs identifiants `d` existants — le contrat V1Plan et les 486
 * combinaisons d'audit restent inchangés. Le TRAIL reste porté par le pipeline course
 * (format "trail" du sport run) mais ses spécificités viennent d'ICI, plus du code en
 * dur. Ajouter une discipline = ajouter une entrée (+ ses gabarits de séance) — le test
 * d'extensibilité de la spec (§14) vérifie qu'une entrée fictive ne casse rien.
 */

export interface DisciplineSpec {
  id: string;
  label: string;
  /** Métrique primaire et son unité d'affichage. */
  primaryMetric: "pace_100m" | "power_w" | "pace_km" | "gap_pace" | string;
  /** Test de référence qui calibre les zones + protocole de retest (affiché tel quel). */
  zonesSource: { test: string; protocol: string; refKey: "css" | "ftp" | "thrPace" | null };
  /** Volume planifié en distance ou en durée. Le trail est en DURÉE (+D+), jamais en km seul. */
  volumeUnit: "distance" | "duration";
  /** Compétences non-cardio trackées (progression par jauges, futur). */
  skills: string[];
  /** Règles de charge propres (délais de récup, charge excentrique…) — consignes moteur. */
  loadRules: string[];
  /** Ce type d'effort porte-t-il de l'impact (flags prudence blessure course/périostite) ? */
  impact: boolean;
}

export const DISCIPLINE_REGISTRY: Record<string, DisciplineSpec> = {
  swim: {
    id: "swim", label: "Natation", primaryMetric: "pace_100m",
    zonesSource: { test: "CSS (400m + 200m à fond)", protocol: "Nage 400m à fond, récupère 10min, puis 200m à fond : l'écart de temps donne ton allure critique au 100m.", refKey: "css" },
    volumeUnit: "distance", skills: ["technique", "respiration", "virages", "eau libre"],
    loadRules: ["zéro impact : tolère les plus hautes fréquences", "épaule = zone sentinelle (coiffe)"],
    impact: false,
  },
  bike: {
    id: "bike", label: "Vélo", primaryMetric: "power_w",
    zonesSource: { test: "FTP (20min à fond)", protocol: "20 minutes à fond après échauffement : FTP ≈ 95% de la puissance moyenne.", refKey: "ftp" },
    volumeUnit: "duration", skills: ["position aéro", "pilotage", "cadence"],
    loadRules: ["zéro impact : gros volumes tolérés", "force basse cadence = charge musculaire, espacer des séances de course"],
    impact: false,
  },
  run: {
    id: "run", label: "Course route", primaryMetric: "pace_km",
    zonesSource: { test: "Allure seuil (3min + 10min à fond)", protocol: "3min à fond, récupération complète, puis 10min à fond : l'écart de distance donne l'allure seuil. Un 10-15km récent à fond est une bonne estimation.", refKey: "thrPace" },
    volumeUnit: "distance", skills: ["économie de course", "gammes", "pacing"],
    loadRules: ["impact = risque n°1 : volume progressif, jamais deux longues consécutives", "plafond de jours d'impact par semaine"],
    impact: true,
  },
  trail: {
    id: "trail", label: "Trail", primaryMetric: "gap_pace",
    zonesSource: { test: "Allure seuil (3min + 10min à fond, sur plat)", protocol: "Même test que la route, SUR PLAT : en trail l'allure brute ne veut rien dire, on raisonne en GAP (allure ajustée à la pente) quand les données existent, sinon en FC/RPE.", refKey: "thrPace" },
    volumeUnit: "duration", // temps + D+, JAMAIS en km seul (spec §2)
    skills: ["descente technique", "montée au train", "navigation", "gestion ravito"],
    loadRules: [
      "volume planifié en TEMPS + D+ (un km de trail n'est pas un km de route)",
      "descente = charge excentrique : délais de récupération rallongés après forte descente",
      "mêmes flags de prudence impact que la course route (périostite : descentes = drapeau)",
    ],
    impact: true,
  },
};

/** D+ cible d'une sortie longue trail, dérivé de la durée (~350-450m/h en course nature). */
export function trailElevationTarget(durationMin: number): { lo: number; hi: number } {
  const h = durationMin / 60;
  return { lo: Math.round((h * 350) / 50) * 50, hi: Math.round((h * 450) / 50) * 50 };
}
