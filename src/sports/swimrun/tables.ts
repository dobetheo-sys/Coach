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
  { wetsuitMandatoryBelowC: 19, acclimationBelowC: 17, minSessionsPerWeek: 1, idealSessionsPerWeek: 2,
    /**
     * S7bis (R20.8, O-15) — L'ACCLIMATATION NE DURE PAS TOUTE LA PRÉPARATION.
     *
     * Le verrou froid confisquait le second créneau facile de la PREMIÈRE à la DERNIÈRE semaine.
     * Or l'adaptation au froid (vasoconstriction périphérique, réponse au choc thermique,
     * tolérance du réflexe inspiratoire) s'installe en quelques semaines d'exposition régulière
     * et se PERD tout aussi vite à l'arrêt : celle de la semaine 1 d'une prépa de 26 semaines ne
     * vaut rien le jour J. Pendant ce temps elle coûtait de la spécificité tout du long — mesuré
     * en R20.3 : sur une épreuve à 68 % de course à pied, le plan n'en faisait courir que 45 %.
     *
     * Elle démarre donc à 8 semaines du jour J. Avant, la bascule S13 reprend son droit et le
     * créneau retourne à la discipline que l'épreuve demande.
     *
     * 8 semaines : au-dessus de la fenêtre d'installation décrite (2 à 6 semaines d'exposition
     * régulière), avec la marge d'une prépa réelle où l'on rate des séances. Le choix penche
     * délibérément du côté long — c'est une règle de SÉCURITÉ, et une acclimatation trop courte
     * coûte plus cher qu'une semaine de spécificité en moins.
     */
    acclimationWeeksBeforeRace: 8 },
);

/**
 * S8 — PLAQUETTES et ÉPAULE. Les plaquettes sollicitent durement épaules et dos : leur
 * introduction est GRADUELLE, jamais d'emblée au volume cible. Le drapeau `epaule` cesse
 * d'être un simple modificateur de volume — il conditionne cette progression.
 */
export const S8_PADDLES = srule(
  "S8",
  "les plaquettes sont l'outil le plus rentable du swimrun et le plus traumatisant pour l'épaule : la progressivité n'est pas une précaution, c'est la condition de leur usage",
  { shareBase: 0.15, shareDev: 0.3, shareSpec: 0.45,
    // R4.8e (audit v7) — épaule déclarée : ZÉRO plaquette, partout. Le facteur valait 0.4, ce qui
    // laissait ~6 % de plaquettes dans la séance pivot pendant que la séance de nage affichait
    // « SANS plaquettes » : deux séances du même plan se contredisaient sur le même drapeau.
    // Trancher vaut mieux qu'expliquer une incohérence.
    shoulderFactor: 0 },
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
 * S14 (R20.3) — LE FOOTING FACILE PORTE SES BORNES, INDEXÉES SUR LE TEMPS DE COURSE À PIED
 * DE L'ÉPREUVE.
 *
 * Le créneau facile course n'avait AUCUNE borne (`bnd` absent) : il devenait donc le déversoir
 * de toutes les passes de remplissage du générateur. Mesuré sur un swimrun à 12 h/sem, la plus
 * longue séance du plan était un « Footing facile » de 179 à 226 min selon le format, avec une
 * MÉDIANE de 138 à 161 min — devant la pivot, qui plafonne à 110-180 min. Un footing de près de
 * quatre heures n'est pas un footing : c'est une seconde sortie longue déguisée, et elle
 * dominait la séance qui EST la spécificité du sport.
 *
 * C'est le défaut que R13 avait corrigé pour le triathlon (« Footing facile 213 min », D7 du
 * banc v6) : le module swimrun est arrivé plus tard et personne n'a rejoué la liste des leçons
 * du sport précédent.
 *
 * **Deux écritures de cette borne ont été mesurées et réfutées avant celle-ci**, par le banc v7,
 * sur le même check `S-MIX` (part de course du plan vs part de course de l'épreuve — 4 profils
 * en défaut avant le lot) :
 *
 * 1. *relative à la pivot de la MÊME semaine, ×0,70* → **S-MIX = 158**. La pivot part à 20-35 %
 *    du temps de course en phase de base : le footing tombait à ~38 min pendant toute la
 *    construction. Or il n'a aucune raison de suivre la rampe de SPÉCIFICITÉ de la pivot — il
 *    construit l'endurance de base, qui est déjà là dès la première semaine.
 * 2. *indexée sur le temps de course à pied de l'épreuve, ×0,55* → **S-MIX = 152**. Même
 *    ordre de grandeur : le vrai problème n'était pas la rampe, c'était le NIVEAU. En swimrun,
 *    les deux créneaux faciles PORTENT la course à pied du plan — il n'y a ni sortie longue
 *    course ni footing supplémentaire pour compenser. Les serrer, c'est sous-entraîner le
 *    limiteur réel du sport, soit exactement le défaut que S13 venait de corriger.
 *
 * Ce que ces deux échecs disent, et que la formulation d'O-8 disait déjà : le défaut n'est pas
 * qu'un footing soit LONG, c'est qu'il soit **la plus longue séance du plan**, devant la séance
 * qui EST la spécificité du sport. La borne porte donc exactement là-dessus — le footing plafonne
 * juste sous la pivot du PIC, la séance la plus longue que le plan produira. Un footing de 2 h
 * dans une prépa de 4 h de course reste un footing ; à 3 h 47 il a pris la place de la pivot.
 *
 * 0,90 : assez haut pour que les deux créneaux faciles portent la course à pied du plan, assez
 * bas pour que la pivot reste la séance de référence — sur toutes les semaines, y compris celles
 * où la pivot est encore courte.
 */
export const S14_EASY_RUN_VS_PEAK_PIVOT = srule(
  "S14",
  "le défaut n'est pas qu'un footing soit long, c'est qu'il dépasse la séance qui porte la spécificité du sport : la borne est la pivot du PIC, pas celle de la semaine en cours",
  0.9,
);

/**
 * S14 — plafond ABSOLU du footing, toutes épreuves confondues. Au-delà de deux heures et demie,
 * une « sortie facile » n'est plus une sortie facile quelle que soit la durée de l'épreuve :
 * elle porte sa propre récupération et cesse d'être ce que sa note promet. C'est la borne qui
 * empêche un ultra-swimrun de rouvrir le déversoir par le haut, là où la pivot du pic serait
 * elle-même très longue.
 */
export const S14_EASY_RUN_CAP_MIN = srule(
  "S14",
  "au-delà de 2 h 30 une sortie facile n'est plus un footing : elle porte sa propre récupération et devient une seconde sortie longue non spécifique",
  150,
);

/** S14 — plancher du footing : en dessous, ce n'est plus de l'endurance fondamentale. */
export const S14_EASY_RUN_FLOOR_MIN = srule(
  "S14",
  "un footing d'endurance fondamentale a besoin d'une trentaine de minutes pour produire son adaptation",
  30,
);

/**
 * S12 — nombre maximal de segments reproduits dans UNE séance. Une course à 48 segments ne se
 * répète pas à l'entraînement : au-delà d'une douzaine d'entrées-sorties d'eau, la séance
 * devient la course elle-même. On travaille la compétence sur un nombre représentatif et on la
 * répète semaine après semaine — c'est comme ça qu'elle s'automatise.
 */
export const S12_PIVOT_MAX_SEGMENTS = srule(
  "S12",
  "la compétence « entrer et sortir de l'eau » s'automatise par la répétition hebdomadaire, pas en reproduisant les 48 segments de la course en une sortie",
  10,
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

/**
 * S13 — LE CRÉNEAU FACILE SECONDAIRE SUIT LA DISCIPLINE QUI DOMINE LA COURSE.
 *
 * Mesuré avant correction (banc v7, R16.10) : la part de COURSE dans le plan valait 63-64 %
 * quelle que soit l'épreuve, alors que la part de course dans la course va de 45 % (5 000 m
 * de nage / 5 km) à 94 % (800 m / 30 km). La structure hebdomadaire était un CONSTANT —
 * 2 nages, 2 courses, la pivot — et ne lisait jamais l'objectif. Sur une épreuve à 94 % de
 * course, le plan sous-entraînait le limiteur réel de 31 points.
 *
 * La règle ne rééquilibre PAS proportionnellement, et c'est délibéré : nager 6 % du temps
 * parce que la course ne nage que 6 % du temps est absurde — la technique de nage se perd
 * par manque de FRÉQUENCE, pas de volume, et c'est la sortie de l'eau qui décide de la
 * course. Aucune des deux disciplines ne descend donc jamais sous deux rendez-vous par
 * semaine (la pivot en porte déjà une de chaque). C'est le SECOND créneau facile qui bascule.
 *
 * Le seuil borne la bande où la structure de référence des coachs (≈64 % de course) est
 * encore juste ; au-dessus, elle ne l'est plus. Il n'y a PAS de seuil symétrique : côté
 * épreuve dominée par la nage, le plan mesurait déjà 64 % de course pour 45-53 % dans la
 * course — au-dessus, jamais en dessous, donc jamais le sens qui sous-entraîne. La règle
 * miroir a été écrite, mesurée (la part de course tombait à 17 %) et retirée.
 */
export const S13_MIX_FOLLOWS_RACE = srule(
  "S13",
  "la spécificité veut que le plan ressemble à la course ; la technique de nage veut de la fréquence — le compromis est de faire basculer UN créneau facile, jamais de supprimer une discipline",
  {
    /** Au-dessus : le second créneau facile (nage de récup) passe en COURSE. */
    runDominantAbove: 0.78,
  },
);

/** Part de nage dans le TEMPS de course (indicatif) — bien supérieure à sa part en distance. */
export const SWIM_TIME_SHARE_HINT: Record<SwimrunCategory, number> = { experience: 0.35, sprint: 0.3, series: 0.28, championship: 0.25 };

/** Accès à l'eau libre — sur le modèle exact de `TRAIL_ACCESS` (§R10.3.6). */
export const OPENWATER_ACCESS: Record<string, { label: string; maxSessionsPerWeek: number }> = {
  toute_annee: { label: "eau libre accessible toute l'année", maxSessionsPerWeek: 3 },
  saisonnier: { label: "eau libre accessible en saison seulement", maxSessionsPerWeek: 1 },
  aucun: { label: "aucun accès à l'eau libre", maxSessionsPerWeek: 0 },
};
