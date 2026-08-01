/**
 * Sport COURSE (registre R10). Extraction MÉCANIQUE de la branche `sp === "run"` de
 * sessionLibrary : le corps des séances n'a pas changé d'un caractère (golden master à 0 écart).
 * Le format `trail` y survit encore pour les plans migrés (`fmt === "trail"`) — le vrai trail
 * est un sport à part depuis R7 (`src/sports/trail/`).
 */
import type { V1Session } from "../../engine/types.ts";
import { C23_BEGINNER_LONG_RUN_CAP_MIN } from "../../engine/constraintMatrix.ts";
import { trailElevationTarget } from "../../engine/disciplineRegistry.ts";
import { registerSport, type SessionKit, type PredictKit } from "../registry.ts";
import { RUN_KM } from "../../engine/predictor.ts";

export function buildRunSessions(kit: SessionKit): V1Session[] {
  const { a, fmt, slot, phase, lvl, finisher, beginner, medHold, inj, noVo2, G, S2, P, W, C, Bd, B } = kit;
  const injImp = inj.impact;
  // R4.1 — trail modulaire (registre de disciplines) : volume en TEMPS + D+, allure en
  // GAP/RPE, compétence descente travaillée à part, prudence excentrique si impact fragile.
  const isTrail = fmt === "trail";
  if (slot === "dur1") {
    // C17 — la VO2 survit au budget (dur1) en dev/spéc/peak ; l'allure course passe en dur2.
    // B2/R6.1 (audit v6) — genou : pas de vitesses maximales ni d'à-coups (la VO2 course
    // charge le genou à chaque appui rapide) → seuil contrôlé, même rôle dans la semaine.
    if (inj.list.includes("genou") && (phase === "spec" || phase === "peak" || phase === "dev")) {
      S2.push({ d: "rn", name: "Seuil contrôlé (genou épargné)", note: "Genou fragile : on garde le stimulus aérobie fort mais sans les vitesses maximales ni les à-coups — le seuil remplace la VO2, sur surface souple si possible.", det: "", steps: [W(15, "footing très facile + gammes sans sauts"), B(P(2, 4), P(6, 10), "rn.thr", "2-3min trot très lent", " sur surface souple"), C(10, "footing facile")] });
    } else if ((phase === "spec" || phase === "peak" || phase === "dev") && !noVo2) {
      S2.push({ d: "rn", name: "VO2max", note: "Puissance aérobie maximale : effort max tenable ~3min, récup complète. Maintenue jusqu'à l'affûtage.", det: "", steps: [W(20, "progressif + 4 lignes droites"), B(P(5, 8), 3, "rn.vo2", "2min30 trot"), C(10, "footing très facile")] });
    } else if (finisher || lvl === "debutant") {
      S2.push({ d: "rn", name: "Seuil doux", note: "Le seuil doit rester «confortablement difficile» : tu peux dire quelques mots, pas tenir une conversation. Si ça pique, ralentis.", det: "", steps: [W(15, "footing très facile + 3 lignes droites"), B(P(2, 4), P(6, 10), "rn.thr", "2-3min trot très lent", injImp ? " sur surface souple" : ""), C(10, "footing facile")] });
    } else {
      S2.push({ d: "rn", name: "Seuil progressif", note: "Allure soutenue mais maîtrisée, régulière du 1er au dernier bloc.", det: "", steps: [W(15, "footing + 4 lignes droites"), B(P(3, 4), P(6, 10), "rn.thr", "2min trot"), C(10, "footing")] });
    }
  } else if (slot === "dur2") {
    if (isTrail && (phase === "spec" || phase === "peak") && !injImp && !noVo2)
      // Compétence descente (registre trail) : progression NON-cardio, trackée à part.
      // Les blessures d'impact (périostite…) court-circuitent cette séance — la descente
      // est une charge excentrique, mêmes drapeaux de prudence que la route (spec §2).
      S2.push({ d: "rn", name: "Côtes + descentes techniques", note: "La descente est une compétence : relâche le buste, cadence haute, regarde loin. La montée se court au RPE, pas à l'allure — en trail l'allure brute ne veut rien dire.", det: "", steps: [W(18, "progressif sur sentier"), B(P(4, 6), 3, "rn.vo2", "descente du même segment EN CONTRÔLE (c'est l'exercice, pas la récup)", " en montée au train"), C(10, "footing souple sur plat")] });
    else if (phase === "spec" || phase === "peak")
      S2.push({ d: "rn", name: "Allure course spécifique", note: "C'est l'allure de ta course : mémorise la sensation, elle doit devenir automatique le jour J.", det: "", steps: [W(18, "progressif + gammes"), Object.assign(Bd(P(3, 5), fmt === "5k" || fmt === "10k" ? 1000 : 2000, fmt === "marathon" ? "rn.mara" : "rn.thr", "2-3min récup active", "", !(fmt === "5k" || fmt === "10k"), "rn"), { repCap: 8 }), C(10, "retour au calme")] });
    else
      S2.push({ d: "rn", name: phase === "base" ? "Endurance soutenue" : "Allure spécifique", note: isTrail ? "Effort tenu et continu, au ressenti (GAP/FC) — pas à l'allure brute." : "Allure tenue et continue, sans à-coups.", det: "", steps: [W(15, "footing facile"), B(1, P(20, 45), fmt === "marathon" || fmt === "trail" ? "rn.mara" : "rn.thr"), C(8, "retour au calme " + G)] });
  } else if (slot === "durLong") {
    const durCaps = ({ "5k": { lo: 40, hi: 74 }, "10k": { lo: 50, hi: 90 }, semi: { lo: 70, hi: 130 }, marathon: { lo: 90, hi: 180 }, trail: { lo: 120, hi: 255 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 60, hi: 110 };
    // C23 — jamais de sortie longue CAP >3h pour un débutant (le cap passe dans bnd → R3.3 ne regonfle pas)
    if (beginner) durCaps.hi = Math.min(durCaps.hi, C23_BEGINNER_LONG_RUN_CAP_MIN);
    // B2/R6.1 (audit v6) — pied et hanche : la sortie longue est la séance qui cumule
    // le plus d'impacts — son plafond baisse selon la zone (pied ×0.85, hanche ×0.9).
    if (inj.list.includes("pied")) durCaps.hi = Math.round(durCaps.hi * 0.85);
    else if (inj.list.includes("hanche")) durCaps.hi = Math.round(durCaps.hi * 0.9);
    const durMin = P(durCaps.lo, durCaps.hi);
    // Trail (registre R4.1) : volume en TEMPS + D+ cible — jamais en km seul. Le D+ suit
    // la durée (~350-450m/h) ; descentes en contrôle, surtout avec un passif d'impact.
    const dplus = isTrail ? trailElevationTarget(durMin) : null;
    S2.push({ d: "rn", long: true, name: isTrail ? "Sortie longue trail" : "Sortie longue", note: beginner ? "Cours lentement, vraiment : tu dois pouvoir parler tout du long. Marche si besoin, c'est OK." : isTrail ? "En trail on compte le TEMPS et le D+, pas les kilomètres. Monte au train, descends en contrôle" + (injImp ? " — descentes prudentes, ta zone fragile encaisse la charge excentrique" : "") + "." : "Allure d'endurance, jamais forcée. La longue construit l'endurance de base.", det: "", steps: [Object.assign(B(1, durMin, "rn.easy", "", (isTrail && dplus ? " · D+ cible " + dplus.lo + "-" + dplus.hi + "m" : "") + (phase === "spec" || phase === "peak" ? (!finisher && !medHold ? ", derniers 15-20min @ allure cible" : "") : "")), { bnd: { floor: durCaps.lo, cap: durCaps.hi, hard: beginner } }), ], ...( { plainBody: true } as object) });
  } else if (slot === "facileR") {
    S2.push({ d: "rn", name: "Footing facile", note: beginner ? "Allure de conversation, sans forcer : c'est le volume facile qui fait progresser." : "Endurance fondamentale : allure de conversation. Ce volume facile construit l'aérobie sans user.", det: "", steps: [B(1, P(30, 50), "rn.easy", "", G && !injImp ? " · termine par " + G.replace("+ ", "") : "")], ...( { plainBody: true } as object) });
  } else if (slot === "facile2") {
    S2.push({ d: "rn", recovery: true, name: "Footing récup", note: "Récupération active : les jambes tournent, zéro intensité — ça accélère la récupération.", det: "", steps: [B(1, P(20, 30), "rn.rec")], ...( { plainBody: true } as object) });
  } else if (slot === "recup") S2.push({ d: "rs", name: "Repos / mobilité", det: "marche, étirements", steps: [] });
  else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  return S2;
}


/** Prédiction run — extraction mécanique de la branche correspondante de `predictRace`. */
export function predictRun(kit: PredictKit): void {
  const { refs, format, items, advice, D, runRange, riegelSec, profWhy } = kit;
  if (refs.thrPace > 0 && RUN_KM[format]) {
    const t = riegelSec(refs.thrPace, RUN_KM[format]);
    items.push({ leg: "Course", value: runRange(t), why: "Riegel depuis ton allure seuil (~1h), exposant 1.06 — la référence des prédictions route" + profWhy });
    D("PRED-run", "Méthode course", "Riegel ^1.06", "Extrapolation standard depuis l'allure tenable une heure");
  } else if (format === "trail") {
    advice.push("Trail : le chrono dépend du D+ et du terrain — repère fiable : allure Z2 à plat, marche assumée dans les pentes raides.");
  } else advice.push("Renseigne ton allure seuil (test : 30min à fond, allure moyenne) pour obtenir une projection chiffrée.");
}

registerSport({
  id: "run",
  mainDiscipline: "rn",
  disciplines: ["rn"],
  // La course a DEUX créneaux faciles : le second footing (récup) sert de repli — un
  // coureur déclassé court quand même, plus court et plus souple.
  easyFallbackSlot: "facile2",
  weekSchema: null,
  buildSessions: buildRunSessions,
  predict: predictRun,
  retestTypes: ["thrPace"],
  guards: { runImpactCap: true },
});
