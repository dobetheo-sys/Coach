/**
 * Constantes SWIMRUN avec provenance (spec R10 phase 3).
 *
 * DÉCISION D'ARCHITECTURE (§R10.3) : le swimrun n'est pas un triathlon sans vélo, c'est un
 * cousin du TRAIL. Distances non standardisées, volume en TEMPS, terrain comme variable
 * première, matériel structurant, prédiction par fourchette large assumée. Ce fichier suit donc
 * le modèle de `trailModel.ts` (constantes nommées, chacune avec son pourquoi), pas celui du tri.
 *
 * Deux nouveautés que ni le trail ni le tri ne couvrent : le BINÔME (le profil cesse d'être
 * individuel) et les RÉFÉRENCES EN TENUE (les refs de bassin/route deviennent des estimations
 * de repli).
 */
export interface Prov { id: string; why: string }
export const SWIMRUN_PROVENANCE: Prov[] = [];
function srule<T>(id: string, why: string, value: T): T {
  SWIMRUN_PROVENANCE.push({ id, why });
  return value;
}

export type SwimrunCategory = "experience" | "sprint" | "series" | "championship";
export const SWIMRUN_CATEGORIES: SwimrunCategory[] = ["experience", "sprint", "series", "championship"];

/**
 * S1 — repères de calibration (ÖTILLÖ Cannes / championnat du monde). Servent de VALEURS PAR
 * DÉFAUT quand l'athlète n'a pas encore les chiffres de sa course : la distance nagée, le
 * nombre de segments et la plus longue nage sont ce qui dimensionne une prépa swimrun.
 */
export const S1_RACE_DEFAULTS: Record<SwimrunCategory, { swimM: number; runKm: number; dplusM: number; segments: number; longestSwimM: number }> = srule(
  "S1",
  "les distances de swimrun ne sont pas normalisées : sans repères réels, un plan par défaut serait une fiction — ceux-ci viennent d'épreuves ÖTILLÖ documentées",
  {
    experience: { swimM: 1700, runKm: 4, dplusM: 100, segments: 6, longestSwimM: 400 },
    sprint: { swimM: 2600, runKm: 9.2, dplusM: 250, segments: 10, longestSwimM: 600 },
    series: { swimM: 7850, runKm: 33, dplusM: 900, segments: 20, longestSwimM: 1400 },
    championship: { swimM: 9000, runKm: 61, dplusM: 1900, segments: 25, longestSwimM: 1600 },
  },
);

/** S2 — durée de préparation minimale par catégorie (§R10.3.1). */
export const S2_MIN_WEEKS: Record<SwimrunCategory, number> = srule(
  "S2",
  "un championnat du monde de swimrun ne se prépare pas dans l'horizon d'une Experience",
  { experience: 10, sprint: 12, series: 20, championship: 30 },
);

/** S3 — plafonds horaires (h/sem au pic) par catégorie × historique. */
export const S3_HISTORY_CAPS: Record<SwimrunCategory, Record<string, number>> = srule(
  "S3",
  "la structure de référence des coachs spécialisés tient dans 7 à 12 h hebdomadaires : au-delà, ce n'est plus la condition qui limite mais la logistique (eau libre, binôme, matériel)",
  {
    experience: { reprise: 5, confirme: 7, ancien: 8 },
    sprint: { reprise: 6, confirme: 8, ancien: 10 },
    series: { reprise: 8, confirme: 11, ancien: 13 },
    championship: { reprise: 9, confirme: 12, ancien: 15 },
  },
);

/** Heures UTILES par catégorie — au-delà, le volume ne sert plus l'objectif. */
export const SWIMRUN_UTIL: Record<SwimrunCategory, number> = { experience: 8, sprint: 10, series: 13, championship: 16 };

/**
 * S4 — RÉFÉRENCES EN TENUE. LE point critique de la spec (§R10.3.3) : il est INTERDIT de
 * dériver l'allure swimrun d'un simple facteur appliqué au CSS bassin ou à l'allure route.
 * Ces facteurs ne sont donc PAS une méthode — ce sont des valeurs de REPLI, marquées comme
 * estimées partout où elles apparaissent, en attendant le test de terrain en tenue complète.
 *
 * Ordre de grandeur observé et documenté par les coachs : un binôme à 6 min/km sur route se
 * retrouve autour de 8 min/km en tenue swimrun (combinaison, chaussures mouillées, terrain) —
 * soit ×1.33. À la nage, combinaison et pull buoy portent, plaquettes tractent, mais la
 * navigation, les vagues et le matériel embarqué coûtent : le net est légèrement plus lent
 * que le CSS bassin.
 */
export const S4_GEAR_FACTORS = srule(
  "S4",
  "les allures ne transfèrent PAS : c'est le point de douleur n°2 des pratiquants (le choc du premier test en tenue). Ces facteurs sont un repli explicite, jamais une méthode — le test en tenue les remplace",
  { run: 1.33, swim: 1.08 },
);

/**
 * S5 — COÛT DES TRANSITIONS. Poste de temps à part entière, systématiquement sous-estimé
 * (point de douleur n°3). Une course à 10 segments compte 20 transitions : à 2 min chacune,
 * c'est 40 min — plus que ce que la plupart des binômes croient perdre sur toute la course.
 * Le coût dépend de l'entraînement : c'est précisément ce que la séance pivot travaille.
 */
export const S5_TRANSITION_MIN: Record<string, number> = srule(
  "S5",
  "les transitions se répètent à l'entraînement ou se paient en course : le coût unitaire baisse avec la pratique, il ne disparaît jamais",
  { debutant: 2.5, inter: 1.5, avance: 1.0 },
);

/**
 * S6 — EFFET DE BINÔME (longe). Règles ÖTILLÖ : l'équipe reste groupée en permanence, sans
 * dépasser 5 à 10 m d'écart selon l'épreuve. Conséquences MODÉLISÉES, pas mentionnées en note :
 * le suiveur drafte (effort réduit de 15 à 20 %, un bon sillage vaut jusqu'à 10 s/100 m), et
 * attachée, la vitesse de l'équipe se rapproche davantage de celle du nageur le plus RAPIDE
 * que du plus lent.
 */
export const S6_TEAM = srule(
  "S6",
  "le choix du partenaire est décrit comme la décision la plus lourde de conséquence du sport : son effet doit être dans le calcul, pas dans un conseil",
  {
    draftEffortSaving: 0.175, // 15-20 % pour le suiveur
    swimSecPer100mGain: 10, // sillage optimal
    fasterSwimmerWeight: 0.6, // la vitesse d'équipe penche vers le plus rapide
  },
);

/**
 * S7 — FROID. L'acclimatation est un AXE PÉRIODISÉ, pas une ligne de conseil : exposition
 * régulière (hebdomadaire au minimum, 2-3× idéalement), avec allongement progressif du temps
 * dans l'eau. Combinaison obligatoire en compétition sous 19 °C (règlement ÖTILLÖ).
 */
export const S7_COLD = srule(
  "S7",
  "l'eau froide dégrade la nage et la lucidité avant de mettre en danger : l'acclimatation se planifie comme une qualité physique",
  { wetsuitMandatoryBelowC: 19, acclimationBelowC: 17, minSessionsPerWeek: 1, idealSessionsPerWeek: 2 },
);

/**
 * S8 — PLAQUETTES et ÉPAULE. Les plaquettes sollicitent durement épaules et dos : leur
 * introduction est GRADUELLE, jamais d'emblée au volume cible. Le drapeau `epaule` cesse
 * d'être un simple modificateur de volume — il conditionne cette progression.
 */
export const S8_PADDLES = srule(
  "S8",
  "les plaquettes sont l'outil le plus rentable du swimrun et le plus traumatisant pour l'épaule : la progressivité n'est pas une précaution, c'est la condition de leur usage",
  { shareBase: 0.15, shareDev: 0.3, shareSpec: 0.45, shoulderFactor: 0.4 },
);

/**
 * S9 — PROGRESSION DE LA SÉANCE PIVOT, en % du temps de course estimé. Mappée sur les PHASES
 * (base/dev/spec/peak/taper) plutôt que câblée sur 10 semaines : la spec donne une courbe à
 * pic 80 % à trois semaines de la course, ce qui correspond à la fin de `peak`.
 */
export const S9_LONG_SHARE: Record<string, [number, number]> = srule(
  "S9",
  "reproduire la durée de course à l'entraînement est contre-productif ; le pic à 80 % trois semaines avant est le compromis documenté",
  { base: [0.2, 0.35], dev: [0.35, 0.55], spec: [0.55, 0.7], peak: [0.7, 0.8], taper: [0.25, 0.4] },
);

/**
 * S10 — PRÉREQUIS D'ENTRÉE. Savoir nager 30 min (~1200 m) en continu et courir 30 min. En
 * dessous, le questionnaire REFUSE les formats longs et propose `experience` : c'est la
 * priorité n°1 du manifeste (santé) appliquée à un sport où l'on est loin du bord.
 */
export const S10_PREREQ = srule(
  "S10",
  "en swimrun on est parfois à 700 m du rivage : un nageur qui ne tient pas 30 min continu n'a pas sa place sur un format long, et le dire est plus utile que de générer un plan",
  { minSwimContinuousMin: 30, minSwimContinuousM: 1200, minRunContinuousMin: 30 },
);

/**
 * S11 — MATÉRIEL OBLIGATOIRE (socle ÖTILLÖ). Rappelé en tête de plan. Formulé comme un socle
 * à VÉRIFIER auprès de l'organisateur, jamais comme une liste exhaustive : elle varie.
 */
export const S11_GEAR_CHECKLIST: string[] = srule(
  "S11",
  "le matériel obligatoire est un point de douleur récurrent car il varie d'un organisateur à l'autre : on donne le socle et on renvoie au règlement",
  [
    "combinaison une pièce adaptée à la température de l'eau",
    "bandage compressif emballé de façon étanche",
    "sifflet accessible pendant les nages",
    "gobelet ou flasque pliable",
    "longe si tu cours en binôme (obligatoire sur la plupart des épreuves)",
  ],
);

/** Part de nage dans le TEMPS de course (indicatif) — bien supérieure à sa part en distance. */
export const SWIM_TIME_SHARE_HINT: Record<SwimrunCategory, number> = { experience: 0.35, sprint: 0.3, series: 0.28, championship: 0.25 };

/** Accès à l'eau libre — sur le modèle exact de `TRAIL_ACCESS` (§R10.3.6). */
export const OPENWATER_ACCESS: Record<string, { label: string; maxSessionsPerWeek: number }> = {
  toute_annee: { label: "eau libre accessible toute l'année", maxSessionsPerWeek: 3 },
  saisonnier: { label: "eau libre accessible en saison seulement", maxSessionsPerWeek: 1 },
  aucun: { label: "aucun accès à l'eau libre", maxSessionsPerWeek: 0 },
};
