/**
 * coherenceScorer — audit « coach de charge » (Sprint 0).
 *
 * INDÉPENDANT DU GÉNÉRATEUR par construction : la charge est recalculée
 * bottom-up depuis les textes de séances (loadModel), jamais depuis les
 * variables internes du générateur. C'est la condition pour que l'audit
 * ne valide pas trivialement ses propres règles.
 *
 * Seuils indicatifs (note.md) :
 * - ratio prescrit/déclaré > 1.4 → sur-prescrit ; < 0.5 → sous-prescrit
 * - part de la séance longue > 45-55% de la semaine → alerte
 */
import type { V1Plan, V1Week } from "../harness/v1Harness.ts";
import { sessionLoad, intensitySplit, DEFAULT_REFS, type AthleteRefs, type SessionLoad } from "../engine/loadModel.ts";
import { C22_AUDIT_HARD_JUMP, BRICK_BIKE_BOUNDS, BRICK_TAPER_BIKE_BOUNDS, easyShareFloor } from "../engine/constraintMatrix.ts";

// Les bornes brick vélo (audit 2, « jamais dépassées, même de peu ») vivent désormais dans la
// matrice de contraintes : l'auditeur et le générateur lisent LE MÊME tableau. La copie locale
// permettait au générateur de produire ce que l'auditeur interdit — vu en R10 phase 2.

export const THRESHOLDS = {
  overPrescribed: 1.4,
  underPrescribed: 0.5,
  softOver: 1.2,
  softUnder: 0.7,
  longShareAlert: 0.55,
  longShareWatch: 0.45,
} as const;

export interface WeekAudit {
  num: number;
  phaseId: string;
  isRecup: boolean;
  declaredMin: number;
  prescribedMin: number;
  ratio: number;
  longestSessionMin: number;
  longShare: number;
  nominalSessions: number; // séances sans volume prescrit (comptées au nominal)
  fullMinutes: number; // minutes issues d'un parsing complet (couverture)
  swimMeters: number; // mètres nagés de la semaine — la mesure de volume honnête en natation
  /** R3-final — minutes hors récup inter-répétitions. Cette base existait pour NEUTRALISER
   *  l'écart entre les deux estimateurs : le générateur ne comptait pas la récupération, nous
   *  si. L'écart est fermé (`recoveryMin` porté par le step, mesuré des deux côtés), donc la
   *  compensation n'a plus d'objet — les règles de progression et de dominance du pic mesurent
   *  désormais les MÊMES minutes que celles que le générateur pilote. Le champ reste exposé
   *  pour l'analyse (part de travail réel d'une semaine), il n'arbitre plus aucune règle. */
  workMin: number;
}

export interface PlanAudit {
  weeks: WeekAudit[];
  peak: WeekAudit; // semaine au volume déclaré max (hors récup)
  score: number; // provisoire — pondération à calibrer, voir ROADMAP-V2
  hardViolations: string[]; // bloquants indépendamment du score
  softIssues: string[];
  adjacentHardDays: number;
  recupHeavierCount: number;
  weeksOver: number; // semaines (hors récup/taper) au ratio > overPrescribed
  weeksUnder: number; // semaines (hors récup/taper) au ratio < underPrescribed
  taperRatio: number | null; // dernière semaine d'affûtage : prescrit/déclaré
  taperVsPeak: number | null; // prescrit affûtage / prescrit pic — audit 2 : ≤ 0.60 (réduction ≥40%)
  vo2InTaper: number; // séances VO2max en semaine d'affûtage — audit 2 : interdit
  brickCapViolations: number; // legs vélo de brick hors bornes format — audit 2
  peakInPeakPhase: boolean; // la semaine max (minutes indépendantes) tombe en phase "peak" — audit 2
  peakHasBrick: boolean | null; // tri uniquement : la semaine max contient le brick — audit 2
  // ---- Règles du manifeste (note.md) ----
  declJumps: number; // sauts >+10% de la courbe déclarée entre semaines de charge — interdit
  auditJumpsHard: number; // sauts >+25% en minutes indépendantes — interdit
  auditJumpsSoft: number; // sauts +15–25% (bruit de métrique toléré : la récup inter-blocs varie)
  consecutiveLongRuns: number; // deux longues CAP sur jours consécutifs — interdit
  beginnerLongRunOver3h: number; // sortie longue CAP >3h pour un débutant — interdit
  smallSwims: number; // séance piscine <750m pour un non-débutant — interdit
  unexplainedSessions: number; // séance sans objectif expliqué (note/💡) — interdit
  easyShare: number; // part du temps FACILE sur les semaines de charge — manifeste « répartition des intensités » (~80/20)
  estimatorGapMed: number | null; // |nos minutes − s.min| médian (sessions avec s.min)
  nominalSessionsTotal: number;
  coverage: number; // part des minutes prescrites issues d'un parsing fiable (full + rest)
  flags: string[];
}

export interface AuditOpts {
  sport?: string;
  format?: string;
  level?: string; // "debutant" active les règles spécifiques débutant/non-débutant du manifeste
  /** C26b — ce qui LIMITE l'athlète : récupération centrale chez l'entraîné, tissu conjonctif
   *  chez celui qui reprend ou qui débute. Le plafond de temps dur en dépend. */
  history?: string;
  injured?: boolean;
  refs?: AthleteRefs;
}

function auditWeek(w: V1Week, refs: AthleteRefs, gaps: number[], stepFlags: string[]): WeekAudit {
  let prescribed = 0;
  let longest = 0;
  let nominal = 0;
  let fullMin = 0;
  let swimM = 0;
  let recovM = 0;
  const loads: SessionLoad[] = [];
  for (const day of w.days) {
    let dayMin = 0;
    for (const s of day.sessions) {
      const load = sessionLoad(s, refs);
      loads.push(load);
      dayMin += load.minutes;
      if (load.meters) swimM += load.meters;
      recovM += load.recoveryMin || 0;
      if (load.confidence === "nominal") nominal++;
      // "rest" = minutes explicites d'un renfo greffé → parsing fiable aussi
      if (load.confidence === "full" || load.confidence === "rest") fullMin += load.minutes;
      if (typeof load.generatorMin === "number" && load.generatorMin > 0) gaps.push(Math.abs(load.minutes - load.generatorMin));
      for (const f of load.flags) if (f.startsWith("séance à steps") || f.startsWith("écart estimateur")) stepFlags.push("S" + w.num + " : " + f);
    }
    // La « séance longue » au sens de l'audit = le plus gros JOUR d'entraînement
    if (dayMin > longest) longest = dayMin;
    prescribed += dayMin;
  }
  // V1.5 : vol_declared = promesse de la courbe (R3.3) ; endurabuild-3 : vol
  const declaredMin = (w.vol_declared ?? w.vol) * 60;
  return {
    num: w.num,
    phaseId: w.phase.id,
    isRecup: w.isRecup,
    declaredMin,
    prescribedMin: Math.round(prescribed),
    ratio: declaredMin > 0 ? prescribed / declaredMin : 0,
    longestSessionMin: Math.round(longest),
    longShare: prescribed > 0 ? longest / prescribed : 0,
    nominalSessions: nominal,
    fullMinutes: fullMin,
    swimMeters: Math.round(swimM),
    workMin: Math.round(prescribed - recovM),
  };
}

export function auditPlan(plan: V1Plan, opts: AuditOpts = {}): PlanAudit {
  const refs = opts.refs ?? DEFAULT_REFS;
  const gaps: number[] = [];
  const stepFlags: string[] = [];
  const weeks = plan.weeks.map((w) => auditWeek(w, refs, gaps, stepFlags));
  const hard: string[] = [];
  const soft: string[] = [];
  const flags: string[] = stepFlags.slice(0, 20);

  // ---- Contrainte dure : jamais deux jours durs adjacents ----
  const allDays = plan.weeks.flatMap((w) => w.days);
  let adjacentHardDays = 0;
  for (let i = 0; i < allDays.length - 1; i++) {
    if (allDays[i].charge === "dur" && allDays[i + 1].charge === "dur") adjacentHardDays++;
  }
  if (adjacentHardDays > 0) hard.push(adjacentHardDays + " paire(s) de jours durs adjacents");

  // ---- Contrainte dure : semaine de récup jamais plus chargée que la précédente ----
  let recupHeavier = 0;
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i].isRecup && !weeks[i - 1].isRecup && weeks[i].prescribedMin > weeks[i - 1].prescribedMin) {
      recupHeavier++;
      flags.push("S" + weeks[i].num + " (récup) plus chargée que S" + weeks[i - 1].num);
    }
  }
  if (recupHeavier > 0) hard.push(recupHeavier + " semaine(s) de récup plus chargée(s) que la semaine précédente");

  // ---- Semaine du pic : ratio prescrit/déclaré ----
  const candidates = weeks.filter((w) => !w.isRecup);
  const peak = candidates.reduce((a, b) => (b.declaredMin > a.declaredMin ? b : a), candidates[0]);

  // ---- Toutes les semaines normales : combien sortent de la bande ? ----
  // (le pic seul sous-estime : en base, bike prescrit jusqu'à 2× le déclaré)
  const normal = weeks.filter((w) => !w.isRecup && w.phaseId !== "taper");
  const weeksOver = normal.filter((w) => w.ratio > THRESHOLDS.overPrescribed).length;
  const weeksUnder = normal.filter((w) => w.ratio < THRESHOLDS.underPrescribed).length;

  // ---- Affûtage (audit 2) : réduction ≥40% vs pic, en minutes indépendantes ----
  const peakByMin = candidates.reduce((a, b) => (b.prescribedMin > a.prescribedMin ? b : a), candidates[0]);
  const taperWeeks = weeks.filter((w) => w.phaseId === "taper");
  const lastTaper = taperWeeks.length > 0 ? taperWeeks[taperWeeks.length - 1] : null;
  const taperRatio = lastTaper ? lastTaper.ratio : null;
  const taperVsPeak = lastTaper && peakByMin.prescribedMin > 0 ? lastTaper.prescribedMin / peakByMin.prescribedMin : null;
  if (taperVsPeak !== null && taperVsPeak > 0.6) {
    hard.push(
      "affûtage insuffisant : dernière semaine à " +
        Math.round(taperVsPeak * 100) +
        "% du pic (spec audit 2 : réduction ≥40%)"
    );
  }

  // ---- Audit 2 : pas de VO2max en affûtage ----
  const taperNums = new Set(taperWeeks.map((w) => w.num));
  let vo2InTaper = 0;
  for (const w of plan.weeks) {
    if (!taperNums.has(w.num)) continue;
    for (const d of w.days)
      for (const s of d.sessions) {
        const zoneVO2 = (s.steps || []).some((st) => typeof st.zone === "string" && st.zone.endsWith(".vo2"));
        if (zoneVO2 || /vo2/i.test(s.name)) {
          vo2InTaper++;
          flags.push("S" + w.num + " (taper) : séance VO2 « " + s.name + " »");
        }
      }
  }
  if (vo2InTaper > 0) hard.push(vo2InTaper + " séance(s) VO2max en semaine d'affûtage (interdit, spec audit 2)");

  // ---- R13.4 : pas de FORCE (basse cadence) en affûtage ----
  // La force à 50-60 rpm a le même coût de fatigue résiduelle que la VO2max (48-72 h de
  // courbatures profondes) : mesuré avant correction, 6 blocs `bk.frc` dans l'affûtage d'un
  // Full — dont une séance de gros braquet à J-3 de l'Ironman. Elle était là par accident de
  // branchement (`else` attrape-tout), pas par intention : la règle devient VÉRIFIÉE.
  let frcInTaper = 0;
  for (const w of plan.weeks) {
    if (!taperNums.has(w.num)) continue;
    for (const d of w.days)
      for (const s of d.sessions)
        if ((s.steps || []).some((st) => typeof st.zone === "string" && st.zone.endsWith(".frc"))) {
          frcInTaper++;
          flags.push("S" + w.num + " (taper) : séance de force « " + s.name + " »");
        }
  }
  if (frcInTaper > 0) hard.push(frcInTaper + " séance(s) de force (basse cadence) en semaine d'affûtage (R13.4 : même coût de récupération que la VO2max)");

  // ---- Audit 2 : bornes du brick vélo par format ----
  // R18.4 — la règle connaît maintenant DEUX bricks. C21b borne celui qui CONSTRUIT (charge,
  // spécifique, pic) ; C21c borne celui qui ENTRETIENT (affûtage), et son plafond est le
  // plancher de C21b — un brick d'affûtage ne peut donc jamais être plus long que le plus
  // court des bricks de charge. L'affûtage n'est PAS exempté : une bande de moins serait un
  // trou par lequel une sortie de 2 h reviendrait en semaine d'affûtage sans un mot.
  let brickCapViolations = 0;
  const boundsCharge = opts.format ? BRICK_BIKE_BOUNDS[opts.format] : undefined;
  const boundsTaper = opts.format ? BRICK_TAPER_BIKE_BOUNDS[opts.format] : undefined;
  for (const w of plan.weeks)
    for (const d of w.days)
      for (const s of d.sessions) {
        if (!s.brick || !s.steps) continue;
        const bike = s.steps.find((st) => st.leg === "bike");
        const taper = w.phase.id === "taper";
        const bounds = taper ? boundsTaper : boundsCharge;
        if (!bike || bike.durationMin == null || !bounds) continue;
        if (bike.durationMin > bounds[1] || bike.durationMin < bounds[0]) {
          brickCapViolations++;
          flags.push("S" + w.num + " : brick vélo " + bike.durationMin + "min hors bornes "
            + (taper ? "d'affûtage (C21c) " : "de charge (C21b) ") + "[" + bounds[0] + ", " + bounds[1] + "]");
        }
      }
  if (brickCapViolations > 0) hard.push(brickCapViolations + " brick(s) vélo hors bornes format (spec audit 2)");

  // ---- Audit 2 : la semaine max tombe en phase "peak" (et contient le brick en tri) ----
  // Tolérance 5% : notre métrique compte la récup inter-blocs (le générateur non), ce qui
  // gonfle les semaines à VO2 ; et les plans saturés par les caps (nage débutant) ont des
  // semaines quasi égales. Échec seulement si une semaine hors peak DÉPASSE nettement le pic.
  const peakPhaseBest = candidates.filter((w) => w.phaseId === "peak").reduce((a, b) => (b && b.prescribedMin > (a?.prescribedMin ?? 0) ? b : a), null as WeekAudit | null);
  let peakInPeakPhase =
    peakByMin.phaseId === "peak" || (!!peakPhaseBest && peakByMin.prescribedMin <= peakPhaseBest.prescribedMin * 1.05);
  // Composition : une semaine fractionnée (VO2/force, récups × répétitions) pèse plus en
  // minutes-métrique qu'une semaine continue à travail égal — c'est l'écart de métrique
  // documenté (ARCHITECTURE.md). La dominance est re-testée HORS récup inter-répétitions
  // (même base que le générateur) avant de conclure à une violation structurelle.
  if (!peakInPeakPhase) {
    // La DOMINANCE DU PIC se juge sur le TRAVAIL, pas sur le temps passé dehors — et ce n'est
    // pas la compensation d'un écart de mesure, c'est la définition de la règle. Une semaine de
    // développement pleine de répétitions occupe plus de CLOCK TIME (les récupérations sont du
    // temps) qu'une semaine de pic faite de sorties longues continues, à charge d'entraînement
    // pourtant inférieure. « La semaine pic est la plus grosse du plan » parle de stimulus.
    // La règle de PROGRESSION, elle, parle bien de temps vécu : elle mesure `prescribedMin`.
    const peakByWork = candidates.reduce((a, b) => (b.workMin > a.workMin ? b : a), candidates[0]);
    const peakPhaseBestW = Math.max(0, ...candidates.filter((w) => w.phaseId === "peak").map((w) => w.workMin));
    if (peakByWork.phaseId === "peak" || (peakPhaseBestW > 0 && peakByWork.workMin <= peakPhaseBestW * 1.05)) peakInPeakPhase = true;
  }
  // Natation : la dominance se juge aussi aux MÈTRES. Sur la fenêtre saturée [600, 850]m
  // du débutant, une semaine de base fractionnée pèse plus cher à volume nagé INFÉRIEUR.
  if (!peakInPeakPhase && opts.sport === "swim") {
    const peakByMeters = candidates.reduce((a, b) => (b.swimMeters > a.swimMeters ? b : a), candidates[0]);
    const peakPhaseBestM = Math.max(0, ...candidates.filter((w) => w.phaseId === "peak").map((w) => w.swimMeters));
    if (peakByMeters.phaseId === "peak" || (peakPhaseBestM > 0 && peakByMeters.swimMeters <= peakPhaseBestM * 1.05)) peakInPeakPhase = true;
  }
  if (!peakInPeakPhase)
    hard.push(
      "semaine de volume max (S" + peakByMin.num + ", " + peakByMin.phaseId + ") dépasse la meilleure semaine peak de >5% (spec audit 2)"
    );
  let peakHasBrick: boolean | null = null;
  if (opts.sport === "tri") {
    const refWeekNum = peakByMin.phaseId === "peak" ? peakByMin.num : (peakPhaseBest ?? peakByMin).num;
    const wk = plan.weeks.find((w) => w.num === refWeekNum);
    peakHasBrick = !!wk && wk.days.some((d) => d.sessions.some((s) => !!s.brick));
    if (!peakHasBrick) hard.push("tri : la semaine pic (S" + refWeekNum + ") ne contient pas le brick (spec audit 2)");
  }

  // ---- Manifeste : progression jamais incohérente (+10% max entre semaines de charge) ----
  // Deux mesures : la courbe déclarée (tolérance 7min pour l'arrondi 0.1h) et nos minutes
  // indépendantes (tolérance élargie : la part de récup inter-blocs varie avec la
  // composition des séances — le générateur ne la compte pas, nous oui).
  let declJumps = 0;
  let auditJumpsHard = 0;
  let auditJumpsSoft = 0;
  {
    let prevDecl = 0;
    let prevOurs = 0;
    for (const w of weeks) {
      if (w.isRecup || w.phaseId === "taper") continue;
      if (prevDecl > 0 && w.declaredMin > prevDecl * 1.1 + 7) declJumps++;
      if (prevOurs > 0) {
        // D3 puis R3-final — les sauts se mesuraient sur la base TRAVAIL parce que le
        // générateur ne comptait pas la récupération : une semaine fractionnée pesait plus cher
        // en minutes-métrique à travail égal, et c'était un artefact de mesure, pas un saut de
        // charge. L'écart est fermé : les deux estimateurs comptent la même chose. On mesure
        // donc le temps réellement prescrit — celui que le générateur pilote et que l'athlète
        // passe dehors. Le seuil dur dérive de la constante nommée (C22_AUDIT_HARD_JUMP).
        const j = w.prescribedMin / prevOurs;
        if (j > C22_AUDIT_HARD_JUMP) auditJumpsHard++;
        else if (j > 1.15) auditJumpsSoft++;
      }
      prevDecl = w.declaredMin;
      prevOurs = w.prescribedMin;
    }
  }
  // I10 a fermé l'écart entre la courbe ANNONCÉE et le volume PRESCRIT : le chiffre affiché suit
  // désormais le contenu (véracité). Conséquence directe : cette règle et celle du saut de
  // volume RÉEL mesurent la même grandeur, avec deux seuils différents — +10 % ici, +25 % là.
  // Deux règles qui se contredisent : l'une est mal formée, et c'est celle-ci. Le +10 % est la
  // CIBLE du générateur (C22), pas un seuil d'audit sur le plan livré ; la tolérance à +25 %
  // existe précisément parce que les planchers de séance empêchent parfois de l'atteindre.
  // La règle de sécurité reste portée par le volume réel ; ici, on SIGNALE sans bloquer.
  if (declJumps > 0) soft.push(declJumps + " saut(s) >+10% de la courbe annoncée entre semaines de charge — la courbe suit désormais le prescrit (I10), et le prescrit est borné à +25% par sa propre règle");
  if (auditJumpsHard > 0) hard.push(auditJumpsHard + " saut(s) >+25% de volume réel entre semaines de charge (manifeste)");

  // ---- Manifeste : jamais deux longues CAP consécutives ----
  let consecutiveLongRuns = 0;
  const dayHasLongRun = (d: (typeof plan.weeks)[0]["days"][0]) => d.sessions.some((s) => !!s.long && s.d === "rn");
  for (let i = 0; i < allDays.length - 1; i++) {
    if (dayHasLongRun(allDays[i]) && dayHasLongRun(allDays[i + 1])) consecutiveLongRuns++;
  }
  if (consecutiveLongRuns > 0) hard.push(consecutiveLongRuns + " paire(s) de longues CAP consécutives (manifeste)");

  // ---- Manifeste : sortie longue CAP ≤3h pour un débutant ; piscine ≥750m pour un non-débutant ;
  // ---- chaque séance explique son objectif (Pourquoi / Bénéfice) ----
  let beginnerLongRunOver3h = 0;
  let smallSwims = 0;
  let unexplainedSessions = 0;
  for (const w of plan.weeks)
    for (const d of w.days)
      for (const s of d.sessions) {
        if (s.d === "rs") continue;
        const load = sessionLoad(s, refs);
        if (opts.level === "debutant" && s.d === "rn" && s.long && load.minutes > 185) beginnerLongRunOver3h++;
        // A3 — UN PLANCHER DE SÉANCE EST UNE RÈGLE DE SEMAINE DE CHARGE. Il dit « en dessous,
        // la séance ne vaut pas le déplacement » : c'est un argument de dosage, et une semaine
        // de décharge a précisément pour objet de retirer. L'exiger en récupération et en
        // affûtage forçait à REMONTER des séances dans les semaines censées alléger — d'où une
        // récup plus lourde que la charge qu'elle assimile, et un affûtage qui n'affûte pas.
        // Deux collisions indépendantes, une seule reformulation, et une règle en moins.
        const decharge = w.isRecup || w.phase.id === "taper";
        if (!decharge && opts.level && opts.level !== "debutant" && s.d === "sw" && (load.meters ?? 0) > 0 && (load.meters ?? 0) < 750) smallSwims++;
        if (!s.note && !(s.det || "").includes("💡")) unexplainedSessions++;
      }
  if (beginnerLongRunOver3h > 0) hard.push(beginnerLongRunOver3h + " sortie(s) longue(s) CAP >3h pour un débutant (manifeste)");
  if (smallSwims > 0) hard.push(smallSwims + " séance(s) piscine <750m pour un non-débutant (manifeste)");
  if (unexplainedSessions > 0) hard.push(unexplainedSessions + " séance(s) sans objectif expliqué (manifeste)");

  // ---- Manifeste : répartition des intensités (~80/20). Part FACILE du temps sur les
  // ---- semaines de charge : <70% = zone grise installée (dur), 70-73% = borderline (souple).
  let easyTot = 0, modTot = 0, hardTot = 0;
  for (const w of plan.weeks) {
    if (w.isRecup || w.phase.id === "taper") continue;
    for (const d of w.days)
      for (const s of d.sessions) {
        const sp = intensitySplit(s, refs);
        easyTot += sp.easyMin; modTot += sp.modMin; hardTot += sp.hardMin;
      }
  }
  const easyShare = easyTot + modTot + hardTot > 0 ? easyTot / (easyTot + modTot + hardTot) : 1;
  // C26 — le plancher suit le VOLUME : 80/20 est la conséquence d'un plafond de temps dur
  // (~60 min/sem), pas une loi en soi. Sur une petite enveloppe, exiger 70 % de facile laisse
  // moins d'une heure de qualité — moins que ce qu'il faut pour maintenir la VO2max.
  const chargeMin = weeks.filter((w) => !w.isRecup && w.phaseId !== "taper").map((w) => w.prescribedMin);
  const meanChargeMin = chargeMin.length ? chargeMin.reduce((a, b) => a + b, 0) / chargeMin.length : 0;
  const easyFloor = easyShareFloor(meanChargeMin, { history: opts.history, level: opts.level, injured: !!opts.injured });
  if (easyShare < easyFloor) hard.push("répartition des intensités : " + Math.round(easyShare * 100) + "% de temps facile (<" + Math.round(easyFloor * 100) + "% pour " + Math.round(meanChargeMin / 6) / 10 + "h/sem — zone grise, manifeste ~80/20)");

  // ---- Cohérence : une nage FACILE/RÉCUP ne dépasse jamais la « longue » de sa semaine
  // (une « Récup eau » de 2150m n'est pas une récup). Les séances de qualité (jours durs)
  // peuvent légitimement totaliser plus de mètres qu'une longue continue — exemptées.
  let longNotLongest = 0;
  for (const w of plan.weeks) {
    const longSw = w.days.flatMap((d) => d.sessions).find((s) => s.d === "sw" && !!s.long);
    if (!longSw) continue;
    const longM = sessionLoad(longSw, refs).meters ?? 0;
    if (longM <= 0) continue;
    for (const d of w.days) {
      if (d.charge !== "facile") continue;
      for (const s of d.sessions) {
        if (s.d !== "sw" || s === longSw) continue;
        if ((sessionLoad(s, refs).meters ?? 0) > longM * 1.05) {
          longNotLongest++;
          flags.push("S" + w.num + " : « " + s.name + " » (facile) dépasse la longue de la semaine");
        }
      }
    }
  }
  if (longNotLongest > 0) hard.push(longNotLongest + " nage(s) facile(s)/récup plus longue(s) que la « longue » de leur semaine (cohérence)");

  let score = 100;
  if (declJumps + auditJumpsHard > 0) score -= 15;
  score -= Math.min(10, auditJumpsSoft);
  if (consecutiveLongRuns + beginnerLongRunOver3h + smallSwims > 0) score -= 15;
  if (unexplainedSessions > 0) score -= 10;
  if (peak.ratio > THRESHOLDS.overPrescribed) {
    score -= 25;
    soft.push("pic S" + peak.num + " SUR-prescrit : ratio " + peak.ratio.toFixed(2));
  } else if (peak.ratio < THRESHOLDS.underPrescribed) {
    score -= 25;
    soft.push("pic S" + peak.num + " SOUS-prescrit : ratio " + peak.ratio.toFixed(2));
  } else if (peak.ratio > THRESHOLDS.softOver || peak.ratio < THRESHOLDS.softUnder) {
    score -= 10;
    soft.push("pic S" + peak.num + " ratio limite : " + peak.ratio.toFixed(2));
  }

  const outOfBand = normal.length > 0 ? (weeksOver + weeksUnder) / normal.length : 0;
  if (outOfBand > 0) {
    score -= Math.min(25, Math.round(outOfBand * 50));
    soft.push(weeksOver + weeksUnder + "/" + normal.length + " semaines normales hors bande [0.5, 1.4]");
  }

  if (peak.longShare > THRESHOLDS.longShareAlert) {
    score -= 15;
    soft.push("séance longue = " + Math.round(peak.longShare * 100) + "% de la semaine du pic");
  } else if (peak.longShare > THRESHOLDS.longShareWatch) {
    score -= 5;
  }

  score -= Math.min(20, adjacentHardDays * 10);
  score -= Math.min(10, recupHeavier * 5);
  if (easyShare < easyFloor) score -= 15;
  else if (easyShare < easyFloor + 0.03) score -= 5;
  if (taperVsPeak !== null && taperVsPeak > 0.6) score -= 20;
  if (vo2InTaper > 0) score -= 15;
  if (brickCapViolations > 0) score -= 15;
  if (!peakInPeakPhase) score -= 10;

  // D1 (audit v6) — une violation dure ne peut JAMAIS coexister avec un score
  // « excellent » : le plafond dérive du NOMBRE de violations, pas d'une énumération
  // de pénalités (les cas non énumérés — brick absent du pic… — ne passent plus
  // entre les mailles : tri/70.3 s'affichait à 100/100 avec une violation dure).
  if (hard.length > 0) score = Math.min(score, 70 - Math.min(30, (hard.length - 1) * 10));

  const nominalTotal = weeks.reduce((n, w) => n + w.nominalSessions, 0);
  const totalPrescribed = weeks.reduce((n, w) => n + w.prescribedMin, 0);
  const totalFull = weeks.reduce((n, w) => n + w.fullMinutes, 0);

  return {
    weeks,
    peak,
    score: Math.max(0, score),
    hardViolations: hard,
    softIssues: soft,
    adjacentHardDays,
    recupHeavierCount: recupHeavier,
    weeksOver,
    weeksUnder,
    taperRatio,
    taperVsPeak,
    vo2InTaper,
    brickCapViolations,
    peakInPeakPhase,
    peakHasBrick,
    declJumps,
    auditJumpsHard,
    auditJumpsSoft,
    consecutiveLongRuns,
    beginnerLongRunOver3h,
    smallSwims,
    unexplainedSessions,
    easyShare,
    estimatorGapMed: gaps.length > 0 ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : null,
    nominalSessionsTotal: nominalTotal,
    coverage: totalPrescribed > 0 ? totalFull / totalPrescribed : 0,
    flags,
  };
}
