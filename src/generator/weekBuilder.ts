/**
 * Construction des semaines V2 — port sémantique des passes de Coach_Pro_V1.5 :
 * schéma jours (7j/10j), redistribution des durs bloqués (sans adjacence), fix peak
 * « reprise », neutralisation médicale, plafond d'impact course, budget de séances,
 * greffes renfo, anti-collage final, garantie de polarisation.
 */
import type { ReasonedPlan, V1Day, V1Session, V1Step } from "../engine/types.ts";
import { buildSessions, type SessionCtx } from "./sessionLibrary.ts";
import { guard, sportModule } from "../sports/registry.ts";
import { intOf, renderSess, type Refs, type HrZones } from "./renderer.ts";

const J = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface DaySlot {
  charge: string;
  slot: string;
}

function schema(use10: boolean, phase: string, isRecup: boolean, r?: ReasonedPlan): DaySlot[] {
  // R10 phase 1 — un sport peut avoir son PROPRE schéma de semaine (le trail : descente et
  // marche sont des séances à part entière, la longue est le pivot du week-end, le lundi porte
  // le renfo excentrique). Il le déclare dans son module ; sinon, le schéma générique par
  // créneaux s'applique — il est agnostique de la discipline, et c'est très bien ainsi.
  const own = r ? sportModule(r.profile.sport as string).weekSchema : null;
  if (own) return own(phase, isRecup, r!) as DaySlot[];
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
  const mod = sportModule(sp as string); // registre R10 : ce que CE sport déclare
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
      // D2 (audit v6) — la cadence de récup ne tombe JAMAIS sur la phase peak quand
      // celle-ci est courte (≤ ~1 semaine) : sur un petit plan, la seule semaine de pic
      // devenait une récup, et « la semaine max du plan » atterrissait mécaniquement en
      // spec — violation structurelle. La récup glisse à la semaine suivante (taper la refuse
      // déjà, la détente d'affûtage fait office de récupération).
      if (isR && ph.id === "peak" && ph.weeks <= 1) isR = false;
      if (isR) sinceR = 0; else sinceR++;
      sch = schema(r.use10, ph.id, isR, r);
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
      // Le brick tri EST de l'intensité : sur avis médical en attente, la longue tombe aussi.
      const stripLong = guard(sp as string, "stripLongOnMedHold");
      if (d.charge === "dur" && (d.slot === "dur1" || d.slot === "dur2" || (stripLong && d.slot === "durLong"))) {
        d.charge = "facile";
        d.slot = mod.easyFallbackSlot;
      }
    }

  // Séances + rendu. Dates absolues ALIGNÉES sur le calendrier réel : le jour étiqueté
  // « Lun » tombe un VRAI lundi (le plan est régénéré à chaque ouverture — sans cet
  // ancrage, la case « aujourd'hui » porte la séance d'un autre jour dès le lendemain).
  // Sans course : la semaine 1 est la semaine EN COURS (début = lundi de cette semaine,
  // les jours déjà écoulés restent visibles/cochables). Avec course : la DERNIÈRE semaine
  // est celle de la course — la course tombe à sa vraie date, à son vrai jour.
  const MS = 864e5;
  const mondayOf = (t: number): number => t - ((new Date(t).getUTCDay() + 6) % 7) * MS;
  // BUG CORRIGÉ (ancrage glissant) : sans date de course, ancrer sur « maintenant » faisait
  // RE-GLISSER la semaine 1 à chaque régénération (le plan est recalculé à chaque ouverture) —
  // l'athlète restait éternellement en semaine 1, progression/historique/série vidés au fil
  // des semaines. L'ancre est désormais plan_start (posée par l'UI à la PREMIÈRE génération,
  // persistée dans les réponses) : le plan avance dans le temps comme un vrai plan.
  const anchorT = a.plan_start ? new Date(a.plan_start + "T00:00:00Z").getTime() : Date.now();
  // C3 (audit v6) — course au-delà de l'horizon (raceBeyondPlan) : le plan démarre
  // MAINTENANT (base longue), il ne s'ancre pas sur une course dans 2 ans.
  const start = a.race_date && !r.raceBeyondPlan
    ? mondayOf(new Date(a.race_date + "T00:00:00Z").getTime()) - (r.weeks - 1) * 7 * MS
    : mondayOf(isFinite(anchorT) ? anchorT : Date.now());
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  days.forEach((d, i) => {
    const ph = d.phase!;
    const prog = ph.weeks > 1 ? (d.week - 1 - ph.start) / (ph.weeks - 1) : 0.5;
    d.prog = Math.max(0, Math.min(1, prog));
    d.date = iso(start + i * MS);
    d.sessions = buildSessions(ctx, d.slot as Parameters<typeof buildSessions>[1], d.phaseId, d.prog, d.week);
    for (const s of d.sessions) {
      if (s.steps && s.steps.length) renderSess(s, refs, hz, r.baseRefs);
      else if (s.min == null) s.min = 0;
    }
  });

  // C18b — un seul « VO2max course » par semaine de peak : le second créneau facileR
  // redevient footing (sinon 4 jours durs et une semaine de peak plus légère que la spec).
  if (guard(a.sport as string, "singleRunVo2PerWeek")) {
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
  // R5.2 (audit v7 bis) — EN DERNIER : la couverture des disciplines tournait AVANT le budget
  // de séances et l'anti-collage, qui pouvaient retirer la séance qu'elle venait d'ajouter.
  // Une semaine d'affûtage de duathlon sortait ainsi sans une seule séance de course — et sans
  // avertissement. Un duathlon commence et finit à pied : c'est la discipline qu'on ne peut pas
  // ne pas toucher en affûtage.
  applyDisciplineCoverage(r, days, refs, hz, ctx);
  applyWeeklyVariety(r, days, refs, hz, ctx);
  return days;
}

/**
 * R5.5 (audit v7 bis) — JAMAIS deux fois la même séance DE QUALITÉ dans la même semaine.
 *
 * Le cycle de 10 jours place deux créneaux `dur2` dans la même fenêtre calendaire : la
 * bibliothèque, sollicitée deux fois avec le même créneau et la même phase, rend deux fois la
 * séance IDENTIQUE (« Force basse cadence », « Seuil CSS + plaquettes »). Physiologiquement,
 * répéter une séance n'est pas une faute ; pédagogiquement, une carte affichée deux fois dit à
 * l'athlète que le plan ne le regarde pas — et deux blocs de seuil rigoureusement identiques
 * ne se justifient pas quand le créneau frère est libre.
 *
 * On cherche donc une VARIANTE (le créneau dur frère), et à défaut on allège : la seconde
 * occurrence redevient une séance facile. L'allègement va toujours dans le sens de la sécurité.
 * Les doublons FACILES sont laissés tels quels — deux footings faciles dans une semaine, c'est
 * un plan normal, pas un défaut.
 */
function applyWeeklyVariety(r: ReasonedPlan, days: GenDay[], refs: Refs, hz: HrZones, ctx: SessionCtx): void {
  const mod = sportModule(r.profile.sport as string);
  const QUALITY_Z = /\.(vo2|thr|css|rp|ss|frc|speed|mara)$/;
  const isQual = (s: V1Session) => (s.steps || []).some((b) =>
    b.role === "body" && (QUALITY_Z.test(String(b.zone || ""))
      || ["tr.vam", "tr.asc", "tr.climb", "tr.flatthr"].includes(String(b.zone || ""))
      || (b.reps || 1) > 1));
  for (let w = 1; w <= r.weeks; w++) {
    const seen = new Set<string>();
    for (const d of days.filter((x) => x.week === w)) {
      for (let i = 0; i < d.sessions.length; i++) {
        const s = d.sessions[i];
        if (s.d === "rs" || !seen.has(s.name) || !isQual(s)) { seen.add(s.name); continue; }
        const alt = d.slot === "dur1" ? "dur2" : d.slot === "dur2" ? "dur1" : null;
        let done = false;
        if (alt) {
          const built = buildSessions(ctx, alt as Parameters<typeof buildSessions>[1], d.phaseId, d.prog || 0, d.week);
          const pick = built.find((x) => x.d !== "rs" && !seen.has(x.name));
          if (pick) {
            if (pick.steps && pick.steps.length) renderSess(pick, refs, hz, r.baseRefs);
            d.slot = alt; d.sessions[i] = pick; done = true;
          }
        }
        if (!done) {
          const built = buildSessions(ctx, mod.easyFallbackSlot as Parameters<typeof buildSessions>[1], d.phaseId, d.prog || 0, d.week);
          const pick = built.find((x) => x.d !== "rs");
          if (!pick) { seen.add(s.name); continue; }
          if (pick.steps && pick.steps.length) renderSess(pick, refs, hz, r.baseRefs);
          d.charge = "facile"; d.slot = mod.easyFallbackSlot; d.sessions[i] = pick;
        }
        seen.add(d.sessions[i].name);
      }
    }
  }
}

/** Plafond de jours d'impact course : l'excédent devient cross-training vélo ou repos.
 *  D10-3 — s'applique à `run` ET `trail` (le trail ajoute l'excentrique à l'impact). */
function applyRunImpactCap(r: ReasonedPlan, days: GenDay[], refs: Refs, hz: HrZones): void {
  const a = r.profile;
  if (!guard(a.sport as string, "runImpactCap") || r.maxRunDays == null) return;
  const isTrail = a.sport === "trail"; // le SUBSTITUT est trail-spécifique (vélo en côte)
  const injImpact = r.inj.impact; // R6 (audit v6) — lecture unique des blessures
  const canCross = a.dispo === "quotidienne" || a.dispo === "semaine";
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    const isRecupWk = wd.filter((d) => d.isR).length >= 4;
    const cap = isRecupWk ? Math.max(2, r.maxRunDays - 1) : r.maxRunDays;
    let subsThisWeek = 0; // R5.5 — rang de la substitution DANS la semaine
    const runDays = wd.filter((d) => d.sessions.some((s) => s.d === "rn"));
    let over = runDays.length - cap;
    if (over <= 0) continue;
    const ordered = [...runDays.filter((d) => d.charge === "facile" && !d.forced), ...runDays.filter((d) => d.charge === "dur" && !d.forced)];
    for (let i = 0; i < ordered.length && over > 0; i++) {
      const d = ordered[i];
      if (canCross && (injImpact || d.charge === "dur")) {
        // R4.0 (audit v7) — POINT D'ENTRÉE UNIQUE. Ces séances étaient écrites en dur ici et
        // ne lisaient NI `medHold` NI `noVo2` : sous drapeau médical (« douleur thoracique à
        // l'effort », que le questionnaire présente comme non négociable), la passe de
        // réparation réinjectait 32 à 97 blocs au seuil APRÈS que les générateurs les aient
        // correctement retirés. Tant qu'une passe peut fabriquer une séance sans passer par
        // une fonction qui connaît les drapeaux, le garde-fou reste contournable par la
        // prochaine passe ajoutée — c'est la leçon structurelle, pas le symptôme.
        const s = crossTrainingSession(r, isTrail, d.charge === "dur", subsThisWeek++);
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

/**
 * R4.6 (audit v7) — COUVERTURE DES DISCIPLINES. Mesuré avant correction : avec 3 jours OFF
 * déclarés, **46 semaines sur 59** d'un plan de duathlon ne contenaient AUCUNE séance de vélo —
 * le plan devenait un plan de course à pied, et ne le disait pas. Aucune contrainte n'imposait
 * la présence des deux disciplines : le schéma était simplement amputé par les jours bloqués.
 *
 * Deux issues, jamais le silence :
 *   1. il reste un jour facile → il change de discipline (le sport garde ses deux moteurs) ;
 *   2. l'enveloppe déclarée ne le permet pas → un AVERTISSEMENT le dit, avec le remède
 *      (format plus court, ou cycle de 10 jours).
 */
function applyDisciplineCoverage(r: ReasonedPlan, days: GenDay[], refs: Refs, hz: HrZones, ctx: SessionCtx): void {
  const mod = sportModule(r.profile.sport as string);
  if (mod.disciplines.length < 2) return; // monodiscipline : rien à couvrir
  let impossible = 0;
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    // On LIT l'information au lieu de la deviner : compter les jours de repos confondait une
    // semaine d'affûtage avec une semaine de récupération, et l'exemptait de toute couverture.
    const isRecupWeek = wd.length > 0 && wd.every((d) => d.isR);
    const isTaper = wd[0]?.phaseId === "taper";
    if (isRecupWeek) continue; // récup : structure volontairement allégée
    // En affûtage, la couverture reste exigée pour la discipline PRINCIPALE au moins : le
    // volume baisse, la spécificité non.
    const required = isTaper ? [mod.mainDiscipline] : mod.disciplines;
    const present = new Set<string>();
    for (const d of wd)
      for (const s of d.sessions) {
        if (s.d === "rs") continue;
        if (s.d === "br") { for (const b of s.steps || []) if (b.leg) present.add(b.leg === "bike" ? "bk" : b.d || "rn"); present.add("bk"); present.add("rn"); }
        else present.add(s.d);
      }
    const missing = required.filter((x) => !present.has(x));
    if (!missing.length) continue;
    // Un jour facile non bloqué peut changer de discipline sans toucher à la structure dure.
    const donors = wd.filter((d) => !d.forced && d.charge === "facile" && d.sessions.some((s) => s.d !== "rs"));
    let fixed = 0;
    for (const disc of missing) {
      const donor = donors[fixed];
      if (!donor) break;
      // La séance de remplacement passe par le point d'entrée unique (R4.0) : elle connaît les
      // drapeaux médicaux et d'âge. Le cross-training vélo EST la séance vélo facile.
      // R5.2 — en AFFÛTAGE, couvrir ne doit pas REGONFLER : la décroissance de l'affûtage est
      // une règle de sécurité (R3.13), la couverture une règle de complétude. La séance de
      // remplacement ne peut donc pas peser sensiblement plus que celle qu'elle remplace.
      const donorMin = donor.sessions.reduce((t, s) => t + (s.min || 0), 0);
      const tooHeavy = (s: V1Session) => isTaper && donorMin > 0 && (s.min || 0) > donorMin * 1.15;
      if (disc === "bk") {
        const sess = crossTrainingSession(r, false, false);
        sess.name = "Endurance vélo (couverture discipline)";
        sess.note = "Ton enveloppe de jours laisse peu de place : cette sortie garantit qu'il reste au moins une séance de vélo dans la semaine. Un plan de duathlon sans vélo n'est pas un plan allégé, c'est un plan d'un autre sport.";
        renderSess(sess, refs, hz, r.baseRefs);
        if (tooHeavy(sess)) continue;
        donor.sessions = [sess];
        fixed++;
      } else {
        const built = buildSessions(ctx, disc === "sw" ? "facile2" : "facileR", donor.phaseId, donor.prog || 0, donor.week);
        // R5.5 — ne jamais réinstaller une séance déjà présente cette semaine-là : la
        // reconstruction produisait un doublon exact (« Seuil CSS + plaquettes » deux fois).
        const already = new Set(wd.flatMap((x) => x.sessions.map((y) => y.name)));
        const pick = built.find((x) => x.d === disc && !already.has(x.name)) || built.find((x) => x.d === disc);
        if (!pick || already.has(pick.name)) continue;
        for (const x of built) if (x.steps && x.steps.length) renderSess(x, refs, hz, r.baseRefs);
        if (tooHeavy(pick)) continue;
        donor.sessions = [pick];
        fixed++;
      }
    }
    if (fixed < missing.length) impossible++;
  }
  if (impossible > 0) {
    r.warnings.push("Sur " + impossible + " semaine(s), ton enveloppe de jours disponibles ne permet pas de faire tenir toutes les disciplines de ce sport (jours bloqués + disponibilité déclarée). Le plan fait au mieux, mais deux options le rendraient meilleur : viser un format plus court, ou passer sur un cycle de 10 jours (Profil → disponibilité) pour espacer les séances clés au lieu de les entasser sur 7 jours.");
  }
}

/**
 * Séance de CROSS-TRAINING de substitution — le SEUL constructeur de séance des passes de
 * réparation (R4.0, audit v7). Il reçoit le plan raisonné, donc les drapeaux : neutralisation
 * médicale, interdiction de VO2 (mineur), blessures. Aucune passe ne doit écrire une séance
 * littérale : c'est ce qui a permis au drapeau médical d'être contourné.
 *
 * @param wantsVertical  trail : garder le stimulus vertical (côte) plutôt qu'un plat
 * @param wantsIntensity le jour remplacé était un jour DUR : on cherche un équivalent
 */
function crossTrainingSession(r: ReasonedPlan, wantsVertical: boolean, wantsIntensity: boolean, nth = 0): V1Session {
  // R5.5 (audit v7 bis) — le point d'entrée unique produisait la MÊME séance à chaque appel :
  // deux jours de course en excès dans la semaine donnaient deux séances rigoureusement
  // identiques. Le rang dans la semaine fait varier le contenu — un athlète qui lit deux fois
  // la même carte pense (à raison) que le plan ne le regarde pas.
  if (nth >= 1 && !r.medHold) {
    // La variante fait varier le CONTENU, jamais la CHARGE : un deuxième remplacement plus long
    // rendrait le plan d'une blessure multiple plus lourd que celui d'une blessure unique
    // (mesuré au banc v6, B3). Même durée que l'endurance de référence, travail de cadence
    // en plus — c'est la lecture qui change, pas la dose.
    return {
      d: "bk", name: "Endurance vélo — travail de cadence (sans impact)",
      note: "Deuxième remplacement de la semaine : même durée que l'autre, mais on y ajoute de la cadence. Alterne 5 min à cadence haute (95-100 tr/min) et 5 min à cadence libre, tout du long, en endurance. Le geste travaille pendant que les tissus de la course récupèrent.",
      det: "",
      steps: [{ role: "body", durationMin: 55, zone: "bk.z2", intensity: intOf("bk.z2") as unknown as string }],
      ...({ plainBody: true } as object),
    } as V1Session;
  }
  // 1. Drapeau médical : AUCUNE intensité, quelle que soit la raison du remplacement.
  //    « Un mauvais plan vaut mieux qu'un plan dangereux » (manifeste).
  if (r.medHold) {
    return {
      d: "bk", name: "Cross-training vélo très souple (avis médical en attente)",
      note: "Tu as signalé un symptôme à l'effort : aucune intensité n'est générée avant le feu vert d'un médecin. Ce vélo reste en endurance basse, tu dois pouvoir tenir une conversation complète. Si le moindre symptôme apparaît, tu t'arrêtes.",
      det: "",
      steps: [{ role: "body", durationMin: 45, zone: "bk.z2", intensity: intOf("bk.z2") as unknown as string }],
      ...({ plainBody: true } as object),
    } as V1Session;
  }
  // 2. Trail : le stimulus qui compte est le VERTICAL, sans impact ni descente. L'intensité
  //    suit les mêmes règles que partout ailleurs (seuil si autorisé, tempo sinon).
  if (wantsVertical) {
    const zone = wantsIntensity && !r.noVo2 ? "bk.thr" : "bk.ss";
    return {
      d: "bk", name: "Cross-training vélo en côte (sans impact)",
      note: "Ton plafond de jours d'appui est atteint : ce vélo garde le travail en montée — le muscle et le cardio progressent — sans ajouter d'impact ni de descente. C'est le meilleur échange possible aujourd'hui."
        + (r.noVo2 ? " Intensité tenue en tempo : la VO2max attendra la majorité." : ""),
      det: "",
      steps: [
        { role: "warmup", durationMin: 15, text: "progressif, sur le plat" },
        { role: "body", reps: 4, durationMin: 8, zone, intensity: intOf(zone) as unknown as string, repCap: 5, recoveryText: "4min souple en descente", text: "en côte, assis, cadence 60-70" } as V1Step,
        { role: "cooldown", durationMin: 10, text: "souple" },
      ],
    } as V1Session;
  }
  // 3. Jour dur remplacé : équivalent d'intensité sans impact — VO2 si autorisée, seuil sinon.
  if (wantsIntensity) {
    const zone = r.noVo2 ? "bk.thr" : "bk.vo2";
    return {
      d: "bk", name: "Cross-training vélo (intensité)",
      note: (r.noVo2
        ? "Intervalles vélo au seuil — l'intensité sans impact, et sans VO2max : à ton âge, la puissance aérobie maximale se construit plus tard, le seuil suffit largement."
        : "Intervalles vélo — équivalent VO2 sans impact, maintient la puissance aérobie pendant que le tissu se répare."),
      det: "",
      steps: [
        { role: "warmup", durationMin: 15, text: "progressif" },
        { role: "body", reps: r.noVo2 ? 3 : 5, durationMin: r.noVo2 ? 8 : 3, zone, intensity: intOf(zone) as unknown as string, repCap: r.noVo2 ? 4 : 6, recoveryText: "3min souple" } as V1Step,
        { role: "cooldown", durationMin: 10, text: "souple" },
      ],
    } as V1Session;
  }
  // 4. Jour facile remplacé : endurance pure.
  return {
    d: "bk", name: "Cross-training vélo",
    note: "Zéro impact : le stimulus aérobie est conservé pendant que les tissus de la course récupèrent.",
    det: "",
    steps: [{ role: "body", durationMin: 55, zone: "bk.z2", intensity: intOf("bk.z2") as unknown as string }],
    ...({ plainBody: true } as object),
  } as V1Session;
}

/**
 * C1 (audit v6) — budget de SÉANCES, pas de jours. La question posée est « séances/sem
 * tenables sans sacrifice ? » : avec doubles=oui, compter les jours livrait 9 séances à
 * qui en avait déclaré 7. Le retrait va du moins coûteux au plus coûteux :
 *   1. 2ᵉ séance des jours doubles (faciles d'abord)  2. jours faciles entiers
 *   3. jours durs hors sortie longue                  4. dernier recours
 * `durLong` et les jours `forced` ne sont JAMAIS touchés (comportement d'origine, correct).
 */
function applySessionBudget(r: ReasonedPlan, days: GenDay[]): void {
  const toOff = (d: GenDay) => {
    d.charge = "off"; d.slot = "off";
    d.sessions = [{ d: "rs", name: "OFF (budget séances)", det: "repos — respect de ta disponibilité déclarée", steps: [] }];
  };
  const nSess = (d: GenDay) => d.sessions.filter((s) => s.d !== "rs").length;
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    const activeNow = () => wd.filter((d) => d.charge !== "off" && d.charge !== "recup");
    const totalSessions = () => wd.reduce((t, d) => t + nSess(d), 0);
    let over = totalSessions() - r.budgetPerWeek;
    if (over <= 0) continue;
    // 1. les journées à 2 séances rendent leur séance secondaire (la plus légère, jamais
    // la longue ni le brick) — le rythme de la semaine est préservé, seule la densité baisse
    const dbls = () => activeNow().filter((d) => nSess(d) > 1);
    for (const d of [...dbls().filter((x) => x.charge === "facile"), ...dbls().filter((x) => x.charge !== "facile")]) {
      while (over > 0 && nSess(d) > 1) {
        const cand = d.sessions.map((s, i) => ({ s, i })).filter((x) => x.s.d !== "rs" && !x.s.long && !x.s.brick);
        if (!cand.length) break;
        const victim = cand.reduce((x, y) => ((y.s.min || 0) < (x.s.min || 0) ? y : x));
        d.sessions.splice(victim.i, 1);
        over--;
      }
      if (over <= 0) break;
    }
    // 2. puis des journées entières, faciles d'abord
    if (over > 0) {
      const fac = activeNow().filter((d) => d.charge === "facile" && !d.forced);
      for (let i = fac.length - 1; i >= 0 && over > 0; i--) { over -= nSess(fac[i]); toOff(fac[i]); }
    }
    if (over > 0) {
      const durs = activeNow().filter((d) => d.charge === "dur" && !d.forced && d.slot !== "durLong");
      for (let i = durs.length - 1; i >= 0 && over > 0; i--) { over -= nSess(durs[i]); toOff(durs[i]); }
    }
    if (over > 0) {
      const any = activeNow().filter((d) => !d.forced && d.slot !== "durLong");
      for (let i = any.length - 1; i >= 0 && over > 0; i--) { over -= nSess(any[i]); toOff(any[i]); }
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
    // R7 TRAIL (T15) — le renfo EXCENTRIQUE est la protection n°1 contre la casse musculaire
    // en descente. Greffé dès la phase de base, jamais une journée en plus.
    if (r.trail) {
      const quad = r.inj.list.includes("quadriceps");
      graft(faciles[0], { d: "rs", name: "+ Renfo excentrique",
        det: (quad ? "25min" : "20min") + " en fin de séance : squats descendants LENTS (5s à la descente), fentes contrôlées, mollets sur une marche"
          + (r.inj.list.includes("cheville") ? ", puis 10min de proprioception de cheville" : "")
          + " — 💡 Objectif : préparer les cuisses à encaisser la descente. C'est la protection la plus efficace contre la casse musculaire du jour J"
          + (quad ? ", et la seule charge autorisée sur tes quadriceps fragiles" : "") + ".",
        steps: [] });
      continue;
    }
    // NB (R10 phase 1) : le trail a sa PROPRE greffe de renfo excentrique, posée plus haut
    // dans cette fonction (elle `continue`). Lui ajouter en plus la plio de la course
    // ferait doublon — l'extraction reste mécanique, ce n'est pas le lieu d'en décider.
    if (sp === "run") {
      // B2 (audit v6) — la greffe de renfo est CIBLÉE par localisation : tibia → renfo
      // tibial, hanche → gainage hanche/ITB (moyen fessier, bande ilio-tibiale).
      graft(faciles[0], { d: "rs", name: r.injuries.includes("tibia") ? "+ Renfo tibial" : r.injuries.includes("hanche") ? "+ Gainage hanche/ITB" : "+ Renfo + gainage", det: r.injuries.includes("hanche") ? "20min moyen fessier + gainage latéral en fin de footing" : "20min en fin de footing", steps: [] });
      const injImpactP = r.inj.impactAny;
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
      d.slot = sportModule(r.profile.sport as string).easyFallbackSlot;
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
