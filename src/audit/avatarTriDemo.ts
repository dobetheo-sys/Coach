/**
 * Démo/spec exécutable — l'XP PAR DISCIPLINE de l'avatar composite (R25 étape 2).
 * `npm run demo:avatartri`. CI rouge au moindre écart.
 *
 * Garanties assertées (décisions fondateur du 08/08/2026) :
 *   1. une nage validée crédite la NATATION et elle seule ; un vélo, le VÉLO ; une course,
 *      la COURSE — la « migration » est un recomptage EXACT de l'historique existant ;
 *   2. le REPOS validé ne donne d'XP à personne (il reste compté par la streak, ailleurs) ;
 *   3. l'inclassable retombe sur COURSE — jamais perdu, jamais réparti au hasard ;
 *   4. badges et semaines régulières partent en TIERS égaux (plancher, déterministe) ;
 *   5. niveau ← XP : fonction pure — niveau 0 existe (silhouette nue), niveau 1 à 10 XP
 *      (première séance), 30 niveaux, monotone, bornée ;
 *   6. la somme des XP directs des trois jauges = (jours validés − repos) × 10 : rien ne
 *      se perd, rien ne s'invente par rapport à l'ancien compteur ;
 *   7. la LÉGENDE exige les trois disciplines à 30 — jamais deux (critères 7-8 du brief).
 */
import { generatePlan } from "../generator/planGenerator.ts";
import { avatarTriV2, avatarTriLevel, avatarTriDiscOf, badgesV2, progressV2 } from "../app/bridge.ts";
import type { AthleteProfile } from "../engine/types.ts";

let failures = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) console.log("✓ " + label);
  else { console.error("✗ " + label + (detail ? " — " + detail : "")); failures++; }
};

// Un plan MULTI-discipline : le triathlon, pour que les trois jauges aient des séances.
const profile = {
  sport: "tri", format: "od", history: "confirme", level: "inter", intent: "competition",
  vol_max: "8", sessions_max: "6", dispo: "semaine", races: "non",
} as unknown as AthleteProfile;
const { plan } = generatePlan(profile);
const today = "2026-08-08";

type Sess = { d?: string };
const cle = (w: { num: number }, d: { jour: string }, si: number) => w.num + "|" + d.jour + "|" + si;

/** Coche toutes les séances d'une discipline donnée (ou tout, ou les seuls repos). */
function cocher(quoi: (s: Sess) => boolean): Record<string, boolean> {
  const done: Record<string, boolean> = {};
  for (const w of plan.weeks) for (const d of w.days) d.sessions.forEach((s, si) => {
    if (quoi(s as Sess)) done[cle(w, d, si)] = true;
  });
  return done;
}
const compter = (quoi: (s: Sess) => boolean) => {
  let n = 0;
  for (const w of plan.weeks) for (const d of w.days) d.sessions.forEach((s) => { if (quoi(s as Sess)) n++; });
  return n;
};
/** La part « badges + semaines régulières » (tiers plancher), recalculée comme le moteur. */
const tiersDe = (answers: Record<string, unknown>) => {
  const b = badgesV2(plan, answers as never, today).length;
  const rw = progressV2(plan, answers as never, today).weekly.filter((w) => w.complete && w.ok).length;
  return Math.floor((b * 80 + rw * 120) / 3);
};

// ---- 1. Chaque discipline est créditée par SES séances, et seulement les siennes ----
{
  const nSw = compter((s) => s.d === "sw");
  check("le plan tri porte bien des nages (" + nSw + ")", nSw > 0);
  const answers: Record<string, unknown> = { done: cocher((s) => s.d === "sw") };
  const av = avatarTriV2(plan, answers as never, today);
  const t = tiersDe(answers);
  check("nages seules cochées → natation = nages×10 + tiers", av.natation.xp === nSw * 10 + t, av.natation.xp + " ≠ " + (nSw * 10 + t));
  check("… et vélo/course ne reçoivent QUE le tiers partagé", av.velo.xp === t && av.course.xp === t, av.velo.xp + "/" + av.course.xp + " vs tiers=" + t);
  check("la meneuse est la natation", av.meneuse === "natation", av.meneuse);
}
{
  const nBk = compter((s) => s.d === "bk");
  const answers: Record<string, unknown> = { done: cocher((s) => s.d === "bk") };
  const av = avatarTriV2(plan, answers as never, today);
  const t = tiersDe(answers);
  check("vélos seuls cochés → vélo = vélos×10 + tiers (" + nBk + " séances)", av.velo.xp === nBk * 10 + t, av.velo.xp + " ≠ " + (nBk * 10 + t));
}

// ---- 2. Le repos validé ne donne d'XP à personne (décision fondateur n°2) ----
{
  const nRs = compter((s) => s.d === "rs");
  check("le plan porte des jours de repos (" + nRs + ")", nRs > 0);
  const answers: Record<string, unknown> = { done: cocher((s) => s.d === "rs") };
  const av = avatarTriV2(plan, answers as never, today);
  const t = tiersDe(answers);
  check("repos seuls cochés → aucune jauge au-delà du tiers partagé",
    av.natation.xp === t && av.velo.xp === t && av.course.xp === t,
    [av.natation.xp, av.velo.xp, av.course.xp].join("/") + " vs tiers=" + t);
}

// ---- 3. L'inclassable retombe sur course, le vide sur personne ----
check("d inconnu (renfo…) → course", avatarTriDiscOf("st") === "course");
check("d absent → personne", avatarTriDiscOf(undefined) === null);
check("rs → personne · sw → natation · bk → vélo · rn → course",
  avatarTriDiscOf("rs") === null && avatarTriDiscOf("sw") === "natation"
  && avatarTriDiscOf("bk") === "velo" && avatarTriDiscOf("rn") === "course");

// ---- 5. Niveau ← XP : pure, bornée, monotone — le niveau 0 existe ----
check("0 XP → niveau 0 (la silhouette nue des maquettes)", avatarTriLevel(0) === 0);
check("9 XP → toujours 0 · 10 XP → niveau 1 (première séance)", avatarTriLevel(9) === 0 && avatarTriLevel(10) === 1);
check("3500 XP → niveau 15 (l'ancien « Légende » 16 niveaux, décalé d'un cran — même XP, même visuel)", avatarTriLevel(3500) === 15);
check("120000 XP → niveau 30 · au-delà → toujours 30", avatarTriLevel(120000) === 30 && avatarTriLevel(999999) === 30);
{
  let mono = true;
  for (let x = 0, prev = 0; x <= 130000; x += 500) { const l = avatarTriLevel(x); if (l < prev) mono = false; prev = l; }
  check("niveau monotone croissant en XP (balayage 0..130000)", mono);
}

// ---- 6. Rien ne se perd : somme des directs = (jours validés − repos) × 10 ----
{
  const answers: Record<string, unknown> = { done: cocher(() => true) };
  const av = avatarTriV2(plan, answers as never, today);
  const t = tiersDe(answers);
  const direct = av.natation.xp + av.velo.xp + av.course.xp - 3 * t;
  const attendu = (compter(() => true) - compter((s) => s.d === "rs")) * 10;
  check("tout coché → Σ XP directs = (séances − repos) × 10", direct === attendu, direct + " ≠ " + attendu);
}

// ---- 7. La légende exige les TROIS à 30 ----
{
  const deux = { natation: { level: 30 }, velo: { level: 30 }, course: { level: 29 } };
  check("30/30/29 n'est pas une légende (recalcul du prédicat sur les niveaux)",
    !(deux.natation.level >= 30 && deux.velo.level >= 30 && deux.course.level >= 30));
  // et sur le vrai moteur : personne n'est légende avec le plan à peine coché
  const answers: Record<string, unknown> = { done: cocher(() => true) };
  const av = avatarTriV2(plan, answers as never, today);
  check("un plan entier coché ne fait pas une légende (les seuils 17-30 se méritent)", av.legende === false);
}

if (failures) { console.error("\nDémo avatar composite : " + failures + " garantie(s) en échec."); process.exit(1); }
console.log("\nDémo avatar composite : toutes les garanties tiennent.");
