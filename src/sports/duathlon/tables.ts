/**
 * Constantes DUATHLON avec provenance (spec R10 phase 2, §R10.2.1 et §R10.2.4).
 *
 * Distances officielles ITU/World Triathlon pour les formats S et M ; L et Powerman suivent les
 * usages des organisateurs (les distances longues ne sont pas normalisées aussi strictement).
 * Les bornes de séance (`lo`/`hi`) sont des MINUTES de brick, pas les distances de course :
 * elles suivent la même logique que le tri (C21) — un brick d'entraînement n'est pas une course.
 */

/** Segment R1 : distance de course et bornes de brick (min). */
export const DUA_RUN1: Record<string, { km: number; lo: number; hi: number }> = {
  S: { km: 5, lo: 6, hi: 12 },
  M: { km: 10, lo: 8, hi: 18 },
  L: { km: 14, lo: 10, hi: 22 },
  PM: { km: 10, lo: 10, hi: 20 }, // Powerman : R1 court pour un vélo très long
};

/** Segment vélo : distance et bornes de brick (min). */
/** Segment vélo : distance et bornes de brick (min) — ALIGNÉES sur `BRICK_BIKE_BOUNDS`
 *  (spec audit 2). Un vélo de duathlon S fait 20 km, exactement comme un tri S : ses bornes
 *  auditées s'appliquent tel quel. Inventer d'autres chiffres ici produisait des bricks que
 *  l'auditeur refusait — 12 violations dures mesurées avant correction. */
export const DUA_BIKE: Record<string, { km: number; lo: number; hi: number }> = {
  S: { km: 20, lo: 45, hi: 90 },
  M: { km: 40, lo: 60, hi: 120 },
  L: { km: 60, lo: 70, hi: 150 },
  PM: { km: 150, lo: 150, hi: 300 },
};

/**
 * Segment R2 : distance, bornes de brick, et facteur de fatigue post-vélo.
 * Le facteur reprend l'échelle validée du tri (`TRI_RUN.fatigue`) : plus le vélo est long,
 * plus le R2 est dégradé. Un R2 de duathlon est proportionnellement plus court et plus intense
 * que la CAP d'un triathlon de durée comparable — d'où des facteurs légèrement plus cléments
 * sur les formats courts (on lutte 2,5 km, on ne gère pas 21 km).
 */
export const DUA_RUN2: Record<string, { km: number; lo: number; hi: number; fatigue: number }> = {
  S: { km: 2.5, lo: 6, hi: 12, fatigue: 1.04 },
  M: { km: 5, lo: 8, hi: 16, fatigue: 1.06 },
  L: { km: 7, lo: 10, hi: 20, fatigue: 1.08 },
  PM: { km: 30, lo: 25, hi: 55, fatigue: 1.12 },
};

/**
 * §R10.2.4 — LE FACTEUR QUE LE TRI N'A JAMAIS EU : la pré-fatigue du R1 dégrade la puissance
 * vélo tenable. Le triathlon n'a jamais eu besoin de ce sens-là (on y arrive sur le vélo après
 * une natation, qui sollicite peu les jambes) ; en duathlon, on y arrive après une course.
 * Plus le R1 pèse lourd dans l'épreuve, plus la ponction est marquée.
 */
export const DUA_BIKE_PREFATIGUE: Record<string, number> = {
  S: 0.98, // 5 km avant 20 km de vélo : ponction faible
  M: 0.96, // 10 km avant 40 : le classique, ~4% de puissance en moins
  L: 0.95,
  PM: 0.93, // 10 km avant 150 km : la gestion prime, la puissance cible descend
};

/**
 * Bande de puissance vélo cible, en fraction de FTP (facteurs Coggan, même échelle que la route
 * et le tri). À NE PAS confondre avec les bornes de brick ci-dessus, qui sont des MINUTES : un
 * segment vélo de duathlon se roule plus fort qu'un vélo de triathlon de durée comparable
 * (aucune natation avant, et une seule course à préserver derrière — plus courte qu'en tri).
 * Le facteur de pré-fatigue (`DUA_BIKE_PREFATIGUE`) s'applique PAR-DESSUS.
 */
export const DUA_BIKE_POWER: Record<string, { lo: number; hi: number }> = {
  S: { lo: 0.88, hi: 0.95 }, // ~30min d'effort : proche du seuil
  M: { lo: 0.85, hi: 0.92 },
  L: { lo: 0.82, hi: 0.88 },
  PM: { lo: 0.72, hi: 0.80 }, // 150 km : la gestion prime, on descend nettement
};

/** Durée de préparation minimale par format (§R10.2.1). */
export const DUA_MIN_WEEKS: Record<string, number> = { S: 8, M: 12, L: 16, PM: 24 };

/** Plafonds horaires par historique (h/sem au pic) — entre la course et le triathlon court. */
export const DUA_HISTORY_CAPS: Record<string, Record<string, number>> = {
  reprise: { S: 5, M: 7, L: 9, PM: 12 },
  confirme: { S: 7, M: 9, L: 11, PM: 15 },
  ancien: { S: 8, M: 11, L: 13, PM: 18 },
};

/** Heures UTILES par format — au-delà, le volume ne sert plus l'objectif. */
export const DUA_UTIL: Record<string, number> = { S: 8, M: 10, L: 13, PM: 17 };

/**
 * PW — TRANSITIONS DU DUATHLON (secondes). Plus courtes qu'en triathlon, et pour une raison
 * concrète : il n'y a pas de combinaison à quitter ni de sac de nage à gérer. T1 = chausser,
 * casque, partir ; T2 = poser le vélo, changer de chaussures. Médianes d'âge-groupe, pas des
 * optima — un athlète rodé fait deux fois plus vite, un premier Powerman fait plus long.
 */
export const DUA_TRANSITION: Record<string, { t1: number; t2: number }> = {
  S: { t1: 60, t2: 45 },
  M: { t1: 75, t2: 60 },
  L: { t1: 90, t2: 75 },
  PM: { t1: 150, t2: 120 },
};
