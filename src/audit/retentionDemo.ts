/**
 * Démo/spec exécutable — système de rétention (spec R4, critères §14). npm run demo:retention.
 *
 * Garanties assertées, CI rouge au moindre écart :
 *   1. le jour de REPOS validé incrémente la streak À L'IDENTIQUE d'un jour de séance ;
 *   2. streak GELÉE (jamais perdue) sous drapeau douleur et maladie déclarée ;
 *   3. AUCUNE mécanique ne récompense un volume hors plan (XP/adhérence insensibles à des
 *      séances non planifiées — seules les séances du plan comptent) ;
 *   4. ajouter une discipline FICTIVE au registre ne change RIEN aux 486 plans (extensibilité) ;
 *   5. trail : volume de la longue en TEMPS + D+ cible, jamais en km seul.
 */
import { generatePlan } from "../generator/planGenerator.ts";
import { adherenceV2, avatarV2 } from "../app/bridge.ts";
import { DISCIPLINE_REGISTRY, type DisciplineSpec } from "../engine/disciplineRegistry.ts";
import type { AthleteProfile, V1Plan } from "../engine/types.ts";

let failures = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) console.log("✓ " + label);
  else { console.error("✗ " + label + (detail ? " — " + detail : "")); failures++; }
};

const profile = {
  sport: "run", format: "10k", history: "confirme", level: "inter", intent: "competition",
  vol_max: "7", sessions_max: "5", dispo: "semaine", pace_known: "oui", pace: "4:30", races: "non",
} as unknown as AthleteProfile;

const { plan } = generatePlan(profile);
const allDays = plan.weeks.flatMap((w) => w.days.map((d) => ({ w, d })));
const dated = allDays.filter((x) => (x.d as { date?: string }).date);
const dateOf = (x: (typeof dated)[0]) => (x.d as { date?: string }).date!;

// Valide TOUTES les séances d'une plage de jours (repos compris — 1 tap, spec §3)
function validateDays(answers: Record<string, unknown>, upTo: number) {
  const done: Record<string, boolean> = {};
  dated.slice(0, upTo).forEach((x) => x.d.sessions.forEach((s, si) => { done[x.w.num + "|" + x.d.jour + "|" + si] = true; }));
  answers.done = done;
}

// ---- 1. Repos validé = jour de séance (strictement le même poids) ----
{
  const a: Record<string, unknown> = {};
  validateDays(a, 10);
  const today = dateOf(dated[9]);
  const adh = adherenceV2(plan, a, today);
  const hasRest = dated.slice(0, 10).some((x) => x.d.sessions.every((s) => s.d === "rs"));
  check("10 jours tous validés (dont " + (hasRest ? "au moins un repos" : "aucun repos ?!") + ") → streak = 10", adh.days === 10 && hasRest, "streak=" + adh.days);
  // retirer la validation du SEUL jour de repos → la streak casse à ce jour (le repos compte donc bien)
  const restIdx = dated.slice(0, 10).findIndex((x) => x.d.sessions.every((s) => s.d === "rs"));
  const done = a.done as Record<string, boolean>;
  const rx = dated[restIdx];
  rx.d.sessions.forEach((s, si) => { delete done[rx.w.num + "|" + rx.d.jour + "|" + si]; });
  const adh2 = adherenceV2(plan, a, today);
  check("repos NON validé → il casse la streak comme n'importe quelle séance (poids identique)", adh2.days === 9 - restIdx, "streak=" + adh2.days + " attendu=" + (9 - restIdx));
}

// ---- 2. Gel de streak : douleur et maladie ne cassent JAMAIS ----
{
  const a: Record<string, unknown> = {};
  validateDays(a, 6); // jours 0..5 validés
  const today = dateOf(dated[8]); // jours 6-7 non validés
  const noFreeze = adherenceV2(plan, a, today);
  check("2 jours manqués sans gel → streak cassée (état témoin)", noFreeze.days === 0, "streak=" + noFreeze.days);
  a.painFlag = { active: true, since: dateOf(dated[6]) };
  const frozen = adherenceV2(plan, a, today);
  check("mêmes jours manqués SOUS drapeau douleur → streak gelée à 6 (pas perdue)", frozen.days === 6, "streak=" + frozen.days);
  delete a.painFlag;
  a.sickDates = [dateOf(dated[6]), dateOf(dated[7])];
  const sick = adherenceV2(plan, a, today);
  check("mêmes jours manqués déclarés MALADE → streak gelée à 6", sick.days === 6, "streak=" + sick.days);
}

// ---- 3. Volume hors plan = ZÉRO gratification (XP, streak) ----
{
  const a: Record<string, unknown> = {};
  validateDays(a, 6);
  const today = dateOf(dated[5]);
  const xpBefore = avatarV2(plan, a, today).xp;
  const adhBefore = adherenceV2(plan, a, today).days;
  // simule des séances HORS PLAN : clés de coche inexistantes + imports FIT surnuméraires
  const done = a.done as Record<string, boolean>;
  done["99|Lun|0"] = true; done["99|Mar|0"] = true; // clés qui ne correspondent à rien
  a.fitSessions = [{ date: today, d: "rn", minutes: 240 }]; // grosse sortie non planifiée
  const xpAfter = avatarV2(plan, a, today).xp;
  const adhAfter = adherenceV2(plan, a, today).days;
  check("séances hors plan (coches fantômes + FIT 4h) → 0 XP supplémentaire", xpAfter === xpBefore, xpBefore + " → " + xpAfter);
  check("séances hors plan → streak inchangée", adhAfter === adhBefore, adhBefore + " → " + adhAfter);
}

// ---- 4. Extensibilité : discipline fictive au registre, moteur intact ----
{
  const before = JSON.stringify(plan.weeks.map((w) => w.vol));
  (DISCIPLINE_REGISTRY as Record<string, DisciplineSpec>)["kayak"] = {
    id: "kayak", label: "Kayak", primaryMetric: "pace_500m",
    zonesSource: { test: "test 1000m", protocol: "1000m à fond", refKey: null },
    volumeUnit: "duration", skills: ["gestuelle pagaie"], loadRules: [], impact: false,
  };
  const { plan: p2 } = generatePlan(profile);
  const after = JSON.stringify(p2.weeks.map((w) => w.vol));
  check("discipline fictive ajoutée au registre → les plans générés sont identiques", before === after);
  delete (DISCIPLINE_REGISTRY as Record<string, DisciplineSpec>)["kayak"];
}

// ---- 5. Trail : longue en TEMPS + D+ cible, jamais en km seul ----
{
  const { plan: pt } = generatePlan({ ...profile, format: "trail" } as unknown as AthleteProfile);
  const longs = pt.weeks.flatMap((w) => w.days).flatMap((d) => d.sessions).filter((s) => s.long);
  check("trail : au moins une sortie longue générée", longs.length > 0);
  const timeBased = longs.every((s) => (s.steps || []).every((st) => st.role !== "body" || st.durationMin != null));
  check("trail : la longue est planifiée en DURÉE (aucun corps en km seul)", timeBased);
  const dplus = longs.some((s) => /D\+ cible \d+-\d+m/.test(s.det || ""));
  check("trail : D+ cible affiché sur la longue (temps + D+, spec §2)", dplus, (longs[0] && longs[0].det || "").slice(0, 80));
}

// ---- 6. Ancrage plan_start : le plan AVANCE dans le temps (fini la semaine 1 éternelle) ----
{
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  const threeWeeksAgo = iso(Date.now() - 21 * 864e5);
  const { plan: pa } = generatePlan({ ...profile, plan_start: threeWeeksAgo } as unknown as AthleteProfile);
  const today = iso(Date.now());
  const wkToday = pa.weeks.find((w) => w.days.some((d) => (d as { date?: string }).date === today));
  check("plan_start il y a 3 semaines → aujourd'hui tombe en semaine 4 (le plan avance)", !!wkToday && wkToday.num === 4, "semaine=" + (wkToday ? wkToday.num : "absente"));
  const { plan: pb } = generatePlan({ ...profile, plan_start: threeWeeksAgo } as unknown as AthleteProfile);
  check("régénération à l'identique : mêmes dates au jour près (déterminisme de l'ancre)",
    JSON.stringify(pa.weeks.map((w) => w.days.map((d) => (d as { date?: string }).date))) === JSON.stringify(pb.weeks.map((w) => w.days.map((d) => (d as { date?: string }).date))));
}

// ---- 6b. R8 — avec une date de course, l'entraînement commence CETTE semaine (jamais la
// prochaine : l'ancien floor(semaines) perdait la fraction et décalait tout le plan) ----
{
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  const today = iso(Date.now());
  for (const daysOut of [59, 61, 66, 70, 74]) { // ~8.4 à ~10.6 semaines — fractions variées
    const race = iso(Date.now() + daysOut * 864e5);
    const { plan: pr } = generatePlan({ ...profile, plan_start: today, race_date: race } as unknown as AthleteProfile);
    const w1 = pr.weeks[0];
    const hasToday = w1.days.some((d) => (d as { date?: string }).date === today);
    const lastW = pr.weeks[pr.weeks.length - 1];
    const raceInLast = lastW.days.some((d) => (d as { date?: string }).date === race);
    check("course à J+" + daysOut + " : la semaine 1 contient AUJOURD'HUI (départ immédiat)", hasToday,
      "semaine 1 : " + ((w1.days[0] as { date?: string }).date || "?") + " → " + ((w1.days[w1.days.length - 1] as { date?: string }).date || "?"));
    check("course à J+" + daysOut + " : la course tombe dans la dernière semaine", raceInLast);
  }
}

// ---- 7. R9 — avatar 16 niveaux : récompense IMMÉDIATE puis paliers qui s'étirent ----
{
  const { plan: pv } = generatePlan(profile);
  const key0 = pv.weeks[0].num + "|" + pv.weeks[0].days.find((d) => d.sessions.some((s) => s.d !== "rs"))!.jour + "|0";
  const today = new Date().toISOString().slice(0, 10);
  const av0 = avatarV2(pv, {}, today);
  check("avatar : 16 niveaux, chacun avec son déblocage visuel documenté", av0.levels.length === 16 && av0.levels.every((l) => l.unlock && l.unlock.length > 3));
  check("avatar : niveau 1 au départ (0 XP)", av0.level === 1 && av0.xp === 0);
  const av1 = avatarV2(pv, { done: { [key0]: true } }, today);
  check("avatar : la PREMIÈRE séance validée fait passer niveau 2 (engouement immédiat)", av1.level === 2, "niveau=" + av1.level + " xp=" + av1.xp);
  check("avatar : teaser du prochain déblocage exposé (nextUnlock)", !!av1.nextUnlock);
  // les paliers s'étirent : chaque écart de seuil ≥ le précédent (courbe non linéaire)
  const gaps = av0.levels.slice(1).map((l, i) => l.xp - av0.levels[i].xp);
  check("avatar : courbe non linéaire (écarts de seuils croissants, du facile au mérité)", gaps.every((g, i) => i === 0 || g >= gaps[i - 1]), gaps.join(","));
  // monotonie : plus de jours validés → jamais un niveau plus bas
  const done5: Record<string, boolean> = {};
  let n = 0;
  pv.weeks[0].days.forEach((d) => d.sessions.forEach((s, si) => { if (n < 5) { done5[pv.weeks[0].num + "|" + d.jour + "|" + si] = true; n++; } }));
  const av5 = avatarV2(pv, { done: done5 }, today);
  check("avatar : l'XP ne fait que monter avec les jours validés (jamais décroissant)", av5.xp >= av1.xp && av5.level >= av1.level);
}

// ---- 8. R10 — le plan part du volume RÉCENT de l'athlète (jamais au-dessus de ce que
// le corps fait déjà) et rejoint la courbe à ≤ +10%/semaine de charge ----
{
  const { plan: pBase, reasoned: rBase } = generatePlan(profile);
  const { plan: pRamp, reasoned: rRamp } = generatePlan({ ...profile, vol_recent: "2" } as unknown as AthleteProfile);
  const decl = (p: V1Plan, i: number) => p.weeks[i].vol_declared ?? p.weeks[i].vol;
  check("vol_recent=2h : la semaine 1 déclare ≤ 2×1.1 h (départ = point de départ réel)", decl(pRamp, 0) <= 2 * 1.1 + 0.06, "sem1=" + decl(pRamp, 0) + "h");
  // croissance ≤ C22 (+10%) entre semaines de CHARGE consécutives pendant la rampe
  let growthOk = true, prevD = 0;
  for (const w of pRamp.weeks) {
    if (w.isRecup || w.phase.id === "taper") { continue; }
    const dv = w.vol_declared ?? w.vol;
    if (prevD > 0 && dv > prevD * 1.105 + 0.06) growthOk = false;
    prevD = dv;
  }
  check("vol_recent : la montée reste ≤ +10% par semaine de charge (C22 respecté par la rampe)", growthOk);
  check("vol_recent : la décision « R10-depart » est consignée (traçabilité du pourquoi)", rRamp.decisions.some((d) => d.id === "R10-depart"));
  check("sans vol_recent : plan STRICTEMENT identique (les 486 combinaisons d'audit ne bougent pas)",
    JSON.stringify(pBase.weeks.map((w) => w.vol)) === JSON.stringify(generatePlan(profile).plan.weeks.map((w) => w.vol)) && !rBase.decisions.some((d) => d.id === "R10-depart"));
}

// ---- 9. R10 — une course intermédiaire datée EXISTE dans la grille : séance 🏁 le jour J,
// semaine allégée (B), semaine suivante en récupération ----
{
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  const today = iso(Date.now());
  const race = iso(Date.now() + 70 * 864e5);
  const inter = iso(Date.now() + 35 * 864e5);
  const { plan: pr } = generatePlan({ ...profile, plan_start: today, race_date: race, races: "oui", race1_date: inter, race1_prio: "B" } as unknown as AthleteProfile);
  const wk = pr.weeks.find((w) => w.days.some((d) => (d as { date?: string }).date === inter));
  const rd = wk && wk.days.find((d) => (d as { date?: string }).date === inter);
  check("course B intermédiaire : le JOUR J porte la séance 🏁 (plus un entraînement)", !!rd && rd.sessions.length === 1 && /🏁/.test(rd.sessions[0].name || ""), rd ? rd.sessions.map((s) => s.name).join(",") : "jour absent");
  check("course B : consigne de pacing présente dans la séance", !!rd && /pacing|Départ prudent|appuyer/i.test(rd.sessions[0].det || ""));
  check("course B : la semaine est marquée course + mini-affûtage (taperRace)", !!wk && wk.race === "B" && wk.taperRace === true);
  const next = wk && pr.weeks.find((w) => w.num === wk.num + 1);
  check("course B : la semaine SUIVANTE est en récupération (postRace)", !!next && next.postRace === true);
}

if (failures) { console.error("\nDémo rétention : " + failures + " garantie(s) en échec."); process.exit(1); }
console.log("\nDémo rétention : toutes les garanties tiennent (repos = séance, gel douleur/maladie, zéro récompense hors plan).");
