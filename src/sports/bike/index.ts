/**
 * Sport VÉLO (registre R10). Extraction mécanique de la branche `sp === "bike"`.
 */
import type { V1Session } from "../../engine/types.ts";
import { registerSport, type SessionKit, type PredictKit } from "../registry.ts";
import { BIKE_POWER } from "../../engine/predictor.ts";

export function buildBikeSessions(kit: SessionKit): V1Session[] {
  const { a, fmt, slot, phase, lvl, finisher, noVo2, S2, P, W, C, B } = kit;
  const clm = fmt === "clm", climb = a.terrain === "montagne" || a.terrain === "vallonne";
  if (slot === "dur1") {
    if (phase === "base") S2.push({ d: "bk", name: "Sweetspot", note: "Effort soutenu mais maîtrisé, cadence 85-95 rpm. Tu dois pouvoir finir chaque bloc sans t'effondrer.", det: "", steps: [W(15, "montée progressive"), B(P(2, 3), P(12, 20), "bk.ss", "5min souple"), C(10, "décrassage")] });
    else if ((phase === "spec" || phase === "peak" || phase === "dev") && !noVo2) S2.push({ d: "bk", name: "VO2max", note: "Intensité maximale tenable 4min, récup longue. La puissance aérobie se maintient jusqu'à l'affûtage.", det: "", steps: [W(20, "progressif + 3 sprints courts"), B(P(4, 6), 4, "bk.vo2", "4min"), C(10, "souple")] });
    else if (lvl === "debutant" || finisher) S2.push({ d: "bk", name: "Tempo progressif", note: "Effort confortablement soutenu, sans jamais te mettre dans le rouge.", det: "", steps: [W(15, "souple"), B(P(2, 3), P(8, 15), "bk.ss", "4min très souple"), C(10, "décrassage")] });
    else S2.push({ d: "bk", name: "Sweetspot", note: "Effort soutenu mais maîtrisé, cadence 85-95 rpm.", det: "", steps: [W(15, "montée progressive"), B(P(2, 3), P(12, 20), "bk.ss", "5min souple"), C(10, "décrassage")] });
  } else if (slot === "dur2") {
    if (clm && (phase === "spec" || phase === "peak")) S2.push({ d: "bk", name: "Spécifique CLM (position)", note: "Travaille la tenue de position autant que la puissance : c'est elle qui te fera gagner du temps.", det: "", steps: [W(20, "progressif en position normale"), B(P(2, 3), P(15, 25), "bk.thr", "5min souple, redresse-toi", " en position aéro tenue"), C(10, "décrassage")] });
    else if (phase === "spec" || phase === "peak") S2.push({ d: "bk", name: "Seuil / race-pace", note: "Allure de course soutenable ~1h. Régularité avant tout.", det: "", steps: [W(15, "progressif"), B(P(2, 4), P(10, 20), "bk.thr", "5min souple"), C(10, "décrassage")] });
    // R13.4 — même fall-through que le tri, même correctif : l'affûtage est branché
    // EXPLICITEMENT. L'`else` attrape-tout envoyait la force basse cadence (bk.frc) en plein
    // affûtage — 48-72 h de fatigue résiduelle, le coût d'une VO2max, à quelques jours de la
    // course. C'est la règle mécanisée du tri (auditeur : « *.frc en taper » = violation dure)
    // qui a révélé que le vélo portait le même accident de branchement.
    else if (phase === "taper") S2.push({ d: "bk", name: "Rappel race-pace", note: "Affûtage : on réveille l'allure course sans générer de fatigue. Court et précis.", det: "", steps: [W(10, "progressif"), Object.assign(B(P(2, 3), P(6, 10), "bk.rp", "3min souple"), { repCap: 4 }), C(5, "décrassage")] });
    else S2.push({ d: "bk", name: climb ? "Force en côte" : "Force basse cadence", note: "Gros braquet, cadence basse, mais sans forcer sur les genoux : c'est musculaire, pas cardio.", det: "", steps: [W(15, "+ montée en intensité"), B(P(4, 6), 5, "bk.frc", "3min souple ou en redescendant", " à 50-60 rpm" + (climb ? " en côte" : "")), C(10, "moulinage léger")] });
  } else if (slot === "durLong") {
    const durCaps = ({ crit: { lo: 60, hi: 150 }, route: { lo: 90, hi: 180 }, clm: { lo: 75, hi: 165 }, cyclo: { lo: 120, hi: 240 }, gravel: { lo: 150, hi: 360 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 90, hi: 210 };
    S2.push({ d: "bk", long: true, name: "Sortie longue", note: "Endurance longue : le moteur aérobie se construit sur la durée. Allure régulière, mange et bois régulièrement.", det: "", steps: [Object.assign(B(1, P(durCaps.lo, durCaps.hi), "bk.z2", "", fmt === "cyclo" || fmt === "gravel" ? " · endurance" : ""), { bnd: { floor: durCaps.lo, cap: durCaps.hi } })], ...( { plainBody: true } as object) });
  } else if (slot === "facileR") S2.push({ d: "bk", name: "Endurance facile", note: "Z2 conversationnel, cadence souple 85-95 rpm : la base aérobie se construit ici.", det: "", steps: [B(1, P(45, 90), "bk.z2")], ...( { plainBody: true } as object) });
  else if (slot === "facile2") S2.push({ d: "bk", recovery: true, name: "Récup active", note: "Moulinage très souple : activer la circulation, aucune force sur les pédales.", det: "", steps: [B(1, P(30, 45), null, "", " très souple")], ...( { plainBody: true } as object) });
  else if (slot === "recup") S2.push({ d: "rs", name: "Repos / gainage", det: "mobilité", steps: [] });
  else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  return S2;
}


/** Prédiction bike — extraction mécanique de la branche correspondante de `predictRace`. */
export function predictBike(kit: PredictKit): void {
  const { refs, format, items, advice, D, bikeIF, bikeWhy } = kit;
  const b = BIKE_POWER[format];
  if (refs.ftp > 0 && b) {
    const [blo, bhi] = bikeIF(b.lo, b.hi); // R15.2 — le relief abaisse la cible
    items.push({ leg: "Vélo — intensité", value: Math.round(refs.ftp * blo) + "–" + Math.round(refs.ftp * bhi) + "W", why: b.note + " — cible en puissance NORMALISÉE (moyenne pondérée : les pointes montent au-dessus)" + bikeWhy });
    // PW — LA VITESSE, PAS LE CHRONO. Le moteur ne connaît pas la distance d'une cyclosportive
    // (elle va de 80 à 250 km), donc il ne peut pas rendre un temps sans l'inventer. Mais il
    // peut convertir la puissance en VITESSE MOYENNE, ce qui est la moitié utile de la
    // réponse : l'athlète connaît sa distance, il fait la division. C'est le maximum honnête
    // ici — et ça vaut mieux que le refus complet d'avant, qui laissait des watts tout seuls.
    const est = kit.bikeTime(100, b.lo, b.hi);
    if (est) items.push({
      leg: "Vélo — vitesse",
      value: est.kmhLo.toFixed(1).replace(".", ",") + "–" + est.kmhHi.toFixed(1).replace(".", ",") + " km/h",
      why: "converti depuis la puissance par le modèle de Martin (1998). Multiplie par ta distance pour ton chrono — le moteur ne la connaît pas et ne l'invente pas. Hypothèses — " + est.hypothese + ".",
    });
    else if (!(kit.athleteKg && kit.athleteKg > 0))
      advice.push("Renseigne ton poids au Profil : sans lui, impossible de convertir tes watts en vitesse (le poids entre dans le roulement ET dans la pente).");
    D("PRED-bike", "Méthode vélo", "% FTP par format + vitesse", "Le chrono dépend d'une distance que le questionnaire ne demande pas ; la puissance et la vitesse moyenne, elles, sont transférables sur n'importe quel parcours");
  } else advice.push("Renseigne ta FTP (test 20min × 0.95) pour obtenir tes puissances cibles de course.");
}

registerSport({
  id: "bike",
  mainDiscipline: "bk",
  disciplines: ["bk"],
  easyFallbackSlot: "facileR",
  weekSchema: null,
  buildSessions: buildBikeSessions,
  predict: predictBike,
  retestTypes: ["ftp"],
  guards: {},
});
