/**
 * Matrice de contraintes V2 — le savoir validé de Coach_Pro_V1.5, en DONNÉES avec provenance.
 *
 * Chaque constante règle-porteuse référence son identifiant du registre d'ARCHITECTURE.md
 * (C… / R3.…) : c'est le format {id, what, val, why} appliqué aux constantes du moteur.
 * Source de vérité : Coach_Pro_V1.5.html (486 combinaisons vertes à l'audit).
 */
import type { Sport, History } from "./types.ts";
import { ANSWER_SCHEMA } from "./answerSchema.ts";

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
  // R10 phase 2 — duathlon. Les tables détaillées vivent dans `src/sports/duathlon/tables.ts`
  // (avec leur provenance) ; ces entrées les REFLÈTENT pour les lectures génériques.
  duathlon: { S: 8, M: 12, L: 16, PM: 24 },
  swimrun: { experience: 10, sprint: 12, series: 20, championship: 30 },
  trail: {}, // pas de format : T6_MIN_WEEKS décide par catégorie d'effort déduite
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
  // R10 phase 2 — duathlon : entre la course pure et le triathlon court (deux disciplines,
  // mais un impact course doublé — le plafond horaire n'est pas ce qui limite, c'est l'appui).
  duathlon: {
    reprise: { S: 5, M: 7, L: 9, PM: 12 },
    confirme: { S: 7, M: 9, L: 11, PM: 15 },
    ancien: { S: 8, M: 11, L: 13, PM: 18 },
  },
  // R10 phase 3 — swimrun : la structure de référence des coachs tient en 7-12 h/sem ; au-delà
  // ce n'est plus la condition qui limite mais la logistique (eau libre, binôme, matériel).
  swimrun: {
    reprise: { experience: 5, sprint: 6, series: 8, championship: 9 },
    confirme: { experience: 7, sprint: 8, series: 11, championship: 12 },
    ancien: { experience: 8, sprint: 10, series: 13, championship: 15 },
  },
  trail: {}, // TRAIL_HISTORY_CAPS décide par catégorie d'effort
};

/** Heures UTILES par format — au-delà, le volume ne sert plus l'objectif. */
export const UTIL: Record<Sport, Record<string, number>> = {
  run: { "5k": 6, "10k": 7, semi: 9, marathon: 12, trail: 14 },
  bike: { crit: 9, route: 13, cyclo: 15, clm: 11, gravel: 20 },
  swim: { sprint: 6, demifond: 8, fond: 10, ow: 12 },
  tri: { S: 8, M: 11, "70.3": 14, Full: 18 },
  duathlon: { S: 8, M: 10, L: 13, PM: 17 },
  swimrun: { experience: 8, sprint: 10, series: 13, championship: 16 },
  trail: {}, // TRAIL_UTIL décide par catégorie
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
/** D3 (audit v6) — seuil DUR de l'auditeur sur les minutes livrées. C22 (+10%) est la
 * règle du GÉNÉRATEUR V2 (cible calée sur le livré) ; la tolérance jusqu'à +25% absorbe
 * la dérive des planchers de séance du produit V1.5 GELÉ, audité par le même scorer.
 * Les trois sites (générateur, texte affiché, auditeur) référencent désormais des
 * constantes nommées — plus jamais un littéral en dur qui diverge en silence. */
export const C22_AUDIT_HARD_JUMP = rule("C22-dur", "au-delà de +25% livré entre semaines de charge, violation dure quelle que soit la cause (V1.5 gelé compris)", 1.25);
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
/** D6 (audit v6) — le débutant a aussi un plancher : une séance piscine sous 600m ne vaut
 * pas le déplacement non plus. Fenêtre débutant résultante : [600m ; 850m] (C15). */
export const C24B_MIN_SWIM_SESSION_BEGINNER_M = rule("C24b", "une séance piscine débutant <600m ne vaut pas le déplacement — C20 promet ~25min/séance, le contenu doit suivre", 600);

/** Brick tri : bornes par format ; ×0.8 pour l'historique « reprise » (C21). */
export const CAP_BRICK_BIKE: Record<string, number> = { S: 90, M: 120, "70.3": 180, Full: 300, L: 150, PM: 300 };
export const CAP_BRICK_RUN: Record<string, number> = { S: 20, M: 24, "70.3": 32, Full: 70, L: 30, PM: 70 };
/**
 * Bornes du leg VÉLO d'un brick, par format — « jamais dépassées, même de peu » (spec audit 2).
 * Source unique : l'auditeur les lit ici (il en gardait une copie), et `blockBounds` cale son
 * PLANCHER dessus. Sans ça le générateur peut produire ce que l'auditeur interdit — c'est
 * arrivé en R10 phase 2 : les bornes duathlon inventées passaient sous le plancher audité.
 * Les formats duathlon S et M partagent les bornes du triathlon S et M : le segment vélo est
 * le même (20 km, 40 km). L et PM sont propres au duathlon.
 */
export const BRICK_BIKE_BOUNDS: Record<string, [number, number]> = rule(
  "C21b",
  "un brick d'entraînement n'est ni une sortie longue déguisée ni un tour de pâté de maisons : ses bornes suivent le format de course",
  { S: [45, 90], M: [60, 120], "70.3": [90, 180], Full: [150, 300], L: [70, 150], PM: [150, 300] },
);

/**
 * Plafond de DOSE par bloc de qualité (minutes dans la zone, répétitions comprises).
 * Ce n'est pas le nombre de répétitions qui blesse, c'est le temps passé dans la zone : le
 * plafond de reps seul laissait passer `5×14min` au seuil (70 min) parce que la mise à
 * l'échelle avait allongé la DURÉE et non le nombre de blocs.
 */
export const DOSE_CAP_MIN = rule(
  "C25",
  "au-delà de ~40 min de seuil ou ~25 min de VO2max dans une séance, ce n'est plus un entraînement dur mais une course : personne ne l'enchaîne semaine après semaine sans casser",
  { thr: 40, vo2: 25 },
);

export const C21_REPRISE_BRICK_FACTOR = rule("C21", "en reprise, le brick ne mange pas la semaine (61% du volume hebdo observé sans ce facteur)", 0.8);

/** Plafonds de séance longue / nage par format (R3.4b), et budget implicite du volume. */
export const CAP_LONG: Record<string, number> = { "5k": 74, "10k": 90, semi: 130, marathon: 180, trail: 255, crit: 150, route: 180, clm: 165, cyclo: 240, gravel: 360 };
export const CAP_SWIM: Record<string, number> = { sprint: 1400, demifond: 2000, fond: 3000, ow: 4500, S: 750, M: 1500, "70.3": 1900, Full: 3000 };
export const AVG_SESSION_H: Partial<Record<Sport, number>> = { run: 1.15, bike: 1.3, tri: 1.2 };

/** C13 — l'échauffement chiffré ne dépasse jamais 25min ni le corps de séance. */
export const C13_WARMUP_MAX_MIN = rule("C13", "échauffement ≤25min et ≤ corps de séance", 25);
/**
 * C13c — PLANCHER d'échauffement : 10 min, quelle que soit la taille de la séance.
 *
 * Le plancher était de 3 min, et la clause de proportion (`≤ 0,8 × corps`) l'y ramenait dès que
 * la courbe réduisait la séance : mesuré sur 9 795 séances, **1 213 séances de QUALITÉ
 * s'échauffaient moins de 10 min, dont 663 moins de 5 min** — un 3×1000 m au seuil précédé de
 * trois minutes de footing. Physiologiquement, la montée de température musculaire, l'ouverture
 * vasculaire et la cinétique de VO2 demandent une dizaine de minutes ; en dessous, le premier
 * intervalle sert d'échauffement et se paie en risque tendineux. La priorité n°2 du manifeste
 * (prévention des blessures) prime sur la proportion : on ne rabote pas un échauffement pour
 * faire tenir une séance dans une enveloppe.
 *
 * Conséquence assumée et TRAITÉE : sous une certaine enveloppe, une séance de qualité ne tient
 * plus (10 min d'échauffement + une dose utile + 3 min de retour au calme). Elle n'est pas
 * rabotée — elle est DÉCLASSÉE en séance facile (C13d, weekBuilder) : mieux vaut un footing
 * assumé qu'une VO2max mal échauffée.
 */
export const C13c_WARMUP_MIN_MIN = rule("C13c", "échauffement ≥10min sur toute séance qui en porte un", 10);
/**
 * C27 — LA VEILLE D'UNE COURSE NE DÉPASSE PAS 45 MIN, ET ELLE EST FACILE.
 *
 * Mesuré : la veille d'une course intermédiaire portait la PLUS LONGUE séance de la semaine sur
 * les quatre sports testés — 4 h 30 de trail, 3 h 56 de vélo, 3 h 23 de brick. La course était
 * insérée dans un calendrier déjà construit, sans que les jours voisins soient replanifiés.
 * 45 minutes souples, quelques accélérations courtes : c'est ce que fait un entraîneur la
 * veille, et c'est le seul contenu qui ne coûte rien le lendemain.
 */
// R13.4 — 45 min la veille n'était pas un déverrouillage, c'était une séance pleine (mesuré :
// 48 min la veille d'un Ironman, 63 la veille d'un 70.3). Un déverrouillage se joue à
// 15-25 min : échauffement + trois accélérations — réveiller, jamais entamer.
export const RACE_EVE_CAP_MIN = rule("C27", "la veille d'une course : ≤25 min — un déverrouillage réveille les jambes (échauffement + 3 accélérations), une séance pleine les entame", 25);

/**
 * C26 — LE PLANCHER DE TEMPS FACILE DÉPEND DU VOLUME, PARCE QUE 80/20 EN EST UNE CONSÉQUENCE.
 *
 * La justification, écrite avant de regarder quelles combinaisons passent.
 *
 * La répartition ~80/20 est une OBSERVATION faite sur des athlètes d'endurance de haut niveau
 * s'entraînant 10 à 25 h par semaine (Seiler, Esteve-Lanao, Stöggl & Sperlich). Son mécanisme
 * est explicite : à ce volume, ce qui limite l'adaptation est la capacité de RÉCUPÉRATION, et
 * le temps passé en intensité en est le premier consommateur. La proportion de 80 % de facile
 * n'est donc pas une loi : c'est ce qu'on obtient mécaniquement quand on plafonne le travail
 * dur à ce qu'un organisme absorbe — environ deux séances et une heure par semaine — et qu'on
 * remplit le reste d'un volume important.
 *
 * En dessous de ce volume, le facteur limitant s'inverse. Un athlète à 3 h par semaine récupère
 * complètement entre ses séances ; ce qui limite son progrès n'est plus la récupération mais le
 * STIMULUS TOTAL. Lui imposer 80 % de facile laisse 35 minutes de qualité hebdomadaire, moins
 * que ce qu'il faut pour seulement MAINTENIR la puissance aérobie maximale. Le seuil de 70 %,
 * appliqué tel quel à une petite enveloppe, protège donc contre un risque qui n'existe pas et
 * dégrade le plan qu'il prétend garder sain.
 *
 * La règle physiologiquement vraie est donc le PLAFOND DE TEMPS DUR (≈60 min/semaine, deux à
 * trois séances) ; la part de facile en est la conséquence arithmétique. On l'énonce dans ce
 * sens : `plancher_facile = 1 − 60 / minutes_hebdo`, borné à [60 %, 70 %].
 *   · 10 h/sem → 1 − 60/600 = 90 % … borné à 70 % : la règle historique, inchangée.
 *   ·  6 h/sem → 1 − 60/360 = 83 % … borné à 70 % : inchangée aussi.
 *   ·  3 h/sem → 1 − 60/180 = 67 % : le plan a droit à une heure de qualité, comme les autres.
 * Le plancher absolu de 60 % reste : en dessous, ce n'est plus une préparation d'endurance.
 *
 * Ce n'est PAS un seuil ajusté à ses contre-exemples : le plafond de 60 min de travail dur est
 * la grandeur physiologique, et elle est identique pour tout le monde. C'est le pourcentage,
 * grandeur dérivée, qui varie — comme il l'a toujours fait dans la littérature.
 */
export const C26_HARD_TIME_CAP_MIN = rule("C26", "le facteur limitant est le temps DUR hebdomadaire (~60 min), pas son pourcentage : la part de facile en découle", 60);
export const C26_EASY_SHARE_MAX = 0.70;
export const C26_EASY_SHARE_MIN = 0.60;
/**
 * C26b — LES 60 MINUTES NE SONT PAS LES MÊMES POUR TOUT LE MONDE.
 *
 * Le raisonnement de C26 tient : le plafond de temps DUR est la grandeur physiologique, la part
 * de facile en est la dérivée. Mais la constante, elle, décrit une capacité de RÉCUPÉRATION
 * CENTRALE — cardiaque, métabolique, nerveuse — et ce n'est pas ce qui limite tout le monde.
 *
 * Chez un athlète qui reprend, ou qui débute, le facteur limitant est le TISSU CONJONCTIF :
 * tendons, aponévroses, os. Il se remodèle sur des semaines à des mois, bien plus lentement que
 * la filière aérobie, et il ne prévient pas — la tendinopathie arrive après la séance qui s'est
 * bien passée. C'est précisément le profil de la V1 grand public, et c'est là que 48 minutes de
 * qualité hebdomadaire sur une enveloppe de 2 h deviennent dangereuses : la borne basse de 60 %
 * les autorisait.
 *
 * Une blessure déclarée dit la même chose, en plus fort et au présent.
 *
 * On module donc la CONSTANTE, pas le raisonnement — c'est ce que l'audit demandait.
 */
export const C26b_HARD_TIME_BY_HISTORY: Record<string, number> = rule(
  "C26b",
  "le plafond de temps dur suit ce qui limite VRAIMENT : récupération centrale chez l'entraîné, tissu conjonctif chez celui qui reprend",
  { reprise: 35, confirme: 60, ancien: 60 },
);
export const C26b_HARD_TIME_BEGINNER_MIN = rule("C26b-deb", "un débutant construit son tissu conjonctif avant sa puissance : la qualité reste marginale", 25);
export const C26b_INJURY_FACTOR = rule("C26b-bless", "une blessure déclarée dit au présent ce que l'historique dit au passé", 0.6);

export interface EasyFloorCtx {
  history?: string;
  level?: string;
  injured?: boolean;
}
/** Plafond de temps DUR hebdomadaire pour ce profil (C26 + C26b). */
export function hardTimeCapMin(ctx?: EasyFloorCtx): number {
  let cap = C26b_HARD_TIME_BY_HISTORY[ctx?.history || "confirme"] ?? C26_HARD_TIME_CAP_MIN;
  if (ctx?.level === "debutant") cap = Math.min(cap, C26b_HARD_TIME_BEGINNER_MIN);
  if (ctx?.injured) cap = Math.round(cap * C26b_INJURY_FACTOR);
  return cap;
}
export function easyShareFloor(weeklyMin: number, ctx?: EasyFloorCtx): number {
  if (!(weeklyMin > 0)) return C26_EASY_SHARE_MAX;
  const derived = 1 - hardTimeCapMin(ctx) / weeklyMin;
  return Math.min(C26_EASY_SHARE_MAX, Math.max(C26_EASY_SHARE_MIN, derived));
}

/**
 * C25 — UNE SÉANCE DE RÉCUPÉRATION RESTE COURTE : 60 min, plafond dur.
 *
 * Le modèle de séance est nommé à la SÉLECTION, puis la mise à l'échelle allonge sa durée pour
 * remplir l'enveloppe — sans jamais renommer ni requalifier. Mesuré : « Nage récup courte » de
 * 196 min et 9 025 m, « Récup active » de 134 min, « Footing récup » de 98 min. Un athlète qui
 * lit « récup courte » et trouve 9 kilomètres ne fera plus jamais confiance à un libellé, et
 * c'est le libellé qui porte l'intention pédagogique de toute l'application.
 *
 * Une heure est la borne haute de ce qu'un entraîneur appelle une récupération : au-delà, le
 * volume lui-même devient une charge, ce qui est exactement l'inverse du but de la séance.
 * Le déversement de volume va vers les séances d'ENDURANCE, jamais vers la récupération.
 */
export const C25_RECOVERY_SESSION_CAP_MIN = rule("C25", "une séance dont l'intention est la récupération ne dépasse pas 60 min", 60);

/**
 * C13e — L'ÉCHAUFFEMENT N'EST JAMAIS PLUS LONG QUE LE CORPS DE SÉANCE. Invariant DUR, sur les
 * six sports et dans les deux unités (minutes en course/vélo/trail, mètres en bassin). Une
 * séance dont l'échauffement pèse plus que le travail n'est pas une séance : c'est un footing
 * qui porte l'étiquette d'une autre chose, et l'athlète qui la lit ne peut plus se fier au nom.
 * C'est cette borne qui arbitre contre C13c : le plancher de 10 min est un OBJECTIF
 * physiologique, pas une autorisation à déséquilibrer la séance. Quand les deux se contredisent,
 * ce n'est pas le rendu qui gonfle l'échauffement — c'est C13d qui restructure la séance.
 */
export const C13e_WARMUP_NEVER_OVER_BODY = rule("C13e", "échauffement ≤ corps de séance, toujours", true);
/**
 * C13d — DOSE MINIMALE D'UNE SÉANCE DE QUALITÉ : 8 min de travail. En dessous, la séance ne
 * mérite plus son nom (l'échauffement et le retour au calme y pèsent plus que le travail) et le
 * créneau devient de l'endurance continue plutôt qu'une caricature de séance dure.
 *
 * Ce seuil n'est délibérément PAS aligné sur le plancher d'échauffement C13c, et l'écart de
 * deux minutes est le résultat d'une mesure. Les aligner à 10 min paraissait plus propre — un
 * échauffement de 10 min tient alors toujours sans dépasser le corps — mais sur une petite
 * enveloppe (swimrun à 4 h/sem) TOUTES les séances de qualité passaient sous le seuil : le plan
 * perdait son unique stimulus VO2 sur 41 semaines (`S-NOVO2`, banc v7). Un plan petit reste un
 * plan : il garde sa qualité. Entre 8 et 10 min de corps, c'est donc C13e qui arbitre —
 * l'échauffement s'aligne sur le corps au lieu de le dépasser.
 */
export const C13d_QUALITY_MIN_BODY_MIN = rule("C13d", "dose de qualité ≥8min de travail, sinon la séance est déclassée", 8);

/** E1/E2 (audit v6) — PARSEUR D'ALLURE UNIQUE. Il y en avait deux : un strict et ancré
 * (moteur, alimente les zones du plan) et un laxiste (bridge, alimente la prédiction) —
 * écrire « 4:50/km » donnait donc une prédiction juste et un plan en fréquence cardiaque,
 * sans que rien ne le signale. Et « 4'50 » était refusé par les deux… alors que c'est la
 * notation que l'app utilise elle-même pour AFFICHER les allures.
 * Tolérant en entrée (4:50 · 4'50 · 4′50 · 4.50 · 4h50 · 04:50 · « 4:50/km » · espaces),
 * strict en validation (secondes < 60, bornes de plausibilité). Renvoie 0 si invalide. */
export function parsePaceSec(v: unknown, kind: "run" | "swim" = "run"): number {
  const m = String(v ?? "").trim().match(/^(\d{1,2})\s*[:h.'′]\s*(\d{1,2})\s*(?:\/\s*(?:km|100\s*m))?$/);
  if (!m) return 0;
  const min = +m[1], sec = +m[2];
  if (sec > 59) return 0;
  const total = min * 60 + sec;
  // course : 2:00 → 20:00 par km · natation : 1:00 → 5:00 par 100m
  const [lo, hi] = kind === "swim" ? [60, 300] : [120, 1200];
  return total >= lo && total <= hi ? total : 0;
}

/** E3 (audit v6) — bornes de plausibilité physiologique : hors bornes, la valeur est
 * traitée comme NON RENSEIGNÉE (repli zones cardio/ressenti) + avertissement nommé —
 * jamais une zone négative ou absurde à l'écran (l'attribut HTML min n'est pas une validation).
 *
 * R13.1 — UNE SEULE SOURCE DE BORNES. Cette table portait ses propres littéraux à côté
 * d'`ANSWER_SCHEMA` : deux domaines pour la même grandeur, et les extrêmes passaient ENTRE les
 * deux. Mesuré : le schéma accepte un âge de 10 à 100, cette table n'en croyait que 14 à 95 —
 * `boundedOrZero("age", 12)` rendait 0, le prédicat `minor` devenait faux, et un enfant de
 * 10 ans recevait le plan adulte complet, VO2max comprises, sans un mot. Un athlète de 98 ans
 * aussi, avec la FCmax d'un homme de 35 ans (le repli d'âge). Cinq clés divergeaient (âge,
 * poids, taille, FCmax, FTP) — l'en-tête de R11 l'avait écrit : « une énumération écrite deux
 * fois est une énumération qui divergera ». Toute clé présente dans le schéma DÉRIVE désormais
 * ses bornes de lui ; si une borne physio doit être plus stricte, c'est LE SCHÉMA qu'on change.
 * Seul `hrRest` (absent du questionnaire) garde une borne locale. */
function schemaBound(key: string, unit: string): { min: number; max: number; unit: string } {
  const f = ANSWER_SCHEMA[key] as { min?: number; max?: number } | undefined;
  if (!f || f.min == null || f.max == null)
    throw new Error("PHYSIO_BOUNDS : la clé « " + key + " » n'existe pas (ou n'est pas numérique) dans ANSWER_SCHEMA — la borne doit vivre dans le schéma, pas ici");
  return { min: f.min, max: f.max, unit };
}
// Accesseurs PARESSEUX : `answerSchema` et ce module s'importent mutuellement, et selon le
// point d'entrée du cycle, `ANSWER_SCHEMA` n'existe pas encore quand cette table s'initialise
// (mesuré : TDZ en important `answerSchema` en premier). La dérivation se fait donc à la
// LECTURE, jamais à l'initialisation — les deux modules sont toujours prêts à ce moment-là.
export const PHYSIO_BOUNDS: Record<string, { min: number; max: number; unit: string }> = rule(
  "E3",
  "une FTP de -100W ou de 9999W produit des zones absurdes affichées sans bruit : hors bornes = non renseigné + avertissement ; bornes DÉRIVÉES d'ANSWER_SCHEMA (R13.1 : deux tables = une zone morte entre les deux)",
  {
    get ftp() { return schemaBound("ftp", "W"); },
    get hrMax() { return schemaBound("hr_max", "bpm"); },
    hrRest: { min: 30, max: 100, unit: "bpm" }, // absent du schéma : borne locale assumée
    get weight() { return schemaBound("weight", "kg"); },
    get height() { return schemaBound("height", "cm"); },
    get age() { return schemaBound("age", "ans"); },
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
    // R10 phase 2 — « course » (zone fragile déclarée en multi-discipline : tri, duathlon)
    // COMPTE comme une blessure d'impact. Elle ne l'était que dans `impactAny` (renfo/plio) :
    // le plafond de jours d'appui, qui lit `impact`, l'ignorait donc — un duathlète déclarant
    // « ça tire quand je cours » recevait autant d'appuis qu'un athlète sain.
    impact: list.some((x) => ["tibia", "genou", "pied", "hanche", "course"].includes(x)),
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
  "une séance de force basse cadence en affûtage (même fatigue résiduelle que la VO2max)",
  "une sortie piscine de 600m (non-débutant)",
  "une sortie longue CAP de 3h pour un débutant",
  "une séance dont l'objectif n'est pas expliqué",
];
