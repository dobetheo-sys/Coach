/**
 * Sport SWIMRUN (spec R10 phase 3).
 *
 * « Le swimrun n'est pas un triathlon sans vélo. C'est un cousin du trail. » (§R10.3) — le
 * module se modélise sur `trailLibrary`, pas sur `tri` : volume en TEMPS, terrain et matériel
 * comme variables premières, prédiction par fourchette large assumée, garde-fous de sécurité.
 *
 * La séance PIVOT n'est PAS un brick : c'est un motif paramétré par la course visée. Quelle que
 * soit sa durée, elle reproduit le NOMBRE DE TRANSITIONS et le POURCENTAGE DE NAGE de l'épreuve.
 * C'est ce qui la distingue d'un enchaînement natation-course quelconque.
 */
import type { V1Session, V1Step } from "../../engine/types.ts";
import { registerSport, type SessionKit, type PredictKit } from "../registry.ts";
import { swimrunObjective } from "./objective.ts";
import {
  S5_TRANSITION_MIN, S6_TEAM, S7_COLD, S8_PADDLES, S9_LONG_SHARE, S10_PREREQ, S11_GEAR_CHECKLIST,
  OPENWATER_ACCESS,
} from "./tables.ts";

/** Part de plaquettes autorisée dans la séance, par phase — S8, progressif et jamais d'emblée. */
function paddleShare(phase: string, shoulder: boolean): number {
  const base = phase === "base" ? S8_PADDLES.shareBase
    : phase === "dev" ? S8_PADDLES.shareDev
    : phase === "taper" ? S8_PADDLES.shareBase
    : S8_PADDLES.shareSpec;
  return shoulder ? base * S8_PADDLES.shoulderFactor : base;
}

export function buildSwimrunSessions(kit: SessionKit): V1Session[] {
  const { a, slot, phase, prog, lvl, beginner, medHold, inj, S2, P, W, C, Wm, Cm, B, Bd } = kit;
  const obj = swimrunObjective(a);
  const ow = OPENWATER_ACCESS[a.openwater_access || "saisonnier"] || OPENWATER_ACCESS.saisonnier;
  const noOpenWater = ow.maxSessionsPerWeek === 0;
  const shoulder = inj.shoulder;
  const team = obj.teamMode === "binome";
  const cold = obj.waterTempC != null && obj.waterTempC < S7_COLD.acclimationBelowC;
  const pad = paddleShare(phase, shoulder);
  const gearNote = team ? " Longe attachée : c'est en binôme que ça se joue." : "";

  if (slot === "durLong") {
    // ---- LA SÉANCE PIVOT : le swimrun spécifique (§R10.3.4) ----
    const band = S9_LONG_SHARE[phase] || S9_LONG_SHARE.dev;
    const share = band[0] + (band[1] - band[0]) * prog;
    // S9 dimensionne la pivot en % du temps de COURSE. Elle reste néanmoins une séance dans
    // une semaine : au-delà d'environ la moitié du volume hebdo, ce n'est plus un plan, c'est
    // une course déguisée (et l'auditeur le signale à juste titre au-delà de 55 %).
    // Le plafond suit la semaine EN COURS, pas le pic : sur une semaine allégée, une pivot
    // calibrée sur le pic représenterait 70 % du volume. `sessionScale` porte déjà le rapport
    // de la semaine à la charge de référence.
    const weekCapMin = Math.round((kit.r.volPeak || 8) * 60 * 0.42 * Math.min(1, kit.sessionScale || 1));
    const durMin = Math.min(weekCapMin, Math.max(40, Math.round(obj.totalMinMid * share)));
    // Le motif reproduit la COURSE : mêmes transitions, même part de nage. Sur une séance plus
    // courte, on garde le NOMBRE de transitions et on raccourcit les segments — c'est la
    // compétence « entrer et sortir de l'eau » qui se travaille, pas la distance.
    const segs = Math.max(2, Math.min(obj.segments, Math.round(obj.segments * Math.min(1, share * 1.3))));
    const swimMin = Math.max(4, Math.round(durMin * obj.swimTimeShare));
    // Les transitions consomment du temps réel : elles sortent du budget de la séance
    // (elles ne sont pas de l'entraînement, mais elles occupent la sortie).
    const runMin = Math.max(6, durMin - swimMin - Math.round(segs * 2 * (S5_TRANSITION_MIN[lvl] ?? 1.5)));
    const perSwim = Math.max(2, Math.round(swimMin / segs));
    const perRun = Math.max(3, Math.round(runMin / segs));
    if (noOpenWater) {
      // §R10.3.6 — aucun accès à l'eau libre : on SUBSTITUE et on le DIT, au lieu de prescrire
      // une séance infaisable. Enchaînements courts bassin ↔ tapis/extérieur, en tenue partielle.
      S2.push({ d: "br", long: true,
        name: "Swimrun en substitution (bassin ↔ course)",
        note: "Tu n'as pas d'accès à l'eau libre : cette séance reproduit ce qui est reproductible — les " + segs * 2 + " transitions et la part de nage de ta course, en bassin et sur route. Ce qui NE se substitue pas : la navigation, la houle, le froid et l'entrée en eau vive. Cale au moins deux week-ends en eau libre avant ta course, c'est le meilleur investissement de ta préparation." + gearNote,
        det: "",
        steps: [
          Wm(200, "nage souple, en tenue partielle si le bassin l'autorise"),
          // Les DEUX legs sont des steps à part entière : mettre la course dans un texte de
          // récupération ferait mentir le total de la séance (l'auditeur, lui, la compte).
          { role: "body", leg: "swim", reps: segs, durationMin: perSwim, zone: "sw.aero", d: "sw", intensity: "aero" as unknown as string, bnd: { floor: 2, cap: perSwim }, recoveryText: "sortie de bassin sans traîner", suffix: " nage" + (pad > 0 ? " (dont ~" + Math.round(pad * 100) + "% avec plaquettes)" : ""), text: "" } as V1Step,
          { role: "body", leg: "run", reps: segs, durationMin: perRun, d: "rn", zone: "rn.easy", intensity: "easy" as unknown as string, bnd: { floor: 3, cap: perRun }, recoveryText: "retour à l'eau immédiat", suffix: " de course entre deux nages", text: "" } as V1Step,
          Cm(150, "souple"),
        ] });
    } else {
      S2.push({ d: "br", long: true,
        name: "Swimrun spécifique (" + segs * 2 + " transitions)",
        note: "LA séance de ta préparation : elle reproduit le nombre de transitions et la part de nage de ta course, quelle que soit sa durée. Entre dans l'eau sans t'arrêter pour ranger tes affaires, sors en courant, et compte le temps que tu perds à chaque passage — c'est là qu'un binôme entraîné gagne une demi-heure." + (cold ? " Eau froide : couvre-toi dès la sortie, la déperdition thermique se joue à la course, pas à la nage." : "") + gearNote,
        det: "",
        steps: [
          W(10, "course d'ouverture progressive, matériel en place"),
          // Nage ET course sont des steps à part entière (§R10.3.4) : le motif alterne les deux
          // `segs` fois. Encoder la course dans un texte de récupération ferait sous-compter la
          // séance de tout son volume de course — l'auditeur l'a relevé, et il avait raison.
          { role: "body", leg: "swim", reps: segs, durationMin: perSwim, zone: "sw.aero", d: "sw", intensity: "aero" as unknown as string, bnd: { floor: 2, cap: perSwim }, recoveryText: "sortie d'eau en courant", suffix: " nage en eau libre" + (pad > 0 ? ", ~" + Math.round(pad * 100) + "% avec plaquettes" : "") + (team ? ", longe attachée" : ""), text: "" } as V1Step,
          { role: "body", leg: "run", reps: segs, durationMin: perRun, d: "rn", zone: "rn.easy", intensity: "easy" as unknown as string, bnd: { floor: 3, cap: perRun }, recoveryText: "entrée dans l'eau sans t'arrêter", suffix: " de course sur sentier entre deux nages", text: "" } as V1Step,
          C(10, "course très souple, se réchauffer"),
        ] });
    }
  } else if (slot === "dur1") {
    // ---- Qualité NAGE : en tenue quand c'est possible, plaquettes progressives (S8) ----
    if (shoulder) {
      S2.push({ d: "sw", name: "Nage seuil contrôlé (épaule épargnée)", note: "Épaule fragile : volume modéré, technique soignée, et les plaquettes réduites au minimum — ce sont elles qui chargent l'épaule en swimrun. Arrêt au moindre signal articulaire.", det: "",
        steps: [Wm(200, "souple + éducatifs doux"), Bd(P(4, 7), 100, "sw.css", "25-35s", " amplitude confortable, SANS plaquettes", false, "sw"), Cm(150, "souple")] });
    } else if (beginner) {
      S2.push({ d: "sw", name: "Technique + aisance en tenue", note: "En swimrun on nage en chaussures et en combinaison : la position change, les jambes portent moins. Habitue-toi au matériel AVANT de chercher la vitesse — c'est le choc n°1 des débutants.", det: "",
        steps: [Wm(200, "souple"), Bd(P(6, 10), 50, "sw.easy", "repos libre", " en tenue partielle, un point technique à la fois", false, "sw"), Cm(100, "relâché")] });
    } else {
      S2.push({ d: "sw", name: "Seuil CSS + plaquettes", note: "Le seuil se tient sur tous les 100 m : le dernier doit ressembler au premier. Les plaquettes viennent progressivement — elles tractent, mais elles chargent l'épaule." + (pad > 0 ? " Aujourd'hui : environ " + Math.round(pad * 100) + "% de la série avec plaquettes." : ""), det: "",
        steps: [Wm(300, "progressif + 4×50m éducatifs"), Bd(P(6, 10), 100, "sw.css", "15-20s", pad > 0 ? " dont ~" + Math.round(pad * 100) + "% avec plaquettes + pull buoy" : "", false, "sw"), Cm(200, "souple")] });
    }
  } else if (slot === "dur2") {
    // ---- Qualité COURSE : le terrain est du trail, l'impact compte ----
    if (inj.impact) {
      S2.push({ d: "rn", name: "Seuil course (surface souple)", note: "Zone fragile déclarée : stimulus fort, sans vitesses maximales ni à-coups, sur surface souple.", det: "",
        steps: [W(15, "footing très facile"), B(P(2, 4), P(6, 10), "rn.thr", "2-3min trot", " sur surface souple"), C(10, "footing facile")] });
    } else {
      S2.push({ d: "rn", name: "Seuil course sur sentier", note: "En swimrun on court sur des rochers, des racines et des sentiers, jambes mouillées et chaussures pleines d'eau. Cours ce seuil sur le terrain le plus proche de ta course, pas sur piste.", det: "",
        steps: [W(15, "footing progressif sur sentier"), B(P(3, 5), P(5, 9), "rn.thr", "2min trot"), C(10, "footing souple")] });
    }
  } else if (slot === "facileR") {
    // ---- Endurance course, ou acclimatation au froid quand la saison l'exige (S7) ----
    if (cold && !noOpenWater && !medHold) {
      S2.push({ d: "sw", name: "Acclimatation eau froide", note: "L'acclimatation au froid est une qualité qui s'entraîne, pas une affaire de volonté : exposition régulière, temps dans l'eau allongé progressivement. Jamais seul, toujours avec une sortie possible à vue." + (obj.waterTempC != null && obj.waterTempC < S7_COLD.wetsuitMandatoryBelowC ? " Sous " + S7_COLD.wetsuitMandatoryBelowC + " °C la combinaison est de toute façon obligatoire en course." : ""), det: "",
        steps: [Bd(1, Math.max(300, P(400, 1000)), "sw.easy", "", " en eau libre, sortie progressive du temps d'exposition", false, "sw")], ...({ plainBody: true } as object) });
    } else {
      S2.push({ d: "rn", name: "Footing facile", note: "Endurance fondamentale, allure de conversation. En swimrun, courir avec des jambes fatiguées par la nage est la norme : ce volume facile construit cette tolérance.", det: "",
        steps: [B(1, P(30, 55), "rn.easy", "", inj.impact ? " · surface souple" : " · sur sentier si possible")], ...({ plainBody: true } as object) });
    }
  } else if (slot === "facile2") {
    S2.push({ d: "sw", name: "Nage récup + technique", note: "Récupération dans l'eau : relâchement total, respiration ample. C'est aussi le moment de refaire des éducatifs à froid, sans fatigue.", det: "",
      steps: [Bd(1, P(600, 1100), "sw.easy", "", " souple, éducatifs entre les séries", false, "sw")], ...({ plainBody: true } as object) });
  } else if (slot === "recup") {
    S2.push({ d: "rs", name: "Repos / épaules + mobilité", det: "coiffe des rotateurs, mobilité chevilles — les deux zones que le swimrun charge le plus", steps: [] });
  } else if (slot === "off") {
    S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  }
  return S2;
}

/**
 * Structure hebdomadaire de référence (§R10.3.4, convergence des sources) : 2-3 nages,
 * 3-4 courses, 1-2 swimruns spécifiques, 2 séances de renforcement. Le swimrun spécifique
 * tombe le week-end (l'eau libre et le binôme sont des contraintes logistiques).
 */
export function swimrunWeekSchema(_phase: string, isRecup: boolean): { charge: string; slot: string }[] {
  if (isRecup) return [
    { charge: "recup", slot: "recup" }, { charge: "facile", slot: "facile2" }, { charge: "off", slot: "off" },
    { charge: "facile", slot: "facileR" }, { charge: "off", slot: "off" }, { charge: "facile", slot: "facile2" }, { charge: "recup", slot: "recup" },
  ];
  // Lun repos/renfo · Mar nage qualité · Mer course facile · Jeu course qualité · Ven nage récup
  // · Sam SWIMRUN spécifique · Dim course facile
  return [
    { charge: "recup", slot: "recup" }, { charge: "dur", slot: "dur1" }, { charge: "facile", slot: "facileR" },
    { charge: "dur", slot: "dur2" }, { charge: "facile", slot: "facile2" }, { charge: "dur", slot: "durLong" },
    { charge: "facile", slot: "facileR" },
  ];
}

/** Prédiction swimrun (§R10.3.7) — trois postes, fourchette large assumée. Riegel inapplicable. */
export function predictSwimrun(kit: PredictKit): void {
  const { items, advice, D } = kit;
  const obj = kit.swimrun;
  if (!obj) {
    advice.push("Renseigne les données de ta course (distance nagée, distance courue, nombre de segments) pour obtenir une estimation de temps.");
    return;
  }
  const fmtHM = (min: number) => {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return h > 0 ? h + "h" + String(m).padStart(2, "0") : m + "min";
  };
  const est = obj.paceKnown ? "" : " — ESTIMÉ d'après ton CSS et ton allure route, fais le test en tenue pour l'affiner";
  items.push({ leg: "Temps estimé", value: fmtHM(obj.totalMinLo) + "–" + fmtHM(obj.totalMinHi),
    why: obj.why + " · fourchette large assumée : sur cette épreuve, le terrain, l'eau et le binôme pèsent plus que la condition physique" });
  items.push({ leg: "Dont nage", value: fmtHM(obj.swimMin) + " (" + Math.round(obj.swimTimeShare * 100) + "% du temps)",
    why: "La nage pèse bien plus lourd en TEMPS qu'en distance : " + Math.round(obj.swimTotalM / 10) / 100 + " km nagés ne représentent qu'une fraction de la distance, mais un quart à un tiers du chrono" + est });
  items.push({ leg: "Dont course", value: fmtHM(obj.runMin),
    why: "Terrain de trail, jambes mouillées, chaussures pleines d'eau : compte une allure nettement plus lente que sur route" + est });
  items.push({ leg: "Dont transitions", value: fmtHM(obj.transitionMin) + " (" + obj.transitions + " passages)",
    why: "Poste à part entière, jamais négligé : " + obj.segments + " segments nagés = " + obj.transitions + " transitions. C'est le temps le plus facile à récupérer — il s'entraîne" });
  if (obj.teamMode === "binome") {
    items.push({ leg: "Effet de binôme", value: "−" + Math.round(S6_TEAM.draftEffortSaving * 100) + "% d'effort pour le suiveur",
      why: "Un bon sillage vaut jusqu'à " + S6_TEAM.swimSecPer100mGain + " s/100 m et supprime la charge de navigation ; attachée, la vitesse de l'équipe se rapproche de celle du nageur le plus rapide" });
  }
  D("PRED-swimrun", "Méthode swimrun", "nage + course + transitions", "Riegel ne s'applique pas : on additionne trois postes mesurés séparément, dont les transitions que tout le monde sous-estime");
  advice.push("Le temps le plus facile à gagner n'est pas dans les jambes : c'est dans les " + obj.transitions + " transitions. Répète-les jusqu'à ce qu'elles soient automatiques.");
  if (!obj.paceKnown) advice.push("Fais le test en tenue COMPLÈTE (combinaison, chaussures, chaussettes, pull buoy, plaquettes, en eau libre, avec ton partenaire et la longe) : 1000 m nagés et 5 à 8 km courus. Un binôme à 6 min/km sur route se retrouve souvent autour de 8 min/km en tenue — tant que ce test n'est pas fait, toutes nos allures sont des estimations.");
  advice.push("Matériel à vérifier auprès de l'organisateur (socle habituel) : " + S11_GEAR_CHECKLIST.join(" · ") + ".");
  if (obj.longestSwimM >= 1000) advice.push("Ta plus longue nage fait " + obj.longestSwimM + " m : c'est la contrainte qui dimensionne ta préparation, thermiquement et mentalement. Nage-la au moins deux fois en conditions réelles avant la course.");
}

registerSport({
  id: "swimrun",
  mainDiscipline: "rn", // la course représente l'essentiel du temps, même si la nage décide
  easyFallbackSlot: "facileR",
  weekSchema: (phase, isRecup) => swimrunWeekSchema(phase, isRecup),
  buildSessions: buildSwimrunSessions,
  predict: predictSwimrun,
  // Le test en tenue passe AVANT le CSS et l'allure route : ceux-ci ne sont qu'un repli.
  retestTypes: ["swimrunSwimPace", "swimrunRunPace", "css", "thrPace"],
  // Le terrain est du trail (impact + excentrique) : le plafond de jours d'appui s'applique.
  // Les planchers de séance en mètres s'appliquent aussi — il y a de la vraie natation ici.
  guards: { runImpactCap: true, swimSessionFloors: true, smoothOnAuditMetric: true, stripLongOnMedHold: true },
});

/** Prérequis d'entrée (S10) — exposé à l'UI, qui refuse les formats longs en dessous. */
export function swimrunPrereqBlock(a: { swim_continuous?: string; run_continuous?: string; format?: string }): string | null {
  const longFormat = a.format === "series" || a.format === "championship";
  if (!longFormat) return null;
  const swimOk = a.swim_continuous === "oui";
  const runOk = a.run_continuous === "oui";
  if (swimOk && runOk) return null;
  return "Pour un format " + (a.format === "championship" ? "championnat du monde" : "World Series")
    + ", il faut savoir nager " + S10_PREREQ.minSwimContinuousMin + " min (environ "
    + S10_PREREQ.minSwimContinuousM + " m) sans s'arrêter et courir " + S10_PREREQ.minRunContinuousMin
    + " min en continu — en swimrun on est parfois à plusieurs centaines de mètres du rivage. "
    + "Commence par un format Experience ou Sprint : ce n'est pas un lot de consolation, c'est l'ordre dans lequel ce sport s'apprend.";
}
