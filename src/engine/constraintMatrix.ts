/**
 * Matrice de contraintes V2 — le savoir validé de Coach_Pro_V1.5, en DONNÉES avec provenance.
 *
 * Chaque constante règle-porteuse référence son identifiant du registre d'ARCHITECTURE.md
 * (C… / R3.…) : c'est le format {id, what, val, why} appliqué aux constantes du moteur.
 * Source de vérité : Coach_Pro_V1.5.html (486 combinaisons vertes à l'audit).
 */
import type { Sport, History } from "./types.ts";

export interface Provenance {
  id: string;
  why: string;
  source: string;
}
const SRC = "Coach_Pro_V1.5.html (audit 486/486 vert)";
export const PROVENANCE: Provenance[] = [];
function rule<T>(id: string, why: string, value: T): T {
  PROVENANCE.push({ id, why, source: SRC });
  return value;
}

/** Semaines minimales de préparation par format. */
export const MIN_WEEKS: Record<Sport, Record<string, number>> = {
  tri: { S: 8, M: 12, "70.3": 20, Full: 36 },
  run: { "5k": 6, "10k": 8, semi: 12, marathon: 16, trail: 18 },
  bike: { crit: 8, route: 12, cyclo: 14, clm: 10, gravel: 16 },
  swim: { sprint: 8, demifond: 10, fond: 12, ow: 14 },
};

/** Plafond d'heures hebdo par historique — ce que l'athlète peut ENCAISSER. */
export const HISTORY_CAPS: Record<Sport, Record<History, Record<string, number>>> = {
  run: {
    reprise: { "5k": 4, "10k": 5, semi: 6, marathon: 8, trail: 9 },
    confirme: { "5k": 5, "10k": 6, semi: 8, marathon: 10, trail: 12 },
    ancien: { "5k": 6, "10k": 7, semi: 9, marathon: 12, trail: 14 },
  },
  bike: {
    reprise: { crit: 6, route: 9, cyclo: 11, clm: 8, gravel: 13 },
    confirme: { crit: 8, route: 12, cyclo: 15, clm: 11, gravel: 17 },
    ancien: { crit: 10, route: 15, cyclo: 18, clm: 13, gravel: 22 },
  },
  swim: {
    reprise: { sprint: 3, demifond: 4, fond: 5, ow: 6 },
    confirme: { sprint: 5, demifond: 6, fond: 7, ow: 9 },
    ancien: { sprint: 6, demifond: 8, fond: 10, ow: 12 },
  },
  tri: {
    reprise: { S: 6, M: 8, "70.3": 11, Full: 15 },
    confirme: { S: 7, M: 10, "70.3": 13, Full: 17 },
    ancien: { S: 8, M: 12, "70.3": 15, Full: 19 },
  },
};

/** Heures UTILES par format — au-delà, le volume ne sert plus l'objectif. */
export const UTIL: Record<Sport, Record<string, number>> = {
  run: { "5k": 6, "10k": 7, semi: 9, marathon: 12, trail: 14 },
  bike: { crit: 9, route: 13, cyclo: 15, clm: 11, gravel: 20 },
  swim: { sprint: 6, demifond: 8, fond: 10, ow: 12 },
  tri: { S: 8, M: 11, "70.3": 14, Full: 18 },
};

/** Marge de sécurité : 10% retenus sauf intention compétition (assumé). */
export const MARGIN = { competition: 1.0, autres: 0.9 };

/** 1B — indicateurs de récupération : sommeil court −15%, charge de vie lourde −10%. */
export const RECUP_FACTORS = rule("1B", "les indicateurs de récup promis par evalRules agissent réellement sur le contenu", {
  sleepCourt: 0.85,
  lifeLourde: 0.9,
});

/** Répartition des phases (base→affûtage). C19 : peak ≥ 1 semaine, toujours. */
export const PHASE_PCTS = [
  { id: "base" as const, nom: "Base", pct: 0.3, c: "#00b8d9" },
  { id: "dev" as const, nom: "Développement", pct: 0.25, c: "#9b72ff" },
  { id: "spec" as const, nom: "Spécifique", pct: 0.2, c: "#f0b429" },
  { id: "peak" as const, nom: "Peak", pct: 0.15, c: "#e63946" },
  { id: "taper" as const, nom: "Affûtage", pct: 0.1, c: "#00a376" },
];
export const C19_PEAK_MIN_WEEKS = rule("C19", "un plan a toujours ≥1 semaine de peak (les arrondis vidaient le peak des plans courts)", 1);

/** Courbe de charge normalisée par phase — taper strictement décroissant (pilote R3.3). */
export const BANDS: Record<string, [number, number]> = {
  base: [0.5, 0.68],
  dev: [0.68, 0.92],
  spec: [0.94, 1.0],
  peak: [1.0, 1.0],
  taper: [0.55, 0.3],
};
export const C22_MAX_WEEKLY_GROWTH = rule("C22", "progression lissée : jamais +10% d'une semaine de charge à la suivante (manifeste)", 1.1);
export const RECUP_WEEK_FACTOR = 0.62;

/** R3.13 — affûtage : si les planchers bloquent, la fréquence cède sous ce ratio du pic réel. */
export const R313_TAPER_MAX_VS_PEAK = rule("R3.13", "réduction d'affûtage ≥40% garantie même quand les planchers de séance bloquent le scaling", 0.55);

/** Cadence des semaines de récupération. */
export const RECUP_EVERY: Record<History, number> = { reprise: 3, confirme: 4, ancien: 4 };

/** Nage débutant : la technique borne tout. */
export const C15_BEGINNER_SWIM_SESSION_CAP_M = rule("C15", "nage débutant ≤850m/séance, tous blocs confondus (technique avant volume, risque épaule)", 850);
export const C20_BEGINNER_SWIM_H_PER_SESSION = rule("C20", "la promesse déclarée d'un nageur débutant suit sa capacité C15 (~25min/séance)", 0.42);
export const BEGINNER_SWIM_VOLPEAK_CAP_H = 4;
export const SWIM_TIME_FACTOR = 0.4; // heures « génériques » → heures réelles de nage

/** Course : plafonds. */
export const C23_BEGINNER_LONG_RUN_CAP_MIN = rule("C23", "jamais de sortie longue CAP >3h pour un débutant (manifeste)", 180);
export const MAX_RUN_DAYS: Record<History, number> = { reprise: 4, confirme: 5, ancien: 6 };

/** Natation non-débutant : une séance piscine <750m ne vaut pas le déplacement (manifeste). */
export const C24_MIN_SWIM_SESSION_M = rule("C24", "piscine ≥750m par séance pour un non-débutant (manifeste : « sortie piscine de 600m » interdite)", 750);

/** Brick tri : bornes par format ; ×0.8 pour l'historique « reprise » (C21). */
export const CAP_BRICK_BIKE: Record<string, number> = { S: 90, M: 120, "70.3": 180, Full: 300 };
export const CAP_BRICK_RUN: Record<string, number> = { S: 20, M: 24, "70.3": 32, Full: 70 };
export const C21_REPRISE_BRICK_FACTOR = rule("C21", "en reprise, le brick ne mange pas la semaine (61% du volume hebdo observé sans ce facteur)", 0.8);

/** Plafonds de séance longue / nage par format (R3.4b), et budget implicite du volume. */
export const CAP_LONG: Record<string, number> = { "5k": 74, "10k": 90, semi: 130, marathon: 180, trail: 255, crit: 150, route: 180, clm: 165, cyclo: 240, gravel: 360 };
export const CAP_SWIM: Record<string, number> = { sprint: 1400, demifond: 2000, fond: 3000, ow: 4500, S: 750, M: 1500, "70.3": 1900, Full: 3000 };
export const AVG_SESSION_H: Partial<Record<Sport, number>> = { run: 1.15, bike: 1.3, tri: 1.2 };

/** C13 — l'échauffement chiffré ne dépasse jamais 25min ni le corps de séance. */
export const C13_WARMUP_MAX_MIN = rule("C13", "échauffement ≤25min et ≤ corps de séance", 25);

/** E3 (audit v6) — bornes de plausibilité physiologique : hors bornes, la valeur est
 * traitée comme NON RENSEIGNÉE (repli zones cardio/ressenti) + avertissement nommé —
 * jamais une zone négative ou absurde à l'écran (l'attribut HTML min n'est pas une validation). */
export const PHYSIO_BOUNDS: Record<string, { min: number; max: number; unit: string }> = rule(
  "E3",
  "une FTP de -100W ou de 9999W produit des zones absurdes affichées sans bruit : hors bornes = non renseigné + avertissement",
  {
    ftp: { min: 60, max: 600, unit: "W" },
    hrMax: { min: 120, max: 220, unit: "bpm" },
    hrRest: { min: 30, max: 100, unit: "bpm" },
    weight: { min: 35, max: 200, unit: "kg" },
    height: { min: 120, max: 230, unit: "cm" },
    age: { min: 14, max: 95, unit: "ans" },
  },
);
export function boundedOrZero(key: keyof typeof PHYSIO_BOUNDS & string, v: number): number {
  const b = PHYSIO_BOUNDS[key];
  return Number.isFinite(v) && v >= b.min && v <= b.max ? v : 0;
}

/** R6.1 — contre-indications par localisation de douleur : une douleur de charge se
 * traite en RETIRANT la contrainte (changer de discipline), pas en la réduisant. */
export interface PainContra { forbid: string[]; prefer: string[] }
export const R6_PAIN_CONTRAINDICATION: Record<string, PainContra> = rule(
  "R6.1",
  "une douleur de charge se traite en retirant la contrainte, pas en la réduisant : chaque localisation interdit la ou les disciplines qui la sollicitent",
  {
    tibia: { forbid: ["rn"], prefer: ["sw", "bk"] },
    genou: { forbid: ["rn", "bk"], prefer: ["sw"] },
    pied: { forbid: ["rn"], prefer: ["sw", "bk"] },
    hanche: { forbid: ["rn"], prefer: ["sw", "bk"] },
    course: { forbid: ["rn"], prefer: ["sw", "bk"] },
    epaule: { forbid: ["sw"], prefer: ["bk", "rn"] },
    dos: { forbid: ["bk"], prefer: ["sw"] },
    cou: { forbid: ["sw", "bk"], prefer: ["rn"] },
  },
);

/** R6.2 — une blessure déclarée réduit le plafond de volume (l'étape « Historique &
 * blessures » promet « une blessure décide quoi adapter » — le volume en fait partie). */
export const R6_INJURY_LOAD_FACTORS = rule(
  "R6.2",
  "une blessure déclarée réduit le plafond de volume ; plusieurs zones fragiles → approche ultra-conservatrice (c'est la carte de règle affichée à l'athlète)",
  { une: 0.9, multiples: 0.8 },
);

/** R6.3 (audit v6, A7) — l'âge module la charge : l'avertissement affiché au Profil
 * (« en dessous de 18 ans, la charge doit être encadrée ») s'applique, pas seulement
 * s'affiche ; au-delà de 60 ans la récupération se rallonge. */
export const R6_AGE_LOAD = rule(
  "R6.3",
  "l'avertissement mineur affiché au Profil doit agir sur le plan (volume -30%, zéro VO2max) ; master 60+ : volume -15% et récupération toutes les 3 semaines",
  {
    mineur: { maxAge: 17, volFactor: 0.7, allowVo2: false },
    master: { minAge: 60, volFactor: 0.85, recupEvery: 3 },
  },
);

/** Lecture UNIQUE des blessures (audit v6 B1a : le motif était dupliqué 4 fois avec des
 * ensembles légèrement différents — un booléen écrasait les localisations). */
export interface InjuryInfo {
  list: string[];
  count: number;
  /** blessure d'impact course (tibia/genou/pied/hanche — ensemble historique V1.5) */
  impact: boolean;
  /** idem + « course » générique (utilisé par les gammes/plyo) */
  impactAny: boolean;
  shoulder: boolean;
  lumbar: boolean;
  cervical: boolean;
}
export function readInjuries(raw: unknown): InjuryInfo {
  const list = (Array.isArray(raw) ? raw.join(",") : String(raw ?? ""))
    .split(",").map((s) => s.trim()).filter((x) => x && x !== "aucune");
  return {
    list,
    count: list.length,
    impact: list.some((x) => ["tibia", "genou", "pied", "hanche"].includes(x)),
    impactAny: list.some((x) => ["tibia", "genou", "pied", "hanche", "course"].includes(x)),
    shoulder: list.includes("epaule"),
    lumbar: list.includes("dos"),
    cervical: list.includes("cou"),
  };
}

/** Interdictions du manifeste — vérifiées par l'auditeur, rappelées ici pour le générateur. */
export const FORBIDDEN = [
  "deux longues sorties CAP consécutives",
  "deux jours durs adjacents",
  "une semaine de récupération plus chargée que la précédente",
  "une progression de volume >+10% entre semaines de charge",
  "une séance VO2max en affûtage",
  "une sortie piscine de 600m (non-débutant)",
  "une sortie longue CAP de 3h pour un débutant",
  "une séance dont l'objectif n'est pas expliqué",
];
