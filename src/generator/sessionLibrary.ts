/**
 * Bibliothèque de séances V2 — port sémantique de sess() (Coach_Pro_V1.5).
 * Steps structurés (R3.2), notes systématiques (manifeste : chaque séance s'explique),
 * bornes règle-porteuses sourcées de la matrice (C21/C23/C24), variantes
 * débutant/blessure/intention identiques au produit validé.
 */
import type { ReasonedPlan, V1Session, V1Step } from "../engine/types.ts";
import { intOf } from "./renderer.ts";
import { sportModule, type SessionKit } from "../sports/registry.ts";
// Import des modules de sport pour leur EFFET DE BORD (enregistrement dans le registre).
// Un seul endroit dans le projet connaît la liste des sports : celui-ci.
import "../sports/run/index.ts";
import "../sports/bike/index.ts";
import "../sports/swim/index.ts";
import "../sports/tri/index.ts";
import "../sports/trail/index.ts";

type Slot = "dur1" | "dur2" | "durLong" | "facileR" | "facile2" | "recup" | "off";

export interface SessionCtx {
  r: ReasonedPlan;
}

export function buildSessions(ctx: SessionCtx, slot: Slot, phase: string, prog: number, weekNum = 1): V1Session[] {
  const r = ctx.r;
  const a = r.profile;
  const sp = a.sport, fmt = a.format;
  const S2: V1Session[] = [];
  const lvl = a.level || "inter";
  const finisher = r.finisher;
  const beginner = r.beginner;
  const medHold = r.medHold;
  const dbl = r.dbl;
  const sessionScale = r.sessionScale;
  const inj = r.inj; // R6 (audit v6) — lecture UNIQUE des blessures, plus de motif dupliqué
  const noVo2 = r.noVo2; // R6.3 — mineur : la VO2max n'est jamais générée, l'alternative seuil/tempo prend le relais
  const _plioOK = lvl !== "debutant" && !finisher && !inj.impactAny;
  const G =
    phase === "base" ? "+ 4-6 strides 15s"
    : phase === "dev" ? "+ gammes (genoux, talons-fesses)"
    : phase === "spec" || phase === "peak" ? (_plioOK ? "+ foulées bondissantes + strides" : "+ gammes + strides (sans sauts)")
    : "";
  const P = (lo: number, hi: number) => Math.max(1, Math.round((lo + (hi - lo) * prog) * sessionScale));
  // builders de steps (mêmes sémantiques que V1.5)
  const W = (min: number, txt?: string): V1Step => ({ role: "warmup", durationMin: min, text: txt || "" });
  const Wm = (dist: number, txt?: string): V1Step => ({ role: "warmup", distanceM: dist, text: txt || "" });
  const C = (min: number, txt?: string): V1Step => ({ role: "cooldown", durationMin: min, text: txt || "" });
  const Cm = (dist: number, txt?: string): V1Step => ({ role: "cooldown", distanceM: dist, text: txt || "" });
  const B = (reps: number, dur: number, zone: string | null, recTxt?: string, sfx?: string): V1Step =>
    ({ role: "body", reps, durationMin: dur, zone, intensity: intOf(zone) as unknown as string, recoveryText: recTxt || "", suffix: sfx || "", prefix: "" }) as V1Step;
  const Bd = (reps: number, dist: number, zone: string | null, recTxt?: string, sfx?: string, unitKm?: boolean, disc?: string): V1Step =>
    ({ role: "body", reps, distanceM: Math.round(dist / 25) * 25, unitKm: !!unitKm, zone, intensity: intOf(zone) as unknown as string, recoveryText: recTxt || "", suffix: sfx || "", prefix: "", d: disc }) as V1Step;
  // Glossaire des éducatifs nage — accessible aux branches swim ET tri : nommer un
  // éducatif ne suffit pas, il faut dire comment le faire (manifeste : jamais muette).
  const swimDrillGlossary = "rattrapé (le bras devant reste tendu jusqu'au contact des mains avant de repartir : corrige le timing), poings fermés (main fermée : force l'appui par l'avant-bras), battements planche (jambes seules, planche tenue devant : isole et muscle le battement)";

  // R10 phase 1 — DISPATCH : les branches par sport ont quitté cette fonction pour
  // `src/sports/<sport>/`. Ce qui reste ici est la boîte à outils COMMUNE (builders de steps,
  // progression P, gammes G, glossaire nage) : elle est partagée, donc elle n'a aucune raison
  // d'être dupliquée par sport. Un sport inconnu lève (`UnknownSportError`) au lieu de
  // retourner un tableau vide, qui produisait des jours muets sans que personne le voie.
  const kit: SessionKit = {
    r, a, sp: sp as string, fmt, slot, phase, prog, weekNum,
    lvl, finisher, beginner, medHold, dbl, sessionScale, inj, noVo2, G, swimDrillGlossary,
    S2, P, W, Wm, C, Cm, B, Bd,
  };
  return sportModule(sp as string).buildSessions(kit);
}
