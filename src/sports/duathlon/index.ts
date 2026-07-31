/**
 * Sport DUATHLON (spec R10 phase 2) — course, vélo, course.
 *
 * Le duathlon valide le registre à faible coût : c'est un triathlon amputé de la natation.
 * Mais l'amputation n'est pas neutre — c'est le format le plus chargé en IMPACT COURSE de tout
 * le catalogue : deux segments de course, dont le second sur des jambes déjà entamées, et
 * aucune séance dans l'eau pour absorber du volume sans impact. Le plafond de jours d'appui
 * n'est donc pas une option ici (§R10.2.3 : « non négociable »).
 *
 * Deux briques, dans les DEUX SENS — c'est la spécificité que le tri n'a jamais eue :
 *   - R1 → vélo : le premier segment de course pré-fatigue les jambes AVANT le vélo. Personne
 *     n'arrive frais sur son vélo en duathlon, et ça s'entraîne.
 *   - vélo → R2 : la transition du tri, mais le R2 duathlon est plus court et plus INTENSE
 *     qu'une CAP de half — on n'y gère pas, on y lutte.
 */
import type { V1Session, V1Step } from "../../engine/types.ts";
import { C21_REPRISE_BRICK_FACTOR } from "../../engine/constraintMatrix.ts";
import { intOf } from "../../generator/renderer.ts";
import { registerSport, type SessionKit, type PredictKit } from "../registry.ts";
import { DUA_RUN1, DUA_BIKE, DUA_RUN2, DUA_BIKE_POWER, DUA_BIKE_PREFATIGUE } from "./tables.ts";

/** Bandes de progression par phase — même échelle que le tri (le brick monte lentement). */
const PHASE_BAND: Record<string, [number, number]> = {
  base: [0.35, 0.55], dev: [0.55, 0.75], spec: [0.75, 0.9], peak: [0.9, 1], taper: [0.35, 0.45],
};

export function buildDuathlonSessions(kit: SessionKit): V1Session[] {
  const { a, fmt, slot, phase, prog, lvl, finisher, beginner, medHold, inj, noVo2, sessionScale, S2, W, C, B } = kit;
  const runInj = inj.list.includes("course") || inj.impact;
  const PB = PHASE_BAND[phase] || [0.5, 0.8];
  const PT = (lo: number, hi: number) => Math.max(1, Math.round((lo + (hi - lo) * (PB[0] + (PB[1] - PB[0]) * prog)) * sessionScale));
  const f = fmt || "M";

  if (slot === "dur1") {
    // Qualité COURSE : c'est la discipline qui décide un duathlon (deux segments sur trois).
    if ((phase === "spec" || phase === "peak" || phase === "dev") && !noVo2 && !runInj) {
      S2.push({ d: "rn", name: "VO2max course", note: "Le duathlon se gagne à pied : la puissance aérobie course est ta première monnaie. Effort maximal tenable ~3min, récupération complète entre.", det: "",
        steps: [W(20, "progressif + 4 lignes droites"), Object.assign(B(PT(5, 8), 3, "rn.vo2", "2min30 trot"), { repCap: 8 }), C(10, "footing très facile")] });
    } else if (runInj) {
      S2.push({ d: "rn", name: "Seuil course (surface souple)", note: "Zone fragile déclarée : on garde le stimulus fort, sans les vitesses maximales ni les à-coups. Sur surface souple, jamais dans la douleur.", det: "",
        steps: [W(15, "footing très facile + gammes sans sauts"), B(PT(2, 4), PT(6, 10), "rn.thr", "2-3min trot très lent", " sur surface souple"), C(10, "footing facile")] });
    } else if (lvl === "debutant" || finisher) {
      S2.push({ d: "rn", name: "Seuil doux", note: "« Confortablement difficile » : tu peux dire quelques mots, pas tenir une conversation. Si ça pique, ralentis.", det: "",
        steps: [W(15, "footing très facile + 3 lignes droites"), B(PT(2, 4), PT(6, 10), "rn.thr", "2-3min trot très lent"), C(10, "footing facile")] });
    } else {
      S2.push({ d: "rn", name: "Seuil progressif", note: "Allure soutenue mais maîtrisée, régulière du premier au dernier bloc.", det: "",
        steps: [W(15, "footing + 4 lignes droites"), B(PT(3, 4), PT(6, 10), "rn.thr", "2min trot"), C(10, "footing")] });
    }
  } else if (slot === "dur2") {
    // Qualité VÉLO — et en spéc/peak, la puissance se travaille SUR JAMBES ENTAMÉES : c'est
    // là que le duathlon se joue, pas sur un vélo frais.
    if (phase === "spec" || phase === "peak") {
      S2.push({ d: "bk", name: "Seuil vélo (jambes entamées)", note: "10min de course d'abord, puis les blocs vélo : la puissance que tu tiens FRAIS n'est pas celle que tu tiendras après un R1. Cette séance mesure la vraie.", det: "",
        steps: [
          { role: "warmup", durationMin: 10, d: "rn", text: "footing d'ouverture @ allure de course — pré-fatigue volontaire" } as V1Step,
          Object.assign(B(PT(2, 4), PT(8, 15), "bk.thr", "5min souple"), { repCap: 5 }),
          C(10, "décrassage"),
        ] });
    } else if ((phase === "dev") && !noVo2) {
      S2.push({ d: "bk", name: "VO2max vélo", note: "Intensité maximale tenable 4min, récupération quasi complète. Sans impact : c'est le vélo qui porte la charge dure de la semaine.", det: "",
        steps: [W(20, "progressif + 3 sprints courts"), Object.assign(B(PT(4, 6), 4, "bk.vo2", "4min"), { repCap: 8 }), C(10, "souple")] });
    // R13.4 — TROISIÈME sport avec le même fall-through (tri, vélo, duathlon) : l'`else`
    // attrape-tout envoyait la force basse cadence en plein affûtage. La règle mécanisée de
    // l'auditeur (« *.frc en taper » = violation dure) les a débusqués un par un — c'est
    // exactement ce qu'une règle vérifiée fait qu'une règle espérée ne fait pas.
    } else if (phase === "taper") {
      S2.push({ d: "bk", name: "Rappel race-pace", note: "Affûtage : on réveille l'allure course sans générer de fatigue. Court et précis.", det: "",
        steps: [W(10, "progressif"), Object.assign(B(PT(2, 3), PT(6, 10), "bk.rp", "3min souple"), { repCap: 4 }), C(5, "décrassage")] });
    } else {
      S2.push({ d: "bk", name: "Force basse cadence", note: "Gros braquet, cadence 50-60 rpm : c'est musculaire, pas cardio. Sans forcer sur les genoux.", det: "",
        steps: [W(15, "+ montée en intensité"), Object.assign(B(PT(4, 6), 5, "bk.frc", "3min souple", " à 50-60 rpm"), { repCap: 8 }), C(10, "moulinage léger")] });
    }
  } else if (slot === "durLong") {
    if ((phase === "spec" || phase === "peak") && !medHold) {
      // C21 — brick borné par format, ×0.8 en reprise. Les DEUX SENS alternent d'une semaine
      // à l'autre : R1→vélo (pré-fatigue) en semaine paire, vélo→R2 (transition) en impaire.
      const rf = a.history === "reprise" ? C21_REPRISE_BRICK_FACTOR : 1;
      const r1 = DUA_RUN1[f] || { lo: 8, hi: 16 };
      const bk = DUA_BIKE[f] || { lo: 50, hi: 110 };
      const r2 = DUA_RUN2[f] || { lo: 10, hi: 22 };
      const prefatigue = kit.weekNum % 2 === 0;
      if (prefatigue) {
        S2.push({ d: "br", long: true, brick: true, name: "Brick R1 → vélo (pré-fatigue)", note: "La spécificité du duathlon, absente du triathlon : tu montes sur le vélo avec des jambes déjà entamées. Cours le R1 à l'allure de course, enchaîne vite, et découvre la puissance que tu tiens vraiment ensuite — c'est celle-là qu'il faut mémoriser.", det: "",
          steps: [
            { role: "body", leg: "run", durationMin: PT(r1.lo, Math.round(r1.hi * rf)), zone: "rn.mara", intensity: intOf("rn.mara") as unknown as string, d: "rn" } as V1Step,
            { role: "body", leg: "bike", durationMin: PT(bk.lo, Math.round(bk.hi * rf)), zone: "bk.z2", intensity: intOf("bk.z2") as unknown as string } as V1Step,
          ], ...({ runInj } as object) });
      } else {
        S2.push({ d: "br", long: true, brick: true, name: "Brick vélo → R2 (transition)", note: "Le R2 d'un duathlon est plus court et plus intense que la CAP d'un triathlon long : on n'y gère pas, on y lutte. Vélo en endurance, dernier tiers à l'allure course, puis R2 à l'allure cible sur des jambes de coton.", det: "",
          steps: [
            { role: "body", leg: "bike", durationMin: PT(bk.lo, Math.round(bk.hi * rf)), zone: "bk.z2", intensity: intOf("bk.z2") as unknown as string } as V1Step,
            { role: "body", leg: "run", durationMin: PT(r2.lo, Math.round(r2.hi * rf)), d: "rn" } as V1Step,
          ], ...({ runInj } as object) });
      }
    } else {
      // Hors phase spécifique : la longue est du VÉLO. Deux segments de course par semaine
      // suffisent en impact — allonger à pied ici serait le meilleur moyen de casser.
      const bl = DUA_BIKE[f] || { lo: 50, hi: 110 };
      S2.push({ d: "bk", long: true, name: "Sortie longue vélo", note: "L'endurance de base se construit ici, sans impact : en duathlon le volume à pied est déjà le facteur limitant. Allure régulière, mange et bois.", det: "",
        steps: [Object.assign(B(1, PT(Math.round(bl.lo * 1.2), Math.round(bl.hi * 1.6)), "bk.z2"), { bnd: { floor: 45, cap: Math.round(bl.hi * 1.8) } })], ...({ plainBody: true } as object) });
    }
  } else if (slot === "facileR") {
    // Le créneau libéré par la nage devient une COURSE FACILE — mais elle reste comptée dans
    // le plafond de jours d'appui : c'est le garde-fou qui décidera si elle survit.
    const ft = DUA_RUN2[f] || { lo: 10, hi: 22 };
    S2.push({ d: "rn", name: "Footing facile", note: "Endurance fondamentale, allure de conversation. En duathlon c'est le volume facile à pied qui construit la résistance du R2.", det: "",
      steps: [B(1, PT(Math.max(25, ft.lo * 2), Math.max(45, ft.hi * 2)), "rn.easy", "", runInj ? " · surface souple" : "")], ...({ plainBody: true } as object) });
  } else if (slot === "facile2") {
    // §R10.2.2 — le créneau « nage récup » du tri n'a plus d'objet : il devient du vélo
    // récupération (zéro impact) plutôt qu'un troisième jour de course.
    S2.push({ d: "bk", recovery: true, name: "Vélo récup", note: "Moulinage très souple, sans force sur les pédales : on active la circulation sans ajouter un appui de plus dans la semaine.", det: "",
      steps: [B(1, PT(30, 45), null, "", " très souple")], ...({ plainBody: true } as object) });
  } else if (slot === "recup") {
    S2.push({ d: "rs", name: "Repos / mobilité", det: "marche, étirements, mobilité hanches", steps: [] });
  } else if (slot === "off") {
    S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  }
  return S2;
}

/** Prédiction duathlon — TROIS legs séparés, jamais un total (même règle que le tri). */
export function predictDuathlon(kit: PredictKit): void {
  const { refs, format, items, advice, D, runRange, riegelSec, profWhy } = kit;
  const r1 = DUA_RUN1[format], bk = DUA_BIKE[format], pw = DUA_BIKE_POWER[format], r2 = DUA_RUN2[format];
  const pf = DUA_BIKE_PREFATIGUE[format] ?? 0.97;
  if (refs.thrPace > 0 && r1 && r2) {
    items.push({ leg: "R1 (" + r1.km + "km)", value: runRange(riegelSec(refs.thrPace, r1.km)), why: "Riegel depuis ton allure seuil — le R1 se court frais, c'est le seul segment où c'est vrai" + profWhy });
    items.push({ leg: "R2 (" + r2.km + "km)", value: runRange(riegelSec(refs.thrPace, r2.km) * r2.fatigue), why: "Riegel × " + r2.fatigue + " de fatigue post-vélo — un R2 se court plus lentement qu'un R1 de même distance, même quand il est plus court" + profWhy });
  } else advice.push("Renseigne ton allure seuil (test : 30min à fond, allure moyenne) pour obtenir tes deux segments de course.");
  if (refs.ftp > 0 && bk && pw) {
    // §R10.2.4 — le facteur que le tri n'a jamais eu : le R1 dégrade la capacité du vélo.
    items.push({ leg: "Vélo (" + bk.km + "km)", value: Math.round(refs.ftp * pw.lo * pf) + "–" + Math.round(refs.ftp * pw.hi * pf) + "W",
      why: "puissance NORMALISÉE cible, réduite de " + Math.round((1 - pf) * 100) + "% : tu arrives sur le vélo avec un R1 dans les jambes — viser la puissance d'un contre-la-montre frais coûterait ton R2" });
  } else advice.push("Renseigne ta FTP (test 20min × 0.95) pour obtenir ta puissance cible vélo.");
  if (items.length) {
    D("PRED-duathlon", "Méthode duathlon", "3 legs séparés (R1 · vélo · R2)", "Un total additionnerait les incertitudes ET les transitions ; chaque segment a sa méthode, et le vélo porte en plus la pré-fatigue du R1");
    advice.push("Le piège du duathlon est le R1 : parti à l'allure d'un 10 km sec, il te coûte le vélo ET le R2. Cours-le 10 à 15 s/km plus lentement que ta référence sur la distance.");
  }
}

registerSport({
  id: "duathlon",
  mainDiscipline: "rn", // deux segments sur trois se courent : la course décide
  disciplines: ["rn", "bk"],
  easyFallbackSlot: "facileR",
  weekSchema: null, // le schéma générique par créneaux convient : rien de spécifique à inventer
  buildSessions: buildDuathlonSessions,
  predict: predictDuathlon,
  retestTypes: ["thrPace", "ftp"],
  // §R10.2.3 — NON NÉGOCIABLE. Format le plus chargé en impact course du catalogue : deux
  // segments de course dont un sur jambes entamées, et aucune séance dans l'eau pour absorber
  // du volume sans impact. Sans ce plafond, le générateur produit 6 jours d'appui par semaine.
  guards: { runImpactCap: true, stripLongOnMedHold: true, singleRunVo2PerWeek: true },
});
