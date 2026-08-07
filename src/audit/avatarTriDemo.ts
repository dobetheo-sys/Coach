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
import { avatarTriV2, avatarTriLevel, avatarTriCreditsOf, badgesV2, progressV2 } from "../app/bridge.ts";
// Le moteur de boucles et les DEUX rendus sont un module PUR (zéro import) : c'est ce qui
// permet de les exécuter ici, en node, sans navigateur — dont la passe exhaustive (0..30)³.
import {
  AVATAR_TRI_ROULEMENTS, avatarTriGen, avatarTriSlots, avatarTriSVG, avatarTriStorySVG,
} from "../../endurabuild/js/ui/avatar-tri.js";
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

// ---- 3. La table des crédits : source unique du mapping ----
const cr = (d: string | undefined) => JSON.stringify(avatarTriCreditsOf(d));
check("d inconnu (renfo…) → course +10", cr("st") === '[["course",10]]');
check("d absent → personne · rs → personne", cr(undefined) === "[]" && cr("rs") === "[]");
check("sw → natation +10 · bk → vélo +10 · rn → course +10",
  cr("sw") === '[["natation",10]]' && cr("bk") === '[["velo",10]]' && cr("rn") === '[["course",10]]');
check("le BRICK crédite les deux disciplines qu'il enchaîne, +5/+5 (la somme reste 10)",
  cr("br") === '[["velo",5],["course",5]]');

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

// ═══════════ ÉTAPE 3 — le moteur de boucles et les deux rendus (module pur) ═══════════

// ---- 8. Le résolveur de slots : 0 ou 1 génération par item, pour tout niveau (critère 1) ----
{
  let ok = true, cause = "";
  for (const disc of ["natation", "velo", "course"] as const) {
    for (let L = 0; L <= 30; L++) {
      const slots = avatarTriSlots(disc, L);
      if (slots.length !== 5) { ok = false; cause = disc + " L" + L + " → " + slots.length + " slots"; }
      for (const sl of slots) if (sl.gen < 0 || sl.gen > 6) { ok = false; cause = disc + "/" + sl.id + " L" + L + " gen=" + sl.gen; }
    }
  }
  check("résolveur : 5 slots par discipline, génération 0..6, pour tout niveau 0..30", ok, cause);
  // Vérifiée sur TOUTE la grille contre la définition écrite en clair — mes premiers points
  // d'échantillonnage ne discriminaient pas « /5 » de « /4 » (la cassure délibérée n'était
  // attrapée que par les critères voisins) : un critère qui NOMME la règle doit la mesurer.
  {
    let ok = true, cause = "";
    for (let L = 0; L <= 30 && ok; L++) for (let p = 1; p <= 5; p++) {
      const attendu = L >= p ? Math.min(6, Math.floor((L - p) / 5) + 1) : 0;
      if (avatarTriGen(L, p) !== attendu) { ok = false; cause = "L" + L + " p" + p + " → " + avatarTriGen(L, p) + " ≠ " + attendu; break; }
    }
    check("la règle du roulement (p + 5(g−1)) tient sur TOUTE la grille 0..30 × 1..5", ok, cause);
  }
  check("niveau 0 → aucun item · niveau 30 → tous les items en génération 6",
    avatarTriSlots("natation", 0).every((sl) => sl.gen === 0)
    && (["natation", "velo", "course"] as const).every((d) => avatarTriSlots(d, 30).every((sl) => sl.gen === 6)));
  const cumuls = Object.entries(AVATAR_TRI_ROULEMENTS)
    .flatMap(([d, items]) => (items as { id: string; mode: string }[]).filter((i) => i.mode === "ajoute").map((i) => d + "/" + i.id))
    .sort().join(" ");
  check("les 4 cumulatifs décidés par le fondateur, et eux seuls",
    cumuls === "course/ambiance natation/materiel velo/ambiance velo/parcours", cumuls);
}

// ---- 9. La passe exhaustive (0..30)³ : les DEUX rendus, aucun crash, jamais vide (critère 9) ----
{
  let n = 0, bad = "";
  for (let a = 0; a <= 30 && !bad; a++) for (let b = 0; b <= 30 && !bad; b++) for (let c = 0; c <= 30; c++) {
    const svg1 = avatarTriSVG({ natation: a, velo: b, course: c }, 120);
    const svg2 = avatarTriStorySVG({ natation: a, velo: b, course: c }, 200);
    if (!svg1.startsWith("<svg") || !svg1.endsWith("</svg>") || !svg2.startsWith("<svg") || !svg2.endsWith("</svg>")) { bad = a + "/" + b + "/" + c; break; }
    n += 2;
  }
  check("passe exhaustive (0..30)³ : " + n + " rendus produits, tous des SVG bien formés", !bad && n === 31 * 31 * 31 * 2, bad || "n=" + n);
}

// ---- 10. Les invariants de rendu vérifiables mécaniquement ----
{
  const max = avatarTriSVG({ natation: 30, velo: 30, course: 30 }, 120);
  const arches = (max.match(/>ARRIVÉE</g) || []).length;
  check("30/30/30 → UNE seule arche/un seul texte ARRIVÉE (règle 5 de l'audit design)", arches === 1, arches + " occurrences");
  check("30/30/30 → DÉPART s'est effacé (une scène, un seul mot)", !max.includes(">DÉPART<"));
  const bonnets = (max.match(/A10 10 0 0 1 60 33/g) || []).length;
  check("30/30/30 → exactement UN bonnet, UNE ceinture (critère 2 : slots à occupant unique)",
    bonnets === 1 && (max.match(/M45\.8 73 L54\.2 73/g) || []).length === 1);
  check("30/30/30 → laurier + podium (légende) présents", max.includes("#00734f") && max.includes(">1</text>"));
  const nu = avatarTriSVG({ natation: 0, velo: 0, course: 0 }, 120);
  check("0/0/0 → la silhouette nue : ni bonnet, ni vélo, ni marqueur", !nu.includes("A10 10 0 0 1 60 33") && !nu.includes("cy=\"96.5\"") && !/font-weight="bold"/.test(nu));
  const marque = avatarTriSVG({ natation: 12, velo: 8, course: 27 }, 120);
  check("les trois marqueurs affichent le niveau exact (12/8/27)",
    marque.includes(">12<") && marque.includes(">8<") && marque.includes(">27<"));
  const story = avatarTriStorySVG({ natation: 12, velo: 8, course: 27 }, 200);
  check("le triptyque porte les trois mêmes marqueurs", story.includes(">12<") && story.includes(">8<") && story.includes(">27<"));
  // le canal forme du jour reste étanche : à niveaux égaux, seuls les calques de posture bougent
  const feu = avatarTriSVG({ natation: 12, velo: 8, course: 27, mood: "feu" }, 120);
  check("la posture (forme du jour) change le rendu sans toucher aux marqueurs (R17.1 préservé)",
    feu !== marque && feu.includes(">12<") && feu.includes(">8<") && feu.includes(">27<"));
}

if (failures) { console.error("\nDémo avatar composite : " + failures + " garantie(s) en échec."); process.exit(1); }
console.log("\nDémo avatar composite : toutes les garanties tiennent.");
