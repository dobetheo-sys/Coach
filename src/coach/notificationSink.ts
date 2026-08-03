/**
 * R21 §3 — LE CANAL DE NOTIFICATION, ET SON INTERFACE.
 *
 * ================================================================================
 * DEUX LIGNES, ET C'EST UNE CONTRAINTE, PAS UN STYLE
 * ================================================================================
 *
 * Le format est celui du handoff :
 *
 *   « Écart détecté : [métrique]. J'ai ajusté [séance] → [nouvelle séance].
 *     Raison : [motif]. »
 *
 * Une notification qu'on ne lit pas en entier au premier coup d'œil ne sert à
 * rien, et U16 a mesuré ce que coûte la densité : la version la plus dense de
 * l'app faisait 1,61 caractère par pixel rendu. `assertDeuxLignes()` fait échouer
 * la construction plutôt que d'émettre une notification trop longue — un contrôle
 * qui prévient ne vaut que s'il bloque (la leçon d'O-9).
 *
 * **Pas de jargon, pas de méthodologie.** Le handoff l'exclut explicitement, et
 * c'est cohérent avec le produit : « Bosquet 2007 » a sa place dans le code et
 * dans la carte « Pourquoi ce plan », pas dans une alerte de trois secondes.
 *
 * ================================================================================
 * POURQUOI UNE INTERFACE ALORS QU'IL N'Y A QU'UN CANAL
 * ================================================================================
 *
 * `NotificationSink` existe pour que le jour où un canal externe arrive
 * (WhatsApp, Telegram, push serveur), rien du coach n'ait à changer : il émet
 * une `CoachNotification`, il ne sait pas où elle va.
 *
 * Ce n'est PAS de l'abstraction spéculative gratuite : le dépôt a déjà tranché
 * que le push app fermée demande un backend (H-2, « on n'annonce pas ce qu'on ne
 * peut pas tenir »). L'interface est donc la forme honnête de cette dette — le
 * point d'ancrage est prêt, et rien ne prétend que le canal existe.
 *
 * Le MVP n'a qu'un puits : `InAppSink`, qui écrit dans une boîte de réception
 * lue par la PWA. Aucune permission navigateur n'est demandée : `notifications.js`
 * gère déjà le cas des notifications système, et en redemander une seconde fois
 * pour un autre motif serait la façon la plus sûre de se faire refuser les deux.
 */
import type { DeviationSignal } from "./deviationDetector.ts";

export interface CoachNotification {
  /** ISO — l'instant d'émission. */
  at: string;
  /** Les lignes, dans l'ordre. Deux au maximum, assertées. */
  lines: string[];
  /** Le signal qui l'a déclenchée : de quoi remonter à la cause sans la recopier. */
  signal: DeviationSignal;
  /** Vrai si un recalcul a effectivement eu lieu (sinon : information seule). */
  recalculated: boolean;
}

export interface NotificationSink {
  send(n: CoachNotification): void | Promise<void>;
}

/** Longueur au-delà de laquelle une « ligne » n'en est plus une sur un téléphone. */
const MAX_CAR_PAR_LIGNE = 120;

export function assertDeuxLignes(lines: string[]): void {
  if (lines.length === 0 || lines.length > 2)
    throw new Error("Notification R21 : " + lines.length + " ligne(s), le format en autorise 1 ou 2");
  for (const l of lines)
    if (l.length > MAX_CAR_PAR_LIGNE)
      throw new Error("Notification R21 : ligne de " + l.length + " caractères (max " + MAX_CAR_PAR_LIGNE + ") — « " + l.slice(0, 40) + "… »");
}

export interface RecalcSummary {
  /** Nom de la séance avant recalcul (celle que l'athlète connaissait). */
  before: string;
  /** Nom après recalcul, ou la même séance raccourcie. */
  after: string;
  /** Le motif, en une phrase, sans jargon. */
  reason: string;
}

/**
 * Fabrique les 1 ou 2 lignes. `recalc` absent = rien n'a été ajusté, et on le dit
 * plutôt que de laisser croire à une action : une notification qui annonce un
 * ajustement inexistant est pire qu'un silence.
 */
export function formatNotification(signal: DeviationSignal, recalc: RecalcSummary | null): CoachNotification {
  const l1 = "Écart détecté : " + signal.what + ".";
  const lines = recalc
    ? [l1, "J'ai ajusté " + recalc.before + " → " + recalc.after + ". Raison : " + recalc.reason]
    : [l1, signal.why];
  assertDeuxLignes(lines);
  return { at: new Date().toISOString(), lines, signal, recalculated: !!recalc };
}

/** Le puits du MVP : une boîte de réception in-app, bornée, sans permission requise. */
export class InAppSink implements NotificationSink {
  readonly inbox: CoachNotification[] = [];
  // Pas de propriété de paramètre (`constructor(private max)`) : Node exécute le
  // TypeScript en mode « strip-only » et la refuse. Contrainte du dépôt — zéro outil
  // de compilation —, pas un choix de style.
  readonly max: number;
  constructor(max = 30) { this.max = max; }
  send(n: CoachNotification): void {
    this.inbox.push(n);
    if (this.inbox.length > this.max) this.inbox.splice(0, this.inbox.length - this.max);
  }
}

/** Puits muet — sert aux mesures : détecter et recalculer sans rien émettre. */
export class NullSink implements NotificationSink {
  send(): void { /* volontairement vide */ }
}
