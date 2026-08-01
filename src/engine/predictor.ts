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
const RIEGEL_ANCRES: [number, number][] = [[4, 1.12], [6.5, 1.09], [10, 1.06], [12, 1.04]];
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

/** Riegel : temps sur D depuis l'allure seuil (tenable ~1h), t = 3600 × (D/D₁ₕ)^exp */
function riegelSecWith(exp: number, thrPaceSecPerKm: number, distKm: number): number {
  const d1h = 3600 / thrPaceSecPerKm;
  return 3600 * Math.pow(distKm / d1h, exp);
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
  const swimEnv = swimEnvOf(legs.swim);
  const swimWhy = swimEnv && (swimEnv.lo !== 1 || swimEnv.hi !== 1)
    ? " · " + swimEnv.label + " (×" + swimEnv.lo + "–" + swimEnv.hi + ")"
    : "";
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
  // R14 P5 — l'exposant de Riegel suit le volume, et SEULEMENT pour une course sèche :
  // les legs course du tri/duathlon portent déjà leurs facteurs de fatigue calibrés à 1,06.
  const expo = sport === "run" ? riegelExponent(opts.runHoursPerWeek) : 1.06;
  if (sport === "run" && expo !== 1.06)
    D("P5", "Tenue de la distance", "exposant de Riegel " + expo.toFixed(3),
      "L'extrapolation entre distances dépend du VOLUME, pas seulement de l'allure : à volume élevé "
      + "on tient mieux la distance, à petit volume la fin coûte plus cher. Riegel figé à 1,06 donnait "
      + "le même marathon à 4 h et à 14 h de course par semaine — Vickers & Vertosick (2016, N=2303) "
      + "montrent que le kilométrage hebdomadaire est un prédicteur majeur.");

  const render = (args: RenderArgs): { items: PredictionItem[]; advice: string[]; decisions: Decision[]; mid: Map<number, number> } => {
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
    const mid = new Map<number, number>();
    const note = (lo: number, hi: number) => { mid.set(items.length, (lo + hi) / 2); };
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
    return { items, advice, decisions: dec, mid };
  }

  // R10 phase 1 — DISPATCH : chaque sport porte SA méthode de prédiction dans son module
  // (`src/sports/<sport>/`). Ce qui reste ici est commun : fourchettes, profil de parcours,
  // formatage, journal de décisions. Un sport sans méthode ne PRÉDIT RIEN plutôt que de
  // sortir un chiffre inventé — la fourchette honnête est la seule sortie acceptable.
  const mod = sportModule(sport);
  if (mod.predict) {
    mod.predict({ format, refs, items, advice, D: Dloc, range, runRange, swimRange, riegelSec, profWhy, swimWhy, bikeIF, bikeWhy, swimrun: opts.swimrun });
  } else {
    advice.push("La prédiction de temps n'est pas encore disponible pour ce sport : nous préférons ne rien afficher plutôt qu'un chiffre que nous ne pourrions pas défendre.");
  }

    return { items, advice, decisions: dec, mid };
  };

  // ---- FORME ACTUELLE — la vérité mesurée, l'ancre. Elle ne bouge pas (R14, non-régression).
  const spreadNow = followed ? 0.02 : 0.03;
  const now = render({ refs, spread: spreadNow, trail: opts.trail });
  decisions.push(...now.decisions);

  return {
    items: now.items,
    advice: now.advice,
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

    // ---- Item de TEMPS : fourchette ASYMÉTRIQUE autour de la forme d'aujourd'hui (R14.1 §2)
    if (mNow != null && mFut != null && mNow > 0) {
      // Le gain en TEMPS, tel que le prédicteur du sport le produit réellement (Riegel, facteur
      // CSS, fatigue post-vélo…) : on ne le re-dérive pas d'une seconde formule.
      const gTime = Math.max(0, 1 - mFut / mNow);
      const loT = mNow * (1 - Math.min(0.95, GAIN_BAND_HI * gTime)); // le plus rapide plausible
      const hiT = mNow * (1 - GAIN_BAND_LO * gTime);                 // « presque rien gagné »
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
