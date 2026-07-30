/**
 * Modèle TRAIL (spec R7) — le trail est un SPORT, pas un format de course à pied.
 *
 * Pourquoi ce module existe : traité comme un format de `run`, le trail recevait une seule
 * durée de préparation, un seul plafond de sortie longue et un seul plafond horaire pour
 * tout — du 23 km/900 m au 100 miles/10 000 m. Le questionnaire ne demandait jamais le
 * dénivelé de la course visée, la seule donnée qui structure une préparation trail.
 *
 * Trois principes structurent tout ce fichier :
 *  - le volume se planifie en TEMPS **et** en D+ / D−, jamais en kilomètres ;
 *  - l'intensité dépend de la PENTE (rendu : renderer.ts, zones `tr.*`) ;
 *  - la DESCENTE est une charge à part entière — premier facteur de casse musculaire et
 *    de non-finish, donc progressée plus lentement que tout le reste.
 *
 * Périmètre assumé (décision produit) : le moteur va jusqu'à `ultra_long` (12-24 h). Au-delà,
 * la stratégie de course (sommeil fractionné, assistance, ravitaillement par base-vie) dépasse
 * ce qu'un plan automatique peut honnêtement produire — et l'outil le DIT au lieu de deviner.
 */
import type { AthleteProfile } from "./types.ts";

export interface Provenance2 { id: string; why: string }
export const TRAIL_PROVENANCE: Provenance2[] = [];
function trule<T>(id: string, why: string, value: T): T {
  TRAIL_PROVENANCE.push({ id, why });
  return value;
}

export type TrailCategory = "kv" | "court" | "long" | "ultra" | "ultra_long" | "ultra_xl";
export const TRAIL_CATEGORIES: TrailCategory[] = ["kv", "court", "long", "ultra", "ultra_long", "ultra_xl"];

/** T1 — plafond de D+ hebdomadaire (m/semaine, au pic) par catégorie × historique. */
export const T1_DPLUS_CAPS: Record<TrailCategory, Record<string, number>> = trule(
  "T1",
  "le D+ est le second axe de charge du trail : le plafonner par catégorie et par historique évite qu'un plan de 8h/sem accumule un dénivelé d'ultra-traileur",
  {
    kv: { reprise: 1500, confirme: 2500, ancien: 3500 },
    court: { reprise: 1200, confirme: 2000, ancien: 2800 },
    long: { reprise: 1800, confirme: 3000, ancien: 4200 },
    ultra: { reprise: 2500, confirme: 4000, ancien: 5500 },
    ultra_long: { reprise: 3000, confirme: 5000, ancien: 7000 },
    ultra_xl: { reprise: 3500, confirme: 6000, ancien: 8500 },
  },
);

/** T2 / T2b — progressions hebdomadaires distinctes ; le NÉGATIF est le plus lent des trois axes. */
export const T2_DPLUS_GROWTH = trule("T2", "le D+ monte plus vite que le temps mais reste lissé", 1.12);
export const T2_DMOINS_GROWTH = trule(
  "T2b",
  "la charge excentrique est le premier facteur de casse musculaire en trail : les dommages culminent 24-48h après l'effort et la récupération complète demande 3 à 7 jours — sa progression est la plus lente",
  1.08,
);

/** T3 — récupération après forte descente (le registre le déclarait depuis R4, personne ne l'appliquait). */
export const T3_ECCENTRIC_RECOVERY = trule(
  "T3",
  "aucune séance de qualité ni de descente dans les 48h suivant une sortie à fort D− : les dommages musculaires excentriques culminent à 24-48h",
  { thresholdDmoins: 1000, minGapDays: 2 },
);

/** T4 — la sortie longue plafonne en % du TEMPS DE COURSE estimé, pas en minutes absolues. */
export const T4_LONG_RUN_VS_RACE: Record<TrailCategory, number> = trule(
  "T4",
  "sur un ultra, reproduire la durée de course à l'entraînement est contre-productif : le plafond suit la catégorie d'effort",
  { kv: 1.5, court: 1.0, long: 0.85, ultra: 0.55, ultra_long: 0.4, ultra_xl: 0.3 },
);

/** T5 — part de marche rapide attendue en course : une compétence entraînable, pas un échec. */
export const T5_HIKE_SHARE: Record<TrailCategory, number> = trule(
  "T5",
  "au-delà de 1500m D+, la marche rapide représente une part majeure du temps de course : elle s'entraîne, avec ou sans bâtons",
  { kv: 0.5, court: 0.05, long: 0.15, ultra: 0.25, ultra_long: 0.35, ultra_xl: 0.4 },
);

/** T6 — durée de préparation minimale par catégorie (remplace `MIN_WEEKS.run.trail = 18` pour tous). */
export const T6_MIN_WEEKS: Record<TrailCategory, number> = trule(
  "T6",
  "un ultra ne se prépare pas dans le même horizon qu'un trail court",
  { kv: 10, court: 12, long: 16, ultra: 22, ultra_long: 28, ultra_xl: 34 },
);

/** T7 — répétitions nutrition/matériel en conditions réelles, au-delà de 6h d'effort. */
export const T7_REHEARSAL = trule(
  "T7",
  "au-delà de 6h d'effort, la nutrition et le matériel sont des causes d'abandon aussi fréquentes que la condition physique : ils se répètent à l'entraînement",
  { minRaceHours: 6, sessionsInSpec: 3 },
);

/** Plafonds horaires du trail par catégorie × historique (h/sem au pic) — l'axe TEMPS. */
export const TRAIL_HISTORY_CAPS: Record<TrailCategory, Record<string, number>> = {
  kv: { reprise: 6, confirme: 8, ancien: 10 },
  court: { reprise: 6, confirme: 8, ancien: 10 },
  long: { reprise: 8, confirme: 11, ancien: 13 },
  ultra: { reprise: 9, confirme: 13, ancien: 16 },
  ultra_long: { reprise: 10, confirme: 14, ancien: 18 },
  ultra_xl: { reprise: 11, confirme: 15, ancien: 20 },
};
/** Heures UTILES par catégorie — au-delà, le volume ne sert plus l'objectif. */
export const TRAIL_UTIL: Record<TrailCategory, number> = { kv: 9, court: 10, long: 13, ultra: 16, ultra_long: 19, ultra_xl: 22 };

/** Pénalité de technicité sur le temps estimé (spec §6.1). */
export const TRAIL_TECHNICITY: Record<string, { f: number; label: string }> = {
  roulant: { f: 1.0, label: "roulant" },
  mixte: { f: 1.08, label: "mixte" },
  technique: { f: 1.18, label: "technique" },
  alpin: { f: 1.3, label: "alpin" },
};

/**
 * T18 (R12.1) — LA VAM SE DÉDUIT D'UNE MONTÉE VÉCUE, PAS D'UN ADJECTIF.
 *
 * L'audit grand public a montré le défaut : contrairement aux trois autres références, le trail
 * ne se repliait pas sur une grandeur observable — il substituait un NOMBRE déduit d'un adjectif
 * auto-déclaré (`level`), puis construisait tout le plan et la prédiction dessus. Sur un
 * 45 km / 2 200 m, le seul changement de « niveau » faisait varier l'estimation de course de
 * TROIS HEURES. Or « intermédiaire » est la case que tout le monde coche.
 *
 * La bonne question n'est pas « connais-tu ta VAM ? » — personne ne la connaît — mais
 * « ta dernière grosse montée : combien de D+, en combien de temps ? ». Tout le monde sait y
 * répondre, et c'est une MESURE.
 *
 * L'abattement : une montée d'entraînement n'est pas un effort seuil, et une montée courte
 * flatte la moyenne (on tient 900 m/h sur 15 min, pas sur une heure). On retient donc 90 % de
 * la VAM observée, et 85 % sous 15 minutes. Conservateur par construction : sous-estimer la VAM
 * donne un plan un peu facile, la surestimer donne un plan intenable et une prédiction qui ment.
 */
export const T18_VAM_FROM_CLIMB = trule(
  "T18",
  "une VAM mesurée sur une montée vécue vaut mieux qu'une VAM déduite d'un adjectif — avec un abattement, car une montée d'entraînement n'est pas un effort seuil et une montée courte flatte la moyenne",
  { abatement: 0.9, shortClimbMin: 15, shortAbatement: 0.85, minMin: 5, maxMin: 300 },
);

/**
 * Repli quand l'athlète n'a ni VAM ni montée à déclarer (R12.4). Deux principes :
 *
 * 1. **BORNE BASSE, pas médiane.** Pour une V1 grand public, l'inconnu doit tomber vers le bas.
 *    L'ancien défaut (850 m/h) décrivait déjà un grimpeur solide. Un plan calibré trop haut se
 *    paie en blessure ; calibré trop bas, il se corrige à la première montée déclarée.
 * 2. **Le repli ne s'appuie plus sur `level`.** C'était le cœur du défaut mesuré : le seul
 *    changement d'adjectif faisait varier l'estimation de course de TROIS HEURES, et
 *    « intermédiaire » est la case que tout le monde coche. On s'appuie sur deux réponses
 *    FACTUELLES — depuis combien de temps tu pratiques, et quel dénivelé tu as près de chez toi
 *    (quelqu'un qui vit en montagne grimpe, quelqu'un qui vit en plaine non). `level` continue
 *    de servir là où il est légitime : le CONTENU des séances, jamais un chiffre de prédiction.
 */
export const VAM_BY_HISTORY: Record<string, number> = trule(
  "T18b", "l'ancienneté de pratique est une réponse factuelle ; le « niveau » est un adjectif — seul le premier a le droit de piloter un chiffre",
  { reprise: 500, confirme: 620, ancien: 720 },
);
/** Allure seuil sur plat, en secondes/km, quand elle n'est pas connue — adossée à l'ancienneté
 *  de pratique, jamais au niveau ressenti (R12.6). Volontairement prudente. */
/**
 * T19 — LA RÉCUPÉRATION D'UNE RÉPÉTITION EN PENTE EST UN RETOUR, ET IL SE CALCULE.
 *
 * En trail, la récupération entre deux répétitions n'est pas une pause : c'est le trajet de
 * retour au pied de la côte (ou en haut de la descente). Elle a donc une durée, et cette durée
 * se DÉDUIT du dénivelé de la répétition — pas d'une phrase. C'était le dernier endroit du
 * moteur où de la prose servait de donnée : 1 740 récupérations de trail étaient comptées
 * 0 minute parce que leur libellé (« descente MARCHÉE », « remontée en marche active ») ne
 * portait aucun chiffre. Une séance de côtes annoncée 11 min en durait 20.
 *
 * Vitesses de RETOUR, pas d'effort — c'est ce qui les distingue des VAM d'entraînement :
 *   · descente marchée/trottinée de récupération : 900 m D−/h. Une descente de récupération se
 *     freine (c'est elle qui casse les cuisses) ; 900 m/h est le compromis observé entre la
 *     marche prudente (~600) et le trot souple (~1 200).
 *   · remontée en marche active : 400 m D+/h. C'est la VAM de randonnée soutenue — au-dessus,
 *     ce n'est plus une récupération, c'est un second bloc de travail.
 * Plancher d'une minute : une répétition ne s'enchaîne pas sans une reprise de souffle, même
 * quand le dénivelé est minuscule.
 */
export const T19_RETURN = trule(
  "T19",
  "la récupération d'une répétition en pente est le trajet de retour : sa durée se déduit du dénivelé, jamais d'un libellé",
  { downWalkMPerH: 900, upWalkMPerH: 400, minMin: 1, maxMin: 45 },
);

/** Durée du RETOUR après une répétition en pente, en minutes (T19). `up`/`down` = mètres de
 *  dénivelé de la répétition ; on redescend ce qu'on a monté, on remonte ce qu'on a descendu. */
export function returnMinutes(o: { dplusM?: number; dmoinsM?: number }): number {
  const t = (o.dplusM ? (o.dplusM / T19_RETURN.downWalkMPerH) * 60 : 0)
    + (o.dmoinsM ? (o.dmoinsM / T19_RETURN.upWalkMPerH) * 60 : 0);
  return Math.min(T19_RETURN.maxMin, Math.max(T19_RETURN.minMin, Math.round(t * 10) / 10));
}

/**
 * T19, RÉCONCILIATION — `recoveryMin` d'un bloc en pente est une DÉRIVÉE de son dénivelé, et
 * le dénivelé bouge après la construction (mise à l'échelle verticale T1/T2, plafond de bosse
 * accessible, allègement T3). Un nombre dérivé figé trop tôt ment dès la première passe qui
 * touche sa source : on le recalcule donc à chaque rendu, comme `_min`.
 *
 * Le TAPIS est exclu : sur un tapis, on ne redescend rien — la récupération est l'intervalle à
 * plat prescrit par la séance, une valeur fixe et non déductible du dénivelé simulé.
 */
export function syncReturnRecovery(steps: { role?: string; reps?: number; gradient?: string; surface?: string; recoveryText?: string; recoveryMin?: number; dplusM?: number; dmoinsM?: number }[]): void {
  for (const st of steps) {
    if (st.role !== "body" || (st.reps || 1) <= 1 || !st.recoveryText) continue;
    if (!st.gradient || st.gradient === "flat" || st.surface === "tapis") continue;
    st.recoveryMin = returnMinutes({ dplusM: st.dplusM, dmoinsM: st.dmoinsM });
  }
}

export const T18d_FLAT_PACE_BY_HISTORY: Record<string, number> = trule(
  "T18d", "un repli d'allure doit s'appuyer sur une réponse vérifiable ; le niveau ressenti n'en est pas une",
  { reprise: 380, confirme: 330, ancien: 300 },
);
/** … modulé par le dénivelé RÉELLEMENT accessible : on grimpe ce qu'on a sous la porte. */
export const VAM_BY_TERRAIN: Record<string, number> = trule(
  "T18c", "le dénivelé accessible depuis chez soi prédit mieux la capacité en montée qu'un niveau ressenti",
  { plat: 0.9, collines: 1.0, montagne: 1.1 },
);

/** VAM déduite d'une montée déclarée (D+ en m, durée en min) — `null` si la saisie ne dit rien. */
export function vamFromClimb(dplusM: number, minutes: number): number | null {
  const T = T18_VAM_FROM_CLIMB;
  if (!(dplusM > 0) || !(minutes >= T.minMin) || minutes > T.maxMin) return null;
  const raw = dplusM / (minutes / 60);
  const f = minutes < T.shortClimbMin ? T.shortAbatement : T.abatement;
  const v = Math.round(raw * f);
  return v >= 150 && v <= 2500 ? v : null;
}

/** Part de la vitesse seuil réellement tenable selon la durée d'effort : une allure seuil
 *  ne se tient pas 12 h. `flat` s'applique à la vitesse au sol, `vert` à la VAM.
 *  (Fractions de la référence seuil, pas des multiplicateurs de temps.) */
const ENDURANCE_KEEP: Record<TrailCategory, { flat: number; vert: number }> = {
  kv: { flat: 0.98, vert: 0.98 },
  court: { flat: 0.92, vert: 0.9 },
  long: { flat: 0.86, vert: 0.85 },
  ultra: { flat: 0.82, vert: 0.82 },
  ultra_long: { flat: 0.78, vert: 0.8 },
  ultra_xl: { flat: 0.7, vert: 0.72 },
};

export interface TrailObjective {
  distanceKm: number;
  dplusM: number;
  dmoinsM: number;
  kmEffort: number;
  category: TrailCategory;
  /** Catégorie demandée par les chiffres, avant plafonnement produit (`ultra_long`). */
  rawCategory: TrailCategory;
  cappedByProduct: boolean;
  raceMinLo: number;
  raceMinHi: number;
  raceMinMid: number;
  technicity: string;
  night: string;
  vam: number;
  vamKnown: boolean;
  /** D'où vient la VAM : saisie, déduite d'une montée vécue (R12.1), ou estimée (repli). */
  vamSource: "declaree" | "montee" | "estimee";
  flatPaceSec: number;
  cutoffH: number | null;
  altitudeMaxM: number | null;
  why: string;
}

const num = (v: unknown): number => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Catégorie d'effort DÉDUITE des données réelles de la course (jamais demandée à l'athlète)
 * + fourchette de temps estimé. Modèle en KM-EFFORT pondéré par la part verticale :
 *   v_km_effort = harmonique(vitesse plat tenable, VAM tenable) selon la part de vertical
 *   t = km-effort / v_km_effort × technicité × nuit
 * La catégorie dépend du temps et le temps dépend de la catégorie (dégradation d'endurance) :
 * quelques itérations convergent. Calibré sur des repères connus (56-101 km de montagne :
 * 8-9 km-effort/h pour un coureur intermédiaire, ~11-12 sur un format court roulant).
 * Un seuil sur la seule distance serait faux : 62 km à 3 200 m D+ et 62 km à plat ne sont
 * pas la même course.
 */
export function trailObjective(a: AthleteProfile): TrailObjective {
  const distanceKm = Math.max(1, num(a.race_distance_km) || 25);
  const dplusM = Math.max(0, num(a.race_dplus_m) || Math.round(distanceKm * 25));
  const dmoinsM = num(a.race_dmoins_m) > 0 ? num(a.race_dmoins_m) : dplusM;
  const kmEffort = Math.round(distanceKm + dplusM / 100);
  const level = a.level || "inter";
  // Trois sources, dans cet ordre : la VAM saisie (rare), la montée VÉCUE (R12.1 — ce que les
  // gens savent), et à défaut un repli conservateur pondéré par l'historique (R12.4).
  const vamDeclared = a.vam_known === "oui" && num(a.vam) >= 200 && num(a.vam) <= 2500 ? num(a.vam) : 0;
  const vamClimb = vamDeclared ? 0 : (vamFromClimb(num(a.climb_dplus_m), num(a.climb_min)) || 0);
  const vamKnown = vamDeclared > 0 || vamClimb > 0;
  const vamSource: "declaree" | "montee" | "estimee" = vamDeclared ? "declaree" : vamClimb ? "montee" : "estimee";
  const vam = vamDeclared || vamClimb
    || Math.round((VAM_BY_HISTORY[a.history || "confirme"] ?? 620) * (VAM_BY_TERRAIN[a.train_dplus_access || "collines"] ?? 1));
  // allure seuil SUR PLAT (s/km) — la référence route reste valable à plat
  // R12.6 — même principe que pour la VAM : quand l'allure n'est pas connue, le repli suit une
  // réponse FACTUELLE (l'ancienneté de pratique), pas un adjectif. C'est par ce chemin que
  // `level` faisait encore varier l'estimation de course — et donc la sortie longue, calibrée
  // en pourcentage du temps de course (T4).
  const flatPaceSec = num(a.pace_known === "oui" ? paceToSec(a.pace) : 0)
    || (T18d_FLAT_PACE_BY_HISTORY[a.history || "confirme"] ?? 330);
  const tech = TRAIL_TECHNICITY[a.race_technicity || "mixte"] || TRAIL_TECHNICITY.mixte;
  const night = a.race_night || "non";
  const nightF = night === "majoritaire" ? 1.1 : night === "partielle" ? 1.05 : 1.0;

  // KV : montée quasi pure, catégorie décidée par la géométrie, pas par le temps
  // KV : un « kilomètre vertical » se reconnaît à sa pente moyenne (≥140 m de D+ par km),
  // pas à un seuil de distance — 6 km pour 1 000 m D+ est un KV, 6 km pour 200 m ne l'est pas.
  const isKv = dplusM / Math.max(1, distanceKm) >= 140 && distanceKm <= 12;
  let cat: TrailCategory = isKv ? "kv" : "long";
  let mid = 0;
  // Modèle en KM-EFFORT, pondéré par la part verticale du parcours (moyenne harmonique).
  // Un modèle purement additif (temps à plat + temps d'ascension) compte DEUX FOIS le
  // déplacement horizontal des montées et surestime lourdement : 62 km/3 200 m sortait à
  // 15-22 h là où la réalité d'un coureur intermédiaire est plutôt 11-13 h.
  const vFlatSeuil = 3600 / Math.max(120, flatPaceSec); // km/h au seuil, sur plat
  const partVert = (dplusM / 100) / Math.max(1, kmEffort); // part du km-effort qui est du vertical
  for (let it = 0; it < 4; it++) {
    const keep = ENDURANCE_KEEP[cat];
    const vFlat = vFlatSeuil * keep.flat; // km-effort/h sur les portions plates
    const vVert = (vam * keep.vert) / 100; // 100 m D+ = 1 km-effort
    const vKmEff = 1 / ((1 - partVert) / Math.max(1, vFlat) + partVert / Math.max(1, vVert));
    mid = (kmEffort / vKmEff) * 60 * tech.f * nightF;
    const h = mid / 60;
    const next: TrailCategory = isKv ? "kv" : h < 3 ? "court" : h < 6 ? "long" : h < 12 ? "ultra" : h < 24 ? "ultra_long" : "ultra_xl";
    if (next === cat) break;
    cat = next;
  }
  const rawCategory = cat;
  // Décision produit : le moteur s'arrête à ultra_long et le dit (§11.2).
  const cappedByProduct = cat === "ultra_xl";
  if (cappedByProduct) cat = "ultra_long";

  // Fourchette : ±20% assumée sur un ultra, plus serrée sur un format court. Le mensonge
  // serait d'afficher une fourchette étroite sur 12h de course.
  const spread = cat === "kv" || cat === "court" ? 0.1 : cat === "long" ? 0.14 : 0.2;
  return {
    distanceKm, dplusM, dmoinsM, kmEffort, category: cat, rawCategory, cappedByProduct,
    raceMinLo: Math.round(mid * (1 - spread)), raceMinHi: Math.round(mid * (1 + spread)), raceMinMid: Math.round(mid),
    technicity: a.race_technicity || "mixte", night, vam, vamKnown, vamSource, flatPaceSec,
    cutoffH: num(a.race_cutoff_h) > 0 ? num(a.race_cutoff_h) : null,
    altitudeMaxM: num(a.race_altitude_max_m) > 0 ? num(a.race_altitude_max_m) : null,
    why: distanceKm + " km / " + dplusM + " m D+ = " + kmEffort + " km-effort · "
      + (vamSource === "declaree" ? "ta VAM de " + Math.round(vam) + " m/h"
        : vamSource === "montee" ? "ta VAM de " + Math.round(vam) + " m/h, déduite de la montée que tu as déclarée"
        : "VAM estimée à " + Math.round(vam) + " m/h (repli prudent : " + (a.history || "confirme") + ", terrain " + (a.train_dplus_access || "collines") + ")")
      + " et ton allure seuil à plat, dégradées pour la durée · terrain " + tech.label
      + (tech.f > 1 ? " (+" + Math.round((tech.f - 1) * 100) + "%)" : "")
      + (nightF > 1 ? " · nuit (+" + Math.round((nightF - 1) * 100) + "%)" : ""),
  };
}

/** Parseur d'allure local (évite une dépendance circulaire avec constraintMatrix). */
function paceToSec(v: unknown): number {
  const m = String(v ?? "").trim().match(/^(\d{1,2})\s*[:h.'′]\s*(\d{1,2})\s*(?:\/\s*km)?$/);
  if (!m) return 0;
  const sec = +m[2];
  if (sec > 59) return 0;
  const t = +m[1] * 60 + sec;
  return t >= 120 && t <= 1200 ? t : 0;
}

/** Accès au dénivelé à l'entraînement : ce que le terrain permet RÉELLEMENT par sortie. */
export const TRAIL_ACCESS: Record<string, { perLongRun: number; perBlock: number; label: string }> = {
  montagne: { perLongRun: 2000, perBlock: 700, label: "montagne (>800m D+ accessibles)" },
  collines: { perLongRun: 800, perBlock: 300, label: "collines (200-800m D+)" },
  // T1b (audit v7) — `perBlock` : le D+ d'UN bloc, pas seulement de la semaine. La question
  // « quel dénivelé accessible depuis chez toi ? » est présentée comme la contrainte n°1 d'une
  // prépa trail ; elle modulait les cibles HEBDO mais pas le `dplusM` des blocs, et le plan
  // prescrivait 210 m de D+ par répétition à quelqu'un qui a déclaré vivre en terrain plat.
  // Sur du plat, on ne trouve qu'une butte : le bloc est court, et il faut le RÉPÉTER.
  plat: { perLongRun: 200, perBlock: 60, label: "plat (<200m D+)" },
};

/** Cible de D+/D− hebdomadaire au pic, bornée par la catégorie, l'historique ET le terrain. */
export function trailWeeklyVertical(obj: TrailObjective, history: string, access: string): {
  dplusPeak: number; dmoinsPeak: number; capped: boolean; accessCap: number;
} {
  const cap = T1_DPLUS_CAPS[obj.category][history] ?? T1_DPLUS_CAPS[obj.category].confirme;
  // Le besoin brut : ~2 à 3 fois le D+ de la course par semaine au pic pour un format court,
  // décroissant en part relative sur les ultras (où le temps devient le limiteur).
  const need = obj.category === "kv" || obj.category === "court" ? obj.dplusM * 2.2
    : obj.category === "long" ? obj.dplusM * 1.3
    : obj.category === "ultra" ? obj.dplusM * 0.9
    : obj.dplusM * 0.6;
  const acc = TRAIL_ACCESS[access] || TRAIL_ACCESS.collines;
  // 2 sorties vallonnées par semaine + le reste en côtes courtes : plafond réalisable
  const accessCap = Math.round(acc.perLongRun * 2.5);
  const dplusPeak = Math.round(Math.min(cap, need, accessCap));
  // Le D− suit le D+ (une montée se redescend) mais reste plafonné : sur un parcours
  // en boucle, D− = D+ ; on ne le programme jamais au-delà.
  const dmoinsPeak = Math.round(Math.min(dplusPeak, dplusPeak * (obj.dmoinsM / Math.max(1, obj.dplusM))));
  return { dplusPeak, dmoinsPeak, capped: Math.min(cap, need) > accessCap, accessCap };
}
