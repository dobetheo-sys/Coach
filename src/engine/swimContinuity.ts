/**
 * B-17 — LA NAGE CONTINUE À LA DISTANCE DE COURSE, EN TRIATHLON.
 *
 * MESURÉ AVANT D'ÊTRE ÉCRIT (registre `BUGS_OUVERTS.md` « B-17 ») : sur `tri/Full`, **4 profils
 * sur 56** reçoivent une nage continue (`reps === 1`) à la distance de course — par accident de
 * composition, aucune règle ne la visant. Le VOLUME est là (jusqu'à 7 125 m en une séance), la
 * CONTINUITÉ n'y est pas : ce sont deux adaptations différentes, et c'est la seconde qui décide
 * du jour J.
 *
 * POURQUOI C'EST UNE RÈGLE DE SÉCURITÉ ET PAS DE PERFORMANCE — critère O-17, membre « l'athlète
 * ne peut pas évaluer le risque » : en eau libre, **le risque n'est pas observable avant d'être
 * réalisé**. En course à pied on ralentit, on marche, on s'arrête — le signal arrive
 * progressivement et des options restent à chaque étape. En eau libre, le choc thermique, la
 * désorganisation du geste et la panique surviennent vite, et loin du bord. Le milieu ne rend
 * aucune information utilisable en temps voulu.
 *
 * Le précédent interne est **S10** (swimrun) : il exige 30 min de nage continue pour un format
 * long, avec sa justification écrite — « on est parfois à 700 m du rivage ». Elle vaut mot pour
 * mot pour un 70.3 en lac ou un Full en mer ; le triathlon n'avait pas d'équivalent.
 *
 * ZÉRO CONSTANTE NOUVELLE : le plancher de 30 min vient de `S10_PREREQ`, les distances de
 * `TRI_SWIM`, les paliers s'en dérivent, la vitesse de repli est le `130` déjà en place.
 */
import { TRI_SWIM } from "./predictor.ts";
import { S10_PREREQ } from "../sports/swimrun/tables.ts";
import { C22_MAX_WEEKLY_GROWTH, PHASE_PCTS } from "./constraintMatrix.ts";

/** Vitesse de repli — la MÊME que `stepMin` (`baseRefs.css || 130`). Voir la note d'unité ci-dessous. */
export const B17_CSS_FALLBACK_SEC = 130;

/**
 * B-17 — LE NOMBRE MAXIMAL DE PALIERS. Les VALEURS ne sont plus tabulées : elles s'interpolent
 * depuis le point de départ de l'ATHLÈTE (arbitrage D3 §3 du fondateur, 16/08/2026). L'ancienne
 * table `[0.5, 0.7, 0.9, 1.0]` était une fraction de la distance de COURSE — « partir de 50 % de
 * la distance de course ne sert pas quelqu'un à 200 m ; la progression doit partir de l'athlète ».
 * Ce qui survit de la table est sa FORME : une MONTÉE, pas un test unique à la fin.
 */
export const B17_PALIERS_MAX = 4;

/**
 * LA PART DU PLAN QUI PRÉCÈDE LA FIN DE LA PHASE SPÉCIFIQUE — dérivée de `PHASE_PCTS`, jamais
 * réécrite. Le dernier palier tombe à la fin de `spec` : c'est cette travée, et non la course
 * entière, que la progression a pour construire la continuité.
 */
export const B17_SPAN_PCT = PHASE_PCTS.filter((p) => ["base", "dev", "spec"].includes(p.id))
  .reduce((t, p) => t + p.pct, 0);

/** Le plus petit départ que la progression accepte, en mètres — deux longueurs de bassin. */
const B17_DEPART_PLANCHER_M = 200;

/**
 * O-54 — L'ÉCHAUFFEMENT ET LE RETOUR AU CALME DE LA SÉANCE DE CONTINUITÉ, EN MÈTRES.
 *
 * Ils vivaient en littéral dans `sports/tri/index.ts` (`Wm(200, …)`, `Cm(150, …)`), et le plafond
 * de séance C15 devait les connaître pour savoir ce qui reste au corps : 850 − 350 = 500, la
 * valeur exacte à laquelle 53 continuités étaient livrées. Une borne qui dépend d'un chiffre écrit
 * ailleurs et qu'elle ne lit pas est une borne fausse au premier changement (R11.1).
 */
export const B17_ECHAUF_M = 200;
export const B17_RETOUR_M = 150;
export const B17_AUX_M = B17_ECHAUF_M + B17_RETOUR_M;

/**
 * O-54 §2 (arbitrage du 17/08/2026) — **C15 LIT LA CAPACITÉ DÉMONTRÉE LÀ OÙ ELLE EXISTE.**
 *
 * Le plafond de séance de nage du débutant (850 m, C15) lisait `level === "debutant"` — une
 * auto-évaluation **globale**, pas une capacité de nage. Or « débutant en triathlon » et
 * « incapable de nager 850 m » sont deux choses différentes : un ancien nageur qui se met au
 * triathlon est `debutant` et peut nager 3 000 m ; le moteur le plafonnait à 850 pendant quarante
 * semaines, et B-17 lui prescrivait des continuités livrées à 500 m sous un titre qui en annonçait
 * 3 800.
 *
 * `longest_swim_m` existe depuis B-17, obligatoire en tri, avec son « je ne sais pas » explicite.
 * C'est exactement le signal dont C15 avait besoin et qu'il n'avait pas quand il a été écrit.
 *
 * LA BORNE EST LA CAPACITÉ DÉMONTRÉE + L'AUXILIAIRE, ET JAMAIS MOINS QUE C15.
 *
 * ⚠ MA PREMIÈRE ÉCRITURE BORNAIT SUR `atteignableM` — ce que la rampe atteint à la FIN de la
 * progression — et c'est la pire erreur de ce chantier : elle RETIRAIT LA PROTECTION À LA
 * POPULATION QU'ELLE PROTÈGE. Deux fautes cumulées :
 *   1. `atteignableM` est une valeur de FIN, appliquée comme plafond constant DÈS LA SEMAINE 1 ;
 *   2. elle croît exponentiellement avec la durée du plan (rampe C22 sur la travée) — sur un Full
 *      de 38 semaines, 2 000 m déclarés donnaient un plafond de **32 076 m**.
 * Mesuré avant de recapturer : un athlète déclarant **400 m** de continu recevait une séance de
 * **4 150 m**. C'est exactement le profil que C15 existe pour protéger.
 *
 * La borne est donc `longest_swim_m + auxiliaire`, plafonnée par le bas à C15 : elle ne descend
 * jamais sous la protection actuelle, et ne monte qu'à hauteur de ce que l'athlète a DÉJÀ fait.
 *
 *   400 m déclarés  → 850 m (C15 gagne)                ← le vrai débutant nageur reste protégé
 *   « je ne sais pas » → 850 m                          ← et il reçoit un TEST (D3)
 *   2 000 m déclarés → 2 350 m                          ← l'ancien nageur reçoit sa séance
 *
 * CE QUE ÇA NE FAIT PAS, DÉLIBÉRÉMENT : la borne ne PROGRESSE pas avec le plan. Un nageur à
 * 2 000 m ne pourra donc pas construire les 3 800 m d'un Ironman, et son écart restera
 * infranchissable — c'est la branche rabattement, et c'est cohérent. Faire croître cette borne
 * semaine après semaine est la BONNE réponse, et c'est exactement le ticket « `beginner` est
 * statique » : toutes les protections du débutant sont justes en semaine 1 et deviennent une
 * camisole en semaine 30. Le résoudre ici, pour cette seule borne, en ferait un cas particulier
 * de plus au lieu d'une règle.
 *
 * ET LE MÉCANISME SE REFERME SUR LUI-MÊME : qui répond « je ne sais pas » reçoit, par la décision
 * D3, un TEST de continuité en première séance de nage — le test produit précisément la valeur qui
 * lèverait ce plafond. Le moteur prescrit la mesure qui débloque sa propre contrainte.
 *
 * CE QUE ÇA NE RÉSOUT PAS, ET C'EST CORRECT : le vrai débutant nageur, qui déclare 400 m ou ne
 * sait pas, reste plafonné — l'écart vers 3 800 m lui reste infranchissable et le rabattement est
 * la bonne réponse pour lui. C'est le cas que B-17 visait au premier jour. La différence est entre
 * refuser une POPULATION et refuser une SITUATION.
 *
 * @param base le plafond que `level` impose (C15), employé quand rien n'est démontré
 */
export function swimSessionCapM(g: ContinuityGate | null, base: number): number {
  if (!g || g.source !== "mesure") return base;
  return Math.max(base, g.departM + B17_AUX_M);
}

/**
 * O-56 §1 — **LA CAPACITÉ PROJETTE, AU PATRON DE C22** (arbitrage du fondateur, 17/08/2026).
 *
 * `swimSessionCapM` rend une borne CONSTANTE, gelée sur la déclaration du premier jour : un
 * nageur à 2 000 m ne construisait donc pas les 3 800 m d'un Ironman, alors que trente-six
 * semaines de préparation sont précisément ce qui les construit. C'est la règle 20 dans son
 * second sens — une valeur de DÉBUT appliquée à la FIN.
 *
 * La borne monte donc avec la position dans le plan, **au taux que le moteur s'impose déjà
 * partout** (`C22_MAX_WEEKLY_GROWTH`). Aucune règle de croissance nouvelle : c'est le patron de
 * C22 appliqué à une seconde grandeur, et l'hypothèse qu'il porte — « l'athlète a fait les
 * séances » — est celle que la rampe assume depuis toujours, pas une hypothèse à défendre.
 *
 *   semaine 1  ..... la capacité déclarée (+ auxiliaire), jamais moins que C15
 *   semaine k  ..... déclarée × C22^(k−1), plafonnée à la DISTANCE DE COURSE
 *
 * Le plafond à `courseM` n'est pas décoratif : au-delà de la distance de l'épreuve, une séance
 * plus longue ne construit plus la continuité que B-17 vise — elle fait du volume, et le volume
 * a ses propres bornes.
 *
 * CE QUE ÇA NE FAIT PAS : corriger la projection par l'ÉVIDENCE. C'est la seconde moitié d'O-56,
 * et elle ne peut agir qu'à la RE-génération — au premier build aucune séance n'est validée.
 * Sans évidence, la projection tient ; avec elle, `swimEvidenceM` relève le point de départ.
 *
 * @param wkNum semaine du plan, 1-indexée — LA POSITION EST UN PARAMÈTRE, pas une hypothèse
 */
export function swimSessionCapAtWeek(g: ContinuityGate | null, base: number, wkNum: number): number {
  if (!g || g.source !== "mesure") return base;
  const k = Math.max(0, (wkNum || 1) - 1);
  const projete = Math.min(g.courseM, g.departM * Math.pow(C22_MAX_WEEKLY_GROWTH, k));
  return Math.max(base, Math.round(projete) + B17_AUX_M);
}

/**
 * O-85 — LA CHARGE D'ÉPAULE : LE VOLUME HEBDOMADAIRE DE NAGE A UNE BORNE, ET SON MULTIPLICATEUR
 * SUIT L'EXPÉRIENCE EN NAGE.
 *
 * *« Ce qui fait le risque n'est pas la distance seule — c'est le volume × la qualité du geste.
 * Un nageur de club fait 25 km par semaine sans dommage ; un autodidacte d'un an dont la
 * technique cède sous fatigue n'a pas la même tolérance à 12. »* (fondateur, 19/08/2026.)
 *
 * Mesuré avant d'écrire (`npm run mesure:epaule`) : **rien ne bornait ce volume**. Ce qui y
 * ressemblait était un artefact — le NOMBRE DE CRÉNEAUX de nage du schéma de semaine — et il
 * laissait passer 14,7 km/sem avec une « Nage récup courte » de 2 625 m. `MAX_RUN_DAYS` borne les
 * jours d'impact en course ; l'argument qui avait écarté un `MAX_SWIM_DAYS` portait sur la
 * FRÉQUENCE (bénigne, voire souhaitable en nage) et ne s'applique pas au VOLUME.
 *
 * TROIS DÉCISIONS ENCODÉES ICI :
 *
 * 1. **LE MULTIPLICATEUR SUIT L'EXPÉRIENCE EN NAGE, PAS LE NIVEAU GÉNÉRAL** — et il est LU sur
 *    une grandeur MESURÉE (la continuité déclarée rapportée à la distance de course), jamais sur
 *    un adjectif auto-déclaré. C'est la leçon R14.1, payée quatre fois : `level` et `history`
 *    décrivent le triathlète, pas son épaule. Un athlète qui ne nage pas encore la distance de
 *    son épreuve est un nageur récréatif quel que soit son niveau à vélo.
 *
 * 2. **LA BORNE EST PLUS SERRÉE CHEZ LE DÉBUTANT — l'inverse du réflexe.** C'est le point que le
 *    fondateur souligne : on protège le moins expérimenté davantage, alors que l'intuition
 *    voudrait « il en fait moins, donc il risque moins ».
 *
 * 3. **ELLE CLIQUETTE SUR LE LIVRÉ, JAMAIS SUR UNE PROJECTION (O-89, arbitrage du fondateur,
 *    19/08/2026).** Ma première écriture levait le multiplicateur sur la continuité PROJETÉE
 *    (`C22^semaine`) : la bande passait à ×6 dès S8 pendant que les paliers B-17 du même plan
 *    posaient la première continue en S25 — deux courbes pour la même grandeur, et la borne
 *    lisait la plus optimiste. L'argument qui tranche est l'asymétrie des erreurs : *« le
 *    cliquet de capacité projette trop haut → l'athlète sous-livre → récupérable ; la borne
 *    d'épaule projette trop haut → il nage 11 km/sem avec une épaule conditionnée pour 7 →
 *    blessure. Une borne de sécurité ne projette pas : une projection est une hypothèse sur
 *    l'avenir, une protection doit tenir sur le présent. »* La tolérance tissulaire suit la
 *    CHARGE ACCUMULÉE, pas la capacité à nager d'un trait — la borne se lève donc au plus
 *    ×C22 au-dessus du volume hebdomadaire de nage RÉELLEMENT LIVRÉ par les semaines déjà
 *    fixées (lecture ARRIÈRE, comme la rampe C22 : pas de circularité O-43), plafonnée à la
 *    bande SUIVANT celle que la continuité déclarée justifie — le « 7,6 km en S1 → 11,4 au
 *    pic » arbitré en fermant O-85 ne bouge pas, seule la RAMPE change : chaque palier est
 *    désormais GAGNÉ par le volume effectivement porté, jamais accordé par le calendrier. Si
 *    le plan sous-livre en nage, la borne s'ouvre plus lentement — et c'est correct.
 *
 * PROVENANCE DES CHIFFRES, dite franchement : les bandes viennent du fondateur (« triathlète
 * récréatif ×2-4 · âge-groupe compétitif ×4-6 · nageur de formation ×8 et plus ») et sont des
 * ordres de grandeur d'entraîneur, pas une publication. Ce qui est défendable et ce qui compte,
 * c'est la FORME et la DIRECTION ; les valeurs sont révocables sans changer le mécanisme.
 * `C22_MAX_WEEKLY_GROWTH` est la seule constante de croissance sourcée du dépôt — aucune
 * constante nouvelle (forme demandée par O-85 §1, reconduite ici).
 *
 * DOMAINE — la formule n'a de sens que si la nage est un LEG, pas l'ÉPREUVE. Un sprinteur qui
 * prépare un 100 m nage trente fois sa distance de course, et c'est correct. La condition est
 * donc portée par l'appelant sous forme DÉRIVÉE (« le sport a-t-il plus d'une discipline ? »),
 * jamais par une liste de sports.
 *
 * NOTE (O-89, périmètre) : `swimSessionCapAtWeek` ci-dessus garde sa projection `C22^semaine` —
 * c'est une borne de SÉANCE dont la levée pilote la construction des paliers (B-17), pas une
 * protection articulaire ; l'arbitrage O-89 nomme la borne d'ÉPAULE. Si « une borne de sécurité
 * ne projette pas » doit s'étendre à C15, c'est une décision à part.
 *
 * @param livreMaxPrecM le plus haut volume hebdomadaire de nage (mètres) LIVRÉ par les semaines
 *   déjà fixées — 0 ou absent en semaine 1. Le producteur est la passe O-85 elle-même, qui
 *   parcourt les semaines dans l'ordre et lit ce qu'elle vient d'écrêter (lecture arrière).
 * @returns le plafond hebdomadaire en mètres, ou `null` quand la borne n'a pas d'objet
 */
export const O85_MULT_EPAULE = [
  { jusqua: 1.0, k: 4 },   // ne nage pas encore la distance de course : récréatif, HAUT de sa bande
  { jusqua: 2.0, k: 6 },   // nage la distance et au-delà : âge-groupe compétitif
  { jusqua: Infinity, k: 8 }, // formation de nageur
];

export function swimWeeklyLoadCapM(g: ContinuityGate | null, livreMaxPrecM?: number | null): number | null {
  if (!g || !g.courseM) return null;
  // Continuité INCONNUE → branche prudente, la plus serrée. Un défaut tacite va vers la sécurité
  // (U14) : ne pas savoir nager 1 900 m d'affilée est le cas le plus fréquent, pas le plus rare.
  //
  // ⚠ LE RATIO NE SE PLAFONNE PAS À LA DISTANCE DE COURSE, contrairement à la borne de SÉANCE
  // ci-dessus, et c'est une mesure qui l'a corrigé : avec le plafond, `ratio` ne dépassait jamais
  // 1,0 et **la bande « formation de nageur » était inatteignable** — un athlète déclarant 4 000 m
  // continus pour un 70.3 recevait le multiplicateur de l'âge-groupe. Les deux bornes lisent la
  // même grandeur pour deux questions différentes : « jusqu'où faire nager d'un trait » se
  // plafonne à la course (au-delà on fait du volume, pas de la continuité) ; « quelle épaule
  // a-t-il » ne se plafonne pas — savoir nager 4 km d'affilée EST de l'expérience.
  const ratio = (g.source === "mesure" ? g.departM : 0) / g.courseM;
  const iDep = O85_MULT_EPAULE.findIndex((b) => ratio < b.jusqua);
  const bande = O85_MULT_EPAULE[iDep < 0 ? O85_MULT_EPAULE.length - 1 : iDep];
  const capDepart = Math.round(bande.k * g.courseM);
  // O-89 — le cliquet : au plus ×C22 au-dessus du plus haut volume déjà LIVRÉ, plafonné à la
  // bande SUIVANTE **seulement quand la continuité déclarée est SOUS la distance de course** :
  // le plan construit alors lui-même cette continuité (paliers B-17), et l'athlète qui la
  // gagnera au fil des semaines gagne la bande avec elle — c'est le « 7,6 km en S1 → 11,4 au
  // pic » arbitré en fermant O-85, la rampe en plus. Au-dessus (déclaré ≥ course), la bande
  // d'au-dessus ne se gagne QUE par une nouvelle continuité VALIDÉE (O-56), jamais par
  // l'accumulation seule — ma première écriture ouvrait ×8 à tout déclaré ≥ course, et le
  // rayon l'a attrapée : un SPRINT (course 750 m) gagnait +36,6 km de nage sur son plan, le
  // déversoir exploitant la marge. Sans historique livré (semaine 1), le départ seul.
  // …et la marge exige une continuité MESURÉE : sur une continuité INCONNUE (ratio 0, branche
  // prudente U14), la bande ne se lève pas par accumulation — l'ancienne forme la laissait à ×4
  // statique, la nouvelle ne doit pas être plus lâche sur un défaut tacite. Le rayon l'a
  // attrapée aussi : les 10 profils touchés restants étaient tous des continuités non déclarées
  // qui gagnaient ×6 par le seul déversoir.
  const iBande = iDep < 0 ? O85_MULT_EPAULE.length - 1 : iDep;
  const iPlafond = g.source === "mesure" && ratio < 1.0 ? Math.min(O85_MULT_EPAULE.length - 1, iBande + 1) : iBande;
  const plafondCliquet = Math.round(O85_MULT_EPAULE[iPlafond].k * g.courseM);
  if (!(livreMaxPrecM != null && livreMaxPrecM > 0)) return capDepart;
  return Math.min(plafondCliquet, Math.max(capDepart, Math.round(livreMaxPrecM * C22_MAX_WEEKLY_GROWTH)));
}

/**
 * O-56 §2 — **L'ÉVIDENCE : le plus haut palier de continuité que l'athlète a VALIDÉ.**
 *
 * Trois décisions du fondateur sont encodées ici, et chacune ferme un mode de défaillance :
 *
 * 1. **LE CLIQUET EST MONOTONE.** Une séance sautée n'est pas une capacité perdue : qui a nagé
 *    800 m d'affilée en semaine 8 sait toujours les nager en semaine 20, qu'il ait fait ou non
 *    la continue de 1 400 prévue entre-temps (malade, en déplacement, ou faite sans la
 *    journaliser). La divergence n'est donc jamais « la capacité redescend » mais « elle ne
 *    monte pas » — deux situations différentes, et une seule existe.
 *
 * 2. **UNE DONNÉE ABSENTE N'EST PAS UNE DONNÉE NÉGATIVE.** Si le cliquet ne montait que sur des
 *    séances validées, l'athlète qui nage tout et ne journalise rien serait traité comme celui
 *    qui ne nage pas : capacité gelée, paliers jamais relevés, rabattement au bout — **pour un
 *    défaut d'usage de l'application, pas d'entraînement**. Ce serait le défaut d'O-54 refait,
 *    une protection qui frappe la mauvaise population. D'où `aDesNages` : l'évidence ne corrige
 *    la projection QUE si le moteur a de l'évidence sur la NAGE.
 *       aucune nage validée ................ aucune évidence, la projection tient
 *       des nages validées, mais pas le palier → évidence réelle, le cliquet ne monte pas
 *    La distinction est exacte et ne demande AUCUN seuil : soit l'athlète journalise sa nage,
 *    soit il ne la journalise pas.
 *
 * 3. **LES PALIERS DE B-17 SONT DÉJÀ LE TEST.** Le plan prescrit une continue à 2 000 m, l'athlète
 *    la fait, sa capacité démontrée vaut 2 000, le palier suivant peut viser plus haut. Le
 *    mécanisme de mesure existe et n'a besoin d'AUCUNE question de plus — c'est la première fois
 *    dans ce moteur qu'une progression s'appuie sur une évidence plutôt que sur une supposition.
 *
 * Fonction PURE, sur le plan PRÉCÉDENT et la carte des ✓ : elle ne devine rien, elle lit.
 */
export interface SwimEvidence {
  /** Le plus haut palier de continuité VALIDÉ, en mètres. 0 = aucun. */
  valideM: number;
  /** Le moteur a-t-il la moindre séance de nage validée ? Sans ça, l'absence n'informe pas. */
  aDesNages: boolean;
  /** Le plus haut palier PRESCRIT et NON validé — celui qui nomme la divergence. 0 = aucun. */
  manqueM: number;
}
export function swimEvidence(
  plan: { weeks?: { num: number; days?: { jour?: string; sessions?: { d?: string; name?: string; steps?: { role?: string; bnd?: { pinned?: boolean }; distanceM?: number | null; reps?: number }[] }[] }[] }[] } | null | undefined,
  done: Record<string, boolean> | null | undefined,
): SwimEvidence {
  const out: SwimEvidence = { valideM: 0, aDesNages: false, manqueM: 0 };
  if (!plan?.weeks || !done) return out;
  for (const w of plan.weeks) for (const d of w.days ?? []) {
    (d.sessions ?? []).forEach((s, si) => {
      if (s.d !== "sw") return;
      const fait = !!done[w.num + "|" + d.jour + "|" + si];
      if (fait) out.aDesNages = true;
      // Le palier de continuité est le bloc ÉPINGLÉ : `pinned` dit « la distance EST le
      // stimulus » (I14), donc c'est exactement la grandeur qu'on cherche à créditer.
      const cont = (s.steps ?? []).find((st) => st.role === "body" && st.bnd?.pinned && st.distanceM != null);
      if (!cont) return;
      const m = (cont.reps || 1) * (cont.distanceM || 0);
      if (fait) out.valideM = Math.max(out.valideM, m);      // cliquet : max, jamais min
      else out.manqueM = Math.max(out.manqueM, m);
    });
  }
  return out;
}

export interface ContinuityGate {
  /** Le seuil, en minutes : `min(30, durée de nage estimée en course)`. */
  seuilMin: number;
  /** La continuité déclarée, convertie par la MÊME vitesse. `null` = « je ne sais pas ». */
  declareMin: number | null;
  /** Durée de nage estimée en course, minutes. */
  courseMin: number;
  satisfait: boolean;
  /** Ce qui manque, en minutes (0 si satisfait). */
  manqueMin: number;
  /** D3 — d'où vient l'information, et les trois cas ne se valent pas. */
  source: "mesure" | "inconnue-assumee" | "absente";
  /** Le point de départ de la progression, en MÈTRES. Jamais une fraction de la course. */
  departM: number;
  /** La distance de course, en mètres. */
  courseM: number;
  /**
   * D3 §3 — LA PROGRESSION PEUT-ELLE ATTEINDRE LA DISTANCE DE COURSE DEPUIS `departM` ?
   * `null` quand la question n'a pas de sujet (continuité non mesurable) : on ne peut pas
   * affirmer qu'une progression ne peut PAS partir d'un point qu'on ne connaît pas.
   */
  franchissable: boolean | null;
  /** Ce que la rampe atteint au mieux depuis `departM`, en mètres — le chiffre du refus. */
  atteignableM: number;
}

const secOf = (v: unknown): number | null => {
  if (typeof v === "number" && isFinite(v) && v > 0) return v;
  const m = String(v ?? "").trim().match(/^(\d{1,2})[:'](\d{2})$/);
  return m ? +m[1] * 60 + +m[2] : null;
};

/**
 * LE GATE — `min(30 min, durée de nage estimée en course)`.
 *
 * POURQUOI PAS UN SEUIL UNIFORME À 30 MIN, ni une indexation par FORMAT : trois mécanismes font
 * le risque en eau libre et ils ne s'échelonnent pas pareil — le choc thermique (3 premières
 * minutes, identique pour tous), la désorganisation du geste par refroidissement (10 à 30 min),
 * la panique par méconnaissance (via l'écart). Pour un sprint de 15-25 min d'eau, seuls le
 * premier et le troisième pèsent ; pour un Full de 60-90 min, les trois pèsent lourdement.
 * 30 min uniformes seraient AU-DESSUS de ce que le sprint exige et EN DESSOUS de ce que le Full
 * mérite. La bonne grandeur n'est ni le format ni la distance : c'est **la durée d'exposition**,
 * que le prédicteur produit déjà.
 *   · formats courts — il faut tenir aussi longtemps que la course durera, ni plus ni moins ;
 *   · formats longs  — exiger la durée de course à l'ENTRÉE serait absurde (c'est l'objectif,
 *     pas le prérequis) : les 30 min de S10 servent de plancher, la progression construit le reste.
 *
 * ⚠ NOTE D'UNITÉ — LE SENS DE L'ERREUR DU REPLI EST LE BON, ET IL NE FAUT PAS LE « CORRIGER ».
 * Sans CSS déclaré, la conversion emploie `130 s/100 m`, qui est **plus RAPIDE** qu'un vrai
 * débutant. Le seuil converti en mètres est donc PLUS GRAND que ce que ce débutant couvrirait
 * réellement en 30 min : le gate lui demande un peu plus que son équivalent-30-minutes. Pour un
 * garde-fou de sécurité c'est la direction souhaitable — et c'est la SEULE occurrence de ce
 * dépôt où le biais connu de cette constante joue en faveur de l'athlète. Quelqu'un pourrait la
 * « corriger » ici en croyant bien faire : ce serait le défaut symétrique de celui qu'O-25 a fermé.
 *
 * ⚠ LE GATE ACCEPTE UNE PREUVE EN BASSIN, ET C'EST ASSUMÉ. `longest_swim_m` sera presque toujours
 * une nage en bassin — mur tous les 25 m, ligne d'eau, fond visible, arrêt possible à chaque
 * longueur —, alors que le seuil est dérivé d'une nage en EAU LIBRE (facteur `TRI_SWIM`). D'où la
 * surcharge : 780 m de bassin pour couvrir 750 m d'eau libre, soit le facteur du milieu (×1,04) et
 * rien d'autre. Elle disparaît quand `milieu === "ow"` : la preuve est alors déjà dans le bon
 * milieu. Ce que cette permissivité coûte est validé par la séance en conditions réelles.
 *
 * « JE NE SAIS PAS » NE SATISFAIT PAS LE GATE. C'est l'INVERSE du réflexe de tout le reste du
 * moteur, où l'absence a longtemps valu permission (le piège du zéro, R20.1-a). Justifié par O-17
 * lui-même : qui ne sait pas ce qu'il a nagé de plus long est, par définition, dans le membre
 * « ne peut pas évaluer le risque ». Le CSS absent, LUI, ne bloque pas — c'est une vitesse que le
 * moteur estime déjà partout ailleurs, pas une inconnue irréductible.
 */
export function continuityGate(a: {
  format?: unknown; css?: unknown; css_known?: unknown; longest_swim_m?: unknown;
  longest_swim_known?: unknown; milieu?: unknown;
}, weeks?: number): ContinuityGate | null {
  const leg = TRI_SWIM[String(a.format ?? "")];
  if (!leg) return null; // format inconnu : pas de distance de course, pas de gate
  const css = (a.css_known === "oui" ? secOf(a.css) : null) ?? B17_CSS_FALLBACK_SEC;
  // `milieu === "ow"` : la continuité déclarée est DÉJÀ en eau libre, la surcharge n'a pas lieu.
  // `mixte` ou absent : origine ambiguë, on prend le conservateur (avec surcharge).
  const facteur = a.milieu === "ow" ? 1 : leg.factor;
  const courseMin = ((leg.dist / 100) * css * leg.factor) / 60;
  const seuilMin = Math.min(S10_PREREQ.minSwimContinuousMin, ((leg.dist / 100) * css * facteur) / 60);
  const m = parseFloat(String(a.longest_swim_m ?? ""));
  const mesuree = a.longest_swim_known !== "non" && isFinite(m) && m > 0;
  // D3 §1 — « JE NE SAIS PAS » EST UN CHOIX, PAS UN CHAMP VIDE. Une absence par OUBLI et une
  // absence ASSUMÉE ne sont pas la même information, et le moteur les confondait. Elles ne
  // changent pas la conséquence (aucune ne satisfait le gate) mais elles changent ce qu'on DIT —
  // et c'est le message, pas la structure du plan, qui est le levier du moteur sur le jour J.
  const source: ContinuityGate["source"] = mesuree ? "mesure"
    : a.longest_swim_known === "non" ? "inconnue-assumee" : "absente";
  const declareMin = mesuree ? ((m / 100) * css) / 60 : null;
  const satisfait = declareMin != null && declareMin >= seuilMin - 0.05;

  // ---- D3 §3 — LA FRANCHISSABILITÉ, mesurée avec ce qui existe déjà ----
  // La continuité est une DISTANCE qui grandit d'une occurrence à la suivante ; la borner plus
  // vite que la croissance hebdomadaire que le moteur s'impose partout ailleurs (C22, +10 %)
  // serait produire ce que l'auditeur refuse. La travée utile n'est pas la course entière mais la
  // fin de la phase SPÉCIFIQUE (`B17_SPAN_PCT`, dérivé de `PHASE_PCTS`) : c'est là que tombe le
  // dernier palier, et une continuité découverte pendant l'affûtage n'a plus de valeur.
  const courseM = leg.dist;
  const spanSem = Math.max(1, Math.round(B17_SPAN_PCT * Math.max(1, weeks ?? 0)));
  const rampe = Math.pow(C22_MAX_WEEKLY_GROWTH, spanSem);
  const departMesure = mesuree ? Math.max(B17_DEPART_PLANCHER_M, m) : 0;
  // Continuité NON MESURABLE : on ne peut pas affirmer qu'une progression ne peut pas partir d'un
  // point qu'on ne connaît pas. Le départ est alors la rampe la plus DOUCE qui arrive quand même,
  // et le premier palier DEVIENT la mesure que l'athlète n'a pas su donner.
  const departM = mesuree ? departMesure
    : Math.max(B17_DEPART_PLANCHER_M, Math.min(courseM, Math.round(courseM / rampe)));
  const atteignableM = Math.round(departM * rampe);
  const franchissable = weeks == null ? null : mesuree ? atteignableM >= courseM : null;

  return {
    seuilMin, declareMin, courseMin, satisfait,
    manqueMin: satisfait ? 0 : Math.max(0, seuilMin - (declareMin ?? 0)),
    source, departM, courseM, franchissable, atteignableM,
  };
}

/**
 * LE NOMBRE DE PALIERS EST PROPORTIONNÉ À L'ÉCART, jamais fixe (arbitrage du fondateur, après la
 * mesure des occurrences disponibles). Mesuré : `tri/S` ne porte JAMAIS quatre « Nage seuil » en
 * phase spécifique, même à 22 semaines (1 à 3), alors que `tri/Full` en porte 8 à 14 dès son
 * horizon minimal. Un nombre fixe aurait donc refusé tous les `tri/S`.
 *
 * Le cas se dissout de lui-même parce que les deux grandeurs dérivent de la durée de nage du
 * format : **là où les paliers sont rares, l'écart est petit** (un sprint dont le gate exige déjà
 * la durée de course n'a presque rien à construire — 1 à 2 confirmations suffisent) ; **là où
 * l'écart est grand, les paliers abondent** (un Full entré à 30 min et devant atteindre 75).
 */
export function palierCount(g: ContinuityGate): number {
  if (!g) return 0;
  // D3 §3b — L'ÉCART SE MESURE EN MÈTRES, DEPUIS L'ATHLÈTE. Il se mesurait en minutes contre
  // `declareMin`, qui vaut `null` dès que la continuité n'est pas mesurable : l'écart valait alors
  // la course entière, quel que soit le départ réellement retenu.
  const reste = Math.max(0, g.courseM - g.departM);
  if (reste <= 0) return 1;                    // rien à construire : une confirmation
  const ratio = reste / Math.max(1, g.courseM);
  return ratio < 0.25 ? 2 : ratio < 0.5 ? 3 : B17_PALIERS_MAX;
}

/**
 * LE NOMBRE DE PALIERS RÉELLEMENT POSABLES — l'écart ET la place disponible.
 *
 * D3 — `palierCount` seul rendait un nombre que la phase spécifique ne pouvait pas porter : sur un
 * `tri/M` de 12 semaines, `spec` fait DEUX semaines et la progression en demandait quatre. Les
 * paliers se collapsaient sur les mêmes semaines, `positions.indexOf(idx)` ne rendait que le
 * PREMIER de chaque groupe, et **le dernier palier — celui qui vaut la distance de course —
 * n'était jamais posé** : la montée s'arrêtait à 1 200 m pour une épreuve de 1 500. Le nombre est
 * donc BORNÉ par la place, et les deux lecteurs (la décision affichée et la séance prescrite)
 * appellent CETTE fonction — R11.1, une seule dérivation.
 */
export function palierPosables(g: ContinuityGate, specWeeks: number): number {
  return Math.max(1, Math.min(palierCount(g), Math.max(1, specWeeks)));
}

/**
 * O-95 — LA DISPOSITION DES CRÉNEAUX DE CONTINUITÉ, EN UN POINT (annonce ET pose la lisent —
 * R11.1 : deux calculs de la même disposition avaient déjà produit O-84a, l'annonce comptant le
 * test comme un palier).
 *
 * Quand la continuité n'est pas mesurée, le premier créneau est le TEST (D3 : le test MESURE, le
 * palier CONSTRUIT). Mesuré (20/08/2026) : les 8 profils où l'eau libre tombait à la DERNIÈRE
 * semaine de spécifique ont TOUS une spec de 2 semaines — le test prenait la première, la
 * consigne eau libre se décalait au palier suivant, c'est-à-dire la dernière semaine avant le
 * pic. Découvrir l'eau libre à la dernière continue avant l'affûtage est le contraire du « tôt »
 * que B-17 promet, sur la population qui en a le plus besoin. Les deux pistes du ticket
 * (« décaler vers le milieu », « porter n à 3 quand spec ≥ 3 ») étaient VIDES pour cette
 * population — il n'y a rien à décaler dans une spec de 2 semaines.
 *
 * La forme : le test GLISSE en fin de DÉVELOPPEMENT — une mesure se prend le plus tôt possible,
 * c'est l'argument de D3 lui-même (« le moteur sait déjà réclamer une mesure ») et l'athlète
 * gagne du temps pour rapporter la distance. La spec porte alors 2 vrais paliers : l'eau libre
 * en PREMIÈRE semaine, la distance finale en dernière. La progression complète compte 3 pas
 * (test → palier eau libre → palier final), d'où `nProgression`.
 */
export function palierLayout(g: ContinuityGate, specWeeks: number, devWeeks: number): {
  /** le test se pose en fin de DEV (sinon : premier créneau de spec quand nTest = 1) */
  testEnDev: boolean;
  /** 1 si la source n'est pas mesurée (un test est prescrit), 0 sinon */
  nTest: number;
  /** nombre de créneaux de continuité posés EN SPEC (test compris quand il y est) */
  nSpec: number;
  /** taille de la progression complète, test compris — le `n` de palierDistanceM */
  nProgression: number;
} {
  const n = palierPosables(g, specWeeks);
  if (g.source === "mesure") return { testEnDev: false, nTest: 0, nSpec: n, nProgression: n };
  // Borné au défaut MESURÉ : n = 2 exactement (test + 1 seul palier, l'eau libre en dernière
  // semaine), et seulement si un développement existe pour recevoir le test. À n = 1 il n'y a
  // pas de progression à sauver ; à n ≥ 3 l'eau libre tombe déjà dans la première moitié.
  if (n === 2 && specWeeks >= 2 && devWeeks >= 1) return { testEnDev: true, nTest: 1, nSpec: 2, nProgression: 3 };
  return { testEnDev: false, nTest: 1, nSpec: n, nProgression: n };
}

/**
 * LA DISTANCE DU PALIER `i` SUR `n`, EN MÈTRES — interpolée entre le départ de l'athlète et la
 * distance de course, jamais lue dans une table.
 *
 * L'interpolation est GÉOMÉTRIQUE parce que la contrainte qui la borne l'est (C22 est un RAPPORT,
 * +10 % d'une semaine à la suivante) : une interpolation linéaire ferait des premiers pas énormes
 * en relatif pour un athlète qui part bas — exactement la population que ce correctif sert. Le
 * dernier palier vaut EXACTEMENT `courseM` par construction, ce que D2 vérifie au mètre près.
 */
export function palierDistanceM(g: ContinuityGate, i: number, n: number): number {
  if (n <= 1 || i >= n - 1) return g.courseM;
  const r = g.courseM / Math.max(1, g.departM);
  return Math.max(g.departM, Math.min(g.courseM, Math.round(g.departM * Math.pow(r, (i + 1) / n))));
}

/**
 * LE MESSAGE « BASSIN + EAU LIBRE » — restreint aux formats M et au-dessus.
 *
 * `milieu` décrit où l'athlète S'ENTRAÎNE, jamais où l'épreuve se nage, et **aucune clé ne porte
 * le second** (suivi en O-47 : `TRI_SWIM` applique déjà son facteur d'eau libre au sprint aussi,
 * donc un sprint nagé en piscine est prédit 4 % trop lent — une hypothèse silencieuse qui vaut son
 * ticket). M, 70.3 et Full se nagent en eau libre dans la quasi-totalité des cas : l'affirmation y
 * est vraie SANS cette clé. Le sprint est le seul format ambigu, et c'est précisément celui où le
 * message serait faux une fois sur deux — il n'y est donc pas affiché.
 *
 * Le conditionnel (« si ta course se nage en eau libre… ») a été écarté : un message qui s'ouvre
 * sur une réserve se lit comme une clause juridique et se saute. Mieux vaut un message qu'on
 * n'affiche que quand il est vrai qu'un message qu'on nuance.
 *
 * Les TROIS autres pièces (gate, séance en eau libre, surcharge) restent actives sur sprint : ce
 * sont des défauts CONSERVATEURS, et on peut se tromper par prudence. Le message, lui, AFFIRME —
 * et on ne peut pas se tromper en affirmant.
 */
export function poolOnlyNotice(a: { format?: unknown; milieu?: unknown }): string | null {
  const fmt = String(a.format ?? "");
  if (fmt !== "M" && fmt !== "70.3" && fmt !== "Full") return null;
  if (a.milieu !== "bassin") return null;
  return "Ta course se nage en eau libre et tu t'entraînes en bassin. Ton plan peut construire la "
    + "distance, pas le milieu — pas de mur, pas de ligne, pas de fond visible, et il faut lever la "
    + "tête pour se repérer. Une seule sortie en eau libre avant le jour J change tout, et plus "
    + "elle est tôt, mieux c'est.";
}

/**
 * O-56 §3 — **LA DIVERGENCE SE NOMME AU PREMIER PALIER MANQUÉ, PAS À LA FIN.**
 *
 * Un athlète qui saute ses continues et découvre en semaine 30 que son Full est rabattu a subi le
 * mode de défaillance qu'on ferme depuis des semaines : une conséquence juste, arrivée trop tard
 * pour être corrigée.
 *
 * ── LA CONTRAINTE QUI DÉCIDE DE LA FORMULATION ─────────────────────────────────────────────
 *
 * **Le moteur ne peut pas distinguer « il n'a pas nagé » de « il n'a pas journalisé ».** C'est la
 * même incertitude que `aDesNages` traite dans `swimEvidence`, et elle a une conséquence directe :
 *
 *     LE MESSAGE DOIT ÊTRE VRAI SOUS LES DEUX LECTURES.
 *
 * « Tu as sauté ta nage continue » n'est vrai que sous l'une — et sous l'autre, il reproche à
 * quelqu'un d'avoir mal utilisé l'application quelque chose qu'il a peut-être fait. Ce qui est vrai
 * sous les deux : **ce que vaut sa capacité validée, ce que le plan prescrit ensuite, et le temps
 * qui reste.** Trois FAITS, aucune implication — et le moteur n'a pas à avoir une opinion sur
 * l'athlète pour les énoncer.
 *
 * ⚠ ON ANNONCE LE PALIER QUE LE PLAN CONTIENT, jamais celui qu'une re-génération produirait. Au
 * moment où ce message s'affiche, le plan n'a pas été reconstruit : dire « la progression repart
 * de 1 000 » alors que la grille porte 1 400 serait faux à l'écran même où on le lit. La
 * reconstruction, elle, viendra du cliquet (§2) à la prochaine génération.
 *
 * ── OÙ ELLE VIT ────────────────────────────────────────────────────────────────────────────
 *
 *   la divergence RALENTIT la progression ....... déclaration LOCALE (ici)
 *   la divergence rend le format INATTEIGNABLE ... maillon de R20.2 — elle borne alors le plan
 *
 * Le premier cas n'a rien à faire dans la chaîne « ce qui borne ton pic » : il ne borne pas le
 * volume, il déplace une progression.
 *
 * ── LE MOMENT ──────────────────────────────────────────────────────────────────────────────
 *
 * L'AJUSTEUR QUOTIDIEN, pas une re-génération manuelle : un message qui n'apparaît qu'à la
 * re-génération n'apparaît jamais pour qui ne re-génère pas — et c'est la population qui en a le
 * plus besoin. Et un palier n'est « manqué » que lorsque sa semaine est PASSÉE : la détermination
 * porte sur le passé, jamais sur la semaine en cours.
 *
 * @param wkNum semaine courante du plan, 1-indexée
 */
export interface SwimDivergence {
  /** Le plus haut palier VALIDÉ, en mètres. */
  valideM: number;
  /** Le plus haut palier PRESCRIT dont la semaine est passée, sans ✓. */
  manqueM: number;
  /** Le prochain palier que le plan CONTIENT (semaine ≥ courante), 0 s'il n'y en a plus. */
  prochainM: number;
  /** La semaine de ce prochain palier, 0 s'il n'y en a plus. */
  prochaineSem: number;
  /** Semaines restantes dans le plan. */
  semainesRestantes: number;
  /** Le message, ou `null` s'il n'y a rien à dire. */
  message: string | null;
}
export function swimDivergence(
  plan: { weeks?: { num: number; days?: { jour?: string; sessions?: { d?: string; steps?: { role?: string; bnd?: { pinned?: boolean }; distanceM?: number | null; reps?: number }[] }[] }[] }[] } | null | undefined,
  done: Record<string, boolean> | null | undefined,
  wkNum: number,
): SwimDivergence {
  const out: SwimDivergence = { valideM: 0, manqueM: 0, prochainM: 0, prochaineSem: 0, semainesRestantes: 0, message: null };
  if (!plan?.weeks?.length) return out;
  const total = Math.max(...plan.weeks.map((w) => w.num));
  out.semainesRestantes = Math.max(0, total - wkNum);
  const d = done || {};
  for (const w of plan.weeks) for (const dy of w.days ?? []) {
    (dy.sessions ?? []).forEach((s, si) => {
      if (s.d !== "sw") return;
      const cont = (s.steps ?? []).find((st) => st.role === "body" && st.bnd?.pinned && st.distanceM != null);
      if (!cont) return;
      const m = (cont.reps || 1) * (cont.distanceM || 0);
      const fait = !!d[w.num + "|" + dy.jour + "|" + si];
      if (fait) { out.valideM = Math.max(out.valideM, m); return; }
      // PASSÉ seulement : un palier de la semaine en cours n'est pas manqué, il est à venir.
      if (w.num < wkNum) out.manqueM = Math.max(out.manqueM, m);
      else if (!out.prochaineSem || w.num < out.prochaineSem) { out.prochaineSem = w.num; out.prochainM = m; }
    });
  }
  // Rien à dire tant qu'aucun palier passé n'est resté sans ✓, ou si la capacité validée a déjà
  // dépassé ce palier (l'athlète l'a fait une autre semaine — le cliquet est MONOTONE).
  if (!out.manqueM || out.valideM >= out.manqueM) return out;
  const faits: string[] = [];
  faits.push(out.valideM > 0
    ? "Ta plus longue nage continue validée est de " + out.valideM + " m."
    : "Aucune nage continue n'est encore validée dans ce plan.");
  if (out.prochainM) faits.push("Le prochain palier de ton plan est de " + out.prochainM + " m, en semaine " + out.prochaineSem + ".");
  if (out.semainesRestantes > 0) faits.push("Il te reste " + out.semainesRestantes + " semaine" + (out.semainesRestantes > 1 ? "s" : "") + ".");
  out.message = faits.join(" ");
  return out;
}
