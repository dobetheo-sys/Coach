/**
 * R21 §2 — LE DÉCLENCHEUR DE RECALCUL, ET SA GARANTIE.
 *
 * ================================================================================
 * LA GARANTIE, AVANT TOUT LE RESTE : ON NE REMONTE JAMAIS LA CHARGE
 * ================================================================================
 *
 * `dailyAdjuster.ts` porte depuis le Sprint 2 une règle qui n'est pas négociable :
 *
 *     « <60 % → on n'essaie JAMAIS de rattraper le volume manqué (règle de coach) »
 *
 * et l'assertion qui la tient (`Invariant readiness violé`, jetée si un ajustement
 * produit plus de minutes qu'avant). Un déclencheur automatique qui répondrait à
 * « tu as raté trois séances » en ajoutant du volume ferait exactement ce que la
 * priorité n°2 du manifeste interdit — et il le ferait tout seul, la nuit, sans
 * que personne le regarde. C'est la raison pour laquelle **ce module ne sait que
 * réduire.**
 *
 * Conséquence assumée, et elle mérite d'être dite parce qu'elle nuance un critère
 * d'acceptation du handoff : un signal « en-dessous » (séance manquée, semaine
 * légère) DÉCLENCHE bien un recalcul — mais un recalcul qui allège la rampe à
 * venir, jamais un qui la charge. On ne récupère pas une séance perdue ; on cesse
 * de prescrire la suite comme si elle avait eu lieu. C'est la même chose qu'un
 * entraîneur fait, et c'est l'inverse de ce que fait un athlète laissé seul.
 *
 * ================================================================================
 * LA FENÊTRE DE 14 JOURS EST UNE BORNE, PAS UN BALAYAGE
 * ================================================================================
 *
 * « Recalcul de la fenêtre glissante 14 jours, PAS tout le plan » : la fenêtre
 * borne ce que le déclencheur a le droit de toucher. À l'intérieur, il ne modifie
 * que les jours qui le NÉCESSITENT — au plus `MAX_JOURS_TOUCHES`. Réduire
 * quatorze jours d'un coup sur un seul import serait une sur-réaction que
 * personne n'a demandée, et qui viderait deux semaines de plan sur une montre mal
 * calibrée.
 *
 * Les jours passés ne sont jamais touchés : on ne réécrit pas ce qui a eu lieu.
 *
 * ================================================================================
 * IL NE GÉNÈRE RIEN
 * ================================================================================
 *
 * Aucun appel au générateur, aucune re-planification : il RÉDUIT des séances
 * existantes, avec `reduceDay()` — la fonction que l'ajusteur du matin utilise
 * déjà. Deux façons de réduire une séance seraient deux définitions de
 * « réduire » (R11.1), et c'est le genre d'écart que ce dépôt a payé six fois.
 *
 * ================================================================================
 * TOUT EST JOURNALISÉ
 * ================================================================================
 *
 * Chaque recalcul produit un `RecalcLogEntry` : avant, après, raison en une
 * phrase. Un plan qui change sans que l'athlète puisse savoir pourquoi est
 * exactement le produit que ce dépôt refuse d'être.
 */
import type { Decision, ReasonedPlan, V1Day, V1Plan } from "../engine/types.ts";
import type { Refs } from "../generator/renderer.ts";
import { dayMinutes, reduceDay, sessionIntensity } from "../readiness/dailyAdjuster.ts";
import type { CompletedSession } from "../readiness/readinessSource.ts";
import {
  detectDeviations, signalMajeur,
  type DeviationSignal, type IngestedSession,
} from "./deviationDetector.ts";
import {
  formatNotification, type CoachNotification, type NotificationSink, type RecalcSummary,
} from "./notificationSink.ts";

/** Borne du handoff : la fenêtre glissante que le déclencheur a le droit de toucher. */
export const FENETRE_RECALC_J = 14;
/** Nombre maximum de jours réellement modifiés par événement. Voir l'en-tête. */
export const MAX_JOURS_TOUCHES = 3;

/**
 * Facteurs de réduction. Modestes et DIFFÉRENTS selon la cause :
 * une surcharge avérée justifie plus qu'un manque, parce qu'elle décrit une
 * fatigue déjà encaissée, tandis qu'un manque décrit une progression à ne pas
 * poursuivre comme si de rien n'était.
 */
const F_SURCHARGE = 0.85;
const F_MANQUE = 0.90;

export interface RecalcLogEntry {
  date: string;
  session_id: string;
  before: { name: string; minutes: number };
  after: { name: string; minutes: number };
  reason: string;
}

export interface CoachResult {
  signals: DeviationSignal[];
  /** Le signal retenu — celui qui a piloté la décision. */
  major: DeviationSignal | null;
  log: RecalcLogEntry[];
  notification: CoachNotification | null;
  decisions: Decision[];
}

const jourApres = (iso: string, n: number) =>
  new Date(new Date(iso + "T00:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);

/** Les jours STRICTEMENT à venir dans la fenêtre, dans l'ordre chronologique. */
function joursFenetre(plan: V1Plan, today: string): { day: V1Day & { date?: string }; week: V1Plan["weeks"][0]; idx: number }[] {
  const fin = jourApres(today, FENETRE_RECALC_J);
  const out: { day: V1Day & { date?: string }; week: V1Plan["weeks"][0]; idx: number }[] = [];
  for (const w of plan.weeks)
    w.days.forEach((d, idx) => {
      const dd = (d as { date?: string }).date;
      if (!dd || dd <= today || dd > fin) return;
      out.push({ day: d as V1Day & { date?: string }, week: w, idx });
    });
  return out.sort((a, b) => String(a.day.date).localeCompare(String(b.day.date)));
}

/**
 * Applique la réduction aux jours qui portent la charge — les séances de QUALITÉ
 * d'abord. Alléger un footing facile ne soulage rien : c'est l'intensité qui coûte,
 * et c'est elle qu'un athlète fatigué tient le moins bien. Même logique que
 * l'ajusteur, qui remplace la qualité et laisse le facile tranquille.
 */
export function recalculerFenetre(
  reasoned: ReasonedPlan, plan: V1Plan, today: string,
  facteur: number, raison: string,
): RecalcLogEntry[] {
  const refs: Refs = { ...reasoned.baseRefs };
  const log: RecalcLogEntry[] = [];
  const candidats = joursFenetre(plan, today)
    .filter(({ day }) => day.sessions.some((s) => {
      const i = sessionIntensity(s);
      return i === "difficile" || i === "moderee";
    }));
  for (const { day, week, idx } of candidats.slice(0, MAX_JOURS_TOUCHES)) {
    const avantNom = day.sessions.map((s) => s.name).join(" + ");
    const avantMin = dayMinutes(day);
    // `reduceDay` mute en place : on garde de quoi ANNULER. Sans ça, une violation
    // détectée laisserait derrière elle le jour déjà alourdi — l'assertion dirait la
    // vérité et le plan porterait quand même la charge ajoutée.
    const avantSteps = JSON.stringify(day.sessions.map((s) => s.steps));
    reduceDay(day, facteur, refs, reasoned.hz, reasoned.baseRefs);
    const apresMin = dayMinutes(day);
    // ── LA GARANTIE D'ABORD, LE RESTE ENSUITE. L'ORDRE EST LE CORRECTIF. ──
    //
    // Ma première écriture testait le « rien n'a bougé » AVANT la garantie :
    //
    //     if (apresMin >= avantMin - 0.5) continue;   // ← une HAUSSE passe ici
    //     if (apresMin > avantMin) throw …            // ← jamais atteint
    //
    // Une hausse satisfait la première condition, donc sortait par `continue` : elle
    // était appliquée au plan (`reduceDay` mute en place), non journalisée, et
    // l'assertion était du code mort. Mesuré : `reduceDay(f = 1.2)` fait passer un bloc
    // de 5 à 6 répétitions — la clause `Math.min` protège `durationMin` et `distanceM`,
    // PAS `reps`. La garantie n'est donc pas structurelle : cette ligne EST ce qui
    // sépare le plan d'une charge ajoutée automatiquement, la nuit, sans témoin.
    //
    // Douzième fois que ce dépôt paie la même leçon sous une autre forme : une garantie
    // placée après une sortie anticipée ne garantit rien.
    if (apresMin > avantMin + 0.5) {
      const restaure = JSON.parse(avantSteps) as V1Day["sessions"][0]["steps"][];
      day.sessions.forEach((s, i) => { s.steps = restaure[i]; });
      throw new Error("Invariant R21 violé : recalcul de fenêtre à la HAUSSE (" + avantMin.toFixed(1) + " → " + apresMin.toFixed(1) + " min)");
    }
    // Une réduction qui ne réduit rien n'est pas une entrée de journal : on ne
    // fabrique pas la preuve d'une action qui n'a pas eu lieu.
    if (apresMin >= avantMin - 0.5) continue;
    log.push({
      date: day.date!,
      session_id: week.num + "|" + day.jour + "|" + idx,
      before: { name: avantNom, minutes: Math.round(avantMin) },
      after: { name: day.sessions.map((s) => s.name).join(" + "), minutes: Math.round(apresMin) },
      reason: raison,
    });
  }
  return log;
}

export interface IngestInput {
  reasoned: ReasonedPlan;
  plan: V1Plan;
  refs: Refs;
  ingested: IngestedSession[];
  done?: Record<string, boolean>;
  completed?: CompletedSession[];
  today: string;
  sink: NotificationSink;
}

/**
 * Le point d'entrée : appelé APRÈS chaque ingestion de séance.
 *
 * Détecte → décide → recalcule (à la baisse, dans la fenêtre) → journalise →
 * notifie. Aucun de ces cinq gestes n'est optionnel, et l'ordre compte : notifier
 * avant de recalculer annoncerait un ajustement qui pourrait ne pas avoir lieu.
 */
export function onSessionIngested(input: IngestInput): CoachResult {
  const { reasoned, plan, refs, ingested, done, completed, today, sink } = input;
  const decisions: Decision[] = [];
  const D = (id: string, what: string, val: string | number, why: string) => decisions.push({ id, what, val, why });

  const signals = detectDeviations({ plan, refs, ingested, done, completed, today });
  const major = signalMajeur(signals);

  if (!major) {
    D("R21-aucun", "Aucune déviation", signals.length, "Ce qui a été fait correspond à ce qui était prévu : le plan ne bouge pas, et c'est une information en soi.");
    return { signals, major: null, log: [], notification: null, decisions };
  }

  D("R21-signal", "Déviation retenue", major.type + " " + major.direction, major.why);

  const surcharge = major.direction === "au-dessus";
  const facteur = surcharge ? F_SURCHARGE : F_MANQUE;
  const raison = surcharge
    ? "tu as encaissé plus que prévu, on laisse le corps encaisser"
    : "la progression repart d'où tu en es, sans rattrapage";

  const log = recalculerFenetre(reasoned, plan, today, facteur, raison);

  if (log.length) {
    D("R21-recalc", "Recalcul " + FENETRE_RECALC_J + " jours",
      log.length + " jour(s) allégé(s)",
      "Seuls les " + FENETRE_RECALC_J + " prochains jours sont concernés, et uniquement à la BAISSE : on ne rattrape jamais un volume manqué, et on n'ajoute jamais de charge sur une fatigue constatée.");
  } else {
    D("R21-sans-effet", "Rien à alléger", "0 jour",
      "Aucune séance de qualité dans les " + FENETRE_RECALC_J + " prochains jours : il n'y a rien à réduire, et on ne touche pas au reste pour faire quelque chose.");
  }

  const resume: RecalcSummary | null = log.length
    ? { before: log[0].before.name + " (" + log[0].before.minutes + " min)", after: log[0].after.minutes + " min", reason: raison }
    : null;
  const notification = formatNotification(major, resume);
  sink.send(notification);

  return { signals, major, log, notification, decisions };
}

/** Journal lisible — le format « avant / après / raison » demandé par le handoff. */
export function formatLog(log: RecalcLogEntry[]): string {
  if (!log.length) return "(aucun recalcul)";
  return log.map((e) =>
    e.date + "  " + e.session_id + "\n"
    + "    avant : " + e.before.name + " — " + e.before.minutes + " min\n"
    + "    après : " + e.after.name + " — " + e.after.minutes + " min\n"
    + "    raison : " + e.reason
  ).join("\n");
}
