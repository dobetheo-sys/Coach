/**
 * Construction des semaines V2 — port sémantique des passes de Coach_Pro_V1.5 :
 * schéma jours (7j/10j), redistribution des durs bloqués (sans adjacence), fix peak
 * « reprise », neutralisation médicale, plafond d'impact course, budget de séances,
 * greffes renfo, anti-collage final, garantie de polarisation.
 */
import type { ReasonedPlan, V1Day, V1Session } from "../engine/types.ts";
import { buildSessions, type SessionCtx } from "./sessionLibrary.ts";
import { intOf, renderSess, type Refs, type HrZones } from "./renderer.ts";

const J = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface DaySlot {
  charge: string;
  slot: string;
}

function schema(use10: boolean, phase: string, isRecup: boolean): DaySlot[] {
  if (isRecup) {
    const d: [string, string][] = [["facile", "facileR"], ["facile", "facile2"], ["off", "off"], ["facile", "facileR"], ["facile", "facile2"], ["facile", "facileR"], ["off", "off"], ["facile", "facile2"], ["facile", "facileR"], ["recup", "recup"]];
    return (use10 ? d : d.slice(0, 7)).map((x) => ({ charge: x[0], slot: x[1] }));
  }
  if (use10)
    return ([["dur", "dur1"], ["facile", "facileR"], ["dur", "dur2"], ["facile", "facile2"], ["dur", "facileR"], ["facile", "facileR"], ["dur", "dur2"], ["facile", "facile2"], ["dur", "durLong"], ["recup", "recup"]] as [string, string][]).map((x) => ({ charge: x[0], slot: x[1] }));
  return ([["recup", "recup"], ["dur", "dur1"], ["facile", "facileR"], ["dur", "dur2"], ["facile", "facile2"], ["dur", "durLong"], ["facile", "facileR"]] as [string, string][]).map((x) => ({ charge: x[0], slot: x[1] }));
}

export interface GenDay extends V1Day {
  cyc?: number;
  jc?: number;
  wasHard?: boolean;
  swapped?: boolean;
  date?: string;
  phase?: { id: string; weeks: number; start: number };
}

/** Jours + charges + séances rendues — tout ce qui précède la boucle de volume R3.3. */
export function buildDays(r: ReasonedPlan, refs: Refs, hz: HrZones): GenDay[] {
  const a = r.profile;
  const sp = a.sport;
  const ctx: SessionCtx = { r };
  const cycleLen = r.use10 ? 10 : 7;
  const totalDays = r.weeks * 7;
  const days: GenDay[] = [];
  let cyc = 0, dic = cycleLen, sinceR = 0, sch: DaySlot[] = [], isR = false;

  for (let i = 0; i < totalDays; i++) {
    const w = Math.floor(i / 7);
    const ph = r.phases.find((p) => w >= p.start && w < p.end) || r.phases[4];
    if (dic >= cycleLen) {
      cyc++; dic = 0;
      isR = ph.id !== "taper" && sinceR >= r.recupEvery - 1;
      if (isR) sinceR = 0; else sinceR++;
      sch = schema(r.use10, ph.id, isR);
    }
    const s = sch[dic] || { charge: "facile", slot: "facileR" };
    const jn = J[i % 7];
    let ch = s.charge, sl = s.slot, forced = false;
    if (r.offDays.includes(jn)) { ch = "off"; sl = "off"; forced = true; }
    days.push({ week: w + 1, jour: jn, cyc, jc: dic + 1, charge: ch as GenDay["charge"], slot: sl, forced, wasHard: ch === "dur" && forced, isR, phaseId: ph.id, phase: ph, prog: 0, sessions: [] });
    dic++;
  }

  // Redistribution des durs bloqués — jamais d'adjacence créée (sécurité > volume)
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    for (const _ of wd.filter((d) => d.wasHard)) {
      const t = wd.find((d, i) => {
        if (d.charge !== "facile" || d.swapped) return false;
        const prev = wd[i - 1], next = wd[i + 1];
        return (!prev || prev.charge !== "dur") && (!next || next.charge !== "dur");
      });
      if (t) { t.charge = "dur"; t.slot = "dur2"; t.swapped = true; }
    }
  }

  // Fix ciblé « reprise » : garantir une semaine peak de charge portant la signature (durLong)
  if ((a.history || "confirme") === "reprise") {
    const peakWeekNums = [...new Set(days.filter((d) => d.phaseId === "peak").map((d) => d.week))];
    if (peakWeekNums.length) {
      const isChargeSig = (wn: number) => {
        const wd = days.filter((d) => d.week === wn);
        return wd.filter((d) => d.isR).length < 4 && wd.some((d) => d.slot === "durLong" && !d.forced);
      };
      if (!peakWeekNums.some(isChargeSig)) {
        const targetWk = Math.max(...peakWeekNums);
        const wd = days.filter((d) => d.week === targetWk);
        const tpl: [string, string][] = [["dur", "dur1"], ["facile", "facileR"], ["dur", "dur2"], ["facile", "facile2"], ["dur", "durLong"], ["facile", "facileR"], ["off", "off"]];
        wd.forEach((d, idx) => {
          d.isR = false; d.wasHard = false; d.swapped = false;
          if (d.forced) { d.charge = "off"; d.slot = "off"; return; }
          const t = tpl[idx] || ["facile", "facileR"];
          d.charge = t[0] as GenDay["charge"]; d.slot = t[1];
        });
      }
    }
  }

  // medHold : retirer l'intensité (dur1/dur2 ; tri : aussi le brick) avant génération
  if (r.medHold)
    for (const d of days) {
      const stripLong = sp === "tri";
      if (d.charge === "dur" && (d.slot === "dur1" || d.slot === "dur2" || (stripLong && d.slot === "durLong"))) {
        d.charge = "facile";
        d.slot = sp === "run" ? "facile2" : "facileR";
      }
    }

  // Séances + rendu (dates absolues : fin = date de course ou aujourd'hui + durée)
  const MS = 864e5;
  const end = a.race_date ? new Date(a.race_date + "T00:00:00Z") : new Date(Date.now() + (totalDays - 1) * MS);
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  days.forEach((d, i) => {
    const ph = d.phase!;
    const prog = ph.weeks > 1 ? (d.week - 1 - ph.start) / (ph.weeks - 1) : 0.5;
    d.prog = Math.max(0, Math.min(1, prog));
    d.date = iso(end.getTime() - (totalDays - 1 - i) * MS);
    d.sessions = buildSessions(ctx, d.slot as Parameters<typeof buildSessions>[1], d.phaseId, d.prog);
    for (const s of d.sessions) {
      if (s.steps && s.steps.length) renderSess(s, refs, hz, r.baseRefs);
      else if (s.min == null) s.min = 0;
    }
  });

  // C18b — un seul « VO2max course » par semaine de peak : le second créneau facileR
  // redevient footing (sinon 4 jours durs et une semaine de peak plus légère que la spec).
  if (a.sport === "tri") {
    for (let w = 1; w <= r.weeks; w++) {
      const vo2Days = days.filter((d) => d.week === w && d.sessions.some((x) => x.name === "VO2max course"));
      for (let i = 1; i < vo2Days.length; i++) {
        const d = vo2Days[i];
        d.sessions = buildSessions(ctx, "facileR", "spec", d.prog || 0);
        for (const x of d.sessions) if (x.steps && x.steps.length) renderSess(x, refs, hz, r.baseRefs);
      }
    }
  }

  applyRunImpactCap(r, days, refs, hz);
  applySessionBudget(r, days);
  applyStrengthGrafts(r, days);
  applyAntiCollage(r, days, refs, hz, ctx);
  applyPolarizationGuard(r, days, ctx, refs, hz);
  return days;
}

/** Plafond de jours d'impact course : l'excédent devient cross-training vélo ou repos. */
function applyRunImpactCap(r: ReasonedPlan, days: GenDay[], refs: Refs, hz: HrZones): void {
  const a = r.profile;
  if (a.sport !== "run" || r.maxRunDays == null) return;
  const injImpact = r.injuries.some((x) => ["tibia", "genou", "pied", "hanche"].includes(x));
  const canCross = a.dispo === "quotidienne" || a.dispo === "semaine";
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    const isRecupWk = wd.filter((d) => d.isR).length >= 4;
    const cap = isRecupWk ? Math.max(2, r.maxRunDays - 1) : r.maxRunDays;
    const runDays = wd.filter((d) => d.sessions.some((s) => s.d === "rn"));
    let over = runDays.length - cap;
    if (over <= 0) continue;
    const ordered = [...runDays.filter((d) => d.charge === "facile" && !d.forced), ...runDays.filter((d) => d.charge === "dur" && !d.forced)];
    for (let i = 0; i < ordered.length && over > 0; i++) {
      const d = ordered[i];
      if (canCross && (injImpact || d.charge === "dur")) {
        const s: V1Session = d.charge === "dur"
          ? { d: "bk", name: "Cross-training vélo (intensité)", note: "Intervalles vélo — équivalent VO2 sans impact, maintient la puissance aérobie pendant que le tissu se répare.", det: "", steps: [{ role: "warmup", durationMin: 15, text: "progressif" }, { role: "body", reps: 5, durationMin: 3, zone: "bk.vo2", intensity: intOf("bk.vo2") as unknown as string, recoveryText: "3min souple" }, { role: "cooldown", durationMin: 10, text: "souple" }] }
          : { d: "bk", name: "Cross-training vélo", note: "Zéro impact : le stimulus aérobie est conservé pendant que les tissus de la course récupèrent.", det: "", steps: [{ role: "body", durationMin: 55, zone: "bk.z2", intensity: intOf("bk.z2") as unknown as string }], ...({ plainBody: true } as object) };
        renderSess(s, refs, hz, r.baseRefs);
        d.sessions = [s];
      } else {
        d.charge = "off"; d.slot = "off";
        d.sessions = [{ d: "rs", name: "OFF (récup impact)", det: "repos — la course use, le tissu se reconstruit au repos", steps: [] }];
      }
      over--;
    }
  }
}

/** Budget de séances : jamais plus de jours actifs que le budget (récup comprises). */
function applySessionBudget(r: ReasonedPlan, days: GenDay[]): void {
  const toOff = (d: GenDay) => {
    d.charge = "off"; d.slot = "off";
    d.sessions = [{ d: "rs", name: "OFF (budget séances)", det: "repos — respect de ta disponibilité déclarée", steps: [] }];
  };
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    const activeNow = () => wd.filter((d) => d.charge !== "off" && d.charge !== "recup");
    let over = activeNow().length - r.budgetPerWeek;
    if (over <= 0) continue;
    const fac = activeNow().filter((d) => d.charge === "facile" && !d.forced);
    for (let i = fac.length - 1; i >= 0 && over > 0; i--) { toOff(fac[i]); over--; }
    if (over > 0) {
      const durs = activeNow().filter((d) => d.charge === "dur" && !d.forced && d.slot !== "durLong");
      for (let i = durs.length - 1; i >= 0 && over > 0; i--) { toOff(durs[i]); over--; }
    }
    if (over > 0) {
      const any = activeNow().filter((d) => !d.forced);
      for (let i = any.length - 1; i >= 0 && over > 0; i--) { toOff(any[i]); over--; }
    }
  }
}

/** Renfo/gammes greffés en fin de séance existante — jamais une journée en plus. */
function applyStrengthGrafts(r: ReasonedPlan, days: GenDay[]): void {
  const a = r.profile;
  const sp = a.sport;
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    if (wd[0]?.isR) continue;
    const ph = wd[0]?.phaseId;
    if (ph === "taper") continue;
    const faciles = wd.filter((d) => d.charge === "facile" && !d.forced);
    const graft = (day: GenDay | undefined, obj: V1Session) => {
      if (day && day.sessions.some((s) => s.d !== "rs")) day.sessions.push(obj);
    };
    if (sp === "run") {
      graft(faciles[0], { d: "rs", name: r.injuries.includes("tibia") ? "+ Renfo tibial" : "+ Renfo + gainage", det: "20min en fin de footing", steps: [] });
      const injImpactP = r.injuries.some((x) => ["tibia", "genou", "pied", "hanche", "course"].includes(x));
      const beginnerR = r.beginner || r.finisher;
      let plioDet: string;
      if (injImpactP) plioDet = "renfo excentrique (pas de sauts — protection)";
      else if (beginnerR) plioDet = "corde à sauter, rebonds souples (initiation douce)";
      else plioDet = ph === "base" ? "corde à sauter, rebonds souples" : ph === "dev" ? "squat jumps, box jumps bas" : "pliométrie réactive";
      graft(faciles[2] || faciles[1], { d: "rs", name: "+ Plio", det: plioDet, steps: [] });
    } else if (sp === "bike") {
      graft(faciles[0], { d: "rs", name: "+ Gainage position", det: "20min en fin de séance", steps: [] });
      if (ph === "spec") graft(faciles[1], { d: "rs", name: "+ Force max", det: "squat/presse 4×5", steps: [] });
    } else if (sp === "swim") {
      graft(faciles[0], { d: "rs", name: "+ Renfo épaules", det: "15min coiffe en fin de séance", steps: [] });
    }
  }
}

/** Anti-collage final : deux durs adjacents → le second redevient facile. */
function applyAntiCollage(r: ReasonedPlan, days: GenDay[], refs: Refs, hz: HrZones, ctx: SessionCtx): void {
  for (let i = 0; i < days.length - 1; i++) {
    if (days[i].charge === "dur" && days[i + 1].charge === "dur" && !days[i + 1].forced) {
      const d = days[i + 1];
      d.charge = "facile";
      d.slot = r.profile.sport === "run" ? "facile2" : "facileR";
      d.sessions = buildSessions(ctx, d.slot as "facile2" | "facileR", d.phaseId, d.prog || 0);
      for (const s of d.sessions) if (s.steps && s.steps.length) renderSess(s, refs, hz, r.baseRefs);
    }
  }
}

/** Polarisation : jamais une semaine 100% dure — la longue est sacrifiée en dernier. */
function applyPolarizationGuard(r: ReasonedPlan, days: GenDay[], ctx: SessionCtx, refs: Refs, hz: HrZones): void {
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    if (wd[0]?.isR) continue;
    const active = wd.filter((d) => d.charge !== "off" && d.charge !== "recup");
    const faciles = active.filter((d) => d.charge === "facile");
    if (active.length >= 2 && faciles.length === 0) {
      const durs = active.filter((d) => d.charge === "dur" && !d.forced);
      if (durs.length >= 2) {
        const nonLong = durs.filter((d) => d.slot !== "durLong");
        const victim = nonLong.length ? nonLong[nonLong.length - 1] : durs[durs.length - 1];
        victim.charge = "facile";
        victim.slot = "facileR";
        victim.sessions = buildSessions(ctx, "facileR", victim.phaseId, victim.prog || 0);
        for (const s of victim.sessions) if (s.steps && s.steps.length) renderSess(s, refs, hz, r.baseRefs);
      }
    }
  }
}
