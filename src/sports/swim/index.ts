/**
 * Sport NATATION (registre R10). Extraction mécanique de la branche `sp === "swim"`.
 * Les planchers/plafonds en MÈTRES (C15/C24/C24b) et la sonde de capacité sont déclarés
 * comme garde-fous du module, plus comme tests de sport dispersés dans le générateur.
 */
import type { V1Session } from "../../engine/types.ts";
import { C15_BEGINNER_SWIM_SESSION_CAP_M } from "../../engine/constraintMatrix.ts";
import { registerSport, type SessionKit, type PredictKit } from "../registry.ts";
import { SWIM_RACE } from "../../engine/predictor.ts";

export function buildSwimSessions(kit: SessionKit): V1Session[] {
  const { a, fmt, slot, phase, beginner, inj, swimDrillGlossary, S2, P, Wm, Cm, Bd } = kit;
  const shoulder = inj.shoulder, ow = a.milieu === "ow" || a.milieu === "mixte";
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
    if (beginner && (phase === "spec" || phase === "peak")) S2.push({ d: "sw", name: "Seuil technique CSS", note: "Quelques 100m à allure seuil contrôlée, technique maintenue : préparer la course sans casser le geste.", det: "", steps: [Wm(200, "souple + éducatifs"), Object.assign(Bd(P(4, 7), 100, "sw.css", "20-30s", "", false, "sw"), { repCap: 10 }), Cm(100, "relâché")] });
    else if (beginner) S2.push({ d: "sw", name: "Technique + éducatifs", note: limFocus.note, det: "", steps: [Wm(200, "souple"), Bd(P(6, 10), 50, "sw.easy", [0.33, "repos libre entre séries (~20s)"], limFocus.txt + ", " + P(1, 2) + " point(s) technique", false, "sw"), Cm(100, "relâché")] });
    else if (shoulder) S2.push({ d: "sw", name: "Seuil contrôlé (épaule)", note: "Volume modéré, technique soignée : on épargne l'épaule, on ne cherche pas la performance brute.", det: "", steps: [Wm(300, "souple + 4×50m éducatifs"), Object.assign(Bd(P(6, 8), 100, "sw.css", "20-30s", "", false, "sw"), { repCap: 10 }), Cm(200, "souple")] });
    else S2.push({ d: "sw", name: "Seuil CSS", note: "Allure régulière sur tous les 100m. Le dernier doit ressembler au premier.", det: "", steps: [Wm(400, "progressif + 4×50m éducatifs"), Object.assign(Bd(P(6, 10), 100, "sw.css", "15-20s", "", false, "sw"), { repCap: 14 }), Cm(200, "souple")] });
  } else if (slot === "dur2") {
    if (beginner && (phase === "spec" || phase === "peak")) S2.push({ d: "sw", name: "Endurance + touches de vitesse", note: "Nage continue technique, plus quelques accélérations courtes de 25m : de la vitesse de forme, pas de la souffrance.", det: "", steps: [Wm(200, "souple"), Bd(1, 400, "sw.aero", "20-30s", " nage continue fractionnée", false, "sw"), Object.assign(Bd(P(6, 10), 25, "sw.speed", "30s repos", " en accélérations progressives, technique maintenue", false, "sw"), { repCap: 12 }), Cm(100, "très souple")] });
    else if (beginner) S2.push({ d: "sw", name: "Endurance technique", note: "Priorité au geste, pas au chrono. Un seul point technique à la fois.", det: "", steps: [Wm(200, "souple"), Bd(1, 600, "sw.easy", "20-30s, le temps de respirer", " nage continue fractionnée (ex 8-12×50m) + 1 éducatif entre chaque", false, "sw"), Cm(100, "très souple")] });
    // B1 (audit v6) — les séances de substitution épaule héritent d'un BUDGET BORNÉ :
    // sans bnd, R3.3 gonflait le bloc jusqu'aux caps génériques (+68% de volume mesuré
    // sur swim/fond/epaule — une blessure qui AUGMENTAIT la charge).
    else if (shoulder && (phase === "spec" || phase === "peak")) S2.push({ d: "sw", name: "Jambes vitesse (épaule épargnée)", note: "Vitesse par les jambes : battements rapides avec planche, l'épaule ne travaille pas. La puissance se maintient sans risque.", det: "", steps: [Wm(200, "souple"), Object.assign(Bd(P(6, 10), 25, "sw.speed", "30s repos", " battements rapides avec planche (jambes seules)", false, "sw"), { repCap: 12 }), Object.assign(Bd(1, 200, "sw.easy", "", " éducatifs technique", false, "sw"), { bnd: { floor: 200, cap: 600 } }), Cm(100, "souple")] });
    else if (shoulder) S2.push({ d: "sw", name: "Jambes + technique", note: "Épaule épargnée : le travail passe par les jambes et la technique, la charge articulaire reste nulle.", det: "", steps: [Object.assign(Bd(1, 400, null, "", " séries battements + éducatifs · épargne épaule", false, "sw"), { bnd: { floor: 300, cap: 1200 } })], ...( { plainBody: true } as object) });
    else S2.push({ d: "sw", name: "Vitesse", note: "Vitesse contrôlée et technique : la fréquence ne doit pas casser ta nage.", det: "", steps: [Wm(400, "varié + 4×25m accélérations"), Object.assign(Bd(P(8, 12), 50, "sw.speed", "30-40s", "", false, "sw"), { repCap: 16 }), Cm(200, "souple")] });
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
  return S2;
}


/** Prédiction swim — extraction mécanique de la branche correspondante de `predictRace`. */
export function predictSwim(kit: PredictKit): void {
  const { refs, format, items, advice, D, range } = kit;
  const sw = SWIM_RACE[format];
  if (refs.css > 0 && sw) {
    const t = (sw.dist / 100) * refs.css * sw.factor;
    items.push({ leg: "Natation (" + sw.dist + "m)", value: range(t), why: "CSS × " + sw.factor + (sw.factor < 1 ? " (les distances courtes se nagent plus vite que le seuil)" : sw.factor > 1 ? " (eau libre : navigation et peloton ralentissent)" : " (le 1500m se nage à l'allure CSS)") });
    D("PRED-swim", "Méthode natation", "CSS × facteur distance", "Le Critical Swim Speed est l'allure soutenable — chaque distance de course a son facteur validé");
  } else advice.push("Renseigne ton CSS (test : 400m et 200m chrono → CSS = 200m ÷ (t400−t200)) pour une projection chiffrée.");
}

registerSport({
  id: "swim",
  mainDiscipline: "sw",
  disciplines: ["sw"],
  easyFallbackSlot: "facileR",
  weekSchema: null,
  buildSessions: buildSwimSessions,
  predict: predictSwim,
  retestTypes: ["css"],
    // Le temps DANS L'EAU n'est pas le temps de séance (bord de bassin, récup, consignes) :
  // le facteur nage traduit la promesse en volume réellement nagé.
  guards: { smoothOnAuditMetric: true, swimSessionFloors: true, capacityProbe: true, swimTimeFactor: true },
});
