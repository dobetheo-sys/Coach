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
