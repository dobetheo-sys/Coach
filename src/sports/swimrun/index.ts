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
import {
 registerSport, type SessionKit, type PredictKit } from "../registry.ts";
import { swimrunObjective } from "./objective.ts";
import {
  S5_TRANSITION_MIN, S6_TEAM, S7_COLD, S8_PADDLES, S9_LONG_SHARE, S10_PREREQ, S11_GEAR_CHECKLIST,
  S12_PIVOT_MAX_SEGMENTS,
  OPENWATER_ACCESS,
  S13_MIX_FOLLOWS_RACE,
  S14_EASY_RUN_VS_PEAK_PIVOT, S14_EASY_RUN_CAP_MIN, S14_EASY_RUN_FLOOR_MIN,
} from "./tables.ts";

/**
 * S9 — DURÉE DE LA SÉANCE PIVOT, calculée en UN seul endroit.
 *
 * Le créneau `durLong` la construisait en ligne ; depuis S14 le créneau facile a besoin de la
 * même formule, prise au PIC, pour s'y borner en dessous. Deux copies auraient divergé au
 * premier ajustement de S9 — et la divergence aurait été silencieuse : un footing plafonné sur
 * une pivot d'hier reste un footing plafonné, il ne lève rien.
 *
 * `progOverride` / `phaseOverride` servent à interroger la formule pour une AUTRE phase que
 * celle en cours : c'est ainsi que le footing connaît la pivot du pic sans la construire.
 */
function pivotDurationMin(kit: SessionKit, totalMinMid: number, phaseOverride?: string, progOverride?: number): number {
  const ph = phaseOverride ?? kit.phase;
  const pr = progOverride ?? kit.prog;
  const band = S9_LONG_SHARE[ph] || S9_LONG_SHARE.dev;
  const share = band[0] + (band[1] - band[0]) * pr;
  // Le plafond suit la semaine EN COURS, pas le pic : sur une semaine allégée, une pivot
  // calibrée sur le pic représenterait 70 % du volume. `sessionScale` porte ce rapport —
  // sauf quand on interroge le pic, qui est par définition la semaine à pleine échelle.
  const scale = phaseOverride ? 1 : Math.min(1, kit.sessionScale || 1);
  const weekCapMin = Math.round((kit.r.volPeak || 8) * 60 * 0.42 * scale);
  return Math.min(weekCapMin, Math.max(40, Math.round(totalMinMid * share)));
}

/**
 * S14 (R20.3) — bornes du créneau facile course. Le plafond est la pivot du PIC, c'est-à-dire
 * la plus longue séance que ce plan produira : le footing ne peut donc jamais devenir la séance
 * de référence, ce qui est exactement ce qu'O-8 reproche. Voir `tables.ts` pour les DEUX
 * écritures précédentes, mesurées et réfutées par le banc v7 (S-MIX 4 → 158 puis 152).
 *
 * Le plancher est absolu ; le `Math.min` garantit qu'il ne peut jamais dépasser le plafond sur
 * une épreuve très courte — une borne inversée est une borne qui ne borne plus.
 */
function easyRunBounds(kit: SessionKit, totalMinMid: number): { floor: number; cap: number } {
  const pivotPeak = pivotDurationMin(kit, totalMinMid, "peak", 1);
  const cap = Math.max(S14_EASY_RUN_FLOOR_MIN,
    Math.min(S14_EASY_RUN_CAP_MIN, Math.round(pivotPeak * S14_EASY_RUN_VS_PEAK_PIVOT)));
  return { floor: Math.min(S14_EASY_RUN_FLOOR_MIN, cap), cap };
}

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
  // R4.3 (audit v7) — `maxSessionsPerWeek` (3 / 1 / 0) est un NOMBRE, pas un booléen : il
  // n'était lu que comme `=== 0`, et le plan prescrivait 3 séances en eau libre là où l'athlète
  // en avait déclaré 1 de possible. Le quota est désormais alloué par PRIORITÉ, de façon
  // déterministe (chaque créneau sait s'il a droit à l'eau libre sans compter la semaine) :
  //   1. le swimrun spécifique — la séance qui justifie le sport ;
  //   2. la plus longue nage continue — la contrainte dimensionnante ;
  //   3. l'acclimatation au froid — la plus substituable (bassin non chauffé, douche).
  const owQuota = ow.maxSessionsPerWeek;
  const owForPivot = owQuota >= 1;
  const owForLongSwim = owQuota >= 2;
  // L'acclimatation est la séance la plus SUBSTITUABLE des trois (bassin non chauffé, douche) :
  // elle ne réclame jamais le quota. Cela laisse une marge d'une séance, car les passes de
  // reconstruction (anti-collage, polarisation) peuvent dupliquer un créneau dans la semaine —
  // une 4ᵉ séance en eau libre est alors apparue sur un plafond de 3. L'athlète garde de
  // l'exposition au froid via le swimrun spécifique et la longue nage, qui y sont déjà.
  const owForCold = false;
  const shoulder = inj.shoulder;
  const team = obj.teamMode === "binome";
  const cold = obj.waterTempC != null && obj.waterTempC < S7_COLD.acclimationBelowC;
  const pad = paddleShare(phase, shoulder);
  // S13 — LE CRÉNEAU FACILE SECONDAIRE SUIT LA COURSE. La structure hebdomadaire était un
  // constant (2 nages, 2 courses, la pivot) : la part de course du plan valait 63-64 % que
  // l'épreuve en demande 45 % ou 94 %. On ne rééquilibre pas au prorata — nager 6 % du temps
  // parce que la course nage 6 % du temps serait absurde, la technique se perd par manque de
  // FRÉQUENCE — mais un créneau facile bascule quand l'écart n'est plus défendable.
  const runShare = 1 - obj.swimTimeShare;
  // Deux verrous, tous deux au nom de la HIÉRARCHIE DU MANIFESTE — la spécificité est la
  // priorité 5, la santé la 1 :
  //   · l'acclimatation au froid n'est pas un choix de spécificité mais une adaptation de
  //     sécurité : quand elle occupe `facile2`, elle le verrouille ;
  //   · sous drapeau médical, le plan est un plan d'entretien — il n'a rien à ressembler à
  //     une course. Mesuré : sans ce verrou, la bascule retirait la nage souple des plans
  //     sous drapeau, et 71 profils perdaient leur seule nage continue.
  const runDominant = runShare > S13_MIX_FOLLOWS_RACE.runDominantAbove && !cold && !medHold;

  const gearNote = team ? " Longe attachée : c'est en binôme que ça se joue." : "";

  // Le stimulus VO2 en course : un seul constructeur, deux créneaux possibles (`dur2` quand le
  // budget le permet, `dur1` en alternance quand il ne le permet pas — R5.5).
  const vo2Swim = (): V1Session => ({ d: "sw", name: "VO2max en nage (zone fragile épargnée)", note: "Ta zone fragile interdit l'intensité en course, pas la puissance aérobie maximale : elle se travaille dans l'eau, sans le moindre impact. Départs toutes les 1'30 : c'est la récupération courte qui fait le travail, pas la vitesse pure. Si tu sens la zone fragile, tu sors.", det: "",
    steps: [Wm(300, "progressif + 4×25m accélérations"), Object.assign(Bd(P(6, 10), 50, "sw.vo2", "départ 1'30", "", false, "sw"), { repCap: 10 }), Cm(200, "très souple")] });
  const vo2Trail = (): V1Session => ({ d: "rn", name: "VO2max sur sentier", note: "Le seul bloc vraiment dur de ta semaine : effort maximal tenable ~3 min, récupération complète. On le place en phase de développement — c'est lui qui relève le plafond sous lequel toute ton allure d'endurance se joue. Sur sentier, pas sur piste : le terrain fait partie du geste.", det: "",
    steps: [W(18, "footing progressif sur sentier + 4 lignes droites"), B(P(4, 6), 3, "rn.vo2", "2min30 trot", ""), C(10, "footing très souple")] });

  if (slot === "durLong") {
    // ---- LA SÉANCE PIVOT : le swimrun spécifique (§R10.3.4) ----
    const band = S9_LONG_SHARE[phase] || S9_LONG_SHARE.dev;
    const share = band[0] + (band[1] - band[0]) * prog;
    // S9 dimensionne la pivot en % du temps de COURSE. Elle reste néanmoins une séance dans
    // une semaine : au-delà d'environ la moitié du volume hebdo, ce n'est plus un plan, c'est
    // une course déguisée (et l'auditeur le signale à juste titre au-delà de 55 %).
    // R20.3 — le calcul vit désormais dans `pivotDurationMin` : le créneau facile en a besoin
    // pour se borner en dessous (S14), et deux copies auraient divergé en silence.
    const durMin = pivotDurationMin(kit, obj.totalMinMid);
    // Le motif reproduit la COURSE : mêmes transitions, même part de nage. Sur une séance plus
    // courte, on garde le NOMBRE de transitions et on raccourcit les segments — c'est la
    // compétence « entrer et sortir de l'eau » qui se travaille, pas la distance.
    // S12 — on ne reproduit jamais plus d'une douzaine de segments dans une séance : au-delà,
    // la séance EST la course. R4.1 (audit v7) : `repCap = segs` sur les deux legs — le nombre
    // de transitions est la SPÉCIFICATION de cette séance, il ne doit jamais absorber du volume.
    // C'est la durée des segments qui s'ajuste.
    const segs = Math.max(2, Math.min(obj.segments, S12_PIVOT_MAX_SEGMENTS, Math.round(obj.segments * Math.min(1, share * 1.3))));
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
        note: "Tu n'as pas accès à un plan d'eau : cette séance reproduit ce qui est reproductible — les " + segs * 2 + " transitions et la part de nage de ta course, en bassin et sur route. Ce qui NE se substitue pas : la navigation, la houle, le froid et l'entrée en eau vive. Cale au moins deux week-ends en conditions réelles (lac ou mer) avant ta course, c'est le meilleur investissement de ta préparation." + gearNote,
        det: "",
        steps: [
          Wm(200, "nage souple, en tenue partielle si le bassin l'autorise"),
          // Les DEUX legs sont des steps à part entière : mettre la course dans un texte de
          // récupération ferait mentir le total de la séance (l'auditeur, lui, la compte).
          { role: "body", leg: "swim", reps: segs, durationMin: perSwim, zone: "sw.aero", d: "sw", intensity: "aero" as unknown as string, bnd: { floor: 2, cap: perSwim }, repCap: segs, recoveryText: "sortie de bassin sans traîner", suffix: " nage" + (pad > 0 ? " (dont ~" + Math.round(pad * 100) + "% avec plaquettes)" : ""), text: "" } as V1Step,
          { role: "body", leg: "run", reps: segs, durationMin: perRun, d: "rn", zone: "rn.easy", intensity: "easy" as unknown as string, bnd: { floor: 3, cap: perRun }, repCap: segs, recoveryText: "retour à l'eau immédiat", suffix: " de course entre deux nages", text: "" } as V1Step,
          Cm(150, "souple"),
        ] });
    } else {
      S2.push({ d: "br", long: true,
        name: "Swimrun spécifique (" + segs * 2 + " transitions)",
        note: "LA séance de ta préparation : elle reproduit le nombre de transitions et la part de nage de ta course, quelle que soit sa durée. Entre dans l'eau sans t'arrêter pour ranger tes affaires, sors en courant, et compte le temps que tu perds à chaque passage — c'est là qu'on gagne une demi-heure." + (cold ? " Eau froide : couvre-toi dès la sortie, la déperdition thermique se joue à la course, pas à la nage." : "") + gearNote,
        det: "",
        steps: [
          W(10, "course d'ouverture progressive, matériel en place"),
          // Nage ET course sont des steps à part entière (§R10.3.4) : le motif alterne les deux
          // `segs` fois. Encoder la course dans un texte de récupération ferait sous-compter la
          // séance de tout son volume de course — l'auditeur l'a relevé, et il avait raison.
          { role: "body", leg: "swim", reps: segs, durationMin: perSwim, zone: "sw.aero", d: "sw", intensity: "aero" as unknown as string, bnd: { floor: 2, cap: perSwim }, repCap: segs, recoveryText: "sortie d'eau en courant", suffix: (owForPivot ? " nage en eau libre" : " nage en bassin") + (pad > 0 ? ", ~" + Math.round(pad * 100) + "% avec plaquettes" : "") + (team ? ", longe attachée" : ""), text: "" } as V1Step,
          { role: "body", leg: "run", reps: segs, durationMin: perRun, d: "rn", zone: "rn.easy", intensity: "easy" as unknown as string, bnd: { floor: 3, cap: perRun }, repCap: segs, recoveryText: "entrée dans l'eau sans t'arrêter", suffix: " de course sur sentier entre deux nages", text: "" } as V1Step,
          C(10, "course très souple, se réchauffer"),
        ] });
    }
  } else if (slot === "dur1") {
    // ---- Qualité NAGE : en tenue quand c'est possible, plaquettes progressives (S8) ----
    // R5.5 (audit v7 bis) — SUR UNE PETITE ENVELOPPE, LA QUALITÉ SE PARTAGE UN SEUL CRÉNEAU.
    // Le stimulus VO2 vit dans `dur2` ; à 3 séances par semaine (ou 3 jours bloqués), le budget
    // supprime ce jour et le plan traversait 40 semaines sans une seule sollicitation de la
    // puissance aérobie maximale — c'est elle qui plafonne l'allure d'endurance sur laquelle
    // tout le reste se joue. Une semaine sur deux en phase de développement, le créneau de
    // qualité bascule donc sur elle ; le seuil nage revient l'autre semaine. Rien n'est
    // sacrifié, tout est alterné — c'est ce que fait un entraîneur avec trois séances.
    // Le SUPPORT suit les zones fragiles (R5.4) : impact → nage, épaule → course. Les deux à la
    // fois : aucun support n'est sûr, on laisse la main aux branches prudentes ci-dessous.
    if (phase === "dev" && kit.weekNum % 2 === 1 && !kit.noVo2 && !medHold && !beginner
        && !(inj.impact && shoulder)
        && ((kit.r.budgetPerWeek ?? 6) <= 4 || (kit.r.offDays?.length ?? 0) >= 3 || kit.a.dispo === "weekend")) {
      S2.push(inj.impact ? vo2Swim() : vo2Trail());
    } else if (shoulder) {
      S2.push({ d: "sw", name: "Nage seuil contrôlé (épaule épargnée)", note: "Épaule fragile : volume modéré, technique soignée, et les plaquettes réduites au minimum — ce sont elles qui chargent l'épaule en swimrun. Arrêt au moindre signal articulaire.", det: "",
        steps: [Wm(200, "souple + éducatifs doux"), Object.assign(Bd(P(4, 7), 100, "sw.css", "25-35s", " amplitude confortable, SANS plaquettes", false, "sw"), { repCap: 10 }), Cm(150, "souple")] });
    } else if (beginner) {
      S2.push({ d: "sw", name: "Technique + aisance en tenue", note: "En swimrun on nage en chaussures et en combinaison : la position change, les jambes portent moins. Habitue-toi au matériel AVANT de chercher la vitesse — c'est le choc n°1 des débutants.", det: "",
        steps: [Wm(200, "souple"), Object.assign(Bd(P(6, 10), 50, "sw.easy", [0.33, "repos libre (~20s)"], " en tenue partielle, un point technique à la fois", false, "sw"), { repCap: 10 }), Cm(100, "relâché")] });
    } else if ((phase === "spec" || phase === "peak") && (kit.weekNum % 2 === 0 || kit.r.weeks <= 14)) {
      // La PLUS LONGUE NAGE est la contrainte dimensionnante d'une prépa swimrun (thermique et
      // mentale) : elle se répète en continu, pas en séries. Une semaine sur deux en phase
      // spécifique, pour ne pas sacrifier le travail de seuil.
      S2.push({ d: "sw", name: "Nage continue longue (répétition de la plus longue nage)",
        note: "La plus longue nage de ta course fait " + obj.longestSwimM + " m : c'est elle qui décide si tu passes ou si tu sors de l'eau vidé. On la répète EN CONTINU, sans toucher le bord — le mental compte autant que le physique ici." + (owForLongSwim ? " En eau libre, avec quelqu'un à vue." : " En bassin : ne t'arrête pas aux murs, demi-tour et tu repars. Ton accès aux plans d'eau est réservé au swimrun spécifique."),
        det: "",
        steps: [Wm(200, "souple, mise en tenue"), Object.assign(Bd(1, Math.max(400, obj.longestSwimM), "sw.aero", "", " en continu, sans arrêt" + (owForLongSwim ? " (eau libre)" : " (bassin)"), false, "sw"), { bnd: { floor: Math.max(400, Math.round(obj.longestSwimM * 0.85)), cap: Math.round(obj.longestSwimM * 1.15) } }), Cm(150, "souple")] });
    } else {
      S2.push({ d: "sw", name: "Seuil CSS + plaquettes", note: "Le seuil se tient sur tous les 100 m : le dernier doit ressembler au premier. Les plaquettes viennent progressivement — elles tractent, mais elles chargent l'épaule." + (pad > 0 ? " Aujourd'hui : environ " + Math.round(pad * 100) + "% de la série avec plaquettes." : ""), det: "",
        steps: [Wm(300, "progressif + 4×50m éducatifs"), Object.assign(Bd(P(6, 10), 100, "sw.css", "15-20s", pad > 0 ? " dont ~" + Math.round(pad * 100) + "% avec plaquettes + pull buoy" : "", false, "sw"), { repCap: 11 }), Cm(200, "souple")] });
    }
  } else if (slot === "dur2") {
    // ---- Qualité COURSE : le terrain est du trail, l'impact compte ----
    if (inj.impact && (phase === "dev" || phase === "spec") && !kit.noVo2 && !medHold && !beginner) {
      // R5.4 — zone fragile à l'impact : la VO2max ne disparaît pas, elle change de SUPPORT.
      // Le swimrun n'a pas de vélo pour absorber l'intensité sans impact, mais il a l'eau — et
      // c'est même le support le plus spécifique des deux. Départs serrés : la difficulté vient
      // du temps de repos, pas de la vitesse pure.
      S2.push(vo2Swim());
    } else if (inj.impact) {
      S2.push({ d: "rn", name: "Seuil course (surface souple)", note: "Zone fragile déclarée : stimulus fort, sans vitesses maximales ni à-coups, sur surface souple.", det: "",
        steps: [W(15, "footing très facile"), B(P(2, 4), P(6, 10), "rn.thr", "2-3min trot", " sur surface souple"), C(10, "footing facile")] });
    } else if ((phase === "dev" || phase === "spec") && !kit.noVo2 && !medHold && !beginner) {
      // R4.8f (audit v7) — le module ne contenait AUCUN stimulus VO2/vitesse : `noVo2` et
      // « pas de VO2 en affûtage » y étaient donc des règles vides. Un swimrun se court à
      // allure d'endurance, mais la puissance aérobie maximale reste ce qui plafonne cette
      // allure — elle se travaille en phase de développement, courte et sur le terrain de la
      // course, pas sur piste.
      S2.push(vo2Trail());
    } else {
      S2.push({ d: "rn", name: "Seuil course sur sentier", note: "En swimrun on court sur des rochers, des racines et des sentiers, jambes mouillées et chaussures pleines d'eau. Cours ce seuil sur le terrain le plus proche de ta course, pas sur piste.", det: "",
        steps: [W(15, "footing progressif sur sentier"), B(P(3, 5), P(5, 9), "rn.thr", "2min trot"), C(10, "footing souple")] });
    }
  } else if (slot === "facileR") {
    // R4.2 (audit v7) — L'ENDURANCE COURSE NE SE FAIT PLUS VOLER SON CRÉNEAU. L'acclimatation au
    // froid remplaçait ce footing dès que l'eau passait sous 17 °C, c'est-à-dire pour la majorité
    // des courses européennes : ce n'était pas un cas limite, c'était le comportement par défaut.
    // Résultat mesuré : le plan allouait 43 % du temps à la course quand la course en demande
    // 68 % — un écart de 25 points, dans le sens qui pénalise le limiteur réel du sport.
    // Le froid consomme désormais un créneau NAGE (`facile2`).
    // S13 — PAS DE RÈGLE SYMÉTRIQUE ICI, et c'est mesuré : côté épreuve dominée par la NAGE
    // (45-53 % de course), le plan était déjà à 64 % — au-dessus de la course, jamais en
    // dessous, donc jamais le sens qui sous-entraîne. Basculer ce créneau en nage « pour la
    // symétrie » a été essayé et mesuré : la part de course tombait à 17 %. Une règle qu'aucun
    // défaut ne réclame est une règle qui en crée un.
    // S14 (R20.3) — LE FOOTING PORTE SES BORNES. Sans `bnd`, il était le seul bloc sans plafond
    // de la semaine, donc le déversoir de toutes les passes de remplissage : mesuré jusqu'à
    // 226 min, médiane 138-161 min, devant la pivot. Le plafond est RELATIF à la pivot de la
    // même semaine — en swimrun c'est elle qui tient le rôle de sortie longue.
    S2.push({ d: "rn", name: "Footing facile", note: "Endurance fondamentale, allure de conversation. En swimrun, courir avec des jambes fatiguées par la nage est la norme : ce volume facile construit cette tolérance — et la course représente la majorité du temps de ta course.", det: "",
      steps: [Object.assign(B(1, P(30, 55), "rn.easy", "", inj.impact ? " · surface souple" : " · sur sentier si possible"), { bnd: easyRunBounds(kit, obj.totalMinMid) })], ...({ plainBody: true } as object) });
  } else if (slot === "facile2") {
    // R4.3 (audit v7) — LE PLAFOND D'ACCÈS À L'EAU LIBRE EST UN NOMBRE, PAS UN BOOLÉEN.
    // `maxSessionsPerWeek` (3 / 1 / 0) n'était lu que comme `=== 0`. La pivot consomme le
    // premier quota de la semaine (c'est la séance prioritaire) : une seconde séance en eau
    // libre n'est donc possible qu'à partir d'un plafond de 2. En dessous, l'acclimatation se
    // fait en bassin froid ou en douche froide — et le plan le DIT.
    if (runDominant) {
      // S13 — ton épreuve court beaucoup plus qu'elle ne nage : ce second créneau facile,
      // qui était une nage de récupération, passe en course. La nage garde deux rendez-vous
      // par semaine (le créneau de qualité et la pivot) : elle ne disparaît jamais.
      // S14 (R20.3) — même borne que le premier créneau facile : c'est le MÊME rôle, et S13 en
      // a fait un second exemplaire. Le laisser sans plafond aurait rouvert le déversoir d'un
      // cran plus loin, exactement sur les épreuves course-dominantes que S13 sert.
      S2.push({ d: "rn", name: "Footing facile (endurance)", note: "Sur ton épreuve, la course représente " + Math.round(runShare * 100) + " % du temps total contre " + Math.round(obj.swimTimeShare * 100) + " % pour la nage : ce second créneau facile lui revient. Allure de conversation, sur le terrain le plus proche de ta course.", det: "",
        steps: [Object.assign(B(1, P(30, 50), "rn.easy", "", inj.impact ? " · surface souple" : " · sur sentier si possible"), { bnd: easyRunBounds(kit, obj.totalMinMid) })], ...({ plainBody: true } as object) });
    } else if (cold && !medHold) {
      const inOpenWater = owForCold;
      S2.push({ d: "sw", name: inOpenWater ? "Acclimatation eau froide" : "Acclimatation au froid (bassin / douche)",
        note: "L'acclimatation au froid est une qualité qui s'entraîne, pas une affaire de volonté : exposition régulière, temps dans l'eau allongé progressivement."
          + (inOpenWater
            ? " Jamais seul, toujours avec une sortie possible à vue."
            : " Ton accès aux plans d'eau est déjà pris par les séances prioritaires de la semaine : cette exposition se fait donc en bassin non chauffé, ou à défaut par des fins de douche froides de 2 à 3 min. C'est moins efficace, et c'est mieux que rien.")
          + (obj.waterTempC != null && obj.waterTempC < S7_COLD.wetsuitMandatoryBelowC ? " Sous " + S7_COLD.wetsuitMandatoryBelowC + " °C la combinaison est de toute façon obligatoire en course." : ""),
        det: "",
        steps: [Bd(1, Math.max(300, P(400, 1000)), "sw.easy", "", (inOpenWater ? " en eau libre" : " en bassin non chauffé") + ", temps d'exposition allongé progressivement", false, "sw")], ...({ plainBody: true } as object) });
    } else {
      S2.push({ d: "sw", recovery: true, name: "Nage récup + technique", note: "Récupération dans l'eau : relâchement total, respiration ample. C'est aussi le moment de refaire des éducatifs à froid, sans fatigue.", det: "",
        steps: [Bd(1, P(600, 1100), "sw.easy", "", " souple, éducatifs entre les séries", false, "sw")], ...({ plainBody: true } as object) });
    }
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
  // R4.2.4 (audit v7) — le créneau `facileR` apparaissait DEUX fois (Mer et Dim) et produisait
  // deux séances identiques dans la même semaine. Un même créneau deux fois, c'est soit une
  // variante, soit un doublon : ici c'était un doublon. La semaine tient en 5 séances, ce qui
  // correspond à la structure de référence des coachs (2 nages, 2 courses + le swimrun
  // spécifique), et le dimanche redevient un vrai jour de repos — un sport qui charge autant
  // les épaules que les jambes en a besoin.
  // Lun repos+renfo · Mar nage qualité · Mer footing · Jeu course qualité · Ven nage récup/froid
  // · Sam SWIMRUN spécifique · Dim repos
  return [
    { charge: "recup", slot: "recup" }, { charge: "dur", slot: "dur1" }, { charge: "facile", slot: "facileR" },
    { charge: "dur", slot: "dur2" }, { charge: "facile", slot: "facile2" }, { charge: "dur", slot: "durLong" },
    { charge: "off", slot: "off" },
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
  // R19.1 — LE MILIEU DE NAGE ET LE RELIEF ENTRENT ICI AUSSI.
  // Les deux questions étaient posées au questionnaire swimrun et au Profil, et ne changeaient
  // RIEN : ce module additionne trois postes qu'il met en forme lui-même (`fmtHM`), donc il ne
  // passait ni par `swimRange` ni par `runRange`, les deux seuls endroits où les corrections
  // étaient appliquées. Une question sans effet est une question qui ment sur ce qu'elle sert.
  // Elles s'appliquent POSTE PAR POSTE, puis se propagent au total — pas l'inverse : appliquer
  // une correction de nage au total reviendrait à ralentir aussi la course à pied.
  const bS = kit.legBands.swim, bR = kit.legBands.run;
  const swimLo = obj.swimMin * (bS ? bS[0] : 1), swimHi = obj.swimMin * (bS ? bS[1] : 1);
  const runLo = obj.runMin * (bR ? bR[0] : 1), runHi = obj.runMin * (bR ? bR[1] : 1);
  const deltaLo = (swimLo - obj.swimMin) + (runLo - obj.runMin);
  const deltaHi = (swimHi - obj.swimMin) + (runHi - obj.runMin);
  const bande = (lo: number, hi: number) => (Math.round(lo) === Math.round(hi) ? fmtHM(lo) : fmtHM(lo) + "–" + fmtHM(hi));
  items.push({ leg: "Temps estimé", value: fmtHM(obj.totalMinLo + deltaLo) + "–" + fmtHM(obj.totalMinHi + deltaHi),
    why: obj.why + " · fourchette large assumée : sur cette épreuve, le terrain, l'eau et le binôme pèsent plus que la condition physique" + kit.swimWhy + kit.profWhy });
  items.push({ leg: "Dont nage", value: bande(swimLo, swimHi) + " (" + Math.round(obj.swimTimeShare * 100) + "% du temps)",
    why: "La nage pèse bien plus lourd en TEMPS qu'en distance : " + Math.round(obj.swimTotalM / 10) / 100 + " km nagés ne représentent qu'une fraction de la distance, mais un quart à un tiers du chrono" + kit.swimWhy + est });
  items.push({ leg: "Dont course", value: bande(runLo, runHi),
    why: "Terrain de trail, jambes mouillées, chaussures pleines d'eau : compte une allure nettement plus lente que sur route" + kit.profWhy + est });
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
  disciplines: ["sw", "rn"],
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
