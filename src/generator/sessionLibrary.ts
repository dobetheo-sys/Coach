/**
 * Bibliothèque de séances V2 — port sémantique de sess() (Coach_Pro_V1.5).
 * Steps structurés (R3.2), notes systématiques (manifeste : chaque séance s'explique),
 * bornes règle-porteuses sourcées de la matrice (C21/C23/C24), variantes
 * débutant/blessure/intention identiques au produit validé.
 */
import type { ReasonedPlan, V1Session, V1Step } from "../engine/types.ts";
import {
  C15_BEGINNER_SWIM_SESSION_CAP_M, C21_REPRISE_BRICK_FACTOR, C23_BEGINNER_LONG_RUN_CAP_MIN,
  CAP_BRICK_BIKE, CAP_BRICK_RUN,
} from "../engine/constraintMatrix.ts";
import { trailElevationTarget } from "../engine/disciplineRegistry.ts";
import { intOf } from "./renderer.ts";

type Slot = "dur1" | "dur2" | "durLong" | "facileR" | "facile2" | "recup" | "off";

export interface SessionCtx {
  r: ReasonedPlan;
}

export function buildSessions(ctx: SessionCtx, slot: Slot, phase: string, prog: number): V1Session[] {
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
  const _injImpactG = (a.injury || "").split(",").some((x) => ["tibia", "genou", "pied", "hanche", "course"].includes(x));
  const _plioOK = lvl !== "debutant" && !finisher && !_injImpactG;
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

  if (sp === "run") {
    const injImp = (a.injury || "").split(",").some((x) => ["tibia", "genou", "pied", "hanche"].includes(x));
    // R4.1 — trail modulaire (registre de disciplines) : volume en TEMPS + D+, allure en
    // GAP/RPE, compétence descente travaillée à part, prudence excentrique si impact fragile.
    const isTrail = fmt === "trail";
    if (slot === "dur1") {
      // C17 — la VO2 survit au budget (dur1) en dev/spéc/peak ; l'allure course passe en dur2.
      if (phase === "spec" || phase === "peak" || phase === "dev") {
        S2.push({ d: "rn", name: "VO2max", note: "Puissance aérobie maximale : effort max tenable ~3min, récup complète. Maintenue jusqu'à l'affûtage.", det: "", steps: [W(20, "progressif + 4 lignes droites"), B(P(5, 8), 3, "rn.vo2", "2min30 trot"), C(10, "footing très facile")] });
      } else if (finisher || lvl === "debutant") {
        S2.push({ d: "rn", name: "Seuil doux", note: "Le seuil doit rester «confortablement difficile» : tu peux dire quelques mots, pas tenir une conversation. Si ça pique, ralentis.", det: "", steps: [W(15, "footing très facile + 3 lignes droites"), B(P(2, 4), P(6, 10), "rn.thr", "2-3min trot très lent", injImp ? " sur surface souple" : ""), C(10, "footing facile")] });
      } else {
        S2.push({ d: "rn", name: "Seuil progressif", note: "Allure soutenue mais maîtrisée, régulière du 1er au dernier bloc.", det: "", steps: [W(15, "footing + 4 lignes droites"), B(P(3, 4), P(6, 10), "rn.thr", "2min trot"), C(10, "footing")] });
      }
    } else if (slot === "dur2") {
      if (isTrail && (phase === "spec" || phase === "peak") && !injImp)
        // Compétence descente (registre trail) : progression NON-cardio, trackée à part.
        // Les blessures d'impact (périostite…) court-circuitent cette séance — la descente
        // est une charge excentrique, mêmes drapeaux de prudence que la route (spec §2).
        S2.push({ d: "rn", name: "Côtes + descentes techniques", note: "La descente est une compétence : relâche le buste, cadence haute, regarde loin. La montée se court au RPE, pas à l'allure — en trail l'allure brute ne veut rien dire.", det: "", steps: [W(18, "progressif sur sentier"), B(P(4, 6), 3, "rn.vo2", "descente du même segment EN CONTRÔLE (c'est l'exercice, pas la récup)", " en montée au train"), C(10, "footing souple sur plat")] });
      else if (phase === "spec" || phase === "peak")
        S2.push({ d: "rn", name: "Allure course spécifique", note: "C'est l'allure de ta course : mémorise la sensation, elle doit devenir automatique le jour J.", det: "", steps: [W(18, "progressif + gammes"), Bd(P(3, 5), fmt === "5k" || fmt === "10k" ? 1000 : 2000, fmt === "marathon" ? "rn.mara" : "rn.thr", "2-3min récup active", "", !(fmt === "5k" || fmt === "10k"), "rn"), C(10, "retour au calme")] });
      else
        S2.push({ d: "rn", name: phase === "base" ? "Endurance soutenue" : "Allure spécifique", note: isTrail ? "Effort tenu et continu, au ressenti (GAP/FC) — pas à l'allure brute." : "Allure tenue et continue, sans à-coups.", det: "", steps: [W(15, "footing facile"), B(1, P(20, 45), fmt === "marathon" || fmt === "trail" ? "rn.mara" : "rn.thr"), C(8, "retour au calme " + G)] });
    } else if (slot === "durLong") {
      const durCaps = ({ "5k": { lo: 40, hi: 74 }, "10k": { lo: 50, hi: 90 }, semi: { lo: 70, hi: 130 }, marathon: { lo: 90, hi: 180 }, trail: { lo: 120, hi: 255 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 60, hi: 110 };
      // C23 — jamais de sortie longue CAP >3h pour un débutant (le cap passe dans bnd → R3.3 ne regonfle pas)
      if (beginner) durCaps.hi = Math.min(durCaps.hi, C23_BEGINNER_LONG_RUN_CAP_MIN);
      const durMin = P(durCaps.lo, durCaps.hi);
      // Trail (registre R4.1) : volume en TEMPS + D+ cible — jamais en km seul. Le D+ suit
      // la durée (~350-450m/h) ; descentes en contrôle, surtout avec un passif d'impact.
      const dplus = isTrail ? trailElevationTarget(durMin) : null;
      S2.push({ d: "rn", long: true, name: isTrail ? "Sortie longue trail" : "Sortie longue", note: beginner ? "Cours lentement, vraiment : tu dois pouvoir parler tout du long. Marche si besoin, c'est OK." : isTrail ? "En trail on compte le TEMPS et le D+, pas les kilomètres. Monte au train, descends en contrôle" + (injImp ? " — descentes prudentes, ta zone fragile encaisse la charge excentrique" : "") + "." : "Allure d'endurance, jamais forcée. La longue construit l'endurance de base.", det: "", steps: [Object.assign(B(1, durMin, "rn.easy", "", (isTrail && dplus ? " · D+ cible " + dplus.lo + "-" + dplus.hi + "m" : "") + (phase === "spec" || phase === "peak" ? (!finisher && !medHold ? ", derniers 15-20min @ allure cible" : "") : "")), { bnd: { floor: durCaps.lo, cap: durCaps.hi } }), ], ...( { plainBody: true } as object) });
    } else if (slot === "facileR") {
      S2.push({ d: "rn", name: "Footing facile", note: beginner ? "Allure de conversation, sans forcer : c'est le volume facile qui fait progresser." : "Endurance fondamentale : allure de conversation. Ce volume facile construit l'aérobie sans user.", det: "", steps: [B(1, P(30, 50), "rn.easy", "", G && !injImp ? " · termine par " + G.replace("+ ", "") : "")], ...( { plainBody: true } as object) });
    } else if (slot === "facile2") {
      S2.push({ d: "rn", name: "Footing récup", note: "Récupération active : les jambes tournent, zéro intensité — ça accélère la récupération.", det: "", steps: [B(1, P(20, 30), "rn.rec")], ...( { plainBody: true } as object) });
    } else if (slot === "recup") S2.push({ d: "rs", name: "Repos / mobilité", det: "marche, étirements", steps: [] });
    else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  } else if (sp === "bike") {
    const clm = fmt === "clm", climb = a.terrain === "montagne" || a.terrain === "vallonne";
    if (slot === "dur1") {
      if (phase === "base") S2.push({ d: "bk", name: "Sweetspot", note: "Effort soutenu mais maîtrisé, cadence 85-95 rpm. Tu dois pouvoir finir chaque bloc sans t'effondrer.", det: "", steps: [W(15, "montée progressive"), B(P(2, 3), P(12, 20), "bk.ss", "5min souple"), C(10, "décrassage")] });
      else if (phase === "spec" || phase === "peak" || phase === "dev") S2.push({ d: "bk", name: "VO2max", note: "Intensité maximale tenable 4min, récup longue. La puissance aérobie se maintient jusqu'à l'affûtage.", det: "", steps: [W(20, "progressif + 3 sprints courts"), B(P(4, 6), 4, "bk.vo2", "4min"), C(10, "souple")] });
      else if (lvl === "debutant" || finisher) S2.push({ d: "bk", name: "Tempo progressif", note: "Effort confortablement soutenu, sans jamais te mettre dans le rouge.", det: "", steps: [W(15, "souple"), B(P(2, 3), P(8, 15), "bk.ss", "4min très souple"), C(10, "décrassage")] });
      else S2.push({ d: "bk", name: "Sweetspot", note: "Effort soutenu mais maîtrisé, cadence 85-95 rpm.", det: "", steps: [W(15, "montée progressive"), B(P(2, 3), P(12, 20), "bk.ss", "5min souple"), C(10, "décrassage")] });
    } else if (slot === "dur2") {
      if (clm && (phase === "spec" || phase === "peak")) S2.push({ d: "bk", name: "Spécifique CLM (position)", note: "Travaille la tenue de position autant que la puissance : c'est elle qui te fera gagner du temps.", det: "", steps: [W(20, "progressif en position normale"), B(P(2, 3), P(15, 25), "bk.thr", "5min souple, redresse-toi", " en position aéro tenue"), C(10, "décrassage")] });
      else if (phase === "spec" || phase === "peak") S2.push({ d: "bk", name: "Seuil / race-pace", note: "Allure de course soutenable ~1h. Régularité avant tout.", det: "", steps: [W(15, "progressif"), B(P(2, 4), P(10, 20), "bk.thr", "5min souple"), C(10, "décrassage")] });
      else S2.push({ d: "bk", name: climb ? "Force en côte" : "Force basse cadence", note: "Gros braquet, cadence basse, mais sans forcer sur les genoux : c'est musculaire, pas cardio.", det: "", steps: [W(15, "+ montée en intensité"), B(P(4, 6), 5, "bk.frc", "3min souple ou en redescendant", " à 50-60 rpm" + (climb ? " en côte" : "")), C(10, "moulinage léger")] });
    } else if (slot === "durLong") {
      const durCaps = ({ crit: { lo: 60, hi: 150 }, route: { lo: 90, hi: 180 }, clm: { lo: 75, hi: 165 }, cyclo: { lo: 120, hi: 240 }, gravel: { lo: 150, hi: 360 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 90, hi: 210 };
      S2.push({ d: "bk", long: true, name: "Sortie longue", note: "Endurance longue : le moteur aérobie se construit sur la durée. Allure régulière, mange et bois régulièrement.", det: "", steps: [Object.assign(B(1, P(durCaps.lo, durCaps.hi), "bk.z2", "", fmt === "cyclo" || fmt === "gravel" ? " · endurance" : ""), { bnd: { floor: durCaps.lo, cap: durCaps.hi } })], ...( { plainBody: true } as object) });
    } else if (slot === "facileR") S2.push({ d: "bk", name: "Endurance facile", note: "Z2 conversationnel, cadence souple 85-95 rpm : la base aérobie se construit ici.", det: "", steps: [B(1, P(45, 90), "bk.z2")], ...( { plainBody: true } as object) });
    else if (slot === "facile2") S2.push({ d: "bk", name: "Récup active", note: "Moulinage très souple : activer la circulation, aucune force sur les pédales.", det: "", steps: [B(1, P(30, 45), null, "", " très souple")], ...( { plainBody: true } as object) });
    else if (slot === "recup") S2.push({ d: "rs", name: "Repos / gainage", det: "mobilité", steps: [] });
    else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  } else if (sp === "swim") {
    const shoulder = (a.injury || "").includes("epaule"), ow = a.milieu === "ow" || a.milieu === "mixte";
    // Limite principale déclarée par le débutant (question dédiée) : chaque réponse
    // oriente RÉELLEMENT les éducatifs vers ce qui bloque, pas un générique commun.
    // Chaque éducatif nommé porte son COMMENT FAIRE (pas juste son nom) — la séance
    // s'explique elle-même, jusque dans le détail technique (manifeste : jamais muette).
    const swimLimitFocus: Record<string, { txt: string; note: string }> = {
      respiration: { txt: " éducatifs respiration — 3 temps bilatérale (souffle continu par le nez sous l'eau, tête qui pivote sans se lever, inspire large sur le côté à la dernière seconde)", note: "La respiration débloque tout le reste : on la travaille isolée, sans la charge de la nage complète." },
      technique: { txt: " éducatifs bras — rattrapé (le bras devant reste tendu, immobile, jusqu'à ce que l'autre main vienne le toucher avant de repartir : corrige le timing et la rotation), poings fermés (main fermée pendant toute la traction : sentir l'appui par l'avant-bras plutôt que la paume), un bras (l'autre reste le long du corps, immobile : isole le mouvement de traction)", note: "Sentir l'appui avant d'ajouter de la distance : la technique s'automatise par la fréquence, pas par la force." },
      endurance: { txt: " nage continue fractionnée courte, sans s'arrêter entre les longueurs", note: "Tenir la distance sans pause compte plus que la vitesse : la continuité prime, on fractionne le repos, pas la nage." },
      peur: { txt: " nage en petites longueurs, pied au mur possible à tout moment, jamais de chrono", note: "Le seul objectif est de se sentir bien dans l'eau — l'aisance se construit par l'exposition progressive, sans pression de performance." },
    };
    const limFocus = swimLimitFocus[a.swim_limit || ""] || { txt: " éducatifs variés — " + swimDrillGlossary, note: "La technique se construit à froid, sans fatigue. Qualité > quantité." };
    if (slot === "dur1") {
      if (beginner && (phase === "spec" || phase === "peak")) S2.push({ d: "sw", name: "Seuil technique CSS", note: "Quelques 100m à allure seuil contrôlée, technique maintenue : préparer la course sans casser le geste.", det: "", steps: [Wm(200, "souple + éducatifs"), Bd(P(4, 7), 100, "sw.css", "20-30s", "", false, "sw"), Cm(100, "relâché")] });
      else if (beginner) S2.push({ d: "sw", name: "Technique + éducatifs", note: limFocus.note, det: "", steps: [Wm(200, "souple"), Bd(P(6, 10), 50, "sw.easy", "repos libre entre séries", limFocus.txt + ", " + P(1, 2) + " point(s) technique", false, "sw"), Cm(100, "relâché")] });
      else if (shoulder) S2.push({ d: "sw", name: "Seuil contrôlé (épaule)", note: "Volume modéré, technique soignée : on épargne l'épaule, on ne cherche pas la performance brute.", det: "", steps: [Wm(300, "souple + 4×50m éducatifs"), Bd(P(6, 8), 100, "sw.css", "20-30s", "", false, "sw"), Cm(200, "souple")] });
      else S2.push({ d: "sw", name: "Seuil CSS", note: "Allure régulière sur tous les 100m. Le dernier doit ressembler au premier.", det: "", steps: [Wm(400, "progressif + 4×50m éducatifs"), Bd(P(6, 10), 100, "sw.css", "15-20s", "", false, "sw"), Cm(200, "souple")] });
    } else if (slot === "dur2") {
      if (beginner && (phase === "spec" || phase === "peak")) S2.push({ d: "sw", name: "Endurance + touches de vitesse", note: "Nage continue technique, plus quelques accélérations courtes de 25m : de la vitesse de forme, pas de la souffrance.", det: "", steps: [Wm(200, "souple"), Bd(1, 400, "sw.aero", "20-30s", " nage continue fractionnée", false, "sw"), Bd(P(6, 10), 25, "sw.speed", "30s repos", " en accélérations progressives, technique maintenue", false, "sw"), Cm(100, "très souple")] });
      else if (beginner) S2.push({ d: "sw", name: "Endurance technique", note: "Priorité au geste, pas au chrono. Un seul point technique à la fois.", det: "", steps: [Wm(200, "souple"), Bd(1, 600, "sw.easy", "20-30s, le temps de respirer", " nage continue fractionnée (ex 8-12×50m) + 1 éducatif entre chaque", false, "sw"), Cm(100, "très souple")] });
      else if (shoulder && (phase === "spec" || phase === "peak")) S2.push({ d: "sw", name: "Jambes vitesse (épaule épargnée)", note: "Vitesse par les jambes : battements rapides avec planche, l'épaule ne travaille pas. La puissance se maintient sans risque.", det: "", steps: [Wm(200, "souple"), Bd(P(6, 10), 25, "sw.speed", "30s repos", " battements rapides avec planche (jambes seules)", false, "sw"), Bd(1, 200, "sw.easy", "", " éducatifs technique", false, "sw"), Cm(100, "souple")] });
      else if (shoulder) S2.push({ d: "sw", name: "Jambes + technique", note: "Épaule épargnée : le travail passe par les jambes et la technique, la charge articulaire reste nulle.", det: "", steps: [Bd(1, 400, null, "", " séries battements + éducatifs · épargne épaule", false, "sw")], ...( { plainBody: true } as object) });
      else S2.push({ d: "sw", name: "Vitesse", note: "Vitesse contrôlée et technique : la fréquence ne doit pas casser ta nage.", det: "", steps: [Wm(400, "varié + 4×25m accélérations"), Bd(P(8, 12), 50, "sw.speed", "30-40s", "", false, "sw"), Cm(200, "souple")] });
    } else if (slot === "durLong") {
      const distCaps = beginner
        ? { lo: 300, hi: Math.min(850, C15_BEGINNER_SWIM_SESSION_CAP_M) }
        : ({ sprint: { lo: 600, hi: 1400 }, demifond: { lo: 1000, hi: 2000 }, fond: { lo: 1500, hi: 3000 }, ow: { lo: 1500, hi: 4500 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 1000, hi: 2000 };
      S2.push({ d: "sw", long: !beginner, name: ow ? "Volume + sighting" : beginner ? "Volume aérobie" : "Longue continue", note: ow ? "Endurance continue + navigation : allure régulière et repères visuels — les conditions réelles de la course." : "Endurance continue : allure régulière, geste stable — c'est la séance qui construit la caisse.", det: "", steps: [Object.assign(Bd(1, P(distCaps.lo, distCaps.hi), "sw.aero", "", (ow ? " · navigation aux repères" : "") + (beginner ? " · fractionne en blocs de 100-200m si besoin, la continuité prime sur l'allure" : ""), false, "sw"), { bnd: { floor: distCaps.lo, cap: distCaps.hi } })], ...( { plainBody: true } as object) });
    } else if (slot === "facileR") {
      // C24 — pas de « sortie piscine de 600m » pour un non-débutant
      const techDistCaps = beginner ? { lo: 200, hi: 600 } : { lo: 750, hi: 1200 };
      if (ow && a.swim_limit === "peur") S2.push({ d: "sw", name: "Aisance eau libre", det: "familiarisation, respiration, flottaison — 💡 Objectif confiance : l'aisance dans l'eau libre se construit sans chrono, par l'exposition progressive.", steps: [] });
      else if (!ow && beginner && a.swim_limit === "peur") S2.push({ d: "sw", name: "Aisance bassin", det: "petites longueurs, pied au mur à tout moment, zéro chrono — 💡 Objectif confiance : l'aisance dans l'eau se construit par l'exposition progressive, jamais par la contrainte.", steps: [] });
      else S2.push({ d: "sw", name: "Technique souple", note: beginner ? limFocus.note : "Éducatifs à froid : le geste se grave sans fatigue. Qualité avant quantité.", det: "", steps: [Object.assign(Bd(1, P(techDistCaps.lo, techDistCaps.hi), "sw.easy", "", beginner ? limFocus.txt : " éducatifs", false, "sw"), beginner ? {} : { bnd: { floor: techDistCaps.lo, cap: techDistCaps.hi } })], ...( { plainBody: true } as object) });
    } else if (slot === "facile2") {
      const recDistCaps = beginner ? { lo: 100, hi: 400 } : { lo: 750, hi: 1100 }; // C24
      S2.push({ d: "sw", name: "Récup eau", note: "Nage de récupération : relâchement total, respiration ample.", det: "", steps: [Object.assign(Bd(1, P(recDistCaps.lo, recDistCaps.hi), "sw.easy", "", " souple", false, "sw"), beginner ? {} : { bnd: { floor: recDistCaps.lo, cap: recDistCaps.hi } })], ...( { plainBody: true } as object) });
    } else if (slot === "recup") S2.push({ d: "rs", name: "Repos / épaules", det: "étirements coiffe", steps: [] });
    else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  } else if (sp === "tri") {
    const runInj = (a.injury || "").includes("course");
    const PB = ({ base: [0.35, 0.55], dev: [0.55, 0.75], spec: [0.75, 0.9], peak: [0.9, 1], taper: [0.35, 0.45] } as Record<string, [number, number]>)[phase] || [0.5, 0.8];
    const PT = (lo: number, hi: number) => Math.max(1, Math.round((lo + (hi - lo) * (PB[0] + (PB[1] - PB[0]) * prog)) * sessionScale));
    const swimDistCaps = ({ S: { lo: 300, hi: 750 }, M: { lo: 600, hi: 1500 }, "70.3": { lo: 950, hi: 1900 }, Full: { lo: 1600, hi: 3000 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 600, hi: 1500 };
    const swimDist = PT(swimDistCaps.lo, swimDistCaps.hi);
    const triSwimVolCap = ({ S: 1050, M: 2100, "70.3": 3000, Full: 4500 } as Record<string, number>)[fmt] || 2100;
    // C24 — même la nage récup tri : ≥750m pour un non-débutant
    const swShortDist = beginner ? Math.min(600, Math.max(200, Math.round((swimDist * 0.4) / 50) * 50)) : Math.min(1100, Math.max(750, Math.round((swimDist * 0.6) / 50) * 50));
    const swTechDist = Math.max(beginner ? 300 : 750, Math.round((swimDist * 0.5) / 50) * 50);
    const swMain = beginner
      ? { name: "Nage seuil technique (+dist)", note: "Technique d'abord, mais quelques 100m à allure seuil contrôlée pour préparer la course.", steps: [Wm(200, "souple"), Object.assign(Bd(1, swimDist, "sw.css", "repos libre entre séries", ", fractionné en séries régulières, éducatifs entre", false, "sw"), { bnd: { floor: swimDistCaps.lo, cap: triSwimVolCap } }), Cm(100, "relâché")] }
      : { name: "Nage seuil (+dist)", note: "Distance cible atteinte, allure régulière. Fractionné = réponse à intensité.", steps: [Wm(300, "+ 4×50m éducatifs"), Object.assign(Bd(1, swimDist, "sw.css", "15-20s", ", fractionné en séries régulières si besoin", false, "sw"), { bnd: { floor: swimDistCaps.lo, cap: triSwimVolCap } }), Cm(200, "souple")] };
    const swTech = beginner
      ? { name: "Nage éducatifs", note: "Zéro chrono ici : uniquement le geste. Alterne les éducatifs, ne les enchaîne pas en force.", steps: [Wm(100, "souple"), Bd(1, swTechDist, "sw.easy", "20-30s", ", par 50m, 1 point technique à la fois — " + swimDrillGlossary, false, "sw"), Cm(100, "dos souple")] }
      : { name: "Nage vitesse", note: "Fréquence et vitesse contrôlées : la technique ne doit pas se dégrader sur les derniers 50m.", steps: [Wm(200, "+ 4×25m accélérations progressives"), Bd(1, swTechDist, "sw.aero", "30-40s sur les 50m rapides", ", dont la moitié en accélérations de 50m", false, "sw"), Cm(150, "souple")] };
    const swShort = { name: "Nage récup", note: "Récupération dans l'eau : relâchement total, respiration ample — le corps absorbe le travail de la semaine.", steps: [Bd(1, swShortDist, "sw.easy", "", " souple, en blocs de 50m, respiration 3 temps · relâchement total", false, "sw")] };
    if (slot === "dur1") {
      if (dbl) S2.push({ d: "sw", name: swMain.name + " (matin)", note: swMain.note, det: "", steps: swMain.steps });
      if (phase === "base") S2.push({ d: "bk", name: "Sweetspot vélo", note: "Cadence 85-95 rpm, soutenu mais maîtrisé.", det: "", steps: [W(15, "montée progressive"), Object.assign(B(PT(2, 3), PT(12, 18), "bk.ss", "5min souple"), { repCap: 4 }), C(10, "décrassage")] });
      else if (phase === "spec" || phase === "peak") S2.push({ d: "bk", name: "VO2max vélo", note: "Puissance aérobie maximale, maintenue jusqu'au pic — pas abandonnée en spécifique (la race-pace vélo est travaillée dans le brick).", det: "", steps: [W(20, "progressif + 3 sprints"), Object.assign(B(PT(4, 6), 4, "bk.vo2", "4min récup"), { repCap: 8 }), C(10, "souple")] });
      else if (phase === "taper") S2.push({ d: "bk", name: "Rappel race-pace", note: "Affûtage : on réveille l'allure course sans générer de fatigue. Court et précis.", det: "", steps: [W(10, "progressif"), Object.assign(B(PT(2, 3), PT(6, 10), "bk.rp", "3min souple"), { repCap: 4 }), C(5, "décrassage")] });
      else if (lvl === "debutant" || finisher) S2.push({ d: "bk", name: "Tempo vélo", note: "Confortablement soutenu, jamais dans le rouge.", det: "", steps: [W(15, "souple"), Object.assign(B(PT(2, 3), PT(8, 15), "bk.ss", "4min souple"), { repCap: 4 }), C(10, "décrassage")] });
      else S2.push({ d: "bk", name: "VO2max vélo", note: "Intensité max tenable 4min, récup quasi complète entre.", det: "", steps: [W(20, "progressif + 3 sprints"), Object.assign(B(PT(4, 6), 4, "bk.vo2", "4min récup"), { repCap: 8 }), C(10, "souple")] });
    } else if (slot === "dur2") {
      if (dbl) S2.push({ d: "sw", name: swTech.name, note: swTech.note, det: "", steps: swTech.steps });
      if (phase === "spec" || phase === "peak") S2.push({ d: "rn", name: "Allure course (tri)", note: "L'allure de course du jour J : mémorise la sensation, jambes déjà entamées par le vélo.", det: "", steps: [W(15, "footing progressif"), Object.assign(B(1, PT(20, 40), "rn.mara"), { bnd: { floor: 20, cap: 45 } }), C(8, "retour au calme")] });
      else S2.push({ d: "bk", name: "Force basse cadence", note: "Gros braquet, cadence basse : musculaire, pas cardio. Sans forcer sur les genoux.", det: "", steps: [W(15, "+ montée en intensité"), Object.assign(B(PT(4, 6), ({ S: 5, M: 5, "70.3": 6, Full: 7 } as Record<string, number>)[fmt] || 5, "bk.frc", "3min souple", " à 50-60 rpm"), { repCap: 8 }), C(10, "moulinage")] });
    } else if (slot === "durLong") {
      if (phase === "spec" || phase === "peak") {
        // C21 — brick borné par format, ×0.8 en reprise (appliqué aussi dans blockBounds)
        const rf = a.history === "reprise" ? C21_REPRISE_BRICK_FACTOR : 1;
        const bb = ({ S: { lo: 45, hi: 90 }, M: { lo: 60, hi: 120 }, "70.3": { lo: 90, hi: 180 }, Full: { lo: 150, hi: 300 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 60, hi: 180 };
        const br = ({ S: { lo: 10, hi: 20 }, M: { lo: 12, hi: 24 }, "70.3": { lo: 16, hi: 32 }, Full: { lo: 35, hi: 70 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 15, hi: 30 };
        // Répartition des intensités (manifeste) : le brick roule en Z2, le DERNIER TIERS
        // passe à l'allure course — la spécificité (transition, jambes entamées) est gardée
        // sans transformer 2 à 5h hebdo en zone grise (tri mesuré à 54-67% de temps facile).
        S2.push({ d: "br", long: true, brick: true, name: "Brick vélo+CAP", note: "Le brick simule la course : vélo en endurance, dernier tiers @ allure course, puis enchaînement rapide vélo→course pour habituer tes jambes à la sensation «de coton» du début de CAP.", det: "", steps: [
          { role: "body", leg: "bike", durationMin: PT(bb.lo, Math.round(bb.hi * rf)), zone: "bk.z2", intensity: intOf("bk.z2") as unknown as string } as V1Step,
          { role: "body", leg: "run", durationMin: PT(br.lo, Math.round(br.hi * rf)), d: "rn" } as V1Step,
        ], ...( { runInj } as object) });
      } else {
        const longRunCaps = ({ S: { lo: 30, hi: 60 }, M: { lo: 40, hi: 75 }, "70.3": { lo: 50, hi: 100 }, Full: { lo: 60, hi: 140 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 50, hi: 100 };
        S2.push({ d: "rn", long: true, name: "Sortie longue CAP", note: "Endurance fondamentale, allure facile et conversationnelle.", det: "", steps: [Object.assign(B(1, PT(longRunCaps.lo, longRunCaps.hi), "rn.easy", "", runInj ? " sur surface souple" : ""), { bnd: { floor: longRunCaps.lo, cap: longRunCaps.hi } })], ...( { plainBody: true } as object) });
      }
    } else if (slot === "facileR") {
      const ftCaps = ({ S: { lo: 25, hi: 45 }, M: { lo: 15, hi: 26 }, "70.3": { lo: 14, hi: 22 }, Full: { lo: 50, hi: 100 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 25, hi: 45 };
      // C18 — le créneau course de qualité garanti en tri : VO2 court en peak
      if (phase === "peak" && !runInj && !medHold && lvl !== "debutant" && !finisher) S2.push({ d: "rn", name: "VO2max course", note: "Rappels de puissance aérobie course, courts et vifs, jambes déjà entamées par le vélo.", det: "", steps: [W(12, "footing progressif + gammes"), Object.assign(B(PT(4, 6), 2, "rn.vo2", "2min trot"), { repCap: 6 }), C(8, "footing très facile")] });
      else if (phase === "peak" && runInj && !medHold) S2.push({ d: "rn", name: "Allure course (tri, surface souple)", note: "Course blessé : allure cible en contrôle, sur surface souple, jamais dans la douleur.", det: "", steps: [W(12, "footing progressif"), B(1, PT(18, 28), "rn.mara", "", ", sur surface souple"), C(8, "footing très facile")] });
      else S2.push({ d: "rn", name: "Footing facile", note: "Course facile : les jambes apprennent à courir « propre » sans fatigue ajoutée.", det: "", steps: [B(1, PT(ftCaps.lo, ftCaps.hi), "rn.easy", "", runInj ? " · surface souple" : "")], ...( { plainBody: true } as object) });
    } else if (slot === "facile2") S2.push({ d: "sw", name: swShort.name + " courte", note: swShort.note, det: "", steps: swShort.steps, ...( { plainBody: true } as object) });
    else if (slot === "recup") S2.push({ d: "rs", name: "Récup active", det: "mobilité", steps: [] });
    else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  }
  return S2;
}
