/**
 * R22 — LA PRÉPARATION TRONQUÉE : le refus « course trop proche » devient franchissable.
 *
 * ================================================================================
 * CE QUI CHANGE, ET CE QUI NE CHANGE PAS
 * ================================================================================
 *
 * R11.4 refuse de générer quand il reste moins de semaines que le format n'en
 * demande. Le refus RESTE le comportement par défaut, mot pour mot : sans
 * `truncate_prep`, rien ne bouge. Ce module ajoute une SORTIE à ce refus, pour
 * l'athlète qui est déjà entraîné et qui le déclare.
 *
 * C'est un alignement sur O-17, pas une entorse : *« notre rôle est d'informer au
 * mieux et de laisser l'athlète choisir… le but n'est jamais de bloquer mais
 * d'accompagner, sauf si réelle mise en danger »*. Le critère du manifeste pour
 * qu'un blocage reste DUR est que « l'athlète ne peut pas évaluer le risque, ou
 * l'erreur est irréversible ». Or « ai-je déjà une base ? » est précisément une
 * question qu'un athlète sait trancher, et rater sa course n'est pas irréversible.
 * L'inverse l'est davantage : un athlète capable qu'on renvoie sans plan
 * s'entraînera seul, sans aucun garde-fou — et la régularité est priorité 3.
 *
 * ================================================================================
 * TROIS ÉCARTS AVEC LE BRIEF, MESURÉS
 * ================================================================================
 *
 * **1. Le seuil n'est PAS 16 semaines.** Il dépend du sport ET du format
 * (`MIN_WEEKS`, plus `T6_MIN_WEEKS` par catégorie d'effort en trail) :
 *
 *     5 km 6 · 10 km 8 · semi 12 · marathon 16 · tri S 8 · tri M 12
 *     70.3 20 · Ironman 36 · swimrun championship 30 …
 *
 * « 16 » est le cas du marathon. Une date de départ virtuelle à `course − 16
 * semaines` donnerait 20 semaines de trop à un Ironman et 10 de trop à un 5 km.
 * La date virtuelle est donc `course − need`, où `need` est lu à la source unique.
 *
 * **2. « Tronquer les 2 premières semaines » est le cas particulier de 14/16.**
 * Le nombre de semaines à retirer est `need − reste`. À 14 semaines sur un
 * marathon ça fait bien 2 ; sur un Ironman à 30 semaines ça en fait 6.
 *
 * **3. Un plancher ABSOLU unique de 8 semaines ne tient pas.** Il autoriserait un
 * Ironman préparé en 8 semaines — exactement ce que R11.4 existe pour refuser, et
 * ce que le refus appelle « te mentir, et te blesser ». Le plancher est donc
 * proportionné au format, et il est DÉRIVÉ plutôt qu'inventé :
 *
 *     on ne peut retirer que des semaines de MISE EN ROUTE,
 *     c'est-à-dire au plus la durée de la phase `base` (PHASE_PCTS, 30 %).
 *
 * C'est la formulation exacte du bandeau que le brief demande lui-même
 * (« les 2 premières semaines **de mise en route** ont été supprimées »). Au-delà,
 * on ne raccourcit plus la mise en route : on ampute le développement, et le plan
 * cesse d'être celui que l'auditeur a validé.
 *
 * Un plancher absolu de 8 semaines s'y ajoute quand le format en demande plus —
 * en dessous, aucune périodisation n'a de sens (il ne reste plus que l'affûtage et
 * le pic, R13.6 les plafonnant à 3 et 5). Il ne s'applique pas aux formats dont le
 * minimum est déjà ≤ 8 : bloquer un 5 km à 5 semaines au nom d'un plancher pensé
 * pour l'Ironman serait le sur-blocage que le manifeste reproche.
 *
 * Ce que ça donne :
 *
 *   | format          | need | retirable | plancher | 14 sem. | 10 sem. |
 *   |-----------------|------|-----------|----------|---------|---------|
 *   | marathon        |  16  |     4     |    12    |   ✅    |   ❌    |
 *   | semi            |  12  |     3     |     9    |   ✅    |   ✅    |
 *   | Ironman         |  36  |    10     |    26    |   ❌    |   ❌    |
 *   | 5 km            |   6  |     1     |     5    |   ✅    |   ✅    |
 *
 * Le cas limite du brief (10 semaines) est bien refusé sur un marathon.
 */
import { MIN_WEEKS, PHASE_PCTS } from "./constraintMatrix.ts";
import { T6_MIN_WEEKS, trailObjective } from "./trailModel.ts";
import type { AthleteProfile } from "./types.ts";

/**
 * Plancher absolu, en semaines. En dessous, il ne reste plus de quoi périodiser :
 * l'affûtage (≤3) et le pic (≤5) occuperaient tout le plan. Ne s'applique qu'aux
 * formats dont le minimum le dépasse.
 */
export const PLANCHER_ABSOLU_SEM = 8;

/**
 * La part de la phase de MISE EN ROUTE — la seule qu'on s'autorise à retirer.
 *
 * Lue À L'APPEL et non au chargement du module : le bundle est une concaténation à
 * portée unique, et `answerSchema` (qui importe ce fichier) y précède
 * `constraintMatrix`. Un `const` de tête aurait lu `PHASE_PCTS` avant son
 * initialisation — le build l'a refusé, ce pour quoi son auto-test existe.
 */
const partBase = () => PHASE_PCTS.find((p) => p.id === "base")!.pct;

export interface TruncatePlan {
  /** Semaines exigées par le format (source unique : MIN_WEEKS / T6_MIN_WEEKS). */
  need: number;
  /** Semaines réellement disponibles. */
  reste: number;
  /** Semaines de mise en route qu'on s'autorise à retirer, au plus. */
  retirable: number;
  /** Sous ce nombre de semaines, même le contournement reste refusé. */
  plancher: number;
  /** Le contournement est-il possible pour cette combinaison ? */
  possible: boolean;
  /** Semaines à retirer si le contournement est appliqué (0 si inutile). */
  aRetirer: number;
}

/** Le `need` du format — un seul point de lecture, trail compris. */
export function semainesRequises(sport: string, profile: AthleteProfile): number | undefined {
  if (sport === "trail") return T6_MIN_WEEKS[trailObjective(profile).category];
  return (MIN_WEEKS[sport as keyof typeof MIN_WEEKS] || {})[String(profile.format || "")];
}

/**
 * Décide si une préparation tronquée est possible, et de combien.
 * Fonction PURE : elle ne connaît ni le plan, ni l'UI, ni le drapeau de l'athlète.
 * C'est ce qui permet de l'appeler à la fois depuis le refus (pour proposer la
 * sortie) et depuis la génération (pour l'appliquer) sans écrire la règle deux fois.
 */
export function planTroncature(need: number | undefined, reste: number): TruncatePlan | null {
  if (!need || !isFinite(reste)) return null;
  const retirable = Math.floor(need * partBase());
  const plancherPhases = need - retirable;
  // Le plancher absolu ne mord que si le format demande davantage : sinon il
  // interdirait un contournement d'UNE semaine sur un 5 km.
  const plancher = need > PLANCHER_ABSOLU_SEM
    ? Math.max(plancherPhases, PLANCHER_ABSOLU_SEM)
    : plancherPhases;
  const possible = reste >= plancher && reste < need;
  return { need, reste, retirable, plancher, possible, aRetirer: possible ? need - reste : 0 };
}

/** Le motif du refus quand même le contournement est impossible. Jamais un reproche. */
export function motifPlancher(t: TruncatePlan): string {
  return "Il reste " + t.reste + " semaine(s), et même en supposant une base déjà acquise, "
    + "ce format n'est pas préparable en moins de " + t.plancher + " semaines : en dessous, "
    + "il ne reste plus que l'affûtage et le pic — un plan qui n'aurait de plan que le nom.";
}
