/**
 * Boucle de réparation V2 — jamais de régénération aveugle (un générateur déterministe
 * reproduirait le même plan : boucle infinie par construction). L'audit dit QUOI est
 * cassé et OÙ ; la réparation vise ce point précis. Itérations plafonnées ; si les
 * contraintes sont insatisfaisables, on rend le MEILLEUR plan avec des avertissements
 * explicites — c'est un output de coaching précieux, pas un échec.
 */
import type { AthleteProfile, V1Plan } from "../engine/types.ts";
import { scaleStepDose } from "../engine/stepScale.ts";
import { auditPlan, type AuditOpts, type PlanAudit } from "../audit/coherenceScorer.ts";
import { guard, sportModule } from "../sports/registry.ts";
import { R313_TAPER_MAX_VS_PEAK } from "../engine/constraintMatrix.ts";
import { longRunSpecificityFloor } from "../engine/longRunSpecificity.ts";
import { generatePlan, normalizeRestMinutes, reconcileDeclaredVolume, syncDerivedLabels, shiftedBikeRp, _c30b } from "./planGenerator.ts";
import { renderSess, type Refs } from "./renderer.ts";
import { sealPlan } from "./seal.ts";
import { sessionLoad, type AthleteRefs } from "../engine/loadModel.ts";


export interface AuditedPlan {
  plan: V1Plan;
  audit: PlanAudit;
  warnings: string[];
  repairs: string[];
  decisions: { id: string; what: string; val: string | number; why: string }[];
}

const MAX_ITERATIONS = 3;

/** Minutes d'une semaine mesurées avec le MODÈLE DE L'AUDITEUR (récup inter-répétitions
 *  comprise) : c'est la seule base honnête quand on répare une violation qu'il a détectée. */
function auditWeekMin(w: V1Plan["weeks"][0], refs: Refs): number {
  const r2: AthleteRefs = { cssSecPer100m: refs.css || 130, thrPaceSecPerKm: refs.thrPace || 330 };
  return w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + sessionLoad(s, r2).minutes, 0), 0);
}

/** Réparations ciblées : violation → action locale sur le plan. Exporté pour la démo de sabotage. */
export function applyTargetedRepairs(plan: V1Plan, audit: PlanAudit, refs: Refs, hz: Record<string, string>, baseRefs: Refs, level?: string, volMaxH?: number): string[] {
  const applied: string[] = [];
  const beginner = level === "debutant";
  const swimFloorM = beginner ? 600 : 750; // C24/C24b — une réparation ne crée jamais une séance qui ne vaut pas le déplacement
  const swimCapM = beginner ? 850 : Infinity; // C15
  // Après toute réduction, une séance nage est ramenée dans sa fenêtre [plancher, plafond]
  const fixSwimBounds = (s: V1Plan["weeks"][0]["days"][0]["sessions"][0]): void => {
    if (s.d !== "sw" || !s.steps || !s.steps.length) return;
    const tot = () => s.steps!.reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
    const body = s.steps.filter((st) => st.role === "body" && st.distanceM != null).sort((x, y) => (y.reps || 1) * (y.distanceM || 0) - (x.reps || 1) * (x.distanceM || 0))[0];
    if (!body || !body.distanceM) return;
    const t0 = tot();
    if (t0 > 0 && t0 < swimFloorM) {
      const missing = swimFloorM - t0;
      if ((body.reps || 1) > 1) body.reps = (body.reps || 1) + Math.ceil(missing / body.distanceM);
      else body.distanceM = Math.ceil((body.distanceM + missing) / 25) * 25;
    } else if (t0 > swimCapM) {
      const excess = t0 - swimCapM;
      if ((body.reps || 1) > 1) body.reps = Math.max(1, (body.reps || 1) - Math.ceil(excess / body.distanceM));
      else body.distanceM = Math.max(100, Math.floor((body.distanceM - excess) / 25) * 25);
    }
  };

  // Affûtage trop lourd — deux visages du même mal : taperVsPeak > 0.6, ou une semaine
  // d'affûtage devenue la plus grosse du plan (échec « pic en phase peak »). Réparation :
  // rétrécir le CORPS des séances d'affûtage vers la cible R3.13, puis couper la fréquence.
  const wMinOf = (w: V1Plan["weeks"][0]) => w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0);
  const taperWeeks = plan.weeks.filter((w) => w.phase.id === "taper");
  const chargeMax = Math.max(0, ...plan.weeks.filter((w) => !w.isRecup && w.phase.id !== "taper").map(wMinOf));
  const taperTooHeavy = (audit.taperVsPeak !== null && audit.taperVsPeak > 0.6) || (!audit.peakInPeakPhase && taperWeeks.some((w) => wMinOf(w) > chargeMax * R313_TAPER_MAX_VS_PEAK));
  if (taperTooHeavy && chargeMax > 0) {
    for (const w of taperWeeks) {
      const target = chargeMax * R313_TAPER_MAX_VS_PEAK;
      if (wMinOf(w) > target) {
        // 1) rétrécir les corps de séance proportionnellement
        const f = Math.max(0.2, target / wMinOf(w));
        for (const d of w.days)
          for (const s of d.sessions) {
            if (!s.steps || !s.steps.length) continue;
            for (const st of s.steps) {
              if (st.role !== "body") continue;
              // §3 QUI_PAIE (18/08/2026) — les LEGS DE BRICK ont leurs bornes de format (C21b),
              // portées par `blockBounds` et non par `bnd` : les raboter ici avec un plancher
              // de 3 min passait SOUS la borne auditée. C'est l'écrivain du « brick vélo hors
              // bornes » de la dette D2 (44 et 41 min pour une borne basse à 45), antérieur au
              // lot — même doctrine que les passes sœurs de reconcileDeclaredVolume.
              if (st.leg) continue;
              if (st.durationMin) st.durationMin = Math.max(3, Math.round(st.durationMin * f));
              if (st.distanceM) st.distanceM = Math.max(100, Math.round((st.distanceM * f) / 25) * 25);
            }
            fixSwimBounds(s);
            renderSess(s, refs, hz, baseRefs);
          }
        applied.push("S" + w.num + " : corps des séances d'affûtage ×" + f.toFixed(2) + " (affûtage plus lourd que permis)");
      }
      // 2) si les planchers bloquent encore : la fréquence cède (R3.13)
      for (let g = 0; g < 4 && wMinOf(w) > chargeMax * R313_TAPER_MAX_VS_PEAK; g++) {
        // R15.7-B — jamais le jour de la VEILLE (Déverrouillage) : exclusion absolue, comme la course.
        const cand = w.days.filter((d) => d.charge === "facile" && !d.forced && d.sessions.some((s) => s.d !== "rs") && !d.sessions.some((s) => s.long || s.brick || /Déverrouillage/i.test(s.name || "")));
        if (!cand.length) break;
        const dayMin = (d: (typeof cand)[0]) => d.sessions.reduce((t, s) => t + (s.min || 0), 0);
        const victim = cand.reduce((x, y) => (dayMin(y) < dayMin(x) ? y : x));
        victim.charge = "off";
        victim.slot = "off";
        victim.sessions = [{ d: "rs", name: "OFF (affûtage)", det: "repos — la fraîcheur du jour J se construit maintenant", steps: [] }];
        applied.push("S" + w.num + " : jour facile → OFF (affûtage trop lourd)");
      }
    }
  }

  // D2 (audit v6) — tri : la semaine pic DOIT contenir le brick (spec audit 2). Les
  // cycles 10 jours / budgets serrés pouvaient le faire glisser hors du pic : on le
  // réintroduit en clonant le brick d'une semaine voisine à la place de la longue.
  if (audit.peakHasBrick === false) {
    const peakAudits = audit.weeks.filter((w) => w.phaseId === "peak");
    const ref = audit.peak && audit.peak.phaseId === "peak" ? audit.peak : peakAudits.reduce((a, b) => (b.prescribedMin > (a?.prescribedMin ?? 0) ? b : a), null as (typeof peakAudits)[0] | null);
    const wk = ref ? plan.weeks.find((w) => w.num === ref.num) : undefined;
    const donor = plan.weeks.flatMap((w) => w.days.flatMap((d) => d.sessions)).find((s) => s.brick && s.steps && s.steps.length);
    if (wk && donor) {
      const target = wk.days.find((d) => d.sessions.some((s) => s.long && !s.brick)) || wk.days.find((d) => !d.forced && d.sessions.some((s) => s.d !== "rs" && !s.brick && !s.long));
      if (target) {
        const clone = structuredClone(donor);
        renderSess(clone, refs, hz, baseRefs);
        target.sessions = [clone];
        target.charge = "dur";
        applied.push("S" + wk.num + " : brick réintroduit dans la semaine pic (spec audit 2 — il avait glissé hors du pic)");
        // le brick ajouté ne crée ni saut de charge ni dépassement de vol_max (C3)
        const prevW = plan.weeks.filter((w) => w.num < wk.num && !w.isRecup && w.phase.id !== "taper").pop();
        if (prevW) {
          const cap = Math.min(wMinOf(prevW) * 1.1, volMaxH ? volMaxH * 60 : Infinity);
          for (let g = 0; g < 4 && wMinOf(wk) > cap; g++) {
            const f = Math.max(0.6, cap / wMinOf(wk));
            for (const d of wk.days)
              for (const s of d.sessions) {
                if (!s.steps || !s.steps.length) continue;
                for (const st of s.steps) {
                  if (st.role !== "body") continue;
                  scaleStepDose(st, f, { repsMode: "floor", durFloor: 8, distFloor: 200, clampToOriginal: true });
                }
                fixSwimBounds(s);
                renderSess(s, refs, hz, baseRefs);
              }
          }
        }
      }
    }
  }

  // D2 (audit v6) — la semaine de volume max doit tomber en phase peak : si une semaine
  // hors peak dépasse la meilleure semaine peak, son corps est réduit juste sous elle.
  if (!audit.peakInPeakPhase && audit.peak && audit.peak.phaseId !== "peak") {
    const peakBest = Math.max(0, ...audit.weeks.filter((w) => w.phaseId === "peak").map((w) => w.prescribedMin));
    const offender = plan.weeks.find((w) => w.num === audit.peak.num);
    if (offender && peakBest > 0 && audit.peak.prescribedMin > 0) {
      // f ≤ 0.97 TOUJOURS : une « réduction » ne remonte jamais le volume (bug mesuré ×1.27)
      const f = Math.min(0.97, Math.max(0.5, (peakBest * 0.92) / audit.peak.prescribedMin));
      for (const d of offender.days)
        for (const s of d.sessions) {
          if (!s.steps || !s.steps.length) continue;
          for (const st of s.steps) {
            if (st.role !== "body") continue;
            // §3 QUI_PAIE (18/08/2026) — troisième site du même raboteur : les legs de brick
            // portent leurs bornes de format (C21b) dans `blockBounds`, et `durFloor: 10`
            // passait dessous (45 → 38 min mesuré, « brick hors bornes »). Si la réduction ne
            // suffit plus sans le brick, le repli ci-dessous (retrait d'une séance, qui
            // épargne déjà longue/brick/course) prend le relais.
            if (st.leg) continue;
            scaleStepDose(st, f, { repsMode: "floor", durFloor: 10, distFloor: 200, clampToOriginal: true });
          }
          fixSwimBounds(s);
          renderSess(s, refs, hz, baseRefs);
        }
      applied.push("S" + offender.num + " (" + audit.peak.phaseId + ") : volume réduit ×" + f.toFixed(2) + " — la semaine max doit rester en phase peak");
      // planchers de séance (nage surtout) : si le scaling ne peut pas mordre (f proche
      // de 1, séances au plancher), la fréquence cède — mais BORNÉE : jamais sous 0.9×
      // la semaine peak de référence (la version précédente pouvait vider la semaine, S4 → 0min).
      const bestPeakWk = plan.weeks.filter((w) => w.phase.id === "peak").sort((x, y) => wMinOf(y) - wMinOf(x))[0];
      for (let g = 0; g < 2 && bestPeakWk && wMinOf(offender) > wMinOf(bestPeakWk); g++) {
        let victim: { d: (typeof offender.days)[0]; si: number; min: number } | null = null;
        for (const d of offender.days) {
          if (d.forced) continue;
          d.sessions.forEach((s, si) => {
            // R13.4 : une course (min=0) n'est jamais une victime de coupe — la VEILLE non plus (R15.7-B).
            if (s.d === "rs" || s.long || s.brick || s.race || /Déverrouillage/i.test(s.name || "")) return;
            const m = s.min || 0;
            if (!victim || m < victim.min) victim = { d, si, min: m };
          });
        }
        if (!victim) break;
        const v = victim as { d: (typeof offender.days)[0]; si: number; min: number };
        if (wMinOf(offender) - v.min < wMinOf(bestPeakWk) * 0.9) break;
        v.d.sessions.splice(v.si, 1);
        if (!v.d.sessions.some((s) => s.d !== "rs")) {
          v.d.charge = "off";
          v.d.sessions = [{ d: "rs", name: "OFF (équilibre du bloc)", det: "repos — la semaine la plus grosse du plan reste la semaine de peak", steps: [] }];
        }
        applied.push("S" + offender.num + " : séance retirée — la semaine max doit rester en phase peak (les planchers bloquaient la réduction)");
      }
    }
  }

  // D2/D3 (audit v6) — saut de volume réel > seuil dur entre semaines de charge : la
  // semaine fautive est ramenée juste sous le seuil (mesure de l'auditeur, réparation plan).
  if (audit.auditJumpsHard > 0) {
    let prev: (typeof audit.weeks)[0] | null = null;
    for (const wa of audit.weeks) {
      if (wa.isRecup || wa.phaseId === "taper") continue;
      if (prev && prev.prescribedMin > 0 && wa.prescribedMin > prev.prescribedMin * 1.25) {
        const wk = plan.weeks.find((w) => w.num === wa.num);
        if (wk) {
          const f = Math.max(0.5, (prev.prescribedMin * 1.2) / wa.prescribedMin);
          for (const d of wk.days)
            for (const s of d.sessions) {
              if (!s.steps || !s.steps.length) continue;
              for (const st of s.steps) {
                if (st.role !== "body") continue;
                scaleStepDose(st, f, { repsMode: "floor", durFloor: 10, distFloor: 200, clampToOriginal: true });
              }
              fixSwimBounds(s);
              renderSess(s, refs, hz, baseRefs);
            }
          applied.push("S" + wk.num + " : saut de charge lissé ×" + f.toFixed(2) + " (manifeste : progression sans à-coups)");
          // Si les planchers de séance bloquent la réduction (nage surtout : fenêtre
          // [600, 850]m), la FRÉQUENCE cède — mesuré sur la métrique de l'auditeur, qui
          // compte la récup inter-répétitions que le générateur ne voit pas.
          const nSess = () => wk.days.reduce((t, d) => t + d.sessions.filter((x) => x.d !== "rs").length, 0);
          const est = () => auditWeekMin(wk, refs);
          for (let g = 0; g < 3 && est() > prev.prescribedMin * 1.2 && nSess() > 3; g++) {
            let victim: { d: (typeof wk.days)[0]; si: number; min: number } | null = null;
            for (const d of wk.days) {
              if (d.forced) continue;
              d.sessions.forEach((x, si) => {
                if (x.d === "rs" || x.long || x.brick) return;
                const m = x.min || 0;
                if (!victim || m < victim.min) victim = { d, si, min: m };
              });
            }
            if (!victim) break;
            const v = victim as { d: (typeof wk.days)[0]; si: number; min: number };
            v.d.sessions.splice(v.si, 1);
            if (!v.d.sessions.some((x) => x.d !== "rs")) {
              v.d.charge = "off";
              v.d.sessions = [{ d: "rs", name: "OFF (lissage de charge)", det: "repos — la progression se fait sans à-coups : cette semaine ne bondit pas sur la précédente", steps: [] }];
            }
            applied.push("S" + wk.num + " : séance retirée (saut de charge que les planchers empêchaient de lisser)");
          }
        }
      }
      prev = wa;
    }
  }

  // D10 (audit v6) — la réparation ne casse JAMAIS la monotonie de l'affûtage : chaque
  // semaine d'affûtage repart ≤ la semaine précédente. La réparation ci-dessus vise
  // chaque semaine indépendamment (cible 0.55×pic) ; planchers et quantification des
  // répétitions pouvaient laisser S(n+1) > S(n). Corps réduits (répétitions comprises),
  // puis la plus petite séance non-longue cède si les planchers bloquent encore.
  {
    let prevMin = 0;
    for (const w of plan.weeks) {
      const m0 = wMinOf(w);
      if (w.phase.id !== "taper" || prevMin <= 0 || m0 <= prevMin) { prevMin = m0; continue; }
      for (let g = 0; g < 6 && wMinOf(w) > prevMin; g++) {
        const f = Math.max(0.5, (prevMin * 0.97) / wMinOf(w));
        for (const d of w.days)
          for (const s of d.sessions) {
            if (!s.steps || !s.steps.length) continue;
            for (const st of s.steps) {
              if (st.role !== "body") continue;
              if (st.leg) continue; // §3 QUI_PAIE — même exclusion que ci-dessus (bornes C21b)
              if (st.reps && st.reps > 1) st.reps = Math.max(1, Math.floor(st.reps * f));
              else if (st.durationMin) st.durationMin = Math.max(3, Math.round(st.durationMin * f));
              else if (st.distanceM) st.distanceM = Math.max(100, Math.round((st.distanceM * f) / 25) * 25);
            }
            fixSwimBounds(s);
            renderSess(s, refs, hz, baseRefs);
          }
      }
      for (let g = 0; g < 4 && wMinOf(w) > prevMin; g++) {
        let victim: { d: V1Plan["weeks"][0]["days"][0]; si: number; min: number } | null = null;
        for (const d of w.days)
          d.sessions.forEach((s, si) => {
            if (s.d === "rs" || s.long || s.brick || s.race) return; // R13.4 : une course (min=0) n'est jamais une victime de coupe
            const m = s.min || 0;
            if (!victim || m < victim.min) victim = { d, si, min: m };
          });
        if (!victim) break;
        const v = victim as { d: V1Plan["weeks"][0]["days"][0]; si: number; min: number };
        v.d.sessions.splice(v.si, 1);
        if (!v.d.sessions.some((s) => s.d !== "rs")) {
          v.d.charge = "off";
          v.d.sessions = [{ d: "rs", name: "OFF (affûtage)", det: "repos — la fraîcheur du jour J se construit maintenant", steps: [] }];
        }
        applied.push("S" + w.num + " : séance retirée (l'affûtage ne remonte jamais)");
      }
      if (wMinOf(w) < m0) applied.push("S" + w.num + " : affûtage ramené sous la semaine précédente (" + Math.round(m0) + "→" + Math.round(wMinOf(w)) + "min)");
      prevMin = wMinOf(w);
    }
  }

  // Séance muette → note générique honnête (le manifeste exige l'explication)
  for (const w of plan.weeks)
    for (const d of w.days)
      for (const s of d.sessions) {
        if (s.d === "rs" || s.note || (s.det || "").includes("💡")) continue;
        s.note = "Séance d'endurance au service du bloc en cours : régularité avant tout.";
        if (s.steps && s.steps.length) renderSess(s, refs, hz, baseRefs);
        else s.det = (s.det || "") + " — 💡 " + s.note;
        applied.push("S" + w.num + " : note ajoutée à « " + s.name + " »");
      }

  return applied;
}

/** Génère, audite, répare de façon ciblée, et rend toujours un résultat honnête. */
export function generateAudited(profile: AthleteProfile, auditOpts?: Partial<AuditOpts>): AuditedPlan {
  const { plan, reasoned } = generatePlan(profile);
  const opts: AuditOpts = {
    sport: profile.sport,
    format: profile.format,
    level: profile.level,
    // C26b — l'auditeur doit savoir ce qui LIMITE cet athlète : sans `history` ni `injured`,
    // il jugerait un débutant qui reprend avec le plafond de temps dur d'un compétiteur.
    history: profile.history,
    injured: !!(profile.injury && profile.injury !== "aucune" && profile.injury !== ""),
    refs: { cssSecPer100m: reasoned.baseRefs.css || 130, thrPaceSecPerKm: reasoned.baseRefs.thrPace || 330 },
    ...auditOpts,
  };
  // O-11 / R20.5 — même bande « allure course » qu'à la génération : la boucle de réparation
  // re-rend des séances, elle ne doit pas les re-rendre avec une AUTRE définition de bk.rp.
  const refs: Refs = { ...reasoned.baseRefs, bikeRp: shiftedBikeRp(String(reasoned.profile.sport), reasoned.profile.format, reasoned.profile) };
  let audit = auditPlan(plan, opts);
  const repairs: string[] = [];
  let best = { plan, audit };

  for (let it = 0; it < MAX_ITERATIONS && audit.hardViolations.length > 0; it++) {
    const applied = applyTargetedRepairs(plan, audit, refs, reasoned.hz, reasoned.baseRefs, profile.level, parseInt(profile.vol_max || "10") || 10);
    if (!applied.length) break; // aucune réparation applicable : inutile de boucler
    repairs.push(...applied);
    audit = auditPlan(plan, opts);
    if (audit.hardViolations.length < best.audit.hardViolations.length || audit.score > best.audit.score) best = { plan, audit };
  }

  const warnings: string[] = [...(reasoned.warnings || [])];
  if (best.audit.hardViolations.length > 0) {
    warnings.push("Plan rendu avec réserves (contraintes insatisfaisables après " + MAX_ITERATIONS + " réparations) :");
    warnings.push(...best.audit.hardViolations.map((v) => "· " + v));
  }
  // Les passes de réparation créent des séances de repos : le contrat `min` se re-normalise à
  // la sortie, pas seulement dans le générateur (R4.8a).
  normalizeRestMinutes(best.plan);
  // R5.3 — la courbe ANNONCÉE se réconcilie avec le prescrit une fois les réparations passées :
  // `reduceDay` et `applyTargetedRepairs` changent encore des durées, et un écart figé avant
  // elles ment à l'athlète dès la première réparation (même leçon que R5.1).
  // C30b — la cible de spécificité est passée ICI AUSSI. Sans elle, le dernier appel à
  // `reconcileDeclaredVolume` rejoue toutes les autres garanties et rescale les semaines une
  // dernière fois : la longue portée à sa cible juste avant redescendait de quelques minutes,
  // et le seul point du pipeline dont la sortie est LIVRÉE ne portait pas la garantie.
  const _spec30f = String(reasoned.profile.sport) === "run"
    ? longRunSpecificityFloor(String(reasoned.profile.format ?? ""), reasoned.baseRefs.thrPace, 0, Number.MAX_SAFE_INTEGER, parseFloat(String(reasoned.profile.vol_max ?? "")) || undefined)
    : null;
  reconcileDeclaredVolume(best.plan, warnings, (s) => renderSess(s, refs, reasoned.hz, reasoned.baseRefs), { longSpecTargetMin: _spec30f ? _spec30f.target : undefined, swimFloors: guard(reasoned.profile.sport as string, "swimSessionFloors"), format: reasoned.profile.format, beginner: reasoned.beginner, medHold: reasoned.medHold, keepTaperSwim: guard(reasoned.profile.sport as string, "swimRacePrepFrequency") && !reasoned.dbl && !reasoned.medHold, mainDiscipline: sportModule(reasoned.profile.sport as string).mainDiscipline, disciplines: sportModule(reasoned.profile.sport as string).disciplines, sessionsMaxDeclared: parseInt(String(reasoned.profile.sessions_max ?? "")) || undefined, history: reasoned.profile.history, level: reasoned.profile.level, injured: reasoned.inj.count > 0, refs: { cssSecPer100m: reasoned.baseRefs.css || 130, thrPaceSecPerKm: reasoned.baseRefs.thrPace || 330 } });
  // R5.1 — EN DERNIER : les réparations ciblées (`applyTargetedRepairs`, `reduceDay`) ont pu
  // rescaler des répétitions après la génération. Toute prose dérivée d'un nombre se resynchronise
  // ici, une fois que plus rien ne bougera — cette fois pour de vrai.
  syncDerivedLabels(best.plan);
  // …et les décisions C30b sont celles du DERNIER passage, pas celles d'un état intermédiaire :
  // le chiffre affiché à l'athlète (« 64 min, soit 33 % de la semaine ») doit décrire le plan
  // qu'il a sous les yeux. Même règle que « l'audit rendu est celui du plan rendu », ci-dessous.
  // L'UNION des deux passages, jamais le seul dernier : une semaine portée à sa cible AVANT le
  // point fixe n'a plus rien à corriger après, et la retirer du journal reviendrait à cacher la
  // décision précisément là où elle a le mieux marché. Le libellé du dernier passage prime,
  // c'est lui qui décrit le plan livré.
  const _frais = new Map(_c30b.map((d) => [d.wk, d]));
  const _c30bFinal = reasoned.decisions.filter((d) => d.id === "C30b").map((d) => {
    const w = Number((/sem\. (\d+)/.exec(String(d.what)) || [])[1]);
    return _frais.get(w) || d;
  });
  for (const d of _c30b) if (!_c30bFinal.includes(d)) _c30bFinal.push(d);
  // …et le CHIFFRE est relu sur le plan livré, jamais gardé de l'instant où la passe a agi :
  // entre les deux, le point fixe C22 a pu rescaler la semaine. Une décision qui annonce
  // « 64 min, soit 33 % » sur un plan qui en porte 61 est un mensonge de quelques minutes,
  // c'est-à-dire exactement le genre que ce dépôt passe son temps à traquer.
  for (const d of _c30bFinal) {
    const w = Number((/sem\. (\d+)/.exec(String(d.what)) || [])[1]);
    const wk = best.plan.weeks.find((x) => x.num === w);
    if (!wk) continue;
    const ss = wk.days.flatMap((x) => x.sessions).filter((x) => x.d !== "rs");
    const lg = ss.find((x) => x.long && !x.race);
    const tot = ss.reduce((t, x) => t + (x.min || 0), 0);
    if (lg && tot > 0) d.val = Math.round(lg.min || 0) + " min, soit " + Math.round((100 * (lg.min || 0)) / tot) + " % de la semaine";
  }
  for (let i = reasoned.decisions.length - 1; i >= 0; i--) if (reasoned.decisions[i].id === "C30b") reasoned.decisions.splice(i, 1);
  for (const d of _c30bFinal) reasoned.decisions.push(d);

  // L'AUDIT RENDU EST CELUI DU PLAN RENDU.
  //
  // `best.audit` était pris AVANT les trois passes ci-dessus — dont `reconcileDeclaredVolume`,
  // qui porte à elle seule sept garanties. Le verdict décrivait donc un plan qui n'existait
  // plus : la trace a montré le même plan « en violation » selon `res.audit` et « propre »
  // selon un `auditPlan` rejoué dessus. Un auditeur qui note un état intermédiaire ne dit rien
  // du produit, exactement comme le harnais qui mesurait le générateur de repli (O7).
  //
  // On re-mesure donc à la sortie. Les réserves affichées à l'athlète sont recalculées avec :
  // annoncer des réserves qu'on vient de lever serait le même mensonge dans l'autre sens.
  // R13.5 — LA PROMESSE EST CONFRONTÉE AU LIVRÉ, EN DERNIER. Le journal pouvait afficher
  // « sonde de capacité → 2,9 h » au-dessus d'un plan dont le pic réel faisait 0,9 h : le
  // chiffre annoncé mentait ×3 et AUCUN garde ne comparait les deux. Si le pic livré fait
  // moins de 75 % de la promesse V2.1, un avertissement nomme le limiteur — et si les
  // semaines de charge sont PLATES (max/min < 1,35), le plan n'est plus un plan périodisé
  // et l'athlète doit le savoir. Deux filets, pas des correctifs : la génération saine ne
  // les déclenche jamais (mesuré : 0 sur les 594 combinaisons).
  {
    const wMin = (w: { days: { sessions: { min?: number }[] }[] }) => w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0);
    const charge = best.plan.weeks.filter((w) => !w.isRecup && w.phase.id !== "taper").map(wMin);
    const pkH = charge.length ? Math.max(...charge) / 60 : 0;
    const v21 = reasoned.decisions.find((d) => d.id === "V2.1");
    const promH = v21 ? parseFloat(String(v21.val).replace(",", ".")) : 0;
    const injWhy = reasoned.inj && reasoned.inj.count > 0 ? "tes séances aménagées pour ta zone fragile (" + reasoned.inj.list.join(", ") + ") bornent chaque semaine" : "les plafonds de séance bornent chaque semaine";
    if (promH > 0 && pkH > 0 && pkH < promH * 0.75)
      warnings.push("Le volume promis (" + promH.toFixed(1) + " h/sem au pic) n'est pas atteignable : " + injWhy + " — le plan livrable culmine à " + pkH.toFixed(1) + " h/sem. C'est ce chiffre-là qui compte.");
    if (charge.length >= 4 && Math.max(...charge) / Math.max(1, Math.min(...charge)) < 1.35)
      warnings.push("Les semaines de charge de ce plan sont quasi identiques (l'écart entre la plus grosse et la plus petite est inférieur à 35 %) : les contraintes de séance empêchent une vraie périodisation. Le plan reste sûr, mais un objectif plus court — ou un avis sur la contrainte qui borne tes séances — le rendrait plus progressif.");
  }
  const finalAudit = auditPlan(best.plan, opts);
  const stale = warnings.indexOf("Plan rendu avec réserves (contraintes insatisfaisables après " + MAX_ITERATIONS + " réparations) :");
  if (stale >= 0) warnings.splice(stale, 1 + best.audit.hardViolations.length);
  if (finalAudit.hardViolations.length > 0) {
    warnings.push("Plan rendu avec réserves (contraintes insatisfaisables après " + MAX_ITERATIONS + " réparations) :");
    warnings.push(...finalAudit.hardViolations.map((v) => "· " + v));
  }
  // T-27 — LE SCEAU, EN TOUT DERNIER. Voir `seal.ts` : c'est le seul point du pipeline où
  // « après » n'existe pas, donc le seul endroit où un invariant vérifié l'est du plan LIVRÉ.
  // Non strict ici (le plan est rendu quoi qu'il arrive) ; c'est la CI qui lève, via
  // `npm run mesure:sceau` et le critère T-27 du banc.
  sealPlan(best.plan, { format: profile.format });
  return { plan: best.plan, audit: finalAudit, warnings, repairs, decisions: reasoned.decisions };
}
