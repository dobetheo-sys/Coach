/**
 * PÉRIODISATION SUR LE CYCLE MENSTRUEL (R11.7 — décision produit du 30/07/2026).
 *
 * Pourquoi ce module existe : l'audit amont a montré que `cycle_sync` n'était JAMAIS lu par le
 * moteur. On demandait à une athlète une donnée intime, on lui affichait une carte de règle
 * « Périodisation cycle », et le plan était identique au bit près. Il fallait choisir : câbler,
 * ou retirer la question. La décision a été de câbler.
 *
 * CE QUE DIT LA LITTÉRATURE, ET CE QU'ELLE NE DIT PAS. La revue systématique de référence
 * (McNulty et al., 2020, *Sports Medicine* — 78 études) conclut à un effet **trivial** de la
 * phase du cycle sur la performance, avec une variabilité INTERINDIVIDUELLE bien plus grande
 * que l'effet moyen. Autrement dit : personne ne peut prédire depuis une application ce que
 * TOI tu ressens en phase lutéale. Toute périodisation qui prétend le contraire vend de la
 * certitude qu'elle n'a pas.
 *
 * Ce module en tire la seule conclusion défendable : **on ne change pas le VOLUME, on change le
 * PLACEMENT.** Les faits mieux établis que la performance elle-même :
 *   · phase lutéale tardive (prémenstruelle) : température centrale plus haute, thermorégulation
 *     dégradée, RPE plus élevé à charge égale, sommeil plus fragmenté ;
 *   · menstruations : très individuel — beaucoup de femmes performent normalement, certaines
 *     non. On ne PRESCRIT donc rien de particulier, on laisse la souplesse.
 *
 * D'où la règle : quand une semaine tombe majoritairement en phase lutéale tardive, la SECONDE
 * séance de qualité de cette semaine devient une séance facile, et le volume perdu revient
 * ailleurs (la courbe s'en charge). Rien de plus. C'est réversible d'un clic, et l'athlète
 * garde le dernier mot — c'est elle qui sait, pas nous.
 */
import type { AthleteProfile } from "./types.ts";

/** Longueur de cycle par défaut, quand elle n'est pas renseignée — médiane des populations. */
export const CYCLE_DEFAULT_LEN = 28;
/** Nombre de jours de phase lutéale TARDIVE en fin de cycle (fenêtre prémenstruelle). */
export const LUTEAL_LATE_DAYS = 6;

export type CyclePhase = "menstruation" | "folliculaire" | "luteale" | "luteale_tardive";

export interface CycleState {
  active: boolean;
  startISO?: string;
  lengthDays: number;
}

/** Lit l'état du cycle depuis les réponses. Inactif si la donnée manque — jamais deviné. */
export function readCycle(a: AthleteProfile): CycleState {
  const on = a.sex === "F" && String(a.cycle_sync || "non") === "oui";
  const start = typeof a.cycle_start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.cycle_start) ? a.cycle_start : undefined;
  const len = Math.round(Number(a.cycle_len) || CYCLE_DEFAULT_LEN);
  return {
    active: !!(on && start && len >= 21 && len <= 40),
    startISO: start,
    lengthDays: len >= 21 && len <= 40 ? len : CYCLE_DEFAULT_LEN,
  };
}

/** Jour du cycle (1 = premier jour des règles) pour une date donnée. */
export function cycleDay(c: CycleState, iso: string): number | null {
  if (!c.active || !c.startISO) return null;
  const t0 = new Date(c.startISO + "T00:00:00Z").getTime();
  const t = new Date(iso + "T00:00:00Z").getTime();
  if (!isFinite(t0) || !isFinite(t)) return null;
  const diff = Math.floor((t - t0) / 864e5);
  const m = ((diff % c.lengthDays) + c.lengthDays) % c.lengthDays;
  return m + 1;
}

export function phaseOf(c: CycleState, iso: string): CyclePhase | null {
  const d = cycleDay(c, iso);
  if (d == null) return null;
  if (d <= 5) return "menstruation";
  if (d <= Math.round(c.lengthDays / 2)) return "folliculaire";
  if (d <= c.lengthDays - LUTEAL_LATE_DAYS) return "luteale";
  return "luteale_tardive";
}

/**
 * Une semaine est « lutéale tardive » quand la MAJORITÉ de ses jours y tombe. On raisonne à la
 * semaine et non au jour : déplacer une séance la veille au soir parce qu'un compteur a changé
 * de case est le genre d'ajustement qui rend un plan illisible et anxiogène.
 */
export function weekIsLateLuteal(c: CycleState, dayISOs: string[]): boolean {
  if (!c.active || !dayISOs.length) return false;
  const n = dayISOs.filter((d) => phaseOf(c, d) === "luteale_tardive").length;
  return n * 2 > dayISOs.length;
}
