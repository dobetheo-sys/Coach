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
import { sportModule, type PredictKit } from "../sports/registry.ts";
import { T5_HIKE_SHARE, TRAIL_TECHNICITY, type TrailObjective } from "./trailModel.ts";
import { DUA_BIKE_POWER, DUA_BIKE_PREFATIGUE } from "../sports/duathlon/tables.ts";
import { bikeTimeEstimate, assumedSetup, type BikeTimeEstimate } from "./cyclingSpeed.ts";
import { projectForm, GAIN_BAND_LO, GAIN_BAND_HI,
  type ProjectionInput, type WeightLever } from "./projection.ts";

export interface PredictionItem {
  leg: string; // "Course", "Natation", "Vélo", "CAP (tri)"…
  value: string; // "3h25–3h34" ou "225–245W"
  why: string;
}
/**
 * R14.1 — LA FORME PROJETÉE AU JOUR J, à côté de la forme actuelle (jamais à sa place).
 * L'UI affiche les deux, étiquetées : « Aujourd'hui : 4h00–4h15 » / « Projeté au 12/09/2027 :
 * 3h44–4h02 (confiance moyenne) ». Jamais un seul chiffre, jamais sans la date de référence.
 */
export interface ProjectedPrediction {
  applicable: boolean;
  horizonWeeks: number;
  adherence: number;
  gainPct: { ftp: number; thrPace: number; css: number; vam: number };
  /** R14.1 §2 — fourchette ASYMÉTRIQUE sur le gain ; `spreadPct` (symétrique) a disparu. */
  gainBand: { ftp: [number, number]; thrPace: [number, number]; css: [number, number]; vam: [number, number] };
  gainSource: "prior" | "mesure" | "mixte";
  confidence: "faible" | "moyenne" | "bonne";
  weightLever: WeightLever | null;
  raceDate?: string;
  refs: { ftp: number; thrPace: number; css: number };
  items: PredictionItem[];
  decisions: Decision[];
}
export interface Prediction {
  items: PredictionItem[];
  advice: string[]; // tests à faire quand une référence manque
  decisions: Decision[];
  /** `null` = on refuse de projeter (le motif est dans `decisions` ou dans `projected.decisions`). */
  projected: ProjectedPrediction | null;
}
export interface PredictOpts {
  pctLoad?: number; // % de charge du plan accomplie
  streakWeeks?: number;
  courseProfile?: string; // "plat" | "vallonne" | "montagne" — profil du parcours visé
  /**
   * R18.2 — profils PAR DISCIPLINE (multisport). Chaque entrée absente retombe sur
   * `courseProfile` pour le vélo et la course ; la nage ne retombe sur rien (un relief ne
   * décrit pas un plan d'eau). Rempli par `legProfileOf()` chez l'appelant, jamais deviné ici.
   */
  legProfiles?: { swim?: string; bike?: string; run?: string };
  /** R19.2 — température de l'eau (°C). Absente = aucune correction de combinaison. */
  waterTempC?: number;
  /**
   * PW — poids de l'athlète (kg), pour convertir une puissance en vitesse (`cyclingSpeed.ts`).
   * ABSENT = pas de chrono vélo, et le refus est DIT (P7/P8) : le poids entre dans le
   * roulement ET dans la pente, un poids inventé fausserait les deux — et dans le sens
   * rassurant sur un parcours plat, ce qui est le pire des deux sens.
   */
  athleteKg?: number;
  /** R7 TRAIL — objectif décodé (distance, D+, catégorie, VAM) : Riegel ne s'applique pas. */
  trail?: TrailObjective;
  /** Objectif swimrun décodé (§R10.3.2) — trois postes de temps. */
  swimrun?: PredictKit["swimrun"];
  /**
   * R14 — P5 : exposant de Riegel piloté par le VOLUME hebdomadaire de course (heures).
   * Absent = on garde 1.06 (le comportement historique).
   */
  runHoursPerWeek?: number;
  /** R14 — entrées du projecteur. Absentes = pas de projection (`projected: null`). */
  projection?: ProjectionInput;
  /**
   * R7 TRAIL — l'objectif recalculé avec une VAM projetée. Le prédicteur ne sait pas
   * reconstruire un `TrailObjective` (il vit dans `trailModel`) : l'appelant le fournit.
   */
  projectTrail?: (gainVam: number, gainPace: number) => TrailObjective;
}

// R6 — profil du parcours : un chrono à plat ne vaut rien sur un parcours vallonné.
// Facteurs de temps course à pied (littérature GAP/expérience course sur route) :
// vallonné ~+3–6 %, montagneux ~+8–15 % — appliqués en ÉLARGISSANT la fourchette
// (l'incertitude monte avec le relief, on ne fait pas semblant du contraire).
//
// R14.3-a — DEUX CHAMPS POUR LA MÊME IDÉE, ET DES CLÉS QUI NE SE RECOUVRAIENT PAS.
// Le jour J lisait `a.terrain` (domaine du schéma : … `montagne` …), la carte Prédiction
// lisait `answers.course_profile` (vocabulaire de l'UI : … `montagneux` …). `vallonne`
// tombait juste par coïncidence orthographique ; `montagne` ne tombait sur rien —
// mesuré sur le jour J d'un Ironman : plat 240 min, montagne 240 min, les +8 à +15 %
// disparaissaient EN SILENCE. Le même athlète pouvait lire deux chronos différents dans
// deux écrans de la même app.
//
// La table couvre désormais TOUT le domaine `terrain` du schéma, et `assertTerrainCovered()`
// (appelée par `build:app`) échoue si une valeur ajoutée au schéma n'y est pas classée :
// la règle « une seule source » est exécutable, pas un commentaire (même geste que R13.1).
export interface ReliefFactor { lo: number; hi: number; label: string }
const RELIEF: Record<string, ReliefFactor> = {
  plat: { lo: 1.0, hi: 1.0, label: "parcours plat" },
  vallonne: { lo: 1.03, hi: 1.06, label: "parcours vallonné" },
  montagne: { lo: 1.08, hi: 1.15, label: "parcours montagneux" },
};
/** Alias du vocabulaire UI (`course_profile`) vers le domaine du schéma (`terrain`). */
const RELIEF_ALIAS: Record<string, string> = { montagneux: "montagne", vallonné: "vallonne" };
/**
 * Valeurs de `terrain` qui décrivent une SURFACE et non un relief : elles ne disent rien
 * du dénivelé, donc elles ne corrigent rien. Les classer explicitement est le but — une
 * valeur non classée doit faire échouer le build, pas retomber sur « pas de correction ».
 */
const RELIEF_NEUTRAL = ["route", "piste", "mixte", "trail"] as const;

/** Résout le profil de parcours vers le domaine du schéma. `null` = pas de correction. */
export function reliefOf(value: unknown): ReliefFactor | null {
  const k = String(value ?? "").trim();
  if (!k) return null;
  return RELIEF[RELIEF_ALIAS[k] || k] || null;
}

/**
 * R15.2 — LE RELIEF DESCEND LA CIBLE DE PUISSANCE (O-2 du registre, fermé).
 *
 * Mesuré avant correction : un 70.3 à plat et un 70.3 de montagne recevaient **175–191 W dans
 * les deux cas** — `TRI_BIKE` ne connaissait que le format. Le relief était traité pour la
 * course à pied depuis R6, jamais pour le vélo.
 *
 * Le mécanisme : sur parcours accidenté, le coût métabolique suit la puissance NORMALISÉE, et
 * NP s'écarte d'autant plus de la moyenne que le terrain est irrégulier. Viser la même bande
 * qu'à plat revient donc à rouler plus dur qu'on ne croit — et le prix se paie à pied. On
 * descend la cible, on nomme l'indice de variabilité, et on ne prédit toujours PAS de chrono
 * vélo (il dépend du parcours, on ne l'invente pas).
 *
 * Décalages d'IF (heuristique de praticiens, assumée comme telle) :
 *   plat 0 · vallonné −0,01 · montagneux −0,025
 * Même famille de risque que P6 (le pacing projeté) : c'est une règle de sécurité, pas un
 * affichage — partir à la puissance d'un parcours plat sur 2 500 m de D+ ne se rattrape pas.
 */
const RELIEF_BIKE_IF: Record<string, number> = { plat: 0, vallonne: -0.01, montagne: -0.025 };
export function bikeIFShift(courseProfile: unknown): number {
  const k = String(courseProfile ?? "").trim();
  return RELIEF_BIKE_IF[RELIEF_ALIAS[k] || k] ?? 0;
}

/**
 * R14.3-a — LE CHEMIN UNIQUE. `course_profile` (le parcours VISÉ, réponse la plus
 * spécifique, posée au Profil) prime ; à défaut on retombe sur `terrain` (le terrain
 * d'entraînement, qui est aussi la question « Le parcours » en vélo et duathlon).
 * Tous les appelants passent par ici — jour J compris.
 */
export function courseProfileOf(a: { course_profile?: unknown; terrain?: unknown }): string | undefined {
  const explicite = String(a.course_profile ?? "").trim();
  if (explicite && reliefOf(explicite)) return explicite;
  const terrain = String(a.terrain ?? "").trim();
  return terrain || undefined;
}

/**
 * R18.2 — LE MILIEU DE NAGE. Ce n'est pas un relief, et ça ne se traite pas comme tel.
 *
 * La référence n'est PAS le bassin : `TRI_SWIM[format].factor` est calibré « peloton,
 * combinaison et navigation compris », donc sur de l'eau libre calme. Le lac vaut donc 1.00,
 * et le bassin est plus RAPIDE que la référence — se tromper de point d'ancrage aurait
 * ralenti tout le monde de 5 % en croyant corriger.
 *
 * `eau_vive` est le cas que le fondateur a cité, et c'est le plus intéressant : un courant
 * peut porter autant qu'il freine. Sa bande est donc ASYMÉTRIQUE ET LARGE, dans les deux
 * sens — on refuse de faire semblant de savoir de quel côté. Même honnêteté que RELIEF pour
 * la course, qui élargit au lieu de décaler.
 *
 * Heuristiques de praticiens, assumées comme telles : aucune de ces valeurs n'est mesurée,
 * et c'est écrit ici plutôt que sous-entendu.
 */
const SWIM_ENV: Record<string, ReliefFactor> = {
  bassin: { lo: 0.94, hi: 0.97, label: "bassin (pas de navigation, appuis aux murs)" },
  lac: { lo: 1.0, hi: 1.0, label: "lac / eau libre calme" },
  mer_calme: { lo: 1.01, hi: 1.05, label: "mer calme" },
  mer_agitee: { lo: 1.06, hi: 1.14, label: "mer agitée (houle, respiration contrariée)" },
  eau_vive: { lo: 0.95, hi: 1.2, label: "eau vive (courant)" },
};
/**
 * R19.2 — LA COMBINAISON. C'était le trou le plus large du modèle de natation.
 *
 * `water_temp_c` n'existait que pour le swimrun. En triathlon, rien : ni combinaison, ni seuil
 * de légalité. Or c'est la variable DOMINANTE du leg natation — 4 à 7 % de temps, et une
 * bascule RÉGLEMENTAIRE, pas continue. R18.2 avait ajouté par-dessus un raffinement de ±5 %
 * (mer calme vs mer agitée) sur un modèle où ce facteur-là manquait : l'ordre de grandeur
 * était inversé, on affinait le détail en ignorant le principal.
 *
 * `TRI_SWIM[format].factor` est calibré « combinaison comprise » : la référence PORTE donc la
 * combinaison. La correction va dans un seul sens — SANS combinaison, on est plus lent. C'est
 * le même piège d'ancrage que SWIM_ENV, et il se paie de la même façon si on l'inverse.
 *
 * Seuils : 24,5 °C est la borne haute commune (World Triathlon en âge-groupe, IRONMAN pour
 * l'éligibilité au classement) ; au-delà la combinaison est interdite. Sous 15 °C, elle
 * devient obligatoire et cesse de suffire à elle seule — c'est une question de sécurité, pas
 * de chrono, et le manifeste range la santé en premier : le moteur AVERTIT au lieu d'estimer.
 */
export const WETSUIT = {
  id: "R19.2",
  maxLegalC: 24.5,
  coldWarnC: 15,
  /** Temps de nage SANS combinaison, la référence l'incluant. */
  sansCombinaison: { lo: 1.04, hi: 1.07 } as ReliefFactor & { lo: number; hi: number },
};
/**
 * Bande de correction due à la combinaison. `null` = température non renseignée, donc aucune
 * correction — on ne devine pas une température d'eau à partir d'un format de course.
 */
export function wetsuitBandOf(waterTempC: unknown): { lo: number; hi: number; label: string } | null {
  const t = typeof waterTempC === "number" ? waterTempC : parseFloat(String(waterTempC ?? ""));
  if (!isFinite(t)) return null;
  if (t > WETSUIT.maxLegalC)
    return { lo: WETSUIT.sansCombinaison.lo, hi: WETSUIT.sansCombinaison.hi, label: "eau à " + t + " °C : combinaison INTERDITE (>" + WETSUIT.maxLegalC + " °C)" };
  return { lo: 1, hi: 1, label: "eau à " + t + " °C : combinaison autorisée" };
}

export function swimEnvOf(value: unknown): ReliefFactor | null {
  const k = String(value ?? "").trim();
  return k ? SWIM_ENV[k] || null : null;
}

/**
 * R18.2 — LE RÉSOLVEUR PAR DISCIPLINE, point unique.
 *
 * Trois niveaux, du plus précis au plus général : la réponse du LEG, puis le profil de course
 * global (`course_profile`), puis le terrain d'entraînement (`terrain`). C'est la même
 * cascade que `courseProfileOf`, prolongée d'un cran — pas un second vocabulaire.
 *
 * La nage ne retombe sur RIEN : le profil global décrit un relief, et un relief ne dit rien
 * d'un plan d'eau. Retomber dessus aurait produit un « lac montagneux » traité comme du plat.
 */
export type RaceLeg = "swim" | "bike" | "run";
export function legProfileOf(a: { leg_swim_env?: unknown; leg_bike_prof?: unknown; leg_run_prof?: unknown; course_profile?: unknown; terrain?: unknown }, leg: RaceLeg): string | undefined {
  if (leg === "swim") {
    const v = String(a.leg_swim_env ?? "").trim();
    return v && SWIM_ENV[v] ? v : undefined;
  }
  const propre = String((leg === "bike" ? a.leg_bike_prof : a.leg_run_prof) ?? "").trim();
  if (propre && reliefOf(propre)) return propre;
  return courseProfileOf(a);
}

/** Garde de build : toute valeur du domaine `terrain` est classée (relief ou neutre). */
export function assertTerrainCovered(domain: readonly string[]): void {
  const orphelines = domain.filter((v) => !RELIEF[v] && !(RELIEF_NEUTRAL as readonly string[]).includes(v));
  if (orphelines.length)
    throw new Error("R14.3-a : terrain « " + orphelines.join(", ") + " » n'est classé ni en relief "
      + "(RELIEF) ni en surface (RELIEF_NEUTRAL) dans predictor.ts — une valeur non classée "
      + "retomberait silencieusement sur « pas de correction », et c'est exactement le défaut "
      + "que « montagne » a fait vivre.");
}

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
/**
 * O-11 / R20.5 — « L'ALLURE COURSE À VÉLO » N'A PLUS QU'UNE SEULE DÉFINITION.
 *
 * Le moteur en portait DEUX, et la zone d'entraînement était la plus dure des deux :
 *
 * | source | « allure course » vélo |
 * |---|---|
 * | `ZDEF["bk.rp"]` (la zone prescrite à l'entraînement) | **0,80–0,88 × FTP, quel que soit le format** |
 * | `TRI_BIKE["Full"]` (la cible du jour J) | **0,70–0,76 × FTP** |
 *
 * Sur un Ironman, une séance nommée « Rappel race-pace » faisait donc rouler **~15 % au-dessus
 * de l'intensité que le moteur prescrit lui-même pour la course** — et sur un sprint, l'inverse
 * (0,80–0,88 contre 0,85–0,93 le jour J : la séance était plus FACILE que la course). Une zone
 * figée ne peut pas décrire un effort dont la durée va de 30 minutes à six heures.
 *
 * C'est le même défaut que R15.2 a corrigé pour le relief, à un autre endroit du même chemin :
 * deux producteurs du même nombre finissent toujours par diverger. Il n'y a donc plus qu'un
 * point — celui-ci — et la zone `bk.rp` le lit.
 *
 * La pré-fatigue du duathlon est INCLUSE : le nombre que l'athlète doit apprendre à tenir est
 * celui de sa course, pas celui d'un contre-la-montre frais. Le relief (`bikeIFShift`) n'est PAS
 * inclus ici — il s'applique en aval, au même endroit pour la prédiction et pour la séance.
 */
export function raceBikeBand(sport: string, format: string | undefined): { lo: number; hi: number } | null {
  const f = String(format ?? "");
  if (sport === "tri") return TRI_BIKE[f] ?? null;
  if (sport === "bike") { const b = BIKE_POWER[f]; return b ? { lo: b.lo, hi: b.hi } : null; }
  if (sport === "duathlon") {
    const pw = DUA_BIKE_POWER[f];
    if (!pw) return null;
    const pf = DUA_BIKE_PREFATIGUE[f] ?? 0.97;
    return { lo: pw.lo * pf, hi: pw.hi * pf };
  }
  return null;
}

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
/**
 * PW — DISTANCES VÉLO OFFICIELLES (World Triathlon / Ironman). Elles n'étaient nulle part :
 * le moteur connaissait la distance de nage et celle de la course à pied, mais pas celle du
 * segment le plus long des quatre formats. C'est ce trou qui rendait le chrono vélo
 * inatteignable, bien plus que l'absence d'un modèle.
 */
export const TRI_BIKE_KM: Record<string, number> = { S: 20, M: 40, "70.3": 90, Full: 180 };

/**
 * PW — LES TRANSITIONS SONT DU TEMPS DE COURSE, ET ELLES NE SONT PAS NÉGLIGEABLES.
 *
 * Sur un Ironman, T1 + T2 pèsent un quart d'heure : les oublier, c'est annoncer un total faux
 * de la valeur d'un ravitaillement complet. Les valeurs sont des MÉDIANES d'âge-groupe lues sur
 * les classements publics, pas des optima — un athlète expérimenté sur une transition courte
 * fait mieux, un premier Ironman avec sac de transition et tente de change fait pire.
 *
 * Elles montent avec le format pour une raison concrète et non par proportionnalité : sur
 * longue distance la transition inclut un sac à récupérer, une tenue à changer, et souvent
 * plusieurs centaines de mètres à pied dans le parc à vélos.
 */
export const TRI_TRANSITION: Record<string, { t1: number; t2: number }> = {
  S: { t1: 120, t2: 75 },
  M: { t1: 150, t2: 90 },
  "70.3": { t1: 300, t2: 210 },
  Full: { t1: 480, t2: 360 },
};

/**
 * V-07 (13/08/2026) — FACTEURS `a_priori`, ET IL FAUT QUE ÇA SE LISE ICI.
 *
 * `fatigue` dit « courir après avoir roulé coûte plus cher ». Les quatre valeurs sont
 * **heuristiques, non sourcées** : aucun commentaire d'origine, aucune entrée `PROVENANCE`,
 * jamais modifiées depuis leur écriture, et **aucun jeu de chronos réels n'a jamais existé
 * dans ce dépôt** — un ajustement empirique était matériellement impossible. `1,13` reprend
 * l'énoncé littéraire courant « le marathon d'un Ironman coûte ~13 % de plus qu'un marathon
 * sec » ; rien ne distingue formellement 1,11 de 1,15.
 *
 * C'est important parce que le commentaire de `riegelExponent` ci-dessous a longtemps affirmé
 * qu'elles avaient été « calibrées CONTRE cet exposant » — justification rétrospective : la
 * table existait, avec ces valeurs exactes, avant que la fonction ne soit écrite. Il n'y avait
 * donc **aucun double compte** à craindre en découplant l'exposant, ce qui était le seul motif
 * invoqué pour le figer à 1,06 hors course sèche.
 *
 * Ses deux voisines immédiates portent leur provenance (`TRI_BIKE_KM` : distances officielles ;
 * `TRI_TRANSITION` : médianes d'âge-groupe lues sur les classements publics). Celle-ci était la
 * seule des trois à être nue, ce qui la faisait ressembler à une constante validée.
 */
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

/**
 * R14 — P5 : L'EXPOSANT DE RIEGEL SUIT LE VOLUME.
 *
 * Il était figé à 1,06. Mesuré : deux athlètes de MÊME allure seuil, l'un à 4 h/semaine,
 * l'autre à 14 h, recevaient le même marathon prédit (3 h 32). Or c'est précisément le
 * volume qui gouverne la tenue de la distance — Vickers & Vertosick (BMC Sports Sci Med
 * Rehabil 2016, N=2303) montrent que Riegel sous-estime le marathon d'au moins 10 min pour
 * la moitié des coureurs, et que le kilométrage hebdomadaire est un prédicteur MAJEUR
 * (MSE 208 contre 381 pour Riegel en validation).
 *
 * Ancrages (calibration empirique de calculateurs, pas une étude princeps — heuristique
 * assumée), interpolés linéairement et bornés :
 *   ≥ 12 h/sem → 1,04 · 10 h → 1,06 · 6,5 h → 1,09 · ≤ 4 h → 1,12
 *
 * ⚠ N'EST APPLIQUÉ QU'À L'EXTRAPOLATION D'UNE COURSE SÈCHE. Les legs course du triathlon et
 * du duathlon gardent 1,06 : leurs facteurs `fatigue` (1,03 à 1,13 selon le format) ont été
 * calibrés CONTRE cet exposant, et bouger l'exposant sous eux recalibrerait silencieusement
 * une table validée — on compterait deux fois la même difficulté.
 */
/**
 * B-21 — LA TABLE EST PROLONGÉE SOUS 4 h, ET C'EST UNE AFFIRMATION DE MODÈLE NOUVELLE.
 *
 * Elle est écrite ici parce qu'elle doit se lire : les quatre ancrages d'origine sont déjà
 * déclarés heuristiques (« calibration empirique de calculateurs, pas une étude princeps »), et
 * l'ancrage `[1.5, 1.15]` en est un cinquième du MÊME statut — a_priori, non sourcé.
 *
 * Ce qui le rend malgré tout meilleur que le plancher qu'il remplace : le plancher AUSSI était
 * une affirmation, et une plus forte. S'arrêter à 4 h revenait à dire « quelqu'un qui court
 * 0,6 h/semaine ne se dégrade pas davantage sur la distance que quelqu'un qui en court 4 »,
 * alors que toute la table dit l'inverse sur son domaine. Mesuré (V-09) : **89,1 % des profils
 * tri et 99,3 % des duathlon** vivent SOUS ce plancher — la table était donc plate exactement
 * là où se trouve presque toute la population qu'elle sert.
 *
 * La valeur n'est pas choisie, elle est PROLONGÉE : la pente du segment le plus bas de la table
 * (4 → 6,5 h) vaut −0,0120/h, et `[1.5, 1.15]` est ce que cette pente donne à 1,5 h. On ne va
 * pas plus bas : au-delà, l'extrapolation quitterait le domaine où quiconque a mesuré quoi que
 * ce soit, et un exposant sans borne produirait des chronos absurdes près du volume nul.
 */
/**
 * L'ANCRAGE BAS [1,5 h → 1,15] — ARBITRÉ LE 14/08/2026 (ARBITRAGE_ANCRAGE_B21) : CONSERVÉ.
 *
 * provenance : **assertion de modèle, non validée externement** — prolongée à la pente du
 *              segment le plus bas (−0,0120/h), pas choisie ; origine commit f2ccd7d.
 * arbitrage  : fondateur, 14/08/2026 — conservé parce que la direction est PRUDENTE (un
 *              exposant plus haut à bas volume rend des temps longue distance plus lents,
 *              le mode d'échec coûteux étant la prédiction optimiste) et la valeur plausible.
 * statut     : **PANSEMENT** — gaté sur l'enrichissement du golden en volumes de course
 *              stratifiés ; le « 89-99 % au plancher » qui l'a motivé a été mesuré sur la
 *              population dont on SAIT qu'elle ne peut pas mesurer les effets volume-
 *              dépendants (96,7 % de vol_max:10) — probablement vrai quand même, à refaire.
 * vérifié    : sous 1,5 h l'exposant est CLAMPÉ à 1,15 (0,5 h → 1,15, pas d'extrapolation) ;
 *              l'ancrage est ACTIF sur le golden (19 profils au clamp, 211 sur le segment
 *              [1,5 → 4], mesure §2.3b) — pas du code mort en test.
 */
const RIEGEL_ANCRES: [number, number][] = [[1.5, 1.15], [4, 1.12], [6.5, 1.09], [10, 1.06], [12, 1.04]];
export function riegelExponent(runHoursPerWeek?: number): number {
  const h = Number(runHoursPerWeek);
  if (!Number.isFinite(h) || h <= 0) return 1.06; // pas de volume connu → comportement historique
  if (h <= RIEGEL_ANCRES[0][0]) return RIEGEL_ANCRES[0][1];
  const last = RIEGEL_ANCRES[RIEGEL_ANCRES.length - 1];
  if (h >= last[0]) return last[1];
  for (let i = 1; i < RIEGEL_ANCRES.length; i++) {
    const [h0, e0] = RIEGEL_ANCRES[i - 1], [h1, e1] = RIEGEL_ANCRES[i];
    if (h <= h1) return e0 + ((e1 - e0) * (h - h0)) / (h1 - h0);
  }
  return 1.06;
}

/** Riegel : temps sur D depuis l'allure seuil (tenable ~1h), t = 3600 × (D/D₁ₕ)^exp
 *
 *  EXPORTÉE depuis C30 (R11.1) : `feasibility.timeFromThresholdPace` en portait une copie
 *  ligne pour ligne, et la spécificité de la sortie longue en aurait fait une troisième.
 *  Trois écritures de Riegel, c'est trois vérités le jour où l'exposant bouge. */
export function riegelSecWith(exp: number, thrPaceSecPerKm: number, distKm: number): number {
  const d1h = 3600 / thrPaceSecPerKm;
  return 3600 * Math.pow(distKm / d1h, exp);
}

/**
 * B-22 — « L'ALLURE MARATHON » N'EST PLUS ÉCRITE DEUX FOIS.
 *
 * `ZDEF["rn.mara"]` valait 1,08–1,13 × l'allure seuil POUR TOUT LE MONDE, pendant que le
 * prédicteur extrapolait le marathon avec un exposant de Riegel qui, lui, dépend du volume
 * (P5, R14). Deux grandeurs dont l'une ignore une variable dont l'autre dépend ne peuvent
 * coïncider qu'en un point — mesuré (V-10) vers 6,5-8 h de course/semaine. En dessous, le plan
 * prédisait une course PLUS LENTE que l'allure à laquelle il faisait s'entraîner ; au-dessus,
 * l'inverse : à 12 h/sem, entraînement à 4'35-4'48 et course annoncée à 4'26, les deux chiffres
 * affichés au même athlète.
 *
 * C'est la forme exacte d'O-11 — deux définitions de « l'allure course » à vélo —, fermée par
 * R20.5 avec `raceBikeBand()`. Même geste ici, et même mécanique de substitution
 * (`refs.runMara` lu par `zoneOf`) : reculer `rn.mara` d'un cran n'aurait fait que déplacer le
 * point d'accord sans supprimer la divergence.
 *
 * LA FORME CLOSE. Avec t = 3600 × (D/d₁ₕ)^e et d₁ₕ = 3600/seuil, le rapport de l'allure de
 * course à l'allure seuil vaut exactement **(D/d₁ₕ)^(e−1)**. Il ne dépend donc pas que du
 * volume : il dépend AUSSI de l'allure seuil de l'athlète — un coureur plus lent couvre moins
 * de distance en une heure, son marathon est proportionnellement plus long, et il se dégrade
 * davantage. C'est physiologiquement juste, et c'est ce que la bande constante niait.
 *
 * LA LARGEUR DE LA ZONE NE CHANGE PAS. On ne déplace que ce sur quoi elle est CENTRÉE.
 * L'ancienne bande 1,08-1,13 a pour centre 1,105 et pour demi-largeur relative ±2,26 % ; cette
 * demi-largeur est conservée telle quelle. Décider de la largeur d'une zone d'entraînement est
 * une autre question, qui n'a pas à être tranchée par un correctif de cohérence.
 */
export const RN_MARA_DEMI_LARGEUR = 0.0226;
/**
 * PLANCHER DE SÉCURITÉ SUR LA PRESCRIPTION (STOP de Phase 1 §1, arbitré le 14/08/2026 :
 * conservé, pas de revert du côté rapide).
 *
 * provenance : **inherited** — le « ~1,05-1,08 » vient du fondateur, DE MÉMOIRE, non vérifié
 *              contre une publication ni contre une donnée du dépôt (il l'a lui-même requalifié
 *              ainsi : « ce n'est pas une source », ARBITRAGE_B22_PHASE2 §1). Pas `source`.
 * statut     : **PANSEMENT** — il masque un défaut de calibration de `RIEGEL_ANCRES`
 *              (heuristique déclarée telle), il ne le corrige pas.
 * sortie     : À RETIRER quand `RIEGEL_ANCRES` aura été recalibrée (chantier B-21/B-04).
 *              Suivi en dette : BUGS_OUVERTS.md « O-34 ». Un pansement sans condition de
 *              sortie devient un acquis — c'est précisément ce que cette entrée empêche.
 *
 * Pourquoi il existe : une PRÉDICTION optimiste déçoit le jour J ; une PRESCRIPTION trop
 * rapide casse l'entraînement toutes les semaines. Le bord bas mesurait 1,044 × seuil à
 * 10 h/sem et 1,021 à 12 h. La dépendance au volume reste (l'objet de B-22), l'extrémité
 * inatteignable est coupée.
 */
export const RN_MARA_RATIO_PLANCHER = 1.05;
export function marathonPaceBand(thrPaceSecPerKm: number, runHoursPerWeek?: number): { lo: number; hi: number } | null {
  if (!(thrPaceSecPerKm > 0)) return null;
  const km = RUN_KM.marathon;
  // Une SEULE écriture de Riegel dans tout le moteur (R11.1) : on appelle celle du prédicteur,
  // on ne réécrit pas la forme close ci-dessus — elle est là pour expliquer, pas pour calculer.
  const ratio = riegelSecWith(riegelExponent(runHoursPerWeek), thrPaceSecPerKm, km) / km / thrPaceSecPerKm;
  const lo = Math.max(ratio * (1 - RN_MARA_DEMI_LARGEUR), RN_MARA_RATIO_PLANCHER);
  return { lo, hi: Math.max(ratio * (1 + RN_MARA_DEMI_LARGEUR), lo + 1e-9) };
}

/**
 * B-25 — LE LEG COURSE DU TRI CONSOMME LA BANDE DU PRÉDICTEUR (troisième versant d'O-11).
 *
 * `sports/tri/index.ts` prescrit `rn.mara` sous le nom « l'allure de course du jour J » —
 * avec la bande STATIQUE de ZDEF (1,08-1,13 × seuil), aveugle au FORMAT. Mesuré de bout en
 * bout (T-16c) : sur S et M la bande est trop LENTE de ~50 s/km (le leg y court plus vite que
 * l'allure marathon d'un coureur), sur Full elle est trop RAPIDE de 46-53 s/km — une allure
 * que le même moteur déclare intenable après 180 km de vélo. Seul 70.3, le format sur lequel
 * la bande a manifestement été calibrée, recouvrait. R20.5 avait fermé ce défaut côté VÉLO
 * (`raceBikeBand`), B-22 côté course sèche — voici le versant course du tri, par la MÊME
 * mécanique de substitution (`refs.runMara`), et AUCUNE constante nouvelle : le centre est ce
 * que `predict()` émet déjà (Riegel × `TRI_RUN.fatigue`, exposant B-21 compris), la largeur
 * est `RN_MARA_DEMI_LARGEUR` (B-22). Si un jour ce calcul réclame un chiffre à arbitrer,
 * c'est qu'il déborde sur B-04 — s'arrêter et le dire (contrat du ticket).
 */
export function raceRunBand(sport: string, format: string, thrPaceSecPerKm: number, runHoursPerWeek?: number): { lo: number; hi: number } | null {
  if (!(thrPaceSecPerKm > 0) || sport !== "tri") return null;
  const leg = TRI_RUN[format];
  if (!leg) return null;
  const ratio = (riegelSecWith(riegelExponent(runHoursPerWeek), thrPaceSecPerKm, leg.km) / leg.km / thrPaceSecPerKm) * leg.fatigue;
  return { lo: ratio * (1 - RN_MARA_DEMI_LARGEUR), hi: ratio * (1 + RN_MARA_DEMI_LARGEUR) };
}

/** Minutes → « 9h20 » : une durée de trail se lit en heures, pas en minutes. */
function fmtHM(min: number): string {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h > 0 ? h + "h" + String(m).padStart(2, "0") : m + "min";
}

/**
 * Un item porte-t-il un TEMPS ? Seuls les temps se projettent (R14 P6) : une cible de
 * puissance (« 159–173 W ») ou de vitesse ascensionnelle reste ancrée sur la référence
 * MESURÉE. Les formats produits par `fmtT`/`fmtHM` : « 4h08 », « 38'20 », « 45min ».
 */
const EST_UN_TEMPS = /^\s*\d+\s*(h\d+|'\d+|min)\s*[–-]/;

/** Le calcul complet des items, rejouable à d'autres références et à une autre fourchette. */
interface RenderArgs {
  refs: { ftp: number; thrPace: number; css: number };
  spread: number;
  trail?: TrailObjective;
}

export function predictRace(
  sport: string,
  format: string,
  intent: string | undefined,
  refs: { ftp: number; thrPace: number; css: number },
  opts: PredictOpts = {}
): Prediction {
  const decisions: Decision[] = [];
  const D = (id: string, what: string, val: string, why: string) => decisions.push({ id, what, val, why });
  // R19.2 — conseils émis AVANT le rendu (sécurité liée à l'eau) : ils ne dépendent d'aucune
  // référence chiffrée, donc ils doivent sortir même quand la prédiction refuse de projeter.
  // Ils sont placés EN TÊTE de la liste : une consigne d'hypothermie passe avant un conseil
  // de pacing.
  const advice0: string[] = [];

  // Fourchette : ±3% de base ; ±2% si le plan est bien suivi ; décalée +3% en mode finisher.
  const followed = (opts.pctLoad ?? 0) >= 60 && (opts.streakWeeks ?? 0) >= 3;
  const shift = intent === "finir" ? 0.03 : 0;
  if (followed) D("PRED-forme", "Fourchette resserrée", "±2%", "Plan bien suivi (streak ≥3 semaines, charge accomplie ≥60%) : la projection est plus fiable");
  if (shift > 0) D("PRED-finisher", "Pacing conservateur", "+3%", "Objectif finisher : on vise l'arrivée en forme, pas la marge d'erreur");
  // R18.2 — chaque leg lit SON profil ; à défaut, le profil global. Un triathlon n'est pas
  // homogène : nager en eau vive, rouler en montagne et courir à plat, ce sont trois
  // corrections indépendantes, et une clé unique en appliquait une troisième, fausse pour
  // les trois. Les sports mono-discipline ne passent pas de `legProfiles` : rien ne bouge.
  const legs = opts.legProfiles || {};
  // Fourchette COURSE À PIED avec profil de parcours (R6) — le relief élargit et décale.
  const prof = reliefOf(legs.run ?? opts.courseProfile);
  if (prof && prof.hi > 1) D("PRED-parcours", "Profil du parcours", prof.label, "Le relief ralentit et augmente l'incertitude : fourchette ×" + prof.lo + "–" + prof.hi + " sur les temps de course à pied");
  const profWhy = prof && prof.hi > 1 ? " · " + prof.label + " (+" + Math.round((prof.lo - 1) * 100) + "–" + Math.round((prof.hi - 1) * 100) + "%)" : "";
  // R15.2 — décalage d'IF vélo et sa justification, calculés UNE fois pour les trois sports
  // qui prescrivent des watts (tri, vélo, duathlon).
  // R18.2 — le milieu de nage. Aucun repli sur le profil global : un relief ne décrit pas
  // un plan d'eau (voir SWIM_ENV).
  const milieu = swimEnvOf(legs.swim);
  const comb = wetsuitBandOf(opts.waterTempC);
  // Les deux se COMPOSENT : un plan d'eau agité sans combinaison cumule les deux pénalités.
  // Les multiplier plutôt que prendre le pire est le choix honnête — ce sont deux causes
  // physiquement indépendantes (flottaison d'un côté, navigation et respiration de l'autre).
  const swimEnv: ReliefFactor | null = (milieu || comb)
    ? { lo: (milieu ? milieu.lo : 1) * (comb ? comb.lo : 1),
        hi: (milieu ? milieu.hi : 1) * (comb ? comb.hi : 1),
        label: [milieu ? milieu.label : null, comb && comb.lo !== 1 ? comb.label : null].filter(Boolean).join(" · ") || (comb ? comb.label : "") }
    : null;
  const swimWhy = swimEnv && (swimEnv.lo !== 1 || swimEnv.hi !== 1)
    ? " · " + swimEnv.label + " (×" + Math.round(swimEnv.lo * 100) / 100 + "–" + Math.round(swimEnv.hi * 100) / 100 + ")"
    : "";
  // SÉCURITÉ avant chrono : sous 15 °C, on ne raffine pas une estimation, on prévient.
  {
    const t = typeof opts.waterTempC === "number" ? opts.waterTempC : parseFloat(String(opts.waterTempC ?? ""));
    if (isFinite(t) && t < WETSUIT.coldWarnC)
      advice0.push("🌡 Eau à " + t + " °C. En dessous de " + WETSUIT.coldWarnC + " °C, la combinaison est obligatoire et ne suffit plus à elle seule : choc thermique à l'entrée, hyperventilation, extrémités qui lâchent. Fais au moins deux nages d'acclimatation en eau à cette température AVANT la course, avec bonnet néoprène, et n'y va jamais seul. Ce n'est pas une question de chrono.");
    if (isFinite(t) && t > WETSUIT.maxLegalC)
      advice0.push("🌡 Eau à " + t + " °C : au-delà de " + WETSUIT.maxLegalC + " °C la combinaison est interdite. Deux conséquences : tu nageras 4 à 7 % moins vite que l'estimation d'une nage en combinaison, et le risque bascule vers l'hyperthermie — entraîne-toi sans combinaison au moins une fois par semaine dans les six dernières semaines.");
  }
  if (swimEnv && (swimEnv.lo !== 1 || swimEnv.hi !== 1))
    D("R18.2-nage", "Milieu de nage", swimEnv.label,
      swimEnv.lo < 1 && swimEnv.hi > 1
        ? "Un courant peut porter autant qu'il freine : la fourchette s'élargit DANS LES DEUX SENS plutôt que de décaler dans un sens qu'on ne connaît pas."
        : swimEnv.hi < 1
          ? "En bassin il n'y a ni navigation ni houle, et les murs rendent du temps : la référence d'eau libre est trop lente ici."
          : "La navigation, la houle et la respiration contrariée coûtent du temps : la fourchette monte et s'élargit.");
  const ifShift = bikeIFShift(legs.bike ?? opts.courseProfile);
  const bikeWhy = ifShift < 0
    ? " · cible ABAISSÉE de " + Math.round(-ifShift * 100) + " points pour le relief : sur un parcours "
      + "accidenté le coût suit la puissance NORMALISÉE et non la moyenne, et l'indice de variabilité "
      + "(IV = NP ÷ moyenne) monte vite. Rouler la bande du plat ici revient à rouler plus dur qu'on ne "
      + "croit — ça se paie à pied, pas sur le vélo"
    : "";
  if (ifShift < 0)
    D("R15.2", "Relief du parcours vélo", (reliefOf(legs.bike ?? opts.courseProfile) || { label: "accidenté" }).label + " → IF " + (ifShift * 100).toFixed(1) + " pt",
      "Le chrono vélo n'est pas prédit (il dépend du parcours), mais la CIBLE D'INTENSITÉ, elle, doit "
      + "descendre : à puissance moyenne égale, un parcours vallonné coûte plus cher qu'un parcours plat.");
  // B-21 — L'EXPOSANT SUIT LE VOLUME PARTOUT, Y COMPRIS EN TRI ET EN DUATHLON.
  //
  // Il était figé à 1,06 hors course sèche, au motif que les facteurs `TRI_RUN.fatigue`
  // « avaient été calibrés CONTRE cet exposant » et qu'en bouger un compterait deux fois la
  // même difficulté. **V-07 a établi que ce motif est faux** : `TRI_RUN` est `a_priori` (aucune
  // source, aucune entrée PROVENANCE, valeurs jamais modifiées, et aucun jeu de chronos réels
  // n'a jamais existé dans ce dépôt), et la table PRÉCÈDE la fonction — il n'y a jamais eu de
  // calibration à préserver. Les deux grandeurs modélisent d'ailleurs des phénomènes distincts :
  // `fatigue` dit « courir après avoir roulé coûte plus cher » (multiplicateur par format),
  // l'exposant dit « à quel point tu tiens quand la distance s'allonge » (fonction du VOLUME
  // DE COURSE). Mesuré (V-09) : les 294 profils tri/duathlon du golden courent **2,03 h/semaine**
  // en médiane, étendue 0,58 → 4,72 — et le moteur leur appliquait à tous l'exposant d'un
  // coureur à 10 h.
  const expo = riegelExponent(opts.runHoursPerWeek);
  if (sport === "run" && expo !== 1.06)
    D("P5", "Tenue de la distance", "exposant de Riegel " + expo.toFixed(3),
      "L'extrapolation entre distances dépend du VOLUME, pas seulement de l'allure : à volume élevé "
      + "on tient mieux la distance, à petit volume la fin coûte plus cher. Riegel figé à 1,06 donnait "
      + "le même marathon à 4 h et à 14 h de course par semaine — Vickers & Vertosick (2016, N=2303) "
      + "montrent que le kilométrage hebdomadaire est un prédicteur majeur.");

  const render = (args: RenderArgs): { items: PredictionItem[]; advice: string[]; decisions: Decision[]; mid: Map<number, number>; bounds: Map<number, [number, number]> } => {
    const items: PredictionItem[] = [];
    const advice: string[] = [];
    const dec: Decision[] = [];
    const Dloc = (id: string, what: string, val: string, why: string) => dec.push({ id, what, val, why });
    const spread = args.spread;
    const refs = args.refs;
    // R14.1 — LE MILIEU EXACT DE CHAQUE ITEM DE TEMPS, capté au vol.
    // La fourchette projetée se construit à partir du milieu de la fourchette ACTUELLE ; le
    // relire dans la chaîne formatée serait fragile. `range`/`runRange` sont appelés juste
    // avant le `items.push()` de leur item, donc `items.length` EST son futur index.
    //
    // Retour utilisateur (08/08/2026) : la borne BASSE projetée était parfois plus LENTE que
    // la borne basse d'aujourd'hui, et la fourchette projetée anormalement plus ÉTROITE que
    // celle d'aujourd'hui — un horizon plus incertain donnant une prédiction plus SERRÉE. Cause
    // : la fourchette projetée ne partait que du MILIEU d'aujourd'hui (`mid`), en perdant
    // l'incertitude de mesure (`spread`, relief, milieu de nage) qui avait construit la largeur
    // affichée pour aujourd'hui. `bounds` capte aussi les bornes RÉELLES de chaque item, pour
    // que la projection les COMPOSE au lieu de les remplacer (voir plus bas).
    const mid = new Map<number, number>();
    const bounds = new Map<number, [number, number]>();
    const note = (lo: number, hi: number) => { const i = items.length; mid.set(i, (lo + hi) / 2); bounds.set(i, [lo, hi]); };
    const range = (sec: number) => {
      const lo = sec * (1 + shift - spread), hi = sec * (1 + shift + spread);
      note(lo, hi);
      return fmtT(lo) + "–" + fmtT(hi);
    };
    const runRange = (sec: number) => {
      if (!prof) return range(sec);
      const lo = sec * prof.lo * (1 + shift - spread), hi = sec * prof.hi * (1 + shift + spread);
      note(lo, hi);
      return fmtT(lo) + "–" + fmtT(hi);
    };
    // R18.2 — même forme que `runRange` : le milieu de nage élargit la fourchette au lieu de
    // décaler un chiffre. Sans réponse, c'est `range` — donc rien ne bouge pour l'existant.
    const swimRange = (sec: number) => {
      if (!swimEnv) return range(sec);
      const lo = sec * swimEnv.lo * (1 + shift - spread), hi = sec * swimEnv.hi * (1 + shift + spread);
      note(lo, hi);
      return fmtT(lo) + "–" + fmtT(hi);
    };
    const riegelSec = (paceSecPerKm: number, distKm: number) => riegelSecWith(expo, paceSecPerKm, distKm);
    // R15.2 — la bande d'IF vélo passe par le MÊME résolveur de parcours que la course
    // (`courseProfileOf` en amont) : une seule clé, donc pas de « montagne vs montagneux » 2.0.
    const bikeIF = (lo: number, hi: number): [number, number] => [
      Math.max(0.3, lo + ifShift), Math.max(0.32, hi + ifShift),
    ];
    /**
     * PW — LE CHRONO VÉLO. Rend `null` quand il manque la matière (poids, FTP, distance) :
     * l'appelant DIT alors ce qui manque, il n'affiche pas un chiffre de remplacement.
     * Le relief passe par `legProfiles.bike` — la même clé que la cible d'intensité, donc
     * pas de « montagne vs montagneux » 2.0 (R14.3-a).
     */
    const bikeTime = (distKm: number | undefined, ifLo: number, ifHi: number): BikeTimeEstimate | null => {
      if (!(refs.ftp > 0)) return null;
      const [blo, bhi] = bikeIF(ifLo, ifHi);
      return bikeTimeEstimate(distKm, refs.ftp * blo, refs.ftp * bhi, opts.athleteKg,
        assumedSetup(sport, format), legs.bike ?? opts.courseProfile);
    };
    /**
     * PW — LE TOTAL, ET POURQUOI SA FOURCHETTE EST LA SOMME DES EXTRÊMES.
     *
     * Le moteur refusait le total au motif qu'« il additionnerait les incertitudes ». C'est
     * exact — et c'est justement ce qu'on veut voir. Deux compositions étaient possibles :
     * en QUADRATURE (racine de la somme des carrés), qui suppose les erreurs indépendantes et
     * les fait donc s'annuler en partie ; ou en SOMME DES BORNES, qui les suppose corrélées.
     * La seconde est retenue parce que la corrélation est réelle : la principale incertitude
     * n'est pas le hasard segment par segment, c'est « la forme du jour est-elle celle qu'on
     * a mesurée » — et ce jour-là, elle l'est ou elle ne l'est pas sur les trois segments à la
     * fois. Elle donne la fourchette la plus LARGE, ce qui est le bon sens de l'erreur pour un
     * athlète qui prépare un départ.
     *
     * Il ne s'affiche QUE si les trois segments sont estimés : un total à deux segments sur
     * trois serait faux de la valeur du troisième, et personne ne lirait l'astérisque.
     */
    const totalOf = (parts: [number, number][], transitionSec: number): [number, number] => [
      parts.reduce((t, p) => t + p[0], transitionSec),
      parts.reduce((t, p) => t + p[1], transitionSec),
    ];
    const fmtRange = (lo: number, hi: number) => { note(lo, hi); return fmtT(lo) + "–" + fmtT(hi); };

  // ---- R7 TRAIL : Riegel est INAPPLICABLE (un km de trail n'est pas un km de route).
  // Modèle à deux composantes : temps à plat + temps vertical (VAM), pénalisés par la
  // technicité et la nuit. Fourchette LARGE et annoncée comme telle : sur un ultra, ±20%
  // est une estimation honnête — afficher une fourchette serrée serait le mensonge.
  if (sport === "trail" && args.trail) {
    const obj = args.trail;
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
    Dloc("PRED-trail", "Méthode trail", "temps à plat + temps vertical (VAM)", "Riegel ne s'applique pas au trail : on additionne le temps horizontal et le temps d'ascension, puis on pénalise selon la technicité (" + tech.label + ") et la nuit");
    return { items, advice, decisions: dec, mid, bounds };
  }

  // R10 phase 1 — DISPATCH : chaque sport porte SA méthode de prédiction dans son module
  // (`src/sports/<sport>/`). Ce qui reste ici est commun : fourchettes, profil de parcours,
  // formatage, journal de décisions. Un sport sans méthode ne PRÉDIT RIEN plutôt que de
  // sortir un chiffre inventé — la fourchette honnête est la seule sortie acceptable.
  const mod = sportModule(sport);
  if (mod.predict) {
    mod.predict({ format, refs, items, advice, D: Dloc, range, runRange, swimRange, riegelSec, profWhy, swimWhy, bikeIF, bikeWhy,
      bikeTime, totalOf, fmtRange, athleteKg: opts.athleteKg,
      legBands: {
        swim: swimEnv ? [swimEnv.lo, swimEnv.hi] : null,
        run: prof && prof.hi > 1 ? [prof.lo, prof.hi] : null,
      },
      swimrun: opts.swimrun });
  } else {
    advice.push("La prédiction de temps n'est pas encore disponible pour ce sport : nous préférons ne rien afficher plutôt qu'un chiffre que nous ne pourrions pas défendre.");
  }

    return { items, advice, decisions: dec, mid, bounds };
  };

  // ---- FORME ACTUELLE — la vérité mesurée, l'ancre. Elle ne bouge pas (R14, non-régression).
  const spreadNow = followed ? 0.02 : 0.03;
  const now = render({ refs, spread: spreadNow, trail: opts.trail });
  decisions.push(...now.decisions);

  return {
    items: now.items,
    advice: [...advice0, ...now.advice],
    decisions,
    projected: buildProjection(sport, refs, opts, now, render),
  };
}

/**
 * R14 — LA FORME PROJETÉE. Le même prédicteur, rejoué sur des références projetées et une
 * fourchette élargie. Trois refus possibles, tous motivés, jamais un chiffre inventé :
 *  - pas d'entrées de projection (appelant qui n'en fournit pas) → `null` ;
 *  - aucune référence mesurée (P8) → `applicable: false`, items vides ;
 *  - horizon trop lointain pour une fourchette utile (P7) → `applicable: false`.
 */
function buildProjection(
  sport: string,
  refs: { ftp: number; thrPace: number; css: number },
  opts: PredictOpts,
  now: { items: PredictionItem[]; mid: Map<number, number> },
  render: (a: RenderArgs) => { items: PredictionItem[]; advice: string[]; decisions: Decision[]; mid: Map<number, number> },
): ProjectedPrediction | null {
  const input = opts.projection;
  if (!input) return null;
  const itemsNow = now.items;

  const p = projectForm(input);
  const vide = { applicable: false, horizonWeeks: p.horizonWeeks, adherence: p.adherence, gainPct: p.gainPct,
    gainBand: p.gainBand, gainSource: p.gainSource, confidence: p.confidence, weightLever: p.weightLever,
    raceDate: input.raceDate, refs, items: [] as PredictionItem[], decisions: p.decisions };

  // P8 — AUCUNE PROJECTION SANS MATIÈRE. Sans référence mesurée, la « forme actuelle » n'a
  // déjà rien à dire ; projeter une valeur inventée serait construire un chrono sur du vent.
  if (!(refs.ftp > 0) && !(refs.thrPace > 0) && !(refs.css > 0)) {
    p.decisions.push({ id: "P8", what: "Pas de projection", val: "aucune référence mesurée",
      why: "Nous ne projetons rien tant qu'aucune référence n'est connue : un chrono construit sur "
        + "une valeur inventée serait un chiffre présentable et faux. Fais un test (les protocoles "
        + "sont dans l'app) et la projection apparaîtra." });
    return vide;
  }
  if (!p.applicable) return vide;

  // Les références projetées. L'allure seuil est un TEMPS au kilomètre : progresser la fait
  // BAISSER — l'erreur de signe ici donnerait un athlète qui ralentit en s'entraînant.
  const projRefs = {
    ftp: refs.ftp > 0 ? Math.round(refs.ftp * (1 + p.gainPct.ftp)) : 0,
    thrPace: refs.thrPace > 0 ? refs.thrPace / (1 + p.gainPct.thrPace) : 0,
    css: refs.css > 0 ? refs.css / (1 + p.gainPct.css) : 0,
  };
  const trailProj = opts.projectTrail ? opts.projectTrail(p.gainPct.vam, p.gainPct.thrPace) : opts.trail;
  // Rejeu au gain de RÉFÉRENCE, sans fourchette : on ne veut de ce passage que le déplacement
  // du milieu. La fourchette, elle, est construite ci-dessous — et elle est asymétrique.
  const fut = render({ refs: projRefs, spread: 0, trail: trailProj });

  let ancres = 0;
  const items: PredictionItem[] = [];
  fut.items.forEach((it, i) => {
    const ref = itemsNow[i] && itemsNow[i].leg === it.leg ? itemsNow[i] : itemsNow.find((x) => x.leg === it.leg);
    const mNow = now.mid.get(i), mFut = fut.mid.get(i);
    const nowBounds = now.bounds.get(i);

    // ---- Item de TEMPS : fourchette ASYMÉTRIQUE autour de la forme d'aujourd'hui (R14.1 §2)
    if (mNow != null && mFut != null && mNow > 0 && nowBounds) {
      // Le gain en TEMPS, tel que le prédicteur du sport le produit réellement (Riegel, facteur
      // CSS, fatigue post-vélo…) : on ne le re-dérive pas d'une seconde formule.
      const gTime = Math.max(0, 1 - mFut / mNow);
      const loT0 = mNow * (1 - Math.min(0.95, GAIN_BAND_HI * gTime)); // le plus rapide plausible
      const hiT = mNow * (1 - GAIN_BAND_LO * gTime);                  // « presque rien gagné »
      // Retour utilisateur (08/08/2026) : à horizon court (gain encore faible), `loT0` — ancrée
      // sur le MILIEU d'aujourd'hui (`mNow`) — pouvait dépasser la borne BASSE d'aujourd'hui
      // (`loNow`, celle affichée à l'écran) : l'athlète lisait un « meilleur cas » projeté plus
      // LENT que son meilleur cas actuel. Le milieu n'est jamais montré, seule la fourchette
      // l'est — la comparaison qui compte pour l'athlète est donc borne à borne, pas borne à
      // milieu. `loT` ne peut donc jamais être pire que ce que l'écran affiche déjà pour
      // aujourd'hui ; `hiT` reste inchangée (R14.1-D : le pire cas reste ancré au milieu).
      const [loNow] = nowBounds;
      const loT = Math.min(loT0, loNow);
      items.push({ leg: it.leg, value: fmtT(loT) + "–" + fmtT(hiT),
        why: it.why + " · au pire, ta forme d'aujourd'hui : un plan suivi ne rend pas plus lent, il "
          + "peut seulement rapporter moins que prévu (sur 483 sujets au même programme, 7 % n'ont "
          + "presque rien gagné et 8 % énormément — HERITAGE)." });
      return;
    }

    // ---- Item de PACING : P6, jamais projeté. Mais on cesse de le faire passer pour une
    // projection : la cible ancrée et la référence projetée deviennent DEUX lignes (R14.1 §3).
    // Sans ça, la moitié du temps de course d'un 70.3 est invisible dans la projection, et
    // l'athlète en conclut — à raison — que l'outil ne prévoit aucun progrès.
    if (!ref) { items.push(it); return; }
    ancres++;
    items.push({ leg: ref.leg + " — cible jour J", value: ref.value,
      why: ref.why + " · ANCRÉE sur ta référence mesurée d'aujourd'hui : elle ne bougera qu'à ton "
        + "prochain test. Partir à l'intensité qu'on espère avoir se paie toujours dans le dernier "
        + "tiers de la course." });
    const w = /^\s*(\d+)\s*[–-]\s*(\d+)\s*W\s*$/.exec(ref.value);
    if (w && refs.ftp > 0) {
      const [lo, hi] = p.gainBand.ftp;
      const ftpLo = Math.round(refs.ftp * (1 + lo)), ftpHi = Math.round(refs.ftp * (1 + hi));
      const cibLo = Math.round(+w[1] * (1 + lo)), cibHi = Math.round(+w[2] * (1 + hi));
      items.push({ leg: ref.leg + " — FTP projetée", value: ftpLo + "–" + ftpHi + "W",
        why: "À ce niveau, la cible du jour J deviendrait " + cibLo + "–" + cibHi + "W. Elle ne se "
          + "débloque pas toute seule : refais un test de FTP et le plan s'y recalera. C'est la moitié "
          + "du temps de course — la voir progresser est le vrai retour de ces semaines." });
    }
  });
  if (ancres > 0)
    p.decisions.push({ id: "P6", what: "Intensités non projetées", val: ancres + " cible(s) ancrée(s)",
      why: "Le temps se projette, l'intensité s'ancre. Une cible de puissance ou d'allure calculée sur "
        + "la forme qu'on ESPÈRE avoir fait partir trop vite le jour J ; celle-ci reste calée sur ta "
        + "dernière mesure réelle, et la référence projetée est affichée à côté, séparément." });

  // Un sport dont TOUS les items sont des cibles d'intensité (le vélo : on prédit des watts,
  // jamais un chrono qui dépend du parcours) n'a pas de chrono à projeter — et le dire vaut
  // mieux que d'afficher une projection sans expliquer pourquoi elle ne bouge pas.
  if (!items.some((it) => EST_UN_TEMPS.test(it.value))) {
    p.decisions.push({ id: "P6-sans-chrono", what: "Rien à projeter", val: "ce sport prédit des cibles, pas un temps",
      why: "Ici nous prédisons des puissances cibles, pas un chrono (il dépend du parcours, du vent et "
        + "du peloton) — et une cible ne se projette jamais (P6). Ta progression apparaît dans ta FTP "
        + "projetée et dans tes retests, pas dans une prédiction de course." });
    return { ...vide, applicable: false, refs: projRefs, items, decisions: p.decisions };
  }

  return {
    applicable: true, horizonWeeks: p.horizonWeeks, adherence: p.adherence, gainPct: p.gainPct,
    gainBand: p.gainBand, gainSource: p.gainSource, confidence: p.confidence, weightLever: p.weightLever,
    raceDate: input.raceDate, refs: projRefs, items, decisions: p.decisions,
  };
}
