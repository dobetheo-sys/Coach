/**
 * PLANCHER DE FRÉQUENCE — « DEUX EST LA BORNE, TROIS EST LA CIBLE » (arbitrage du fondateur,
 * PLANCHER_FREQUENCE.md, 21/08/2026), ET LA MESURE A DÉPLACÉ LES DEUX VALEURS UNE FOIS DE PLUS.
 *
 * Le lot précédent avait mesuré que le plancher de TROIS nages que le fondateur avait nommé
 * était déjà franchi 13 semaines sur 31 avant toute conversion. Il en a tiré la bonne
 * conclusion — *« poser 3 maintenant, ce serait déclarer 42 % des semaines de charge en
 * infraction : un plancher qui condamne l'existant au lieu de border le futur »* — et a
 * redescendu la borne à 2, la cible à 3.
 *
 * **Le même raisonnement, appliqué au CORPUS et non au seul profil du fondateur, déplace encore
 * les valeurs.** Mesuré sur les 3 522 semaines de charge des 188 profils tri du golden :
 *
 * ```
 * sous 3 nages   3 502 / 3 522   99,4 %      ← la « cible » n'est pas approchée, elle est hors d'atteinte
 * sous 2 nages   2 261 / 3 522   64,2 %      ← poser 2 en dur condamnerait DEUX TIERS du corpus
 * à ZÉRO nage       22 / 3 522    0,6 %
 * ```
 *
 * Poser « 2 en dur » sans condition referait donc, un cran plus bas, exactement ce que le
 * fondateur refusait pour 3. Et la coupe qui explique tout est le BUDGET DE SÉANCES, pas
 * l'athlète :
 *
 * ```
 * ≤5 séances/sem   nage moy 1,24   ·   sous 2 : 70,9 %
 * 6-7 séances      nage moy 1,37   ·   sous 2 : 63,7 %
 * 8-9 séances      nage moy 3,05   ·   sous 2 :  0,0 %      ← le plancher y est DÉJÀ tenu
 * ≥10 séances      nage moy 2,00   ·   sous 2 :  0,0 %
 * ```
 *
 * Avec 6 créneaux pour 3 disciplines, deux nages, c'est un tiers des séances pour une
 * discipline qui pèse 12 % du chrono : ce n'est pas un défaut, c'est l'allocation qui fait son
 * travail. Au-dessus de 8 séances, le plancher est tenu par 100 % du corpus **sans qu'aucune
 * règle ne l'impose** — il ne condamne rien et il borne ce qui viendrait le franchir. C'est
 * exactement l'usage que le document lui assigne : *« posé avant, il borne la pièce ; posé
 * après, il est franchi par elle. »*
 *
 * TROIS NIVEAUX, ET CHACUN PORTE SA MESURE :
 *
 *   ZÉRO (dur)      une semaine de charge ne porte JAMAIS zéro séance d'une discipline de
 *                   l'épreuve. C'est la borne qui fait le travail que le §2 décrit — *« une
 *                   semaine sans une seule nage est inacceptable quel que soit l'arbitrage »* —
 *                   et elle est DÉRIVÉE : aucun nombre à choisir, elle vaut pour les trois
 *                   disciplines et pour tout sport multi-disciplines.
 *
 *   DEUX (plancher) sur la discipline limitante, **quand le budget de la semaine le permet**.
 *                   `PLANCHER_BUDGET_MIN` est le point de rupture MESURÉ, pas un choix : c'est
 *                   la valeur au-dessus de laquelle le corpus tient déjà le plancher.
 *
 *   TROIS (cible)   publiée, jamais forcée (O-17 : informer plutôt que bloquer). 99,4 % des
 *                   semaines de charge tri sont dessous ; en faire une contrainte serait
 *                   réécrire l'allocation par un effet de bord.
 *
 * ⚠ CE QUE CE MODULE N'EST PAS. Ce n'est pas une passe : il ne rattrape aucune semaine. Les 30
 * semaines qui franchissent aujourd'hui le niveau ZÉRO (22 sans nage, 8 sans course) sont
 * DÉCLARÉES et tenues par un cliquet (`T-60`), pas corrigées — les corriger est un correctif
 * d'allocation sur les profils à 3-5 séances, c'est-à-dire ceux qui « tombent dans TOUTES les
 * coupes à la fois », et ça se décide séparément (O-98). Nommer une borne « dure » et ne pas
 * l'appliquer serait malhonnête si ce n'était pas écrit : c'est écrit.
 *
 * ⚠ LE DOMAINE N'EST PAS `swim_limit`, ET LA RAISON VAUT D'ÊTRE LUE. Le §3 du document demande
 * que le plancher lise `swim_limit`, *« comme la borne d'épaule lit l'expérience »*. Deux
 * mesures l'écartent :
 *
 *   1. **`swim_limit` n'est pas posée en triathlon** — `ANSWER_SCHEMA` la déclare pour le seul
 *      sport `swim`. Sur le profil du fondateur, la clé n'existe pas ; un plancher qui la lirait
 *      serait inerte là où il doit border.
 *   2. **La borne d'épaule NE lit PAS un adjectif déclaré** : elle lit la continuité MESURÉE
 *      rapportée à la distance de course (O-85 §1, « jamais sur un adjectif auto-déclaré —
 *      c'est la leçon R14.1, payée quatre fois »). L'analogie du §3 pointe donc vers la mesure,
 *      pas vers la clé.
 *
 * Et le proxy mesuré ne sépare rien : classés par ce ratio, les profils tri dont la nage est
 * limitante sont sous 2 nages **63,2 %** du temps, les autres **77,4 %** — la classe « nage
 * limitante » n'est pas celle qui nage le moins. Le domaine du plancher est donc le BUDGET de la
 * semaine, qui est la seule grandeur que la mesure fait apparaître.
 *
 * ⚠ ET IL N'EST PAS LE PREMIER — le §3 posait la question, la réponse est non, deux fois :
 * `C29`/`C29b`/`C29c` tiennent un plancher de fréquence en AFFÛTAGE (Bosquet 2007, ≥ 80 % des
 * séances), et `S7_COLD` du swimrun porte déjà la forme à DEUX grandeurs
 * (`minSessionsPerWeek` / `idealSessionsPerWeek`). La forme retenue ici est celle de `S7` —
 * borne + cible — parce qu'elle existe déjà dans le dépôt et qu'un troisième vocabulaire pour
 * la même idée serait la faute que R11.1 interdit.
 *
 * ⚠ UNITÉ (règle 14) : le compte est en SÉANCES DE LA DISCIPLINE, **legs de brick compris**.
 * Ce n'est pas un détail de comptage, c'est le verdict : sans les legs, 119 semaines de charge
 * tri portent zéro séance d'une discipline ; avec eux, 30 — parce qu'un brick EST du travail de
 * vélo et de course. Il ne contient jamais de natation, donc il ne crédite jamais la nage.
 */

/** Le point de rupture MESURÉ du budget hebdomadaire (voir le tableau en tête). */
export const PLANCHER_BUDGET_MIN = 8;

/** Les trois niveaux. Ordres de grandeur d'entraîneur, révocables — la FORME est ce qui compte. */
export const PLANCHER_FREQ = { dur: 1, plancher: 2, cible: 3 } as const;

/**
 * Ce que la semaine doit tenir, compte tenu de son budget de séances.
 *
 * `dur` vaut toujours 1 : une discipline de l'épreuve est présente, quel que soit le budget.
 * `plancher` ne vaut 2 que si la semaine a de quoi le tenir — sinon il retombe sur `dur`, et
 * c'est ce qui l'empêche de condamner les deux tiers du corpus.
 */
export function plancherFrequenceSemaine(nSeancesSemaine: number): {
  dur: number; plancher: number; cible: number;
} {
  const budgetSuffisant = nSeancesSemaine >= PLANCHER_BUDGET_MIN;
  return {
    dur: PLANCHER_FREQ.dur,
    plancher: budgetSuffisant ? PLANCHER_FREQ.plancher : PLANCHER_FREQ.dur,
    cible: PLANCHER_FREQ.cible,
  };
}

/**
 * Le compte de séances d'une discipline dans une semaine, legs de brick compris.
 *
 * POINT UNIQUE (R11.1) : le plancher, la décision qui le publie et la garde qui le vérifie
 * comptent tous par ici. Deux comptages divergents pour la même grandeur, c'est la forme que
 * ce dépôt a payée quatre fois (O-42 : quatre conversions mètres ↔ minutes pour une grandeur).
 */
const LEG_DE: Record<string, string> = { sw: "swim", bk: "bike", rn: "run" };
export function seancesDiscipline(
  semaine: { days?: { sessions?: { d?: unknown; race?: unknown; brick?: unknown; steps?: { leg?: unknown }[] }[] }[] },
  disc: string,
): number {
  let n = 0;
  for (const j of semaine.days ?? []) for (const s of j.sessions ?? []) {
    if (s.race) continue;
    // Un brick est du travail de vélo ET de course — jamais de natation : il ne crédite donc
    // que les legs qu'il contient réellement.
    if (s.brick) { if ((s.steps ?? []).some((st) => st.leg === LEG_DE[disc])) n++; }
    else if (s.d === disc) n++;
  }
  return n;
}
