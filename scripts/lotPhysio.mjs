#!/usr/bin/env node
/**
 * BANC DU LOT `fix/moteur-physio` — les assertions T-01 à T-19.
 * T-01 à T-14 viennent du handoff maître ; T-15 à T-19 de l'ADDENDUM 01.
 *
 *   node scripts/lotPhysio.mjs          # verdict complet
 *   node scripts/lotPhysio.mjs --strict # exit 1 aussi sur les rouges attendus (fin de lot)
 *
 * CONTRAT, repris de `audit:v6` parce que c'est déjà la convention du dépôt :
 * chaque test déclare ce qu'on ATTEND de lui aujourd'hui. Un rouge ATTENDU (la dette que le lot
 * va corriger) n'échoue pas le banc — sinon on ne pourrait pas committer les tests avant les
 * correctifs, ce que la règle n°1 du lot exige justement. Un rouge INATTENDU (un test passé vert
 * qui redevient rouge) échoue toujours : c'est une régression.
 *
 * Quand un ticket ferme un test, on passe son `attendu` à "vert" DANS LE MÊME COMMIT — il devient
 * un garde-fou permanent. C'est ce qui empêche la dette de redevenir un souvenir.
 *
 * DEUX TESTS N'ENCODENT PAS LE HANDOFF MAIS L'ARBITRAGE DU FONDATEUR (13/08, voir
 * ARBITRAGES_LOT_PHYSIO.md) : T-03 (plafond de sortie longue INDEXÉ sur le volume, et jamais
 * devant le plancher C30) et T-04 (12 %, bornes 25-60, disciplines d'IMPACT seulement). Les
 * valeurs du handoff ont été mesurées puis écartées ; encoder la proposition plutôt que la
 * décision produirait un banc qui exige ce qu'on a décidé de ne pas faire.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import "../src/app/bridge.ts";
import { ZDEF } from "../src/generator/renderer.ts";
import { zoneClass, intensitySplit } from "../src/engine/loadModel.ts";
import { sessionIntensity } from "../src/readiness/dailyAdjuster.ts";
import { CAP_SWIM } from "../src/engine/constraintMatrix.ts";
import { C26c_HARD_TIME_TOLERANCE, PROVENANCE, easyShareFloor, swimTimeFactorOf,
  BRICK_BIKE_BOUNDS, BRICK_TAPER_BIKE_BOUNDS, DOSE_CAP_MIN, DOSE_EXEMPT } from "../src/engine/constraintMatrix.ts";
import { RN_THR_FRONTIERE_LENTE } from "../src/engine/loadModel.ts";
import { TrainingReasoningEngine } from "../src/engine/reasoningEngine.ts";
import { traceOn, traceDump } from "../src/engine/trace.ts";
import { toProfile } from "../src/app/bridge.ts";
import { riegelExponent, riegelSecWith, RUN_KM, marathonPaceBand, RN_MARA_RATIO_PLANCHER, TRI_SWIM, SWIM_RACE } from "../src/engine/predictor.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";
import { estCharge } from "./lib/planMetrics.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const strict = process.argv.includes("--strict");
const src = (p) => readFileSync(join(ROOT, "src", p), "utf8");

const { profils } = JSON.parse(readFileSync(join(ROOT, "tests", "fixtures", "profils30.json"), "utf8"));
const plans = profils.map((p) => {
  try { return { ...p, plan: globalThis.EBV2.buildPlan(p.sport, { ...p.a }) }; }
  catch (e) { return { ...p, erreur: String(e?.message ?? e) }; }
}).filter((p) => p.plan);

// ---- réacteur de tests ----------------------------------------------------
const TESTS = [];
const T = (id, attendu, quoi, fn) => TESTS.push({ id, attendu, quoi, fn });
/** Un test rend { ok, detail } — `detail` est ce qu'on lit quand il est rouge. */

const IMPACT = new Set(["run", "trail", "duathlon"]);
const semainesCharge = (plan) => (plan.weeks ?? []).filter(estCharge);
const seances = (w) => (w.days ?? []).flatMap((d) => (d.sessions ?? []).filter((s) => s && s.d !== "rs"));
const minSem = (w) => seances(w).reduce((t, s) => t + (s.min || 0), 0);
const durSem = (w) => seances(w).reduce((t, s) => { try { return t + (intensitySplit(s).hardMin || 0); } catch { return t; } }, 0);
const modSem = (w) => seances(w).reduce((t, s) => { try { return t + (intensitySplit(s).modMin || 0); } catch { return t; } }, 0);

// ---- T-01 · les deux classificateurs disent la même chose ------------------
// §5 (DOC_UNIQUE après B1) — TROISIÈME FONCTION SOUS LE MÊME GARDE : `EBV2.sessionSplit`
// est né pour alimenter le graphe B1, le contexte exact qui a produit `_IFZ` et la doctrine
// CTL/ATL parallèle. Vérifié à la source : c'est un WRAPPER de refs autour d'`intensitySplit`
// (bridge.ts, `sessionSplitForUI` → `return intensitySplit(...)`) — il importe, il ne
// réimplémente pas. Le garde empêche que ça change : les trois classent identiquement.
T("T-01", "rouge", "zoneClass(), sessionIntensity() et EBV2.sessionSplit() classent identiquement toute zone de ZDEF", () => {
  const MAP = { hard: "difficile", mod: "moderee", easy: "facile" };
  const ecarts = [];
  for (const zone of Object.keys(ZDEF)) {
    const attendu = MAP[zoneClass(zone)];
    const obtenu = sessionIntensity({ d: "rn", min: 60, steps: [{ role: "body", zone, durationMin: 60 }] });
    // la 3e voix : sessionSplit doit ranger les 60 min dans la classe que zoneClass nomme
    try {
      const sp = globalThis.EBV2.sessionSplit({ d: "rn", min: 60, steps: [{ role: "body", zone, durationMin: 60 }] }, {});
      const cls3 = sp.hardMin >= 59 ? "hard" : sp.modMin >= 59 ? "mod" : sp.easyMin >= 59 ? "easy" : "?";
      if (cls3 !== zoneClass(zone)) ecarts.push(`${zone} : zoneClass=${zoneClass(zone)} mais sessionSplit=${cls3}`);
    } catch (e) { ecarts.push(`${zone} : sessionSplit a levé (${String(e?.message).slice(0, 40)})`); }
    if (attendu !== obtenu) ecarts.push(`${zone} : loadModel=${attendu} · dailyAdjuster=${obtenu}`);
  }
  return { ok: !ecarts.length, detail: `${ecarts.length} zone(s) divergente(s) — ` + ecarts.join(" · ") };
});

// ---- T-02 · aucun classificateur ne référence une zone fantôme -------------
T("T-02", "rouge", "toute zone référencée par un classificateur existe dans ZDEF", () => {
  const suffixes = [...src("readiness/dailyAdjuster.ts").matchAll(/"(\.[a-z0-9]+)"/g)].map((m) => m[1]);
  const connus = new Set(Object.keys(ZDEF).map((z) => z.slice(z.indexOf("."))));
  const fantomes = [...new Set(suffixes.filter((s) => !connus.has(s)))];
  return { ok: !fantomes.length, detail: `suffixe(s) sans zone correspondante : ${fantomes.join(", ")}` };
});

// ---- T-03 · plafond de la sortie longue (ARBITRAGE, pas handoff) -----------
T("T-03", "rouge", "sortie longue ≤ plafond indexé sur le volume (50 % <5 h · 35 % ≥5 h · 45 % ultra)", () => {
  const viol = [];
  for (const { id, sport, plan } of plans) {
    const ultra = sport === "trail" && /ultra/.test(JSON.stringify(plan._v2?.decisions ?? []));
    for (const w of semainesCharge(plan)) {
      const m = minSem(w);
      if (m <= 0) continue;
      const longue = Math.max(0, ...seances(w).filter((s) => s.long).map((s) => s.min || 0));
      if (!longue) continue;
      const plafond = ultra ? 0.45 : m < 300 ? 0.50 : 0.35;
      if (longue / m > plafond + 0.005) viol.push(`${id} S${w.num} ${Math.round(longue / m * 100)}%>${plafond * 100}%`);
    }
  }
  return { ok: !viol.length, detail: `${viol.length} semaine(s) au-dessus — ` + viol.slice(0, 6).join(" · ") };
});

// ---- T-04 · plafond de temps dur (ARBITRAGE : 12 %, 25-60, impact) --------
T("T-04", "rouge", "temps dur ≤ clamp(12 % du volume, 25, 60) sur les disciplines d'impact", () => {
  const viol = [];
  for (const { id, sport, plan } of plans) {
    if (!IMPACT.has(sport)) continue;
    for (const w of semainesCharge(plan)) {
      const m = minSem(w);
      if (m <= 0) continue;
      const cap = Math.min(60, Math.max(25, 0.12 * m)) * C26c_HARD_TIME_TOLERANCE;
      const dur = durSem(w);
      if (dur > cap) viol.push(`${id} S${w.num} ${Math.round(dur)}min>${Math.round(cap)}`);
    }
  }
  return { ok: !viol.length, detail: `${viol.length} semaine(s) au-dessus — ` + viol.slice(0, 6).join(" · ") };
});

// ---- T-05 · interlock modéré / plancher de facile --------------------------
// MA PREMIÈRE ÉCRITURE SUBSTITUAIT LA PART DE FACILE RÉELLE AU PLANCHER `easyFloor`, et
// flaguait donc une semaine à 90 % facile / 9 % modéré — une bonne semaine — comme violation.
// Le plancher est une CONSTANTE dérivée du plafond de dur (`easyShareFloor`), pas la mesure du
// plan qu'on juge : comparer une grandeur à elle-même rend un critère qui se resserre tout seul.
T("T-05", "rouge", "part de modéré ≤ 1 − plancher de facile − 0,05 (interdit 60/40/0)", () => {
  const viol = [];
  for (const { id, sport, a, plan } of plans) {
    for (const w of semainesCharge(plan)) {
      const m = minSem(w);
      if (m <= 0) continue;
      const floor = easyShareFloor(m, { history: a.history, level: a.level, injured: !!a.injury });
      const plafondMod = Math.max(0.05, 1 - floor - 0.05);
      const mod = modSem(w) / m;
      if (mod > plafondMod + 0.005) viol.push(`${id} S${w.num} mod=${Math.round(mod * 100)}% > ${Math.round(plafondMod * 100)}%`);
    }
  }
  return { ok: !viol.length, detail: `${viol.length} semaine(s) — ` + viol.slice(0, 6).join(" · ") };
});

// ---- T-06 · prérequis de nage continue en triathlon (B-17) -----------------
// DEUX ÉCRITURES SYNTAXIQUES AVANT CELLE-CI, LES DEUX FAUSSES, ET ELLES RESTENT ÉCRITES.
//   (1) la première cherchait `swim_continuous` dans tri/index.ts **+ answerSchema.ts** et rendait
//       VERT : ce champ existe bien dans le schéma… parce que c'est celui du SWIMRUN, qui le
//       partage. Le test matchait le gate d'un AUTRE sport et concluait que celui du tri existait ;
//   (2) la seconde, scopée au module tri, cherchait `/prereq|nage_continue/` — B-17 livré, elle
//       serait restée ROUGE, la règle ne portant aucun de ces mots. Un test qui exige un
//       VOCABULAIRE au lieu d'un COMPORTEMENT échoue dans les deux sens.
// C'est la règle 15 : on mesure ce qui s'EXÉCUTE. Le test observe désormais le plan LIVRÉ, sur les
// quatre propriétés que B-17 promet — et il porte les deux défauts §14 (D1 : une seule par
// semaine ; D2 : livré == cible au mètre près, critère EXACT, « un bloc dont la distance porte un
// sens ne tolère pas de tolérance »).
T("T-06", "vert", "B-17 — nage continue prescrite en tri : gate, une par semaine, montée monotone, livré == cible", () => {
  // 1 650 m à 1'50/100 m = 30,25 min : au-dessus du plancher S10 de 30 min, donc le gate est
  // satisfait pour les quatre formats et AUCUN n'est rabattu. La prémisse est assertée plus bas :
  // sans elle, un profil rabattu au sprint rendrait le test vert sur un format qu'il ne nomme pas
  // (c'est exactement ce que ma première sonde a fait, cf. `scripts/sondeB17.mjs`).
  const base = { sport: "tri", intent: "competition", level: "inter", history: "confirme",
    dispo: "quotidienne", doubles: "non", sessions_max: "6", age: "35", sex: "H", weight: "75",
    vol_max: "12", vol_recent: "6", injury: "aucune", med_pain: "non", med_dizzy: "non",
    med_treat: "non", pace_known: "oui", pace: "5:00", ftp_known: "oui", ftp: "220",
    css_known: "oui", css: "1:50", terrain: "route", milieu: "bassin" };
  const lundi = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
  const dans = (n) => { const d = lundi(); d.setDate(d.getDate() + n * 7 - 1); return d.toISOString().slice(0, 10); };
  const CONT = /^Nage continue/;
  const bad = [], vus = [];

  // (a) LE GATE MORD, ET SA CONSÉQUENCE EST GRADUÉE (D3 §3). Ce critère demandait qu'un Full à
  //     800 m soit RABATTU : il encodait la décision que D3 a RENVERSÉE. Réécrit sur la décision
  //     en vigueur plutôt que supprimé — 800 m sur 36 semaines se referment à +10 %/semaine, donc
  //     le format est GARDÉ ; 100 m ne se referment pas, donc il rabat. Les deux moitiés sont
  //     assertées : un correctif qui ne rabattrait PLUS JAMAIS serait aussi faux que celui qui
  //     rabat tout le monde, et c'est ce second défaut qui a coûté 117 profils sur 148.
  {
    const gard = globalThis.EBV2.buildPlan("tri", { ...base, format: "Full", longest_swim_known: "oui", longest_swim_m: "800", race_date: dans(36) });
    const dg = (gard._v2?.decisions ?? []).find((x) => x.id === "B17-continuite");
    if (!dg) bad.push("gate : Full à 800 m ne dit RIEN — l'écart doit être nommé même quand le format est gardé");
    else if (/rabattu/i.test(String(dg.what ?? ""))) bad.push("gate : Full à 800 m est RABATTU alors que l'écart se referme (D3 §3)");
    else vus.push("gardé ✓ " + dg.val);

    const rab = globalThis.EBV2.buildPlan("tri", { ...base, format: "Full", longest_swim_known: "oui", longest_swim_m: "100", race_date: dans(36) });
    const dr = (rab._v2?.decisions ?? []).find((x) => x.id === "B17-continuite");
    if (!dr || !/rabattu/i.test(String(dr.what ?? ""))) bad.push("gate : Full à 100 m n'est PAS rabattu — la branche de sécurité a disparu");
    else vus.push("rabattu ✓ " + dr.val);

    // « je ne sais pas » ne satisfait pas le gate, et le DIT — sans quoi la question posée au §1
    // de l'arbitrage n'aurait aucun effet observable.
    const inc = globalThis.EBV2.buildPlan("tri", { ...base, format: "70.3", longest_swim_known: "non", race_date: dans(20) });
    if (!(inc._v2?.decisions ?? []).some((x) => x.id === "B17-continuite")) bad.push("« je ne sais pas » ne produit aucune décision de continuité");
  }
  // (b) LE GATE LAISSE PASSER ce qu'il doit laisser passer, et la prescription tient.
  for (const [format, h] of [["M", 18], ["70.3", 26], ["Full", 36], ["Full", 42]]) {
    const p = globalThis.EBV2.buildPlan("tri", { ...base, format, longest_swim_known: "oui", longest_swim_m: "1650", race_date: dans(h) });
    const id = `${format}/${h}`;
    if ((p._v2?.decisions ?? []).some((x) => x.id === "B17-continuite" && /rabattu/i.test(String(x.what ?? "")))) {
      bad.push(`${id} : PRÉMISSE ROMPUE — le format est rabattu, la ligne mesurerait un autre format`);
      continue;
    }
    const paliers = [];
    for (const w of p.weeks ?? []) {
      const conts = (w.days ?? []).flatMap((d) => (d.sessions ?? []).filter((s) => s.d === "sw" && CONT.test(String(s.name ?? ""))));
      // D1 — le créneau `facile2` est une CATÉGORIE (29 semaines sur 308 en portent deux jours) :
      // sans départage explicite, les deux jours recevaient la même nage continue.
      if (conts.length > 1) bad.push(`${id} S${w.num} : ${conts.length} nages continues dans la MÊME semaine`);
      for (const s of conts) {
        const cible = +(String(s.name).match(/(\d+)\s*m d'affilée/)?.[1] ?? 0);
        const livre = (s.steps ?? []).filter((st) => st.role === "body")
          .reduce((t, st) => t + (st.distanceM || 0) * (st.reps || 1), 0);
        // D2 — EXACT, pas approché : une différence d'un mètre signifie qu'une passe non
        // identifiée touche encore le bloc (cas O-26, `blockBounds` réécrivait le plancher).
        if (livre !== cible) bad.push(`${id} S${w.num} : livré ${livre} m ≠ cible ${cible} m`);
        paliers.push(cible);
      }
    }
    if (!paliers.length) bad.push(`${id} : aucune nage continue prescrite`);
    // La MONTÉE est l'objet de la règle : un test unique à la fin ne laisse pas le temps de
    // corriger ce qu'on y apprend. Strictement croissante, et le dernier palier EST la distance.
    for (let i = 1; i < paliers.length; i++) if (paliers[i] <= paliers[i - 1]) bad.push(`${id} : palier ${i + 1} (${paliers[i]} m) ≤ le précédent (${paliers[i - 1]} m)`);
    if (paliers.length && paliers[paliers.length - 1] !== TRI_SWIM[format].dist) bad.push(`${id} : dernier palier ${paliers[paliers.length - 1]} m ≠ distance de course ${TRI_SWIM[format].dist} m`);
    vus.push(`${id} ${paliers.join("→")}`);
  }
  // (e) D4 — LA PROGRESSION NE DÉPEND NI DES DOUBLES NI DU BUDGET DE SÉANCES.
  //
  // Ce bloc existe parce que T-06 était VERT pendant que le premier usage réel ne recevait qu'UN
  // palier sur trois. La cause n'est pas dans ce qu'il vérifiait — c'est que sa fixture porte
  // `doubles: "non"`, donc il n'a jamais exercé la branche où le porteur de la continue est une
  // séance « (matin) », c'est-à-dire celle que la coupe par `sessions_max` retire en premier.
  // C'est la leçon A-2 dans sa forme la plus chère : un corpus se juge sur l'espace des
  // DÉCISIONS, pas sur celui des saisies — 31 gates et 989 profils de golden ont laissé passer
  // ça parce qu'aucun ne croisait `doubles` avec la continuité.
  //
  // Le critère est une PROPRIÉTÉ et non une valeur : ce que B-17 promet est livré QUEL QUE SOIT
  // le budget. Une valeur épinglée aurait été satisfaite en gelant un chiffre (règle 19).
  {
    const attendu = (p) => (p._v2?.decisions ?? []).find((x) => x.id === "B17-paliers");
    for (const dbl of ["non", "oui"]) for (const sm of ["6", "7", "10"]) {
      const p = globalThis.EBV2.buildPlan("tri", { ...base, format: "70.3", doubles: dbl, sessions_max: sm,
        longest_swim_known: "oui", longest_swim_m: "1000", race_date: dans(40) });
      const n = +(String(attendu(p)?.val ?? "").match(/(\d+)\s*palier/)?.[1] ?? 0);
      const livrees = (p.weeks ?? []).flatMap((w) => (w.days ?? []).flatMap((d) => (d.sessions ?? [])))
        .filter((s) => s.d === "sw" && CONT.test(String(s.name ?? ""))).length;
      if (!n) { bad.push(`doubles=${dbl}/sessions_max=${sm} : aucune décision B17-paliers à comparer`); continue; }
      if (livrees !== n) bad.push(`doubles=${dbl}/sessions_max=${sm} : ${livrees} continue(s) livrée(s) pour ${n} annoncée(s)`);
      else vus.push(`dbl=${dbl}/sm=${sm} ${livrees}/${n} ✓`);
    }
  }
  return { ok: !bad.length, detail: bad.length ? bad.slice(0, 6).join(" · ") : vus.join(" · ") };
});

// ---- T-07 · délai excentrique de 48 h, FRONTIÈRES DE SEMAINE comprises -----
// V-01 a montré que la règle EST appliquée (deux mécanismes). Ce test la vérifie sur le seul
// endroit que le filet par semaine ne peut pas voir : le passage d'une semaine à la suivante.
T("T-07", "vert", "aucune séance dure/descente dans les 48 h suivant ≥1000 m de D− (bord de semaine inclus)", () => {
  const viol = [];
  for (const { id, sport, plan } of plans) {
    if (sport !== "trail") continue;
    const jours = (plan.weeks ?? []).flatMap((w) => (w.days ?? []).map((d) => ({ w, d })));
    const dMoins = (d) => (d.sessions ?? []).reduce((t, s) => t + (s.steps ?? []).reduce((u, st) => u + (st.dmoinsM || 0) * (st.reps || 1), 0), 0);
    for (let i = 0; i < jours.length; i++) {
      if (dMoins(jours[i].d) < 1000) continue;
      for (const nxt of jours.slice(i + 1, i + 3)) {
        const conflit = nxt.d.charge === "dur" || dMoins(nxt.d) > 200;
        const memeSemaine = nxt.w.num === jours[i].w.num;
        if (conflit) viol.push(`${id} S${jours[i].w.num}→S${nxt.w.num}${memeSemaine ? "" : " (BORD)"}`);
      }
    }
  }
  return { ok: !viol.length, detail: `${viol.length} violation(s) — ` + viol.slice(0, 6).join(" · ") };
});

// ---- T-08 · répétition nutrition sur les épreuves longues ------------------
T("T-08", "rouge", "toute épreuve ≥2 h 30 estimées porte ≥3 séances de répétition nutrition en spécifique", () => {
  const manquants = [];
  for (const { id, plan } of plans) {
    const specs = (plan.weeks ?? []).filter((w) => (w.phase?.id ?? w.phaseId) === "spec");
    if (!specs.length) continue;
    const longues = specs.flatMap(seances).filter((s) => (s.min || 0) >= 150);
    if (!longues.length) continue;
    const avecNutri = longues.filter((s) => /ravito|glucide|nutrition|g\/h/i.test(String(s.note ?? "") + String(s.det ?? "")));
    if (avecNutri.length < 3) manquants.push(`${id} ${avecNutri.length}/3`);
  }
  return { ok: !manquants.length, detail: `${manquants.length} plan(s) sous 3 répétitions — ` + manquants.slice(0, 8).join(" · ") };
});

// ---- T-09 · pas de table morte dans duathlon/tables.ts ---------------------
T("T-09", "rouge", "les tables DUA_* déclarées sont soit importées, soit absentes", () => {
  const tables = [...src("sports/duathlon/tables.ts").matchAll(/export const (DUA_[A-Z_]+)/g)].map((m) => m[1]);
  const tout = ["sports/duathlon/index.ts", "engine/constraintMatrix.ts", "generator/planGenerator.ts", "generator/weekBuilder.ts", "engine/predictor.ts"].map(src).join("\n");
  const mortes = tables.filter((t) => !new RegExp(`\\b${t}\\b`).test(tout));
  return { ok: !mortes.length, detail: `table(s) déclarée(s) et jamais lue(s) : ${mortes.join(", ")}` };
});

// ---- T-10 · chaque constante tracée porte une sensibilité mesurée ----------
T("T-10", "rouge", "toute entrée de PROVENANCE porte un champ `sensitivity`", () => {
  const sans = (PROVENANCE ?? []).filter((p) => p && p.sensitivity === undefined).map((p) => p.id);
  return { ok: (PROVENANCE ?? []).length > 0 && !sans.length, detail: `${sans.length}/${(PROVENANCE ?? []).length} entrées sans sensibilité mesurée` };
});

// ---- T-11 · pas de borne inline quand une table sourcée existe -------------
T("T-11", "rouge", "aucune borne de séance inline quand une table sourcée équivalente existe", () => {
  const dup = [];
  if (/const durCaps\s*[:=]/.test(src("sports/run/index.ts")) && !/CAP_LONG/.test(src("sports/run/index.ts"))) dup.push("run/index.ts durCaps");
  if (/const durCaps\s*[:=]/.test(src("sports/bike/index.ts")) && !/CAP_LONG/.test(src("sports/bike/index.ts"))) dup.push("bike/index.ts durCaps");
  if (!/BRICK_BIKE_BOUNDS/.test(src("sports/tri/index.ts"))) dup.push("tri/index.ts bornes brick");
  return { ok: !dup.length, detail: `borne(s) recopiée(s) au lieu d'être importée(s) : ${dup.join(", ")}` };
});

// ---- T-12 · toute prédiction affichée porte une fourchette -----------------
// MA PREMIÈRE ÉCRITURE LISAIT `plan._v2.prediction.items` — CE CHEMIN N'EXISTE PAS. La
// prédiction vient d'un appel séparé `predict(sport, answers, plan)`. Le test examinait donc
// ZÉRO item et passait vert : satisfait par sa propre panne, la définition d'un test vacueux.
// Il compte désormais ce qu'il regarde, et ÉCHOUE s'il ne regarde rien.
T("T-12", "rouge", "toute prédiction exposée à l'athlète porte une fourchette d'incertitude", () => {
  const sans = [];
  let examines = 0;
  for (const { id, sport, a, plan } of plans) {
    let pr;
    try { pr = globalThis.EBV2.predict(sport, a, plan); } catch { continue; }
    for (const it of pr?.items ?? []) {
      const v = String(it?.value ?? "");
      if (!v) continue;
      // NE JUGE QUE LES CHRONOS. Ma première écriture flaguait « Vitesse cible : 6,8
      // km-effort/h », « Part de marche : ~35 % du temps » et « Effet de binôme : −18 %
      // d'effort » — ni l'un ni l'autre n'est une prédiction de TEMPS, et le « ~ » de la part
      // de marche EST déjà une marque d'incertitude. Un test qui exige une fourchette sur une
      // cible d'allure forcerait à projeter le pacing, ce que P6 interdit explicitement.
      const estChrono = /\d\s*h\s*\d|\d\s*['’]\s*\d|^\s*\d+\s*min\b/.test(v);
      if (!estChrono) continue;
      examines++;
      if (!/\d\s*[–—-]\s*\d/.test(v)) sans.push(`${id} « ${it.leg} : ${v} »`);
    }
  }
  if (!examines) return { ok: false, detail: "AUCUN item de prédiction examiné — le test ne mesure rien" };
  return { ok: !sans.length, detail: `${sans.length}/${examines} prédiction(s) sans fourchette — ` + sans.slice(0, 5).join(" · ") };
});

// ---- T-13 · renforcement musculaire, tous sports ---------------------------
T("T-13", "rouge", "tout plan porte ≥2 blocs de renforcement par semaine hors affûtage", () => {
  const sans = [];
  for (const { id, plan } of plans) {
    const ch = semainesCharge(plan);
    if (!ch.length) continue;
    const avec = ch.filter((w) => {
      const txt = seances(w).map((s) => `${s.name} ${s.note ?? ""} ${s.det ?? ""}`).join(" ");
      return (txt.match(/renfo|gainage|excentrique|proprioception/gi) ?? []).length >= 2;
    });
    if (avec.length < ch.length) sans.push(`${id} ${avec.length}/${ch.length} sem`);
  }
  return { ok: !sans.length, detail: `${sans.length} plan(s) sans renforcement suffisant — ` + sans.slice(0, 8).join(" · ") };
});

// ---- T-14 · cible glucidique horaire sur les séances longues --------------
T("T-14", "rouge", "toute séance >60 min porte une cible glucidique horaire", () => {
  let total = 0, avec = 0;
  for (const { plan } of plans)
    for (const w of plan.weeks ?? [])
      for (const s of seances(w)) {
        if ((s.min || 0) <= 60) continue;
        total++;
        if (/\d+\s*(?:–|-|à)?\s*\d*\s*g\/h|glucide/i.test(String(s.note ?? "") + String(s.det ?? ""))) avec++;
      }
  return { ok: total > 0 && avec === total, detail: `${avec}/${total} séances >60 min portent une cible glucidique` };
});


// ---- T-15 · cohérence interne du classificateur, domaine par domaine ------
// DISTINCT DE T-01 : T-01 compare deux fonctions entre elles et resterait vert si `sw.aero`
// était mal classé PARTOUT de la même façon. T-15 teste la cohérence INTERNE d'une seule.
//
// LA PRÉMISSE DE LA PREMIÈRE ÉCRITURE ÉTAIT UNE FAUTE D'UNITÉ, MESURÉE LE 14/08/2026 —
// ARBITRAGE « ALIGNER » ROUVERT AUPRÈS DU FONDATEUR SUR CES CHIFFRES. Elle comparait des
// ratios de VITESSE (natation : 1/1,06 = 94,3 % de la vitesse CSS) à des ratios de PUISSANCE
// (bk.ss : 88-94 % FTP). Dans l'eau, la traînée fait puissance ∝ v³ : sw.aero vaut
// (1/1,06)³ = **84 % de l'effort seuil** — SOUS le plancher de la ligne tempo (88 %) et sous
// le propre plafond de rn.easy (86 %, classée easy). Le classement actuel (`easy`) RESPECTE
// donc l'ordre des efforts ; « aligner » sw.aero sur `mod` aurait encodé la confusion
// vitesse/puissance, et son coût était mesuré : 411 semaines du golden passaient au-dessus
// de la borne C26d des 40 % de modéré (0 aujourd'hui) — des plans entiers déclassés pour un
// changement d'étiquette. L'arbitrage C26d demandé « dans le même ticket » est donc SANS
// OBJET sous la lentille corrigée. La ligne tempo n'a PAS d'homologue natation : les zones
// de nage sautent de 84 % (aero) à 100 % (css).
//
// L'invariant qui reste — et qui garde — : les classes RESPECTENT L'ORDRE DES EFFORTS entre
// disciplines. Aucune zone classée plus bas ne demande plus d'effort qu'une zone classée
// plus haut. C'est lui que le test asserte, fractions publiées.
const DOMAINES = [
  ["facile / Z2", ["rn.easy", "bk.z2", "sw.easy"]],
  ["tempo / sweetspot", ["rn.mara", "bk.ss", "sw.aero"]],
  ["seuil", ["rn.thr", "bk.thr", "sw.css"]],
  ["VO2max", ["rn.vo2", "bk.vo2", "sw.vo2"]],
];
T("T-15", "vert", "les classes d'intensité respectent l'ordre des EFFORTS entre disciplines (P ∝ v³ en natation)", () => {
  const RANG = { easy: 0, mod: 1, hard: 2 };
  const effort = (z) => {
    const d = ZDEF[z];
    if (!d || !Number.isFinite(d.lo) || !Number.isFinite(d.hi)) return null;
    if (z.startsWith("bk.")) return [d.lo, d.hi];               // %FTP : déjà de la puissance
    if (z.startsWith("rn.")) return [1 / d.hi, 1 / d.lo];       // allure → vitesse ≈ effort (linéaire)
    if (z.startsWith("sw.")) return [(1 / d.hi) ** 3, (1 / d.lo) ** 3]; // vitesse au CUBE (traînée)
    return null;
  };
  const zones = DOMAINES.flatMap(([, zs]) => zs).map((z) => ({ z, cls: zoneClass(z), eff: effort(z) })).filter((x) => x.eff);
  const ecarts = [];
  for (const a of zones) for (const b of zones)
    // une zone de classe STRICTEMENT inférieure ne peut pas demander plus d'effort que le
    // BAS de la fourchette d'une zone de classe supérieure (tolérance 2 pts : les bandes
    // publiées sont des arrondis de table)
    if (RANG[a.cls] < RANG[b.cls] && a.eff[1] > b.eff[0] + 0.02)
      ecarts.push(`${a.z} (${a.cls}, ${Math.round(a.eff[1] * 100)} %) dépasse ${b.z} (${b.cls}, plancher ${Math.round(b.eff[0] * 100)} %)`);
  const table = DOMAINES.map(([nom, zs]) => nom + " : " + zs.map((z) => { const e = effort(z); return e ? `${z} ${Math.round(e[0] * 100)}-${Math.round(e[1] * 100)} %` : z; }).join(" · ")).join(" — ");
  return { ok: !ecarts.length, detail: (ecarts.length ? ecarts.slice(0, 4).join(" · ") + " — " : "") + table };
});

// ---- T-16 · le chrono prédit et l'allure prescrite parlent du même effort -
// RESTREINT AU MARATHON, et la raison est écrite plutôt que tue. L'addendum listait trois
// distances ; mesuré, `src/sports/run/index.ts` ne prescrit `rn.mara` qu'au marathon — 5 km,
// 10 km et semi reçoivent `rn.thr`, qui est une séance AU SEUIL et non une prescription
// d'allure de course. Courir son 10 km plus vite que son allure seuil est de la physiologie
// normale : le critère littéral y comparait deux grandeurs qui n'ont pas à coïncider, et les
// 4 rouges qu'il produisait étaient structurels. Le semi, lui, tombait dans la bande à tous les
// volumes. Retirer un critère mal posé plutôt que de le figer rouge, c'est ce que R20.6 a fait
// des invariants I6/I8/I12.
//
// Ce que le test garde : la bande prescrite est celle que le générateur POSE RÉELLEMENT
// (`marathonPaceBand`, B-22), jamais la table statique — sans quoi il mesurerait l'état d'avant
// le correctif et resterait rouge à jamais.
T("T-16", "vert", "le chrono marathon prédit tombe dans la bande d'allure marathon prescrite", () => {
  const hors = [];
  for (const thr of [225, 255, 300, 330, 390]) {   // 3'45 à 6'30/km
    for (const h of [3, 4, 6.5, 8, 10, 12, 14]) {
      const b = marathonPaceBand(thr, h);
      if (!b) { hors.push(`seuil ${thr} : aucune bande`); continue; }
      const r = riegelSecWith(riegelExponent(h), thr, RUN_KM.marathon) / RUN_KM.marathon / thr;
      // Réponse au STOP de Phase 1 (§1) — le PLANCHER 1,05 découple volontairement la
      // prescription de la prédiction à haut volume : une bande posée AU plancher avec une
      // prédiction plus rapide que lui est l'état voulu, pas une incohérence.
      const auPlancher = Math.abs(b.lo - RN_MARA_RATIO_PLANCHER) < 1e-9 && r < b.lo;
      if (!auPlancher && (r < b.lo - 1e-9 || r > b.hi + 1e-9)) hors.push(`${thr}s/km @${h}h : ${r.toFixed(4)} hors [${b.lo.toFixed(4)}, ${b.hi.toFixed(4)}]`);
    }
  }
  return { ok: !hors.length, detail: `${hors.length} combinaison(s) hors bande — ` + hors.slice(0, 6).join(" · ") };
});

// ---- T-16b · et la bande N'EST PLUS une constante ------------------------
// Sans ce second volet, T-16 serait satisfait par une bande RECENTRÉE une fois pour toutes :
// il compare la prédiction à elle-même. Ce qui doit être gardé, c'est que la bande SUIVE les
// deux variables dont elle dépend — le volume de course et l'allure seuil de l'athlète.
T("T-16b", "vert", "la bande d'allure marathon suit le volume ET l'allure seuil", () => {
  const b3 = marathonPaceBand(255, 3), b12 = marathonPaceBand(255, 12);
  const lent = marathonPaceBand(390, 8), rapide = marathonPaceBand(225, 8);
  const ecarts = [];
  if (!(b3.lo > b12.lo + 1e-6)) ecarts.push("le volume ne déplace pas la bande");
  if (!(lent.lo > rapide.lo + 1e-6)) ecarts.push("l'allure seuil ne déplace pas la bande");
  // La LARGEUR relative, elle, ne bouge pas : on a déplacé le centre, pas redéfini la zone.
  const larg = (b) => (b.hi - b.lo) / ((b.hi + b.lo) / 2);
  // La largeur relative ne se compare qu'entre bandes NON écrêtées : le plancher 1,05 la
  // réduit légitimement à haut volume (réponse au STOP de Phase 1, §1) — et il est gardé.
  if (b12.lo > RN_MARA_RATIO_PLANCHER + 1e-9 && Math.abs(larg(b3) - larg(b12)) > 1e-6) ecarts.push("la largeur relative de la zone a changé");
  if (marathonPaceBand(255, 14).lo < RN_MARA_RATIO_PLANCHER - 1e-9) ecarts.push("le plancher élite 1,05 ne tient pas à 14 h/sem");
  return { ok: !ecarts.length, detail: ecarts.join(" · ") };
});

// ---- T-16c · la promesse « allure du jour J » tient PAR (sport × format) --
// B-25 (le doc du fondateur) — T-16 itérait sur des DISTANCES, pas sur des couples
// (sport, format) : appliqué au seul module course, il ne pouvait pas voir que le TRI
// prescrit `rn.mara` sous le nom « l'allure de course du jour J » avec une bande STATIQUE,
// aveugle au format. Mesuré de bout en bout : le plan est CONSTRUIT, la bande est lue dans
// le `det` de la séance émise, la prédiction du leg vient de `predict()` du même profil —
// jamais une comparaison de la fonction à elle-même (le piège que T-16b nomme).
// Critère : la bande prescrite RECOUVRE la bande prédite (les deux portent leur largeur).
const _B25_BASE = { intent: "competition", med_pain: "non", med_dizzy: "non", med_treat: "non",
  sex: "H", age: "35", sessions_max: "6", dispo: "quotidienne", doubles: "non", level: "avance",
  history: "confirme", injury: "aucune", css_known: "oui", css: "1:40", ftp_known: "oui",
  ftp: "250", pace_known: "oui", pace: "4:15", weight: "75", vol_max: "12", vol_recent: "10" };
const _p2s = (t) => { const m = String(t).match(/(\d+)[:'](\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };
const _hm2s = (t) => { const m = String(t).match(/(\d+)h(\d+)|(\d+)'(\d{2})/); return m ? (m[1] ? +m[1] * 3600 + +m[2] * 60 : +m[3] * 60 + +m[4]) : null; };
T("T-16c", "vert", "tri : la bande « allure du jour J » émise recouvre le leg prédit, aux 4 formats", () => {
  const KM = { S: 5, M: 10, "70.3": 21.0975, Full: 42.195 };
  const hors = [];
  for (const fmt of ["S", "M", "70.3", "Full"]) {
    let plan, pr;
    try {
      plan = globalThis.EBV2.buildPlan("tri", { ..._B25_BASE, format: fmt });
      pr = globalThis.EBV2.predict("tri", { ..._B25_BASE, format: fmt }, plan);
    } catch (e) { hors.push(`${fmt} : ${String(e?.message).slice(0, 40)}`); continue; }
    // la bande PRESCRITE, lue dans le det des séances rn.mara du plan émis
    let bande = null;
    for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const sx of d.sessions ?? [])
      for (const st of sx.steps ?? []) if (st.zone === "rn.mara") {
        const m = String(sx.det ?? "").match(/(\d[:']\d{2})-(\d[:']\d{2})\/km/);
        if (m) bande = [_p2s(m[1]), _p2s(m[2])];
      }
    // le leg PRÉDIT du même profil
    const leg = (pr?.items ?? []).find((i) => /CAP|Course/i.test(String(i.leg)));
    const t = String(leg?.value ?? "").split("–").map(_hm2s);
    if (!bande || t.length !== 2 || t.some((x) => x == null)) { hors.push(`${fmt} : bande ou leg illisible`); continue; }
    const pred = [t[0] / KM[fmt], t[1] / KM[fmt]];
    const recouvre = bande[0] <= pred[1] && pred[0] <= bande[1];
    if (!recouvre) hors.push(`${fmt} : prescrit ${bande.map((x) => Math.round(x)).join("-")} s/km, prédit ${pred.map((x) => Math.round(x)).join("-")} s/km — disjoints`);
  }
  return { ok: !hors.length, detail: hors.length + " format(s) où la promesse du libellé est fausse — " + hors.join(" · ") };
});

// ---- T-17 · toute décomposition affichée porte une fourchette -------------
// Et la somme des sous-segments égale le total sur CHAQUE borne : une décomposition dont les
// parties ne se recomposent pas ressemble à un bug même quand chaque nombre est juste.
const SEC = (t) => {
  let m;
  if ((m = String(t).match(/^(\d+)h(\d+)$/))) return +m[1] * 3600 + +m[2] * 60;
  if ((m = String(t).match(/^(\d+)'(\d+)$/))) return +m[1] * 60 + +m[2];
  if ((m = String(t).match(/^(\d+)min$/))) return +m[1] * 60;
  return null;
};
const EST_CHRONO = (v) => String(v).split("–").every((x) => SEC(x.trim()) != null);
T("T-17", "rouge", "tout sous-segment chronométré porte une fourchette", () => {
  let vus = 0; const sans = [];
  for (const { id, sport, a, plan } of plans) {
    let pr; try { pr = globalThis.EBV2.predict(sport, a, plan); } catch { continue; }
    for (const it of pr?.items ?? []) {
      const v = String(it.value ?? "");
      if (!EST_CHRONO(v)) continue;          // ni cible d'allure, ni watts : P6 les exclut
      vus++;
      if (!v.includes("–")) sans.push(`${id} « ${it.leg} » = ${v}`);
    }
  }
  return { ok: vus > 0 && !sans.length, detail: `${sans.length}/${vus} chronos sans fourchette — ` + sans.slice(0, 8).join(" · ") };
});

// ---- T-18 · un FAIT PHYSIQUE estimé porte une bande -----------------------
// P6 interdit de projeter le PACING (« vitesse cible »). Il ne dit rien d'une estimation de
// fait — la part de marche d'un ultra, l'effet de longe d'un binôme swimrun. Ces deux-là sont
// la source dominante d'incertitude de leur segment et sont affichés au chiffre près.
const FAIT_PHYSIQUE = /part de marche|effet de (?:binôme|longe)|passages|segments/i;
const CIBLE_PACING = /vitesse cible|allure cible|puissance/i;
T("T-18", "rouge", "toute estimation d'un fait physique porte une bande (le pacing en est exclu, P6)", () => {
  let vus = 0; const sans = [];
  for (const { id, sport, a, plan } of plans) {
    let pr; try { pr = globalThis.EBV2.predict(sport, a, plan); } catch { continue; }
    for (const it of pr?.items ?? []) {
      const leg = String(it.leg ?? ""), v = String(it.value ?? "");
      if (CIBLE_PACING.test(leg) || !FAIT_PHYSIQUE.test(leg + " " + v)) continue;
      vus++;
      if (!/[–±]/.test(v)) sans.push(`${id} « ${leg} » = ${v}`);
    }
  }
  return { ok: vus > 0 && !sans.length, detail: `${sans.length}/${vus} estimations de fait sans bande — ` + sans.slice(0, 8).join(" · ") };
});

// ---- T-19 · le message de volume nomme ce qui mord, et cite le bon chiffre -
// DEUX MOITIÉS, et V-11 les a mesurées séparément parce qu'elles ne sont pas dans le même état.
//   (a) la contrainte NOMMÉE est l'argmin des plafonds — mesuré VERT (0 désaccord sur 247
//       messages du golden qui nomment un plafond). C'est un garde-fou de non-régression.
//   (b) le NOMBRE CITÉ est la valeur MODULÉE et non la valeur de table — mesuré ROUGE,
//       161/247 (65,2 %) sur le golden. Pire cas : la phrase annonce « 4 h/sem » quand le
//       plafond modulé vaut 1,44 h et que le plan livre 0,7 h. C'est la faute d'unité que
//       R20.7 a corrigée sur le RETRAIT et jamais sur la PHRASE.
const _moteur = new TrainingReasoningEngine();
const _hSem = (s) => { const m = String(s).match(/([\d,]+) h\/sem/); return m ? parseFloat(m[1].replace(",", ".")) : null; };
/**
 * MA PREMIÈRE ÉCRITURE DE T-19 A EXAMINÉ ZÉRO PROFIL ET S'EST AFFICHÉE ROUGE.
 * Elle tournait sur `profils30` — or les 20 décisions R20.2 qu'ils portent nomment TOUTES
 * « le nombre de séances », qui n'est pas un plafond : les deux compteurs restaient à 0 et le
 * `ok` tombait par la garde de non-vacuité, pas par un défaut. Un rouge obtenu ainsi est pire
 * qu'un vert vacueux — il a l'air d'avoir trouvé quelque chose. C'est la faute de T-12,
 * refaite dans le même lot. Le test lit donc la population que l'addendum lui assigne, le
 * golden, et un examen vide est déclaré CASSÉ et non rouge.
 */
const CAPS_R202 = (L) => [["ton volume demandé", L.declared * L.swimTime], ["ton historique", L.caps], ["le volume utile du format", L.util]];
T("T-19", "vert", "le message de volume nomme l'argmin des plafonds ET cite la valeur modulée", () => {
  let nomme = 0, desaccord = 0, cite = 0, brut = 0, vus = 0; const ex = [];
  for (const { key, sport, a } of goldenProfiles()) {
    let plan, r;
    try { plan = globalThis.EBV2.buildPlan(sport, a); r = _moteur.analyze(toProfile(sport, a)); } catch { continue; }
    const dec = (plan?._v2?.decisions ?? []).find((d) => d.id === "R20.2");
    if (!dec) continue;
    vus++;
    const L = r.volLimits;
    const quoi = String(dec.val).replace(/^.*ce qui borne, c'est /, "").replace(/ \(−.*$/, "");
    const trois = CAPS_R202(L);
    // (a) — n'a de sens que si le moteur nomme un PLAFOND. Nommer un facteur multiplicatif,
    //       la rampe ou la structure de la semaine met la notion d'argmin hors sujet, et
    //       compter ces cas comme des accords gonflerait le test d'un vert gratuit.
    //       Depuis le correctif §2, la règle publiée porte la GARDE D'OBSERVATION (O-35) :
    //       un plafond que le pic livré dépasse n'a pas borné le plan et sort des candidats —
    //       le test applique la même clause, sur les mêmes valeurs, sans copier l'ordre.
    if (trois.some(([q]) => q === quoi)) {
      nomme++;
      const queueA = L.marg * L.recup * L.med * (r.loadFactor < 1 ? r.loadFactor : 1); // O-35
      const picA = parseFloat(String(dec.val).match(/pic à ([\d,.]+)/)?.[1]?.replace(",", ".") ?? "NaN");
      const candA = trois.filter(([, x]) => !Number.isFinite(picA) || x * queueA >= picA - 0.1);
      const baseA = candA.length ? candA : trois;
      if (!baseA.filter(([q]) => q === quoi).some(([, x]) => x <= Math.min(...baseA.map(([, y]) => y)) + 0.001)) desaccord++;
    }
    // (b) — le chiffre écrit dans la phrase contre la valeur modulée du plafond nommé.
    const table = quoi === "ton historique" ? L.caps : quoi === "le volume utile du format" ? L.util : null;
    const dit = _hSem(dec.why);
    if (table == null || dit == null) continue;
    cite++;
    // O-35 — `swimTime` n'est plus un facteur de la chaîne : c'est la conversion d'unité de la
    // SEULE grandeur déclarée en temps de piscine (`declared`). Les tables (caps/util) sont du
    // volume d'entraînement et ne la subissent pas.
    const queue = L.marg * L.recup * L.med * (r.loadFactor < 1 ? r.loadFactor : 1);
    if (Math.abs(dit - table * queue) > 0.05) {
      brut++;
      if (ex.length < 4) ex.push(`${key} dit ${dit} h, modulé ${(table * queue).toFixed(2)} h, ${String(dec.val).replace(/ —.*/, "")}`);
    }
  }
  if (!nomme || !cite) return { ok: false, detail: `banc cassé : examiné ${vus} message(s), dont ${nomme} nommant un plafond et ${cite} citant un chiffre — un test qui ne regarde rien ne peut être ni vert ni rouge` };
  return {
    ok: !desaccord && !brut,
    detail: `(a) argmin : ${desaccord}/${nomme} désaccord · (b) valeur de TABLE au lieu de MODULÉE : **${brut}/${cite}** (${(brut / cite * 100).toFixed(1)} %)` + (ex.length ? " — " + ex.join(" · ") : ""),
  };
});

// ---- T-20 · toute intensité de step RÉSOUT — jamais un défaut silencieux --
// Famille « comptabilité d'intensité » (ARBITRAGE_ANCRAGE_B21 §4). Réponse MESURÉE à la
// question du fondateur (« que fait le classificateur d'un [object Object] ? ») : la
// classification passe par `st.zone`, jamais par `intensity` — et le « [object Object] »
// N'EXISTE PAS DANS L'APP : c'était MA SONDE qui template-littéralisait le champ. Le contrat
// réel, relevé sur 2 589 steps : `intensity` est un OBJET bande {ref,lo,hi} posé par
// `intOf()` (typé `as unknown as string` — le TYPE ment, pas la valeur), ou la string "easy"
// posée au déclassement C26c, ou absent. Son unique consommateur est l'export JSON, où un
// objet se sérialise proprement. Ma première écriture de T-20 assertait « string » — 265
// rouges qui étaient 265 fautes de MON contrat, pas du moteur (règle 11 : la contre-preuve
// a mordu l'instrument). Ce que T-20 garde vraiment : (a) toute zone posée résout dans ZDEF
// — sans quoi zoneClass tombe en « easy » SILENCIEUX, le vrai danger ; (b) toute intensité
// présente est une bande finie ou "easy" — jamais du bruit ; (c) la frontière seuil que la
// classification par bande utilise (loadModel) reste ÉGALE à celle que ZDEF déclare — le
// garde anti-dérive des deux écritures.
T("T-20", "vert", "tout step : zone résoluble dans ZDEF, intensité = bande finie ou « easy »", () => {
  const problemes = [];
  let steps = 0;
  const plansPlus = [...plans];
  try {
    const dua = globalThis.EBV2.buildPlan("duathlon", { intent: "competition", format: "PM",
      med_pain: "non", med_dizzy: "non", med_treat: "non", sex: "H", age: "35", sessions_max: "6",
      vol_max: "12", vol_recent: "10", dispo: "quotidienne", doubles: "non", level: "avance",
      history: "confirme", injury: "aucune", ftp_known: "oui", ftp: "220", pace_known: "oui", pace: "4:30", weight: "72" });
    plansPlus.push({ id: "duathlon-PM-T20", plan: dua });
  } catch {}
  for (const { id, plan } of plansPlus)
    for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? [])
      for (const st of s.steps ?? []) {
        if (st.role !== "body") continue;
        steps++;
        if (st.zone != null && !ZDEF[st.zone]) problemes.push(`${id} « ${s.name} » : zone inconnue ${st.zone}`);
        const it = st.intensity;
        // Le contrat RELEVÉ (2 589 steps) a trois formes, pas deux — T-20 a trouvé la
        // troisième en naissant : le swimrun pose la string "aero" (littéral du module).
        // Une string non vide se sérialise et s'affiche ; le danger que T-20 garde est le
        // BRUIT — bande non finie, objet vide, zone inconnue — jamais un mot lisible.
        const bandeOk = it && typeof it === "object" && Number.isFinite(it.lo) && Number.isFinite(it.hi);
        const stringOk = typeof it === "string" && it.length > 0 && it.length < 60;
        if (it != null && !bandeOk && !stringOk) problemes.push(`${id} « ${s.name} » : intensité irrésoluble (${JSON.stringify(it).slice(0, 40)})`);
      }
  const uniques = [...new Set(problemes)];
  if (Math.abs(RN_THR_FRONTIERE_LENTE - ZDEF["rn.thr"].hi) > 1e-9)
    uniques.push(`la frontière seuil de loadModel (${RN_THR_FRONTIERE_LENTE}) a dérivé de ZDEF rn.thr.hi (${ZDEF["rn.thr"].hi})`);
  return { ok: steps > 0 && !uniques.length, detail: `${uniques.length} défaut(s) sur ${steps} steps — ` + uniques.slice(0, 5).join(" · ") };
});

// ---- T-23 / T-25 / T-26 · R20.2 : plafonds parallèles, facteurs séquentiels ----
// DOC_UNIQUE §1-§3 (14/08/2026). Le défaut est double : le sélecteur prend LA PLUS GROSSE
// BAISSE quand le texte promet « ce qui borne » (la contrainte FINALE, l'argmin des plafonds) ;
// et l'attribution des plafonds dépend de l'ORDRE des appels `etape()` — permuter caps/util
// change le coupable sur le même plan (§1.3). Cause racine : des plafonds PARALLÈLES (un
// min()) traités comme une chaîne séquentielle. Les facteurs, eux, composent réellement et
// restent un produit. Le correctif attendu émet un RECORD (`plan._r202`) qui expose
// l'énumération complète — plafonds avec leur valeur livrée, facteurs avec leur coefficient —
// pour que ces trois tests la vérifient DE DEHORS, sans copie de la règle.
const _goldenCache = { fait: false, rows: [] };
function goldenAvecMoteur() {
  if (_goldenCache.fait) return _goldenCache.rows;
  for (const { key, sport, a } of goldenProfiles()) {
    try {
      const plan = globalThis.EBV2.buildPlan(sport, a);
      const r = _moteur.analyze(toProfile(sport, a));
      _goldenCache.rows.push({ key, plan, L: r.volLimits, lf: r.loadFactor });
    } catch { /* refus typés : hors population, comme au golden */ }
  }
  _goldenCache.fait = true;
  return _goldenCache.rows;
}

// T-25 — l'identité du fondateur : min(plafonds) × ∏(facteurs) === volPeak à ±0,1 h.
// « Si l'identité ne tient pas, un maillon manque à l'énumération » — c'est ce qui aurait
// attrapé O-13 sans attendre qu'un profil de natation le révèle. Vérifiable sur les 949.
//
// JOURNAL DE FERMETURE (14/08/2026) — le test a mordu quatre fois en naissant :
//   945 sans record → 659 (record émis) → 643 (la COURBE déclarée entre au min() : run/5k,
//   Lw = 0,67 au pic, la chaîne nommait « ton historique » 4 h pour un pic à 2,6 h)
//   → 457 (la cible de boucle MESURÉE avec sa cause : la croissance D3/D4 sur le livré)
//   → 439. Le résidu a DEUX causes mesurées, chacune avec son ticket :
//   (1) O-35 — la chaîne natation est incohérente en UNITÉ dans les deux sens (débutant
//       livré ≪ min : pire 1,80 h de « min » pour un pic à 0,7 ; inter livré ≫ min : 3,7 h
//       livrées au-dessus d'un « plafond » à 2,16) + trail (charge 3 axes). Une conversion
//       × swimTime a été essayée puis RETIRÉE : ajustée sur UN cas, elle inversait l'identité
//       sur 148 profils.
//   (2) le RENDU DISCRET — 158 cas à 0,1-0,2 h d'écart : la question des « 18 minutes » du
//       DOC_UNIQUE §0, mesurée à l'échelle. La sonde sature un clone continu, le plan rend
//       des séances discrètes (planchers, quantification, passes post-boucle).
// Reste ROUGE tant que ces deux tickets ne sont pas fermés — un vert obtenu en élargissant
// la tolérance serait le test qui s'ajuste au défaut.
T("T-25", "rouge", "record R20.2 : min(plafonds livrés) === volPeak à ±0,1 h, sur tout le golden", () => {
  let vus = 0, sansRecord = 0, casses = 0, conversions = 0; const ex = [];
  for (const { key, plan } of goldenAvecMoteur()) {
    vus++;
    const rec = plan?._r202;
    if (!rec) { sansRecord++; continue; }
    const actifs = (rec.plafonds ?? []).filter((p) => Number.isFinite(p.livre));
    if (!actifs.length) { casses++; if (ex.length < 5) ex.push(`${key} : record sans plafond actif`); continue; }
    const minLivre = Math.min(...actifs.map((p) => p.livre));
    const volPeak = Number(rec.volPeak ?? plan.volPeak);
    if (Math.abs(minLivre - volPeak) > 0.1) { casses++; if (ex.length < 5) ex.push(`${key} min=${minLivre.toFixed(2)} h ≠ pic=${volPeak} h`); }
    // l'identité AU SENS STRICT : pour tout plafond déclaré en unité athlète, livré = brut ×
    // ∏(facteurs) — le record ne peut pas mentir sur la conversion (la faute d'unité de V-11).
    // O-35 : `declared` porte EN PLUS la conversion piscine → eau (elle ne s'applique qu'à la
    // grandeur que l'athlète déclare, jamais aux tables) — le test l'admet pour ce seul id.
    const Q = (rec.facteurs ?? []).reduce((q, f) => q * (Number(f.f) || 1), 1);
    for (const p of actifs) {
      if (p.unite !== "athlete") continue;
      // le facteur de conversion vient de la CONSTANTE du moteur, jamais d'un littéral recopié
      // ici (ce serait la deuxième écriture que R11.1 interdit, dans le test qui la garde)
      const attendu = p.id === "declared"
        ? [p.brut * Q, ...["reprise", "confirme", "ancien"].map((h) => p.brut * Q * swimTimeFactorOf(h))] // B-09 : le facteur dépend de l'historique
        : [p.brut * Q];
      if (attendu.every((x) => Math.abs(p.livre - x) > 0.01)) {
        conversions++; if (ex.length < 5) ex.push(`${key} ${p.id} : livré ${p.livre} ≠ brut ${p.brut} × Q ${Q.toFixed(3)}`); break;
      }
    }
  }
  if (!vus) return { ok: false, detail: "banc cassé : aucun profil examiné" };
  return { ok: !sansRecord && !casses && !conversions,
    detail: `${sansRecord}/${vus} sans record · ${casses} identité(s) cassée(s) · ${conversions} conversion(s) incohérente(s)` + (ex.length ? " — " + ex.join(" · ") : "") };
});

// T-26 — la non-régression du §1.3 : l'attribution est invariante par permutation. Le test ne
// simule PAS la chaîne (ce serait une copie de la règle) : il recalcule l'argmin depuis les
// VALEURS du record — une opération sans ordre — et exige que le plafond NOMMÉ soit un
// minimiseur ; et qu'aucun plafond non-argmin ne porte de retrait (l'artefact d'ordre).
// FERMÉ LE JOUR DE SA NAISSANCE par le correctif §2 (plafonds en min() parallèle, argmin
// nommé, retrait nul sur les non-argmin) — vérifié rouge d'abord : 583/583 sans record.
T("T-26", "vert", "l'attribution des plafonds est invariante par permutation : le nommé EST l'argmin du record", () => {
  let vus = 0, sansRecord = 0, desaccords = 0, fantomes = 0; const ex = [];
  for (const { key, plan } of goldenAvecMoteur()) {
    const dec = (plan?._v2?.decisions ?? []).find((d) => d.id === "R20.2");
    if (!dec) continue;
    vus++;
    const rec = plan?._r202;
    if (!rec) { sansRecord++; continue; }
    const quoi = String(dec.val).replace(/^.*ce qui borne, c'est /, "").replace(/ \(−.*$/, "");
    const plafs = (rec.plafonds ?? []).filter((p) => Number.isFinite(p.livre));
    if (!plafs.length) { desaccords++; continue; }
    // même règle publiée que le moteur, recalculée sans ordre : l'argmin se prend parmi les
    // plafonds que l'observation ne réfute pas (livré ≥ pic − 0,1 : un plafond que le plan
    // dépasse n'a pas borné le plan — O-35), repli sur tous si aucun.
    const cand = plafs.filter((p) => p.livre >= Number(rec.volPeak) - 0.1);
    const base = cand.length ? cand : plafs;
    const minVal = Math.min(...base.map((p) => p.livre));
    // deux maillons peuvent partager le même nom d'athlète (courbe déclarée / croissance sur
    // le livré) : le nommé est conforme si AU MOINS UN plafond portant ce nom est minimiseur.
    const nommes = base.filter((p) => p.quoi === quoi);
    // un facteur nommé (drapeau médical…) n'est pas une revendication de plafond : hors sujet ici
    if (nommes.length && !nommes.some((p) => p.livre <= minVal + 0.001)) { desaccords++; if (ex.length < 4) ex.push(`${key} nomme « ${quoi} » (${Math.min(...nommes.map((p) => p.livre)).toFixed(1)} h), min = ${minVal.toFixed(1)} h`); }
    for (const p of plafs) if (p.livre > minVal + 0.001 && (Number(p.retire) || 0) > 0.001) fantomes++;
  }
  if (!vus) return { ok: false, detail: "banc cassé : aucune décision R20.2 examinée" };
  return { ok: !sansRecord && !desaccords && !fantomes,
    detail: `${sansRecord}/${vus} sans record · ${desaccords} nommé ≠ argmin · ${fantomes} plafond(s) non-argmin portant un retrait (l'artefact d'ordre du §1.3)` };
});

// T-23 — la cohérence d'ÉCRAN : quand la sonde V2.1 (« les plafonds de séance ne permettent
// pas plus ») et R20.2 sont affichées ensemble, R20.2 ne peut pas nommer un plafond que le pic
// n'approche même pas — c'est le profil de la capture : « ce qui borne, c'est ton historique »
// (13 h) trois centimètres sous une sonde qui vient de calibrer 7,8 h.
//
// LES COMPTES AVANT/APRÈS NE SONT PAS COMPARABLES, et c'est écrit : avant le correctif,
// l'instrument ne savait évaluer que les plafonds declared/caps/util (via volLimits) — 22/218.
// Avec le record, il évalue TOUTE contrainte nommée (courbe comprise) — 37/218, sur un
// périmètre plus large. Le résidu partage les causes de T-25 : O-35 (natation — aucun plafond
// énuméré n'approche le pic parce que la sonde y mesure 2 h pour des semaines qui livrent
// 0,5-0,7) et le rendu discret (tri : courbe 5,2 h nommée pour un pic livré à 4,5).
T("T-23", "rouge", "V2.1 et R20.2 affichées ensemble ne nomment pas deux contraintes mordantes différentes", () => {
  let paires = 0, incoherents = 0; const ex = [];
  for (const { key, plan, L, lf } of goldenAvecMoteur()) {
    const decs = plan?._v2?.decisions ?? [];
    const r202 = decs.find((d) => d.id === "R20.2");
    if (!r202 || !decs.some((d) => d.id === "V2.1")) continue;
    paires++;
    const quoi = String(r202.val).replace(/^.*ce qui borne, c'est /, "").replace(/ \(−.*$/, "");
    const pic = parseFloat(String(r202.val).match(/pic à ([\d,.]+)/)?.[1]?.replace(",", ".") ?? "NaN");
    // la valeur du plafond nommé, dans l'unité du pic : depuis le record s'il existe, sinon
    // depuis volLimits × queue (la conversion que T-19(b) a validée).
    const rec = plan?._r202;
    let livre = null;
    if (rec) livre = (rec.plafonds ?? []).find((p) => p.quoi === quoi)?.livre ?? null;
    else {
      const queue = L.marg * L.recup * L.med * (lf < 1 ? lf : 1); // O-35 : swimTime hors chaîne
      livre = quoi === "ton historique" ? L.caps * queue : quoi === "le volume utile du format" ? L.util * queue : quoi === "ton volume demandé" ? L.declared * queue : null;
    }
    if (livre == null || !Number.isFinite(pic)) continue; // nommé = facteur ou structure : pas un plafond chiffrable ici
    if (livre > pic + 0.5) { incoherents++; if (ex.length < 4) ex.push(`${key} nomme « ${quoi} » à ${livre.toFixed(1)} h pour un pic à ${pic} h`); }
  }
  if (!paires) return { ok: false, detail: "banc cassé : aucune paire V2.1 + R20.2 examinée" };
  return { ok: !incoherents,
    detail: `${incoherents}/${paires} écran(s) où R20.2 nomme un plafond que le pic n'approche pas pendant que V2.1 nomme les plafonds de séance` + (ex.length ? " — " + ex.join(" · ") : "") };
});

// ---- T-21 · aucun littéral numérique dans les gabarits de message ----------
// ARBITRAGES_STOP_PHASE2 §6 : « le défaut n'est pas dans les ~30 messages, il est dans le
// MÉCANISME — un template qui ré-écrit une valeur peut toujours diverger de celle qui a été
// utilisée ». Un message interpolé depuis le record NE PEUT PAS contredire le calcul (le
// patron B-24/V-11, appliqué au volume par R20.2). Ce test compte les chaînes de message des
// deux fichiers émetteurs qui portent un nombre-avec-unité ÉCRIT EN DUR (« +10 % par
// semaine », « ≈ 25min », « 40-60 % ») : chacun peut mentir dès que la constante bouge.
// R20.2 n'est PAS à refondre à ce titre (DOC_UNIQUE §0 : son record est correct) — le rouge
// mesure le reste de la classe.
T("T-21", "rouge", "aucun gabarit de message ne porte de littéral numérique — tout nombre vient d'un record", () => {
  const UNITES = /\d+(?:[.,]\d+)?\s*(?:%|h\b|min\b|sem|semaines?|kcal|W\b|°C|km\b|j\b)/;
  const trouve = [];
  for (const f of ["generator/planGenerator.ts", "engine/reasoningEngine.ts"]) {
    const lignes = src(f).split("\n");
    lignes.forEach((l, i) => {
      const sansComment = l.replace(/^\s*(\/\/|\*|\/\*).*$/, "");
      for (const m of sansComment.matchAll(/"([^"]{6,})"/g))
        if (UNITES.test(m[1]) && !/^[A-Z]?\d|^R\d|^C\d|^T\d/.test(m[1])) trouve.push(`${f}:${i + 1} « ${m[1].slice(0, 50)} »`);
    });
  }
  return { ok: trouve.length === 0, detail: `${trouve.length} littéral(aux) à unité dans des chaînes émises — ` + trouve.slice(0, 4).join(" · ") };
});

// ---- T-22 · un step qui promet une allure porte une zone -------------------
// ARBITRAGES_STOP_PHASE2 §7 : « Tout step dont le det ou la prose nomme une allure porte une
// zone. L'absence de zone n'est acceptable que là où la classe de repli est démontrée
// correcte (récupération). » L'exception est OBLIGATOIRE (sans elle : 11 034 faux rouges,
// les « Récup active » dont le repli easy est la bonne classe par conception). L'offenseur
// mesuré : le R2 du brick duathlon — det « 51min CAP @ allure cible », step {d:"rn"} SANS
// zone, compté « mod » par repli (416 séances, périmètre B-26).
T("T-22", "rouge", "toute séance qui nomme une allure a tous ses steps de corps zonés (exception récup)", () => {
  const plansPlus = [...plans];
  try {
    const dua = globalThis.EBV2.buildPlan("duathlon", { intent: "competition", format: "PM",
      med_pain: "non", med_dizzy: "non", med_treat: "non", sex: "H", age: "35", sessions_max: "6",
      vol_max: "12", vol_recent: "10", dispo: "quotidienne", doubles: "non", level: "avance",
      history: "confirme", injury: "aucune", ftp_known: "oui", ftp: "220", pace_known: "oui", pace: "4:30", weight: "72" });
    plansPlus.push({ id: "duathlon-PM-T22", plan: dua });
  } catch {}
  const nus = new Map();
  let examinees = 0;
  for (const { id, plan } of plansPlus)
    for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? []) {
      const prose = String(s.det ?? "") + " " + String(s.note ?? "") + " " + String(s.name ?? "");
      if (!/allure/i.test(prose)) continue;
      if (/récup|souple/i.test(prose)) continue; // l'exception démontrée correcte (repli easy)
      examinees++;
      for (const st of s.steps ?? [])
        if (st.role === "body" && st.zone == null) nus.set(`${id} « ${s.name} » step ${st.d ?? "?"} sans zone`, true);
    }
  const l = [...nus.keys()];
  return { ok: examinees > 0 && l.length === 0, detail: `${l.length} step(s) de corps sans zone dans une séance qui nomme une allure (${examinees} séances examinées) — ` + l.slice(0, 4).join(" · ") };
});

/**
 * T-27 — LE SCEAU EXISTE, IL EST LE DERNIER, ET SES COMPTES SONT UN CLIQUET.
 *
 * Deux moitiés, parce que le sceau peut échouer de deux façons opposées :
 *   · ses invariants de rang DUR sont à zéro sur le golden — ils lèvent en CI, donc la
 *     treizième occurrence de « une garantie vérifiée au milieu ne vérifie que l'avant-dernier
 *     état » est attrapée à la sortie au lieu d'être trouvée deux lots plus tard ;
 *   · ses invariants DÉCLARÉS ne dépassent pas le compte épinglé. Rendre bloquant un invariant
 *     dont on n'a pas trié les échecs FIGE la dette au lieu de la traiter (R20.6) — on épingle
 *     donc le chiffre mesuré, et c'est sa HAUSSE qui échoue. Une BAISSE échoue aussi : elle
 *     veut dire qu'un ticket s'est fermé et que le chiffre doit descendre dans le même commit.
 *
 * Le sceau est posé par `generateAudited` : le vérifier ici, c'est le vérifier sur le plan que
 * l'athlète reçoit, pas sur un plan reconstruit pour le test.
 */
// Mesuré sur le golden — `npm run mesure:sceau`. S4 : 441 → **439** avec la garde de phase du
// §2 (la restitution ne s'applique plus en affûtage) — deux violations d'I14 en moins, obtenues
// sans les viser. Le cliquet a exigé que le chiffre descende DANS LE MÊME COMMIT : c'est ce
// qu'il est fait pour faire, et c'est une baisse, pas une régression.
// O-42 (15/08/2026) — la conversion unique déplace les deux compteurs, dans les DEUX sens, et
// le cliquet a exigé les deux chiffres dans le même commit.
//   S4 (I14, « la longue est la plus longue de sa discipline dans sa semaine ») : 439 → **353**,
//     86 violations en moins. Un bloc de nage prescrit en mètres coûte désormais les minutes de
//     sa zone : les séances de qualité cessent de paraître plus courtes qu'elles ne sont, donc
//     cessent de dépasser la longue sans que rien ne le voie. Baisse obtenue sans la viser.
//   S5 (T-25, « min(plafonds) du record R20.2 vaut le pic livré ») : 509 → **513**, quatre de
//     plus. C'est une HAUSSE et elle est publiée comme telle : la chaîne de plafonds est en
//     heures et le pic livré bouge de quelques minutes, donc quatre profils traversent la
//     tolérance de 0,1 h. Elle appartient à la famille encore ouverte (O-35/O-36 : ce que le
//     point fixe RETIRE n'est déclaré par aucun maillon) et ne se ferme pas ici.
// RE-ÉPINGLÉ APRÈS D3 (16/08/2026), et la dérive est VÉRIFIÉE avant d'être photographiée.
// Le lot précédent l'avait laissé dériver exprès : le cliquet bougeait parce que le gate B-17
// rabattait 117 profils tri sur 148 sur une réponse que le produit ne collectait pas, et
// re-épingler aurait enregistré ce défaut comme la référence. D3 le corrige, et les nouvelles
// valeurs sont mesurées, pas subies :
//   · S1 4 → 5 — MÊMES trois profils qu'à `cf392af` (`tri/Full/injury-multi`, `tri/Full/vol-min`,
//     `duathlon/PM/vol-min`), une violation de plus sur l'un d'eux : ces plans tri sont désormais
//     de VRAIS Full (ils étaient rabattus au sprint et audités contre des bornes de Full) ;
//   · S4 353 → 351 et S5 513 → 500, dont **+9 apportés par la sous-passe `B17`** qui n'existait
//     pas — le corpus passe de 949 à 969 profils.
// RE-ÉPINGLÉ APRÈS LE LOT 1 (17/08/2026) — LA HAUSSE EST ARBITRÉE, PAS SUBIE.
// Le plafond de dose lit désormais les blocs prescrits en MÈTRES. Le cliquet a fait ce qu'il
// existe pour faire : il a refusé la hausse, le lot s'est arrêté, et le fondateur a tranché
// AVANT que le chiffre bouge. Le relever pour faire passer un lot serait l'inverse.
//   · S5 (T-25) 500 → **508**, huit de plus. Cause identifiée, mesurée, et déjà couverte par la
//     note de recapture du golden : la sonde de capacité V2.1 lit un clone SATURÉ de la semaine
//     LIVRÉE, moins de dur livré donne une capacité mesurée plus basse, la COURBE baisse — et la
//     chaîne déclarée s'écarte du pic livré sur huit profils de plus. C'est **O-43 à l'identique
//     et dans l'autre sens qu'O-42**, qui avait fait monter la même courbe pour la raison
//     symétrique. Entrée OUVERTE, cause nommée depuis O-35 ; le lot l'élargit de 8.
//   · S4 (I14) 351 → **352**, un de plus. Famille connue (`mesure:sceau` en montre le type : une
//     VO2max de 45 min contre une longue de 44 sur un 5 km), **cas non isolé** — c'est dit ainsi
//     plutôt qu'habillé d'une cause plausible. Un cliquet qui monte avec une raison honnête vaut
//     mieux qu'un cliquet qui monte avec une raison inventée.
// RE-ÉPINGLÉ APRÈS O-54 §2 (17/08/2026), et le mouvement va DANS LES DEUX SENS.
//   S4 (I14, « la longue est la plus longue de sa discipline ») 352 → **357**, cinq de plus ;
//   S5 (T-25, « min(plafonds) vaut le pic livré ») 508 → **502**, six de moins.
// C15 cesse de plafonner à 850 m un débutant en triathlon qui sait nager : ses séances de nage
// grossissent, donc certaines dépassent sa sortie longue de nage (S4 monte) pendant que la chaîne
// déclarée retrouve le pic livré sur six profils (S5 descend). Aucune violation DURE.
// ⚠ ÉPINGLÉ UNE FOIS À 349/505 SUR UN ÉTAT ABANDONNÉ — la première écriture d'O-54 §2 bornait sur
// `atteignableM` et donnait 4 150 m de séance à qui déclare 400 m. Le cliquet a fait son travail
// deux fois de suite ; c'est la seconde valeur qui vaut, et la première est dite plutôt qu'effacée.
// PUIS S5 502 → **516** (17/08/2026, second mouvement du même jour) : le CORPUS a grandi de 20
// profils (la sous-passe B-17 croise le niveau, 969 → 989), pas le moteur. S4 est INCHANGÉ à 357,
// ce qui est le meilleur signe que la hausse de S5 vient bien du corpus : un élargissement touche
// les deux compteurs ou aucun selon ce qu'il ajoute, une régression moteur les aurait bougés
// ensemble sur les MÊMES profils.
// PUIS S5 516 → **508** (O-56 §1) : le MOTEUR cette fois, prouvé par `npm run base:cliquet`
// (corpus inchangé, 985 → 985 profils). Le plafond de séance de nage suit la position dans le
// plan, les continuités sont livrées, et huit profils de plus voient leur chaîne déclarée
// retrouver leur pic livré. Une BAISSE s'épingle aussi rigoureusement qu'une hausse.
// O-69 (18/08/2026) — LE PLANCHER DU VOLUME RÉCENT NE BOUGE AUCUN COMPTEUR DU SCEAU.
// Vérifié en le livrant : S4 357 et S5 508 avant comme après, corpus inchangé (985 plans).
// Une passe intermédiaire du même lot (retrait « 1bis » dans la boucle de volume) les avait
// déplacés à 352/506 et j'avais RÉ-ÉPINGLÉ en attribuant le mouvement à O-69 — attribution
// FAUSSE, démontrée en retirant la passe (jamais déclenchée sur le cas qu'elle visait, retirée
// comme R16.10 l'a fait d'une règle miroir) : les compteurs sont revenus seuls à 357/508.
// Un cliquet ré-épinglé sur une cause non isolée est un cliquet menti — l'épisode reste écrit.
// PUIS S5 508 → **503** (O-70, 18/08/2026) : le MOTEUR, volontairement — le pic du tri change de
// contenu (VO2max course → spécifique, 0 VO2 en décharge, C3 rejoué au point fixe sur
// l'enveloppe). S4 INCHANGÉ à 357, corpus inchangé (985) : cinq profils de MOINS dont la chaîne
// déclarée diverge du pic livré — une BAISSE, ré-épinglée avec la même rigueur qu'une hausse.
// PUIS S5 503 → **509** (QUI PAIE §2, 18/08/2026) : l'orientation de la politique de
// financement déplace la VICTIME des coupes sur 57 profils du corpus (mesuré au golden :
// le reste du lot rend 0 écart, l'orientation seule rend 57 — l'attribution est
// ensembliste, pas devinée). Le livré bouge, la chaîne déclarée non : six profils de plus
// rejoignent la famille T-25, dont la cause est OUVERTE et nommée depuis O-35 (« ce que le
// point fixe retire n'est déclaré par aucun maillon »). Hausse à raison honnête — le
// contraire d'un relèvement pour faire passer un lot : la politique protège des séances
// que la coupe prenait, et le diagnostic déclaré n'a pas encore appris à le dire.
// (509 était l'épingle de l'état intermédiaire, orientation swimrun comprise — retirée le
// jour même après réfutation par v7 : le périmètre final tri+duathlon rend 505.)
// PUIS S1 5 → **4** (QUI PAIE §3, 18/08/2026) : le MOTEUR, attribution prouvée par RETRAIT DU
// SEUL FACTEUR (leçon de l'épisode « 1bis » ci-dessus) — stash de `repairLoop.ts` seul, la
// sonde rend 5 ; restauré, elle rend 4. La violation payée est un brick de CHARGE
// (`tri/Full/vol-min`, « Brick vélo+CAP » à 118 min pour un plancher audité à 150) : trois
// écrivains de `repairLoop` réduisaient les legs de brick SOUS `bnd.floor ?? 10` alors que le
// plancher C21b des legs vit dans `blockBounds` — la famille exacte de la moitié « brick » de
// la dette D2 du banc v6. Les 4 restantes sont toutes des bricks d'AFFÛTAGE sous leur plancher
// de 40 min (le résidu O-37a d'origine) — une autre passe, pas encore identifiée, à suivre là.
// PUIS S4 357 → **349** et S5 505 → **504** (ordre de cession C26c au pic, 18/08/2026) : le
// MOTEUR, volontairement, et l'attribution est PROUVÉE PAR RETRAIT DU SEUL FACTEUR (mutation de
// `rangCession` neutralisée → les deux compteurs reviennent à 357/505, restaurée → 349/504).
// Les deux BAISSENT : au pic, le VO2 cède avant la nage seuil, donc huit semaines de plus
// voient leur sortie longue redevenir la plus longue de sa discipline (S4 = I14). Une baisse
// s'épingle avec la même rigueur qu'une hausse.
// ⚠ Ce lot a aussi réveillé un défaut LATENT et l'a fermé : le déclassement de C26c écrivait
// `bk.easy`, une zone qui N'EXISTE PAS dans `ZDEF` (le vélo facile est `bk.z2`). Il ne tombait
// jamais sur un bloc vélo avant que l'ordre de cession n'y envoie le VO2 — **64 violations
// DURES** au sceau, sur des profils `bike/crit/debutant`. Corrigé dans le même commit.
const SCEAU_ATTENDU = { S1: 4, S4: 349, S5: 504 };
T("T-27", "vert", "le sceau est posé sur le plan livré : invariants DURS à zéro, déclarés au compte épinglé", () => {
  const compte = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 };
  let scelles = 0, nus = 0, dur = 0;
  const ex = [];
  for (const { key, plan } of goldenAvecMoteur()) {
    if (!plan?._sealed || !plan?._seal) { nus++; if (ex.length < 3) ex.push(`${key} : plan NON SCELLÉ`); continue; }
    scelles++;
    for (const v of plan._seal.verdicts ?? []) {
      compte[v.id] = (compte[v.id] ?? 0) + v.violations.length;
      if (v.rang === "dur" && v.violations.length) {
        dur += v.violations.length;
        if (ex.length < 3) ex.push(`${key} : ${v.id} DUR — ${v.violations[0]}`);
      }
    }
  }
  const derives = Object.entries(SCEAU_ATTENDU)
    .filter(([id, n]) => compte[id] !== n)
    .map(([id, n]) => `${id} ${compte[id]} au lieu de ${n}`);
  const ok = scelles > 0 && nus === 0 && dur === 0 && derives.length === 0;
  return {
    ok,
    detail: `${scelles} plan(s) scellé(s), ${nus} nu(s) · ${dur} violation(s) DURE(s) · `
      + (derives.length ? `cliquet : ${derives.join(" ; ")}` : "déclarés au compte épinglé")
      + (ex.length ? " — " + ex.join(" · ") : ""),
  };
});

/**
 * T-28 — POUR TOUTE BORNE AUDITÉE, LE GÉNÉRATEUR LIT LA MÊME SOURCE QUE L'AUDITEUR.
 *
 * ⚠ MA PREMIÈRE ÉCRITURE DE CE CRITÈRE ÉTAIT FAUSSE DANS SA CONCLUSION, et elle est corrigée
 * ici plutôt que discrètement remplacée. Elle MODÉLISAIT `blockBounds` au lieu de l'observer et
 * annonçait « 12 couples permissifs, tous en AFFÛTAGE ». Mesuré sur les plans livrés (216
 * profils tri + duathlon) : les 135 legs vélo de brick d'affûtage portent TOUS un `bnd` posé
 * par R18.4 depuis `BRICK_TAPER_BIKE_BOUNDS` — ils n'atteignent JAMAIS la branche `s.brick` que
 * je modélisais. La branche réellement empruntée est celle de la CHARGE (1 476 legs).
 *
 * Le défaut réel était donc plus discret, et réel quand même : le plancher lisait
 * `BRICK_BIKE_BOUNDS` (la table de l'auditeur) et le plafond `CAP_BRICK_BIKE`, une SECONDE
 * table portant les mêmes six valeurs. Zéro permissivité vivante, mais deux vérités pour une
 * borne, libres de diverger. `CAP_BRICK_BIKE` est SUPPRIMÉE (unique consommateur) et le plafond
 * lit la table auditée : golden **0 écart supplémentaire**, le correctif ne change aucun plan.
 *
 * Le critère porte sur la PROPRIÉTÉ (« une borne, une source »), pas sur le nombre de tables :
 * il reste vrai si quelqu'un ajoute un format.
 */
T("T-28", "vert", "toute borne auditée est lue par le générateur à la MÊME source que par l'auditeur", () => {
  const pb = [];
  // Le plafond et le plancher du leg vélo de brick doivent venir de la MÊME table que
  // l'auditeur. On le vérifie par le COMPORTEMENT : la borne que `blockBounds` déclare pour un
  // brick de charge doit valoir exactement celle de C21b, à `brickRF`/`share` près.
  // Les COMMENTAIRES sont retirés avant de chercher : ce critère a rougi en naissant sur le
  // commentaire qui explique la suppression de `CAP_BRICK_BIKE`. C'est la famille de faux
  // positifs déjà mesurée deux fois dans ce chantier (une CSP lue dans un commentaire, 62
  // citations bibliographiques prises pour des requêtes) — un instrument qui lit du code doit
  // lire du CODE.
  const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const src = sansCommentaires(readFileSync(resolve(ROOT, "src/generator/planGenerator.ts"), "utf8"));
  if (/CAP_BRICK_BIKE/.test(src)) pb.push("planGenerator lit encore CAP_BRICK_BIKE (2e table pour la borne C21b)");
  const cm = sansCommentaires(readFileSync(resolve(ROOT, "src/engine/constraintMatrix.ts"), "utf8"));
  if (/export const CAP_BRICK_BIKE/.test(cm)) pb.push("CAP_BRICK_BIKE est encore exportée — une table morte se réutilise");
  // …et le leg d'affûtage doit tenir la bande C21c, quelle que soit la branche empruntée.
  let legs = 0, hors = 0;
  for (const { plan, key } of goldenAvecMoteur()) {
    const fmt = plan?._v2?.profile?.format ?? plan?.format;
    for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? []) {
      if (!s.brick || !s.steps) continue;
      const aud = (w.phase?.id === "taper" ? BRICK_TAPER_BIKE_BOUNDS : BRICK_BIKE_BOUNDS)[fmt];
      const bl = s.steps.filter((st) => st.leg === "bike" && st.durationMin != null);
      if (!aud || !bl.length) continue;
      legs++;
      const m = bl.reduce((t, st) => t + (st.reps || 1) * (st.durationMin || 0), 0);
      if (m > aud[1] || m < aud[0]) hors++;
    }
  }
  // Les legs hors bornes résiduels sont O-37a, épinglés par S1 au cliquet du sceau : ce critère
  // garde la SOURCE, pas le résidu — sinon deux gardes mesureraient la même chose.
  return { ok: pb.length === 0, detail: pb.length ? pb.join(" · ") : `une borne, une source — ${legs} legs vélo de brick vérifiés (${hors} hors bornes, suivis en O-37a/S1)` };
});

/**
 * T-29 (SÉMANTIQUE) — UNE DONNÉE ABSENTE NE FAIT SAUTER AUCUNE VÉRIFICATION DE SÉCURITÉ.
 *
 * ⚠ MA PREMIÈRE ÉCRITURE ÉTAIT SYNTAXIQUE ET A RATÉ LE SITE QUI COMPTAIT. Elle cherchait la
 * forme `x ? cap : Infinity` et recensait 14 sites ; le fail-open de C24/C24b s'écrit
 * `if (tot <= 0) continue` — même sémantique, autre syntaxe. Onzième occurrence de « un critère
 * qui nomme une chose et en mesure une voisine », dans le balayage lui-même.
 *
 * La famille est : tout flot de contrôle (`continue`, `return` anticipé, court-circuit, défaut
 * permissif, `catch` vide) où une donnée manquante fait SAUTER une vérification de sécurité. Et
 * la distinction qui décide n'est pas syntaxique : un `continue` sur donnée absente est un
 * FILTRE quand l'absence veut dire « la règle ne s'applique pas », un GARDE-FOU SAUTÉ quand elle
 * veut dire « je ne peux pas l'évaluer ». Sur 69 sites de la famille syntaxique, ~60 sont des
 * filtres — les recenser tous n'aurait gardé personne. Le balayage porte donc sur les PASSES DE
 * SÉCURITÉ (`npm run audit:t29`), et ce critère garde ses deux moitiés.
 */
T("T-29", "vert", "aucune donnée absente ne fait sauter une vérification de sécurité (balayage sémantique)", () => {
  const pb = [];
  const sansCom = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // (a) le fail-open nommé : les deux états de « zéro mètre » sont SCINDÉS, pas confondus
  const pg = sansCom(readFileSync(resolve(ROOT, "src/generator/planGenerator.ts"), "utf8"));
  if (/if \(tot <= 0 \|\| tot >= floorM\) continue/.test(pg))
    pb.push("C24/C24b : `tot <= 0` et `tot >= floorM` encore confondus dans un seul `continue`");
  // (b) la forme la plus dangereuse de la famille reste absente du moteur
  let catches = 0;
  for (const f of ["src/generator/planGenerator.ts", "src/generator/repairLoop.ts", "src/engine/reasoningEngine.ts"])
    catches += (sansCom(readFileSync(resolve(ROOT, f), "utf8")).match(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/g) || []).length;
  if (catches) pb.push(catches + " catch silencieux — une exception avalée est la pire forme de la famille");
  // (c) les deux gardes que le sceau porte pour cette famille existent et sont DURES
  const seal = readFileSync(resolve(ROOT, "src/generator/seal.ts"), "utf8");
  for (const id of ["S6", "S7"])
    if (!new RegExp('id: "' + id + '"[^}]*rang: "dur"').test(seal))
      pb.push(id + " absent du sceau ou pas de rang DUR");
  return { ok: pb.length === 0, detail: pb.length ? pb.join(" · ") : `fail-open C24/C24b scindé · 0 catch silencieux · S6 et S7 durs au sceau` };
});

/**
 * T-30 — À PROFIL ET FORMAT ÉGAUX, LE TEMPS DE TRAVAIL D'UN BLOC DE QUALITÉ EST INVARIANT PAR
 * VARIATION DE `thrPace`.
 *
 * Écrit ROUGE avant le correctif, comme le veut la méthode : c'est la PROPRIÉTÉ que l'item 3
 * d'O-36 doit rendre vraie, pas le chemin qu'il prendra. Aujourd'hui le moteur adapte le NOMBRE
 * de répétitions (3,84 → 3,01 entre 4:30 et 8:30) mais pas leur LONGUEUR (~1 672 m partout), donc
 * le coureur lent reçoit **×1,50 de temps de travail** pour la même prescription.
 *
 * La correction retenue (arbitrage du 15/08) : la DURÉE de répétition devient la source, la
 * distance devient un affichage dérivé — le contrat que B-25 fait déjà tourner en production sur
 * le leg course du tri. Quand elle sera écrite, ce critère passera au vert sans être retouché :
 * il ne nomme aucun mécanisme.
 */
T("T-30", "rouge", "le temps de travail d'un bloc de qualité course ne dépend pas de l'allure déclarée", () => {
  const ZQ = /\.(thr|vo2|mara|sprint)/;
  const dose = (pace) => {
    let n = 0, min = 0;
    for (const format of ["5k", "10k", "semi", "marathon"]) for (const level of ["debutant", "inter", "avance"]) {
      let plan;
      try {
        plan = globalThis.EBV2.buildPlan("run", {
          sport: "run", format, history: "confirme", level, intent: "competition", pace,
          med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune", sessions_max: "5",
          dispo: "quotidienne", doubles: "non", pace_known: "oui", terrain: "route", sex: "H",
          age: "35", vol_max: "8", vol_recent: "3", weight: "75",
        });
      } catch { continue; }
      for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? [])
        for (const st of s.steps ?? []) {
          if (st.role !== "body" || !ZQ.test(String(st.zone || ""))) continue;
          n++; min += st._min ?? 0;
        }
    }
    return n ? min / n : 0;
  };
  const rapide = dose("4:30"), lent = dose("8:30");
  const r = rapide > 0 ? lent / rapide : 1;
  // TOLÉRANCE ±2 % (arbitrage du 15/08) : ×1,09 est un rapport DILUÉ (les blocs prescrits en
  // temps ne varient pas avec l'allure). Une conversion à moitié faite le ramènerait vers 1,045
  // — encore rouge à ±2 %, potentiellement vert à ±5 %. Serrer la tolérance est ce qui empêche
  // la dilution de masquer un correctif incomplet, et dispense de garder la sous-population
  // comme second test.
  return {
    ok: rapide > 0 && Math.abs(r - 1) <= 0.02,
    detail: `dose moyenne d'un bloc de qualité : ${rapide.toFixed(1)} min à 4:30 · ${lent.toFixed(1)} min à 8:30 — rapport ×${r.toFixed(2)} (cible 1,00 ± 2 %)`,
  };
});

/**
 * O-39 — TOUTE ZONE CLASSÉE QUALITÉ EST SOIT PLAFONNÉE, SOIT EXEMPTÉE. Jamais simplement absente.
 * `mara` portait la plus grosse dose du moteur sans entrée nulle part ; l'exemption est juste,
 * elle est désormais ÉCRITE (`DOSE_EXEMPT`), et ce critère empêche la prochaine zone d'entrer
 * sans décision.
 */
T("O-39", "rouge", "toute zone de qualité émise est plafonnée (DOSE_CAP_MIN) ou exemptée (DOSE_EXEMPT)", () => {
  const vues = new Set();
  for (const { plan } of goldenAvecMoteur())
    for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? [])
      for (const st of s.steps ?? []) {
        const z = String(st.zone || "");
        if (st.role !== "body" || !z) continue;
        if (/\.(thr|vo2|mara|sprint|css|rp)$/.test(z)) vues.add(z.split(".").pop());
      }
  // ⚠ MA PREMIÈRE ÉCRITURE MESURAIT LA TABLE, PAS LE CODE. Elle annonçait « rp et css sans
  // plafond » ; or `planGenerator` mappe `/\.thr$|\.css$/` sur `DOSE_CAP_MIN.thr` — `css` EST
  // plafonné à 40, il n'a simplement pas de clé propre. Treizième occurrence de « un critère qui
  // nomme une chose et en mesure une voisine ». Le prédicat lit désormais la RÉSOLUTION du code.
  const resolu = (suf) => /^(thr|css)$/.test(suf) ? DOSE_CAP_MIN.thr
    : suf === "vo2" ? DOSE_CAP_MIN.vo2 : DOSE_CAP_MIN[suf];
  const orphelines = [...vues].filter((suf) => resolu(suf) === undefined && DOSE_EXEMPT[suf] === undefined);
  return {
    ok: vues.size > 0 && orphelines.length === 0,
    detail: `${vues.size} suffixe(s) de qualité émis (${[...vues].sort().join(", ")}) · ${orphelines.length} sans plafond NI exemption`
      + (orphelines.length ? ` — ${orphelines.join(", ")}` : ""),
  };
});

// ---- verdict --------------------------------------------------------------
/**
 * §6.3 (DOC_UNIQUE, 14/08/2026) — LES ROUGES ATTENDUS SONT UNE LISTE NOMMÉE, PAS UN NOMBRE.
 * « Seize, c'est une foule : le dix-septième y entre sans qu'on le voie. » Chaque entrée nomme
 * le ticket qui la fermera. Le CLIQUET : un rouge hors liste échoue le banc (il n'entre pas
 * dans la foule en silence) ; une entrée dont le test est devenu VERT échoue aussi — passer
 * son `attendu` à "vert" ET retirer l'entrée DANS LE MÊME COMMIT, comme `audit:v6` et Z-11.
 * Tickets : A-xx/B-xx/N-xx = handoff maître + addendum · O-35 = BUGS_OUVERTS.md.
 */

/**
 * T-34 (O-43 §1) — LE PLAFOND EST UNE PROPRIÉTÉ DE L'ATHLÈTE, PAS DE LA FAÇON DONT ON COMPTE.
 *
 * Le critère du fondateur, qui remplace un arbitrage par un FILTRE : toute issue d'O-43 qui laisse
 * ce test rouge est disqualifiée quels que soient ses chiffres.
 *
 * Le test fait varier la CONVERSION et rien d'autre — `sw.easy` de ×1,12 à ×1,30 sur `ZDEF`, le
 * point unique depuis O-42, donc la mutation atteint les cinq sites. Rien chez l'athlète n'a
 * bougé : ni son historique, ni sa déclaration, ni sa disponibilité. Ce qu'on lui prescrit ne
 * doit pas bouger non plus.
 *
 * ⚠ MA PREMIÈRE ÉCRITURE TESTAIT LE SEUL MAILLON `structurel` ET SORTAIT **VERTE** — elle a
 * réfuté ma propre analyse d'O-43 §3. Mesuré : la mutation laisse `structurel` à +1,0 %
 * (1,733 → 1,750 h) parce qu'il somme des plafonds de séance EN MINUTES, atteints à saturation
 * quelle que soit la conversion. Ce qui bouge, c'est `courbe` (+11 %), `boucle-growth` (+36 %) et
 * le PIC LIVRÉ (1,1 → 1,2 h). J'avais lu « structurel 1,42 → 2,08 » sur un diff qui contenait TOUT
 * O-42, et j'en avais conclu une causalité que l'expérience contrôlée ne soutient pas : ce maillon
 * monte parce que la semaine gagne des séances, il n'est pas la cause. Le test porte donc sur ce
 * que le fondateur a écrit — CE QUI EST PRESCRIT —, pas sur le maillon que j'avais désigné.
 */
T("T-34", "rouge", "ce qui est prescrit est invariant par changement de conversion (O-43)", () => {
  const a = { sport: "swim", format: "fond", history: "reprise", level: "debutant", intent: "finir",
    sessions_max: "6", dispo: "quotidienne", doubles: "non", age: "35", sex: "H",
    css: "2:00", css_known: "oui", vol_max: "10", vol_recent: "0", injury: "aucune",
    med_pain: "non", med_dizzy: "non", med_treat: "non", milieu: "bassin", swim_limit: "technique" };
  const lire = () => {
    const p = globalThis.EBV2.buildPlan("swim", { ...a });
    const ch = {};
    for (const x of p._r202?.plafonds ?? []) ch[String(x.id ?? x.nom)] = x.livre;
    const jours = Math.max(...(p.weeks ?? []).map((w) => (w.days ?? []).filter((d) => (d.sessions ?? []).some((sx) => sx.d === "sw" && sx.min > 0)).length));
    return { pic: p.volPeak, jours, ch };
  };
  const avant = lire();
  const memo = { ...ZDEF["sw.easy"] };
  ZDEF["sw.easy"].lo = 1.30; ZDEF["sw.easy"].hi = 1.30;   // +16 % d'allure, rien d'autre ne bouge
  const apres = lire();
  ZDEF["sw.easy"].lo = memo.lo; ZDEF["sw.easy"].hi = memo.hi;
  const dPic = avant.pic > 0 ? Math.abs(apres.pic - avant.pic) / avant.pic : 0;
  const maillons = Object.keys(avant.ch)
    .filter((k) => avant.ch[k] > 0 && Math.abs(apres.ch[k] - avant.ch[k]) / avant.ch[k] > 0.01)
    .map((k) => `${k} ${avant.ch[k].toFixed(2)}→${apres.ch[k].toFixed(2)}`);
  return {
    ok: dPic < 0.01 && avant.jours === apres.jours,
    detail: `pic livré ${avant.pic} → ${apres.pic} h (${(dPic * 100).toFixed(1)} %) · jours de nage ${avant.jours} → ${apres.jours} · maillons qui bougent : ${maillons.join(" · ") || "aucun"}`,
  };
});

/**
 * T-35 (O-43 §7) — CE QUI EST PRESCRIT EST ÉPINGLÉ : une hausse est DÉCLARÉE dans son commit.
 *
 * « Une garde de cohérence interne ne voit rien quand la promesse et la livraison bougent
 * ensemble » — c'est exactement ce qui a laissé passer O-43 sous une ventilation qui se disait
 * complète. T-25 compare la chaîne au pic d'un même profil ; celle-ci compare le plan À LUI-MÊME
 * d'une VERSION à l'autre. Le cliquet n'interdit pas une hausse : il interdit qu'elle soit
 * silencieuse. Les deux grandeurs sont épinglées parce que le dommage d'O-43 vit dans la
 * FRÉQUENCE autant que dans le volume (§3 du fondateur).
 */
// Épinglés sur la MESURE, pas sur un souvenir : `npm run mesure:o43` les rend, et le cliquet
// force à les recopier ici dans le commit qui les fait bouger.
/**
 * T-36 (O-44 §4) — LE JUMEAU DE T-34 : SENSIBLE À CE QUI LE CONCERNE.
 *
 * « Une constante gelée est trivialement invariante » — un test d'invariance SEUL est satisfait
 * par la pire des solutions. T-34 et T-36 ensemble définissent la propriété réelle : **invariant à
 * ce qui ne le concerne pas, sensible à ce qui le concerne.** Ni l'un ni l'autre ne suffit, et
 * c'est la forme générale à appliquer à tout test d'invariance du dépôt.
 *
 * On fait varier ce qui décrit l'ATHLÈTE — historique, volume déclaré, volume récent, drapeau
 * médical, blessure, âge — et ce qui est prescrit doit répondre. Un facteur qui ne bouge RIEN est
 * soit inerte (défaut), soit dominé par un autre plafond sur ce profil : le test le nomme au lieu
 * de le taire, et n'exige pas que les six répondent — il exige qu'AUCUN ne soit muet sur toute la
 * ligne, et que le drapeau médical, lui, réponde toujours (c'est une garde dure).
 */
T("T-36", "vert", "ce qui est prescrit répond aux contraintes de l'athlète (jumeau de T-34)", () => {
  // ⚠ LA MOITIÉ SENSIBILITÉ PORTE UN DOMAINE (arbitrage du 17/08/2026, qui corrige la formulation
  // d'O-44 §4). « Invariant à ce qui ne le concerne pas, sensible à ce qui le concerne » est
  // incomplet : **une grandeur qui CONVERGE est insensible à sa limite, et c'est correct.**
  // Relu à cette lumière, ce critère est SAIN — il fait varier `vol_max` et `sessions_max`, deux
  // contraintes qui ne convergent vers aucune limite dans le domaine balayé : plus d'heures
  // disponibles donne plus de plan, sans plafond atteint. Le trou n'est donc pas ici.
  // (Le cas qui a produit la règle est `T-41` : sur un sprint, une continuité déclarée à 400 m et
  // une à 2 000 m arrivent au même plafond à mi-plan parce que la projection converge vers la
  // distance de course — exiger de la sensibilité là signalerait une convergence comme un défaut.)
  const base = { sport: "swim", format: "fond", history: "reprise", level: "debutant", intent: "finir",
    sessions_max: "6", dispo: "quotidienne", doubles: "non", age: "35", sex: "H",
    css: "2:00", css_known: "oui", vol_max: "10", vol_recent: "0", injury: "aucune",
    med_pain: "non", med_dizzy: "non", med_treat: "non", milieu: "bassin", swim_limit: "technique" };
  const prescrit = (over) => {
    const p = globalThis.EBV2.buildPlan("swim", { ...base, ...over });
    const jours = Math.max(...(p.weeks ?? []).map((w) => (w.days ?? []).filter((d) => (d.sessions ?? []).some((sx) => sx.d === "sw" && sx.min > 0)).length));
    const total = (p.weeks ?? []).reduce((t, w) => t + (w.days ?? []).reduce((u, d) => u + (d.sessions ?? []).reduce((v, sx) => v + (sx.race ? 0 : sx.min || 0), 0), 0), 0);
    return { pic: p.volPeak ?? 0, jours, total };
  };
  const ref = prescrit({});
  const axes = [
    ["historique", { history: "ancien" }],
    ["volume déclaré", { vol_max: "3" }],
    ["volume récent", { vol_recent: "8" }],
    ["drapeau médical", { med_pain: "oui" }],
    ["blessure épaule", { injury: "epaule" }],
    ["âge", { age: "68" }],
  ];
  const muets = [], vus = [];
  for (const [nom, over] of axes) {
    let v; try { v = prescrit(over); } catch { vus.push(`${nom} REFUS`); continue; }
    const bouge = Math.abs(v.pic - ref.pic) > 0.05 || v.jours !== ref.jours || Math.abs(v.total - ref.total) > 5;
    vus.push(`${nom} ${v.pic}h/${v.jours}j/${v.total}min${bouge ? "" : " ←MUET"}`);
    if (!bouge) muets.push(nom);
  }
  // Le drapeau médical est une garde DURE : s'il ne bouge rien, ce n'est pas une domination,
  // c'est un garde-fou éteint.
  const medMuet = muets.includes("drapeau médical");
  return {
    ok: muets.length < axes.length && !medMuet,
    detail: `référence ${ref.pic}h/${ref.jours}j/${ref.total}min · ${vus.join(" · ")}${muets.length ? ` — MUETS : ${muets.join(", ")}` : ""}`,
  };
});

const PRESCRIT_ATTENDU = {
  "fond/reprise/debutant": { pic: 1.1, jours: 5 },
  "sprint/reprise/debutant": { pic: 1.1, jours: 5 },
};
T("T-35", "vert", "le pic livré et la fréquence de nage sont épinglés — une hausse ne peut pas être silencieuse", () => {
  const base = { sessions_max: "6", dispo: "quotidienne", doubles: "non", age: "35", sex: "H",
    css: "2:00", css_known: "oui", vol_max: "10", vol_recent: "0", injury: "aucune", intent: "finir",
    med_pain: "non", med_dizzy: "non", med_treat: "non", milieu: "bassin", swim_limit: "technique" };
  const bad = [], vus = [];
  for (const [cle, att] of Object.entries(PRESCRIT_ATTENDU)) {
    const [format, history, level] = cle.split("/");
    const p = globalThis.EBV2.buildPlan("swim", { ...base, sport: "swim", format, history, level });
    const jours = Math.max(...(p.weeks ?? []).map((w) => (w.days ?? []).filter((d) => (d.sessions ?? []).some((sx) => sx.d === "sw" && sx.min > 0)).length));
    vus.push(`${cle} ${p.volPeak}h/${jours}j`);
    if (Math.abs((p.volPeak ?? 0) - att.pic) > 0.05 || jours !== att.jours)
      bad.push(`${cle} : ${p.volPeak} h / ${jours} j au lieu de ${att.pic} h / ${att.jours} j`);
  }
  return { ok: bad.length === 0, detail: bad.length ? bad.join(" · ") : vus.join(" · ") };
});

T("T-39", "vert", "un bloc ÉPINGLÉ n'est pas raboté par le plafond de dose (O-53), et le compte des autres rabotages est épinglé", () => {
  // `bnd.pinned` dit « la distance EST le stimulus » (I14). Deux moitiés, et la seconde existe
  // parce que la première est LATENTE : `sw.aero` n'est pas une zone plafonnée, donc le
  // croisement avec le plafond de dose est vide, et un test qui se contenterait de constater
  // « 0 raboté par le plafond » serait satisfait par un moteur sans aucune garde (règle 19).
  //
  //   (1) invariance — aucun bloc épinglé n'est livré SOUS son épingle du fait du plafond ;
  //       ⚠ ET SON DOMAINE DE SENSIBILITÉ EST NOMMÉ (arbitrage du 17/08/2026) : ce critère ne
  //       demande PAS que le compte de rabotages varie avec quoi que ce soit — il l'épingle. La
  //       sensibilité est portée par la contre-preuve (`sw.aero` plafonnée : 57 → 195 sans la
  //       garde), pas par le critère lui-même, et c'est la bonne place : l'insensibilité du
  //       compte EST la propriété recherchée en régime normal.
  //   (2) sensibilité — le compte TOTAL des blocs épinglés non livrés à leur épingle est
  //       épinglé. Ces rabotages ne viennent pas du plafond de dose (mesuré identique avant et
  //       après le lot 1) : le cliquet est ici pour qu'aucun autre mécanisme ne vienne s'y
  //       ajouter en silence.
  //
  //       57 → **31** avec O-54 §2 (17/08/2026), et la baisse dit exactement ce que le correctif
  //       fait et ce qu'il ne fait pas. C15 lisait `level === "debutant"`, une auto-évaluation
  //       GLOBALE, et plafonnait à 850 m un ancien nageur qui se met au triathlon ; il lit
  //       désormais la capacité DÉMONTRÉE (`longest_swim_m`) quand elle existe.
  //         · les rabotages à 500 m disparaissent — c'était la moitié dangereuse ;
  //         · il en reste 31, et ce sont des continuités bornées à la capacité DÉCLARÉE : un
  //           nageur à 2 000 m ne construit pas les 3 800 m d'un Ironman, ses derniers paliers
  //           sont livrés à 2 000. C'est VOULU et documenté (`swimSessionCapM`) : faire croître
  //           cette borne semaine après semaine est le ticket « `beginner` est statique ».
  //           Le titre, lui, dit la vérité (T-40), et la franchissabilité doit le voir.
  //       ⚠ CE CHIFFRE A ÉTÉ ÉPINGLÉ UNE FOIS À **4**, sur une première écriture qui bornait sur
  //       `atteignableM` et donnait 4 150 m de séance à qui déclare 400 m. Épingler sur un état
  //       qu'on abandonne ensuite est une erreur de tenue de livre, publiée ici plutôt que
  //       réécrite en silence.
  //       Puis **69 → 23** avec O-56 §1 : le MOTEUR, cette fois — `base:cliquet` le prouve
  //       (corpus inchangé, 985 → 985). Le plafond de séance SUIT désormais la semaine, donc les
  //       paliers de continuité sont livrés à leur épingle au lieu d'être écrêtés par une borne
  //       gelée sur la semaine 1. Les 23 restants sont des semaines où le VOLUME, et non C15, ne
  //       peut pas payer la séance.
  //       Avant cela **31 → 69** : le CORPUS a grandi, pas le moteur. La sous-passe B-17 du golden croise
  //       désormais le NIVEAU (969 → 989 profils), donc 20 profils `debutant` à continuité basse
  //       entrent dans le compte — chacun avec ses paliers bornés à sa capacité déclarée. Un
  //       cliquet qui monte parce qu'on a ÉLARGI la mesure et un cliquet qui monte parce que le
  //       moteur a régressé se ressemblent exactement : la différence est écrite ici, faute de
  //       quoi le prochain lecteur devra la redécouvrir.
  //
  // Contre-preuve, en rendant le croisement NON VIDE (`sw.aero` ajoutée aux zones plafonnées) :
  //     garde posée .... 57 rabotés / 308   ← inchangé, elle tient
  //     garde retirée .. 195 rabotés / 308  ← +138, elle sert
  // O-69 (18/08/2026) — le plancher ne change PAS ce compte (23 avant comme après) ; une passe
  // intermédiaire retirée du lot l'avait déplacé à 22 et l'épingle avait suivi à tort. Rétabli.
  // PUIS 23 → **26** (O-70, 18/08/2026) : le pic du tri change de contenu et les semaines
  // SATURÉES de `G/tri/Full/vol-min` (un Full dans 4 h/sem) se recomposent — trois continuités
  // B-17 de plus rejoignent la catégorie documentée ci-dessus : « le VOLUME, et non C15, ne
  // peut pas payer la séance ». Les trois exemples sont apparus AVANT le clamp C3 du même lot
  // (mesuré sur l'état intermédiaire) : c'est le contenu, pas le clamp.
  // PUIS 26 → **25** (lot progression pièce 1, 18/08/2026) : la trajectoire du brick rend les
  // bricks de début de spécifique PLUS PETITS (117 min au lieu de 212 en première occurrence),
  // les semaines saturées de vol-min retrouvent des minutes, et une continuité de plus est
  // payée. Un raboté de MOINS est le sens attendu du lot — ré-épinglé à la baisse.
  // PUIS 25 → **24** (QUI PAIE §2, 18/08/2026) : l'orientation épargne des jours de nage —
  // une continuité de plus est payée. Même attribution ensembliste que S5 ci-dessus.
  const RABOTES_ATTENDUS = 24;
  let n = 0, ko = 0; const zones = {}, ex = [];
  for (const { key, plan } of goldenAvecMoteur()) {
    for (const w of plan?.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? [])
      for (const st of s.steps ?? []) {
        if (!st.bnd?.pinned) continue;
        n++;
        const livre = st.distanceM != null ? st.distanceM : st.durationMin;
        if (livre === st.bnd.cap) continue;
        ko++; zones[String(st.zone)] = (zones[String(st.zone)] || 0) + 1;
        if (ex.length < 3) ex.push(`${key} · ${String(s.name).slice(0, 28)} · ${st.zone} · ${livre} pour ${st.bnd.cap}`);
      }
  }
  const bad = [];
  if (!n) bad.push("AUCUN bloc épinglé dans le corpus — le critère ne mesure rien, vérifier l'instrument");
  if (ko !== RABOTES_ATTENDUS) bad.push(`${ko} bloc(s) épinglé(s) raboté(s) au lieu de ${RABOTES_ATTENDUS} (O-54 §2) · ${ex.join(" ; ")}`);
  return { ok: bad.length === 0, detail: bad.join(" · ") || `${n} blocs épinglés · ${ko} rabotés (O-54 §2 : reste le volume de semaine, plus C15) · zones ${JSON.stringify(zones)}` };
});

T("T-40", "vert", "aucun titre de séance n'annonce une distance que la séance ne contient pas (O-54)", () => {
  // Le titre « Nage continue en eau libre — 3800 m d'affilée » était livré à 500 m chez un
  // débutant. Le critère lit le NOMBRE DANS LE TITRE et le compare au contenu du bloc — jamais à
  // l'épingle, qui est précisément la valeur dont le titre s'était détaché.
  //
  // Non-vacuité : il faut que des titres chiffrés EXISTENT dans le corpus, sans quoi « 0 titre
  // qui ment » est satisfait par un moteur qui n'en produit aucun (règle 19).
  // Contre-preuve : correctif retiré → 57 titres mentent sur 308.
  let n = 0, ment = 0; const ex = [];
  for (const { key, plan } of goldenAvecMoteur()) {
    for (const w of plan?.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? []) {
      const m = /— (\d+) m d'affilée/.exec(String(s.name || "")); if (!m) continue;
      n++;
      const corps = (s.steps || []).filter((x) => x.role === "body" && x.distanceM != null);
      const livre = corps.length === 1 ? (corps[0].reps || 1) * (corps[0].distanceM || 0) : null;
      if (livre !== +m[1]) { ment++; if (ex.length < 3) ex.push(`${key} · « ${s.name} » livre ${livre}`); }
    }
  }
  const bad = [];
  if (n < 50) bad.push(`seulement ${n} titre(s) chiffré(s) dans le corpus — le critère ne mesure presque rien`);
  if (ment) bad.push(`${ment} titre(s) annoncent une distance absente du contenu · ${ex.join(" ; ")}`);
  return { ok: bad.length === 0, detail: bad.join(" · ") || `${n} titres chiffrés, 0 qui ment` };
});

T("T-41", "vert", "le plafond de séance de nage suit la capacité DÉMONTRÉE et la POSITION dans le plan (O-54 §2, O-56 §1)", () => {
  // ⚠ CETTE GARDE A ÉTÉ RÉÉCRITE PARCE QU'ELLE MESURAIT UN MAXIMUM SUR TOUT LE PLAN quand la
  // propriété est PAR SEMAINE — c'est la règle 20 appliquée à la garde elle-même, une heure après
  // l'avoir écrite pour le moteur. Sa première version aurait rougi sur O-56 §1 alors que la
  // projection est exactement ce qu'O-56 demande : un 400 m déclaré reçoit 3 800 m en semaine 30,
  // au bout d'une progression prescrite (725 → 900 → 1 050 → 1 225 → 1 900 …), pas d'un saut.
  //
  //   invariance   — en SEMAINE 1, qui déclare 400 m ou « je ne sais pas » reste sous C15.
  //                  C'est la moitié protectrice : ma première écriture d'O-54 §2 bornait sur
  //                  `atteignableM` et donnait 4 150 m de séance DÈS LE DÉBUT.
  //   sensibilité  — À MI-PLAN, qui déclare 2 000 m reçoit plus que qui déclare 400 m. Sans
  //                  elle, une borne gelée à C15 satisferait l'invariance (règle 19).
  //
  // La sensibilité NE SE MESURE PAS en semaine 1 : mesuré, les deux profils y reçoivent 725 m —
  // c'est le VOLUME qui borne, pas la capacité. Une garde posée là serait vacue en croyant tester.
  const BASE = { sport: "tri", intent: "competition", level: "debutant", history: "reprise",
    dispo: "quotidienne", doubles: "non", sessions_max: "6", age: "35", sex: "H", weight: "75",
    vol_max: "10", vol_recent: "3", injury: "aucune", med_pain: "non", med_dizzy: "non",
    med_treat: "non", pace_known: "oui", pace: "5:30", ftp_known: "oui", ftp: "220",
    css_known: "oui", css: "2:10", terrain: "route", milieu: "bassin" };
  // L'HORIZON EST FIXÉ, et c'est nécessaire : sans `race_date` le moteur prend `MIN_WEEKS` du
  // FORMAT, donc deux profils du même format mais de continuité différente n'ont pas la même
  // longueur de plan dès qu'un rabattement s'applique — on comparerait deux plans de 8 et 36
  // semaines. Mesuré en écrivant cette garde : `Math.max` sur une tranche VIDE rendait
  // `-Infinity` et le critère annonçait « la déclaration ne départage pas » sur un artefact.
  const lundi = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
  const dans = (n) => { const d = lundi(); d.setDate(d.getDate() + n * 7 - 1); return d.toISOString().slice(0, 10); };
  const HORIZON = { S: 12, "70.3": 24, Full: 38 };
  const parSemaine = (over) => {
    const p = globalThis.EBV2.buildPlan("tri", { ...BASE, race_date: dans(HORIZON[over.format]), ...over });
    return (p.weeks || []).map((w) => {
      let m = 0;
      for (const d of w.days) for (const s of d.sessions) if (s.d === "sw")
        m = Math.max(m, (s.steps || []).reduce((t, x) => t + (x.distanceM != null ? (x.reps || 1) * x.distanceM : 0), 0));
      return m;
    });
  };
  const bad = []; let departage = 0;
  for (const fmt of ["S", "70.3", "Full"]) {
    const vrai = parSemaine({ format: fmt, longest_swim_m: "400" });
    const inconnu = parSemaine({ format: fmt, longest_swim_known: "non", longest_swim_m: "" });
    const nageur = parSemaine({ format: fmt, longest_swim_m: "2000" });
    // (1) INVARIANCE en semaine 1 — 850 (C15) + la marge des séances qui échappent à C15 par un
    // AUTRE chemin (la sortie longue passe par `CAP_SWIM`) : comportement antérieur, hors périmètre.
    if (vrai[0] > 1100) bad.push(`${fmt} · 400 m · SEMAINE 1 : séance de ${vrai[0]} m — la protection a sauté`);
    if (inconnu[0] > 1100) bad.push(`${fmt} · « je ne sais pas » · SEMAINE 1 : ${inconnu[0]} m — la protection a sauté`);
    // (2) « je ne sais pas » ne projette JAMAIS : sans mesure, il n'y a rien à projeter (D3).
    const maxInc = Math.max(...inconnu), maxVrai = Math.max(...vrai);
    if (maxInc > 1100) bad.push(`${fmt} · « je ne sais pas » projette jusqu'à ${maxInc} m — l'inconnu n'est pas une capacité`);
    // (3) SENSIBILITÉ à mi-plan — la capacité déclarée doit départager.
    const mi = Math.floor(vrai.length / 2), fin = Math.max(mi + 1, Math.min(vrai.length, mi + Math.ceil(vrai.length / 4)));
    const pic = (l) => (l.length ? Math.max(...l.slice(mi, fin), 0) : 0);
    if (!vrai.length || !nageur.length) { bad.push(`${fmt} : un des profils ne rend AUCUNE semaine — le critère ne mesure rien`); continue; }
    // LA SENSIBILITÉ NE SE MESURE PAS SUR CHAQUE FORMAT, et c'est une propriété du modèle, pas
    // une faiblesse du critère : la projection converge vers la DISTANCE DE COURSE, donc sur un
    // sprint (750 m) une déclaration à 400 et une à 2 000 arrivent au même plafond en milieu de
    // plan — ce qui est juste, 750 m sont atteignables par tout le monde en douze semaines.
    // Mesuré : S 1 100 contre 1 100, 70.3 2 250 contre 2 250, Full 3 400 contre 2 500.
    // Elle est donc exigée GLOBALEMENT (au moins un format départage), ce qui reste rouge si la
    // déclaration cesse d'agir — ma première écriture l'exigeait partout et rougissait sur le
    // comportement voulu : la position du témoin est aussi une décision (règle 20).
    if (pic(nageur) > pic(vrai)) departage++;
    if (maxVrai <= vrai[0]) bad.push(`${fmt} · 400 m : la borne ne PROGRESSE pas (${vrai[0]} → ${maxVrai}) — O-56 §1 inerte`);
  }
  if (!departage) bad.push("aucun format où la capacité déclarée départage à mi-plan — la déclaration n'agit plus");
  return { ok: bad.length === 0, detail: bad.join(" · ") || "semaine 1 bornée, l'inconnu ne projette pas, la déclaration départage à mi-plan, la borne progresse" };
});

T("T-43", "vert", "PROPRIÉTÉ — le rabattement B-17 ne rend jamais un format supérieur au demandé (O-57)", () => {
  // T-42 garde le SYMPTÔME (le balayage sans date, là où le défaut a été trouvé) ; celui-ci garde
  // la PROPRIÉTÉ, et il tient quelle que soit la façon dont l'horizon se dérive. C'est l'invariant
  // que la liste `["Full","70.3","M","S"]` était censée porter et ne portait pas : « premier
  // franchissable » suppose que la franchissabilité DÉCROÎT le long de la liste — vrai à horizon
  // fixe, faux quand `semainesDe(f)` dérive l'horizon du format lui-même. La liste portait une
  // hypothèse de monotonie que rien ne vérifiait.
  //
  // ⚠ IL EST VRAI PAR CONSTRUCTION DEPUIS LE CORRECTIF, et c'est dit plutôt que tu : la recherche
  // est bornée (`candidats = ordre.slice(rang)`), donc ce critère CONFIRME au lieu de découvrir.
  // Il vaut quand même — le jour où quelqu'un rétablit un balayage complet en comparant « dans
  // l'autre sens », il redevient une garde qui travaille. Sa contre-preuve le montre : retirer la
  // borne rend 9 rabattements montants sur 105 profils.
  //
  // AVEC ET SANS DATE, et les deux comptent : la direction fait la GRAVITÉ. Un rabattement qui se
  // trompe vers le bas donne un plan trop facile — décevant. Un rabattement qui MONTE donne un
  // plan d'Ironman à quelqu'un qui déclare 400 m de nage continue.
  const RANG = { S: 0, M: 1, "70.3": 2, Full: 3 };
  const BASE = { sport: "tri", intent: "competition", history: "reprise", dispo: "quotidienne",
    doubles: "non", sessions_max: "6", age: "35", sex: "H", weight: "75", vol_max: "10",
    vol_recent: "3", injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non",
    pace_known: "oui", pace: "5:30", ftp_known: "oui", ftp: "220", css_known: "oui", css: "2:10",
    terrain: "route", milieu: "bassin" };
  const lundi = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
  const dans = (n) => { const d = lundi(); d.setDate(d.getDate() + n * 7 - 1); return d.toISOString().slice(0, 10); };
  const bad = []; let vus = 0, rabats = 0, sansDate = 0;
  for (const format of ["S", "M", "70.3", "Full"]) for (const level of ["debutant", "inter", "avance"])
    for (const longest_swim_m of ["100", "400", "800", "1500", "2000"])
      for (const sem of [null, 10, 20, 30, 40]) {
        const a = { ...BASE, format, level, longest_swim_m };
        if (sem) a.race_date = dans(sem); else sansDate++;
        let p; try { p = globalThis.EBV2.buildPlan("tri", a); } catch { continue; }
        vus++;
        const dec = ((p._v2 || {}).decisions || []).find((d) => d.id === "B17-continuite" && /au lieu de/.test(String(d.val)));
        if (!dec) continue;
        rabats++;
        const cible = String(dec.val).split(" ")[0];
        if (RANG[cible] > RANG[format]) bad.push(`${format}/${level}/${longest_swim_m}m${sem ? "/" + sem + "sem" : "/sans date"} → ${cible} : le rabattement MONTE`);
      }
  if (vus < 200) bad.push(`seulement ${vus} profil(s) générés — l'échantillon ne prouve rien`);
  if (!rabats) bad.push("AUCUN rabattement observé — le critère est vacu, la branche n'est pas exercée");
  if (!sansDate) bad.push("aucun profil SANS date — la branche où le défaut vivait n'est pas balayée");
  return { ok: bad.length === 0, detail: bad.join(" · ") || `${vus} profils (dont ${sansDate} sans date), ${rabats} rabattements, tous vers un format ≤ demandé` };
});

T("T-42", "vert", "le rabattement B-17 DESCEND toujours — jamais vers un format plus long (O-57)", () => {
  // `ordre = ["Full","70.3","M","S"]` et on retenait le PREMIER format franchissable. Or
  // `semainesDe(f)` rend l'horizon PROPRE à chaque format quand aucune date n'est saisie
  // (`MIN_WEEKS` : 8 pour un sprint, 36 pour un Full) : le Full, avec 36 semaines de rampe, était
  // franchissable AVANT le sprint qui n'en a que 8. Un débutant demandant un SPRINT et déclarant
  // 400 m de nage continue recevait **un plan d'Ironman** — l'inversion exacte d'une règle de
  // sécurité, sur la population qu'elle protège.
  //
  // AUCUN GATE NE POUVAIT LA VOIR : elle n'existe que SANS date de course, et les 989 profils du
  // golden en portent une. Trouvée en écrivant T-41, par une sonde qui n'en posait pas.
  // Contre-preuve : `ordre` non restreint → 9 profils sur 105 remontent, jusqu'à `S → Full`.
  const RANG = { S: 0, M: 1, "70.3": 2, Full: 3 };
  const BASE = { sport: "tri", intent: "competition", history: "reprise", dispo: "quotidienne",
    doubles: "non", sessions_max: "6", age: "35", sex: "H", weight: "75", vol_max: "10",
    vol_recent: "3", injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non",
    pace_known: "oui", pace: "5:30", ftp_known: "oui", ftp: "220", css_known: "oui", css: "2:10",
    terrain: "route", milieu: "bassin" };
  const bad = []; let vus = 0, rabats = 0;
  for (const format of ["S", "M", "70.3", "Full"]) for (const level of ["debutant", "inter", "avance"])
    for (const longest_swim_m of ["100", "400", "800", "1500", "2000"]) {
      // SANS date : c'est la seule branche où le défaut vit, et l'omettre rendrait le critère vacu.
      let p; try { p = globalThis.EBV2.buildPlan("tri", { ...BASE, format, level, longest_swim_m }); } catch { continue; }
      vus++;
      const dec = ((p._v2 || {}).decisions || []).find((d) => d.id === "B17-continuite" && /au lieu de/.test(String(d.val)));
      if (!dec) continue;
      rabats++;
      const cible = String(dec.val).split(" ")[0];
      if (RANG[cible] > RANG[format]) bad.push(`${format}/${level}/${longest_swim_m}m → ${cible} : le rabattement MONTE`);
    }
  if (vus < 50) bad.push(`seulement ${vus} profil(s) générés — l'échantillon ne prouve rien`);
  if (!rabats) bad.push("AUCUN rabattement observé — le critère est vacu, la branche n'est pas exercée");
  return { ok: bad.length === 0, detail: bad.join(" · ") || `${vus} profils, ${rabats} rabattements, tous vers un format ≤ demandé` };
});

// T-38 RETIRÉ (O-46 réfuté, 16/08/2026) — il comparait `CAP_SWIM` à une exigence de SÉANCE alors
// que `CAP_SWIM` borne UN BLOC de la sortie longue (`if (s.long) { if (s.d === "sw") … }`). Un
// triathlète Full nage jusqu'à 7 125 m en une séance : la prémisse « le moteur lui interdit sa
// distance de course » était fausse. Le test est retiré plutôt que réécrit — ce qui survit est
// B-17 (« une nage CONTINUE à la distance de course est-elle PRESCRITE ? », 4 profils sur 56 en
// Full), qui est un ticket de PRESCRIPTION et non de plafond, et qui aura sa garde avec lui.


// ---- T-44 · la coupe par sessions_max ne discrimine pas une discipline -----
/**
 * O-66 — LA CONTRAINTE COMPTE DES SÉANCES, LE CLASSEMENT MESURE DES MINUTES.
 *
 * `sessions_max` est un compte de séances ; le tri qui décide laquelle part se fait en MINUTES.
 * Le classement optimise donc une grandeur que la contrainte ne mentionne pas — six séances de
 * 30 min et six de 90 min satisfont le même plafond. La conséquence n'est pas neutre : la nage
 * a structurellement les séances les plus courtes (50 min contre 68 à vélo, 203 en brick), donc
 * un budget de TEMPS DE VIE devient un arbitrage ENTRE DISCIPLINES, toujours au détriment de la
 * plus courte — et d'autant plus sûrement qu'elle LIMITE l'athlète, puisque le moteur lui en
 * prescrit alors davantage.
 *
 * ── POURQUOI CE CRITÈRE PORTE LA PROPRIÉTÉ ET NON LE MÉCANISME ────────────────────────────
 *
 * Le fondateur a demandé la PROPRIÉTÉ plutôt que l'ordre de priorité, « parce que ça survivra à
 * une réécriture du tri ». Elle s'énonce sans nommer aucune passe : *la coupe ne retire jamais
 * d'une discipline une part plus grande que celle qu'elle occupe dans le plan prescrit.*
 *
 * ── ET POURQUOI ELLE SE MESURE SANS CONTREFACTUEL ─────────────────────────────────────────
 *
 * Comparer « avec coupe » et « sans coupe » demanderait deux générations qui diffèrent aussi
 * PAR AILLEURS (`budgetPerWeek` alimente d'autres passes) : la causalité ne se lit pas sur un
 * diff de lot. La coupe DIT donc ce qu'elle retire, via la trace — dont `scripts/trace.mjs`
 * vérifie à chaque exécution qu'elle est sans effet sur la sortie. Le prescrit devient
 * `livré + retiré`, sur UNE seule génération.
 *
 * ── LE PIÈGE DE LA VACUITÉ, FERMÉ ─────────────────────────────────────────────────────────
 *
 * Le correctif le moins coûteux qui ferait passer ce test est « ne rien couper » : sans retrait,
 * la propriété est trivialement vraie (règle 19, la question se pose AVANT d'écrire). Le critère
 * exige donc que la coupe MORDE sur ses profils — un profil où elle ne retire rien ne prouve
 * rien et le dit.
 */
T("T-44", "rouge", "PROPRIÉTÉ — la coupe par sessions_max ne retire pas d'une discipline plus que sa part du plan prescrit (O-66)", () => {
  const base = { intent: "competition", history: "confirme", level: "inter", vol_max: "10",
    vol_recent: "6", dispo: "semaine", off_days: "non", injury: "aucune", age: "35", sex: "H",
    weight: "85", med_pain: "non", med_dizzy: "non", med_treat: "non", terrain: "vallonne",
    leg_swim_env: "lac", milieu: "bassin", longest_swim_m: "1000", longest_swim_known: "oui",
    pace_known: "oui", pace: "5:00", ftp_known: "oui", ftp: "220", css_known: "oui", css: "1:50" };
  const lundi = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
  const dans = (n) => { const d = lundi(); d.setDate(d.getDate() + n * 7 - 1); return d.toISOString().slice(0, 10); };
  const TOL = 0.10;   // 10 points de pourcentage : une coupe strictement proportionnelle
                      // n'existe pas sur des entiers, mais 98 % contre 38 % n'est pas un arrondi.
  const bad = [], vus = [];
  let mordu = 0;
  for (const [format, h, dbl, sm] of [["70.3", 40, "oui", "6"], ["70.3", 30, "oui", "7"], ["Full", 40, "oui", "6"], ["M", 20, "parfois", "5"]]) {
    const id = `${format}/${h}sem/dbl=${dbl}/sm=${sm}`;
    traceOn(id);
    let p;
    try { p = globalThis.EBV2.buildPlan("tri", { ...base, format, doubles: dbl, sessions_max: sm, race_date: dans(h) }); }
    catch (e) { traceOn(null); bad.push(`${id} : REFUS ${String(e.message ?? e).slice(0, 40)}`); continue; }
    const retraits = traceDump().entries.filter((x) => x.pass === "budget-seances");
    traceOn(null);
    const livre = {}, retire = {};
    for (const w of p.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? [])
      if (s.d !== "rs") livre[s.d] = (livre[s.d] || 0) + 1;
    for (const x of retraits) retire[x.discipline] = (retire[x.discipline] || 0) + 1;
    const totRet = Object.values(retire).reduce((a, b) => a + b, 0);
    if (!totRet) { vus.push(`${id} : la coupe ne mord pas`); continue; }
    mordu++;
    const prescrit = {};
    for (const k of new Set([...Object.keys(livre), ...Object.keys(retire)])) prescrit[k] = (livre[k] || 0) + (retire[k] || 0);
    const totPre = Object.values(prescrit).reduce((a, b) => a + b, 0);
    for (const d of Object.keys(prescrit)) {
      const partRet = (retire[d] || 0) / totRet, partPre = prescrit[d] / totPre;
      if (partRet > partPre + TOL) bad.push(`${id} : ${d} subit ${(100 * partRet).toFixed(0)} % des retraits pour ${(100 * partPre).toFixed(0)} % du plan prescrit (${retire[d]}/${totRet} retirées, ${prescrit[d]}/${totPre} prescrites)`);
    }
    vus.push(`${id} ${totRet} retrait(s) ${Object.entries(retire).map(([k, n]) => k + ":" + n).join(",")}`);
  }
  // SANS MORSURE, LE CRITÈRE NE MESURE RIEN — et « ne rien couper » est justement le correctif
  // le moins coûteux qui le ferait passer.
  if (!mordu) bad.push("VACUEUX : la coupe ne mord sur aucun profil du jeu — le critère est satisfait par construction");
  return { ok: !bad.length, detail: bad.length ? bad.slice(0, 5).join(" · ") : vus.join(" · ") };
});

// QUI PAIE §2 (18/08/2026) — LA POLITIQUE DE FINANCEMENT, GARDÉE SUR SES DEUX MOITIÉS.
// (1) le TÉMOIN comportemental : la famille que le golden a montrée déplacée par l'orientation
//     (57 profils, duathlon/S en tête) — un jour qui porte un créneau protégé et qui était
//     COUPÉ (« off ») survit dès qu'une autre victime existe. Le témoin épingle UN profil de
//     cette famille avec sa raison ; il suit l'état du moteur (famille C30-A/O-51).
// (2) le CLIQUET de présence : le balayage tri serré rend 48 semaines de charge sans nage
//     non-récup sur 324 — un chiffre qui appartient à O-66 (budgets sessions_max minuscules),
//     PAS à l'orientation (vérifié inerte dessus, un facteur à la fois) ; la politique ne doit
//     jamais le faire MONTER. Population épinglée (un zéro/compte a besoin de sa population).
// Contre-preuve post-commit : `npm run casser` sur le filtre `skipProtege` → (1) rougit.
/**
 * T-49 — TOUT NOM DE ZONE RÉFÉRENCÉ DANS LE CODE EXISTE DANS `ZDEF` (contrôle STATIQUE).
 *
 * Demandé par le fondateur après `bk.easy` (« CORRECTEUR SANS TRACE » §3) : une zone qui
 * n'existe pas, écrite dans C26c, **latente depuis son écriture** parce que la cible ne tombait
 * jamais sur un bloc vélo, exposée des mois plus tard par l'ordre de cession — 64 violations
 * dures d'un coup. « Protégé par le chemin, pas par la borne », deuxième occurrence du fil.
 *
 * `T-20` assertait qu'un STEP LIVRÉ porte une intensité résoluble : c'est une propriété de
 * SORTIE, donc elle ne voit que les chemins empruntés. Celle-ci lit le CODE et voit donc aussi
 * ce qui n'a jamais tourné — la seule façon de garder un défaut latent sur tous les corpus.
 *
 * Deux moitiés, parce que le défaut avait deux formes possibles :
 *   (1) un LITTÉRAL de zone inconnu de `ZDEF` ;
 *   (2) un nom de zone CONSTRUIT par concaténation — la forme exacte du bug (`disc + ".easy"`),
 *       qu'aucun contrôle de littéral ne peut voir. On l'interdit : un nom de zone est un
 *       littéral, ou il vient d'une table.
 */
T("T-49", "vert", "tout nom de zone du code existe dans ZDEF, et aucun n'est fabriqué par concaténation", () => {
  const connues = new Set(Object.keys(ZDEF));
  const pb = [];
  let litteraux = 0, fichiers = 0;
  const sansCommentaires = (x) => x
    .replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, " "))
    .replace(/^(\s*)\/\/.*$/gm, "$1");
  const dossiers = ["src/generator", "src/sports", "src/engine"];
  const fs = [];
  const walk = (d) => {
    for (const e of readdirSync(resolve(ROOT, d), { withFileTypes: true })) {
      if (e.isDirectory()) walk(d + "/" + e.name);
      else if (e.name.endsWith(".ts")) fs.push(d + "/" + e.name);
    }
  };
  for (const d of dossiers) walk(d);
  for (const f of fs) {
    fichiers++;
    const src = sansCommentaires(readFileSync(resolve(ROOT, f), "utf8"));
    // (1) les littéraux « disc.zone »
    for (const m of src.matchAll(/"((?:sw|bk|rn|tr)\.[a-z0-9]+)"/g)) {
      litteraux++;
      if (!connues.has(m[1])) pb.push(`${f} : zone inconnue « ${m[1]} »`);
    }
    // (2) la FABRICATION d'un nom de zone : une affectation à `.zone` qui contient un `+`.
    for (const m of src.matchAll(/\.zone\s*=\s*([^;\n]+)/g)) {
      if (/\+/.test(m[1]) && /"\./.test(m[1])) pb.push(`${f} : nom de zone FABRIQUÉ par concaténation — ${m[1].trim().slice(0, 60)}`);
    }
  }
  if (litteraux < 100) pb.push(`POPULATION : ${litteraux} littéral(aux) de zone trouvés dans ${fichiers} fichiers — la sonde ne lit plus le code`);
  return { ok: pb.length === 0, detail: pb.length ? `${pb.length} : ` + pb.slice(0, 3).join(" · ") : `${litteraux} littéraux de zone dans ${fichiers} fichiers, tous dans ZDEF ; aucun nom fabriqué` };
});

/**
 * T-48 — AU PIC, LE VO2 CÈDE AVANT LA NAGE SEUIL (arbitrage « C26c AU PIC », 18/08/2026).
 *
 * R13.4 tient QUAND IL Y A DE LA PLACE ; il ne tranche pas quand deux choses veulent le même
 * créneau dur. Quand `C26c` sature au pic, l'ordre est : le brick ne cède jamais, le VO2 cède
 * en premier, la nage seuil après lui. Trois raisons — spécificité, asymétrie du coût,
 * réversibilité (le VO2 se retrouve en quelques séances, une technique de nage dégradée non).
 *
 * ⚠ MA PREMIÈRE ÉCRITURE MESURAIT O-74, PAS L'ORDRE DE CESSION. Elle exigeait « jamais de VO2
 * au pic pendant que la nage seuil est absente » et rendait 72 profils — mais sur ces plans la
 * nage seuil N'EXISTE PAS en charge de pic (c'est O-74, un défaut distinct et non traité), et un
 * ordre de cession ne peut pas protéger une séance qui n'est pas là. Troisième « énoncé sans
 * objet » de la journée, la famille que R20.6 a retirée du banc d'invariants.
 *
 * Ce qui EST observable sans trace, c'est la COMPOSITION du pic livré, et elle se garde en
 * cliquet — deux totaux et leur population. La contre-preuve est directe : retirer l'ordre de
 * cession ramène 10 308 min de VO2 et 406 896 m de nage seuil.
 */
// ⚠ POPULATION 187, PAS 148 : ma sonde ad hoc filtrait sur `sport`, le critère lit la CLÉ du
// golden (qui porte aussi les passes B17/allure/…). Les deux TOTAUX sont pourtant identiques —
// c'est le DÉNOMINATEUR qui différait, pas la mesure : un ratio se lit en cherchant sa base.
// Sans ordre de cession, les mêmes 187 profils rendent vo2 10 308 min et nage seuil 406 896 m.
const PIC_ATTENDU = { vo2Min: 8628, seuilM: 424683, profils: 187 };
T("T-48", "vert", "la composition du PIC en tri est épinglée : le VO2 a cédé, la nage seuil a gagné (C26c)", () => {
  let vo2 = 0, seuil = 0, profils = 0;
  for (const { key, plan } of goldenAvecMoteur()) {
    if (!key.includes("/tri/") && !key.startsWith("tri/")) continue;
    const pics = (plan.weeks ?? []).filter((w) => w.phase?.id === "peak" && !w.isRecup);
    if (!pics.length) continue;
    profils++;
    for (const w of pics) for (const d of w.days ?? []) for (const sx of d.sessions ?? []) {
      vo2 += (sx.steps || []).filter((b) => /\.vo2$/.test(String(b.zone || ""))).reduce((t, b) => t + (b.reps || 1) * (b.durationMin || 0), 0);
      if (sx.d === "sw" && /seuil/i.test(sx.name || "")) {
        seuil += (sx.steps || []).filter((b) => b.zone === "sw.css").reduce((t, b) => t + (b.reps || 1) * (b.distanceM || 0), 0);
      }
    }
  }
  const pb = [];
  if (profils !== PIC_ATTENDU.profils) pb.push(`POPULATION ${profils} au lieu de ${PIC_ATTENDU.profils}`);
  if (Math.abs(vo2 - PIC_ATTENDU.vo2Min) > 1) pb.push(`VO2 ${Math.round(vo2)} au lieu de ${PIC_ATTENDU.vo2Min} min`);
  if (Math.abs(seuil - PIC_ATTENDU.seuilM) > 25) pb.push(`nage seuil ${seuil} au lieu de ${PIC_ATTENDU.seuilM} m`);
  return { ok: pb.length === 0, detail: pb.length ? pb.join(" · ") : `${profils} profils tri · VO2 ${Math.round(vo2)} min · nage seuil ${seuil} m au pic` };
});

T("T-47", "vert", "la dose de seuil nage n'atteint son plafond qu'en phase de PIC (pièce 2)", () => {
  const pb = [];
  let profils = 0, doses = 0;
  for (const { key, plan } of goldenAvecMoteur()) {
    if (!/^[^/]*\/?tri\//.test(key) && !key.includes("/tri/")) continue;
    const vus = [];
    for (const w of plan.weeks ?? []) {
      if (w.isRecup || w.phase?.id === "taper") continue;
      for (const d of w.days ?? []) for (const sx of d.sessions ?? []) {
        if (sx.d !== "sw" || !/seuil/i.test(sx.name || "")) continue;
        const css = (sx.steps || []).filter((st) => st.zone === "sw.css");
        if (!css.length) continue;
        const m = css.reduce((t, st) => t + (st.reps || 1) * (st.distanceM || 0), 0);
        const minSem = (w.days ?? []).reduce((t, dd) => t + (dd.sessions ?? []).reduce((u, ss) => u + (ss.race ? 0 : (ss.min || 0)), 0), 0);
        vus.push({ num: w.num, ph: w.phase?.id, m, minSem });
      }
    }
    // OBJET DU CRITÈRE — une trajectoire ne se montre que là où le PLAFOND DE DOSE gouverne.
    // Mesuré sur `G/tri/Full/mineur-format-ouvert` (16 ans, format M, 11 semaines) : ses cinq
    // doses valent 450 à 675 m, soit 9 à 14 min, très SOUS le plafond — elles sont gouvernées par
    // le volume de la semaine, pas par la trajectoire, et leur ordre ne dit donc rien d'elle.
    // Le seuil porte sur le NOMBRE d'occurrences parce que c'est la grandeur observable sans
    // refaire la conversion mètres → minutes ici (le CSS n'est pas exposé au critère) ; les plans
    // qu'il écarte sont les plans courts à petit format, exactement ceux où le plafond ne mord pas.
    if (vus.length < 6) continue;
    profils++; doses += vus.length;
    // la dose se compare en MÈTRES ici : à CSS constant dans un plan, mètres et minutes sont
    // proportionnels — et c'est la seule grandeur lisible sans refaire la conversion.
    const mx = Math.max(...vus.map((v) => v.m));
    // (1) LE DÉFAUT CORRIGÉ : la première occurrence ne naît plus à sa taille finale.
    if (vus[0].m >= mx * 0.9) pb.push(`${key} : première occurrence déjà à ${Math.round((vus[0].m / mx) * 100)} % du maximum`);
    // (2) LE PLAFOND EST RÉSERVÉ AU PIC — mais seulement là où le critère a un OBJET.
    //   ⚠ Ma première écriture ne posait pas cette condition et rendait 28 échecs dont deux à
    //   « pic 0 m » : sur `tri/*/reprise/*`, les semaines de CHARGE du pic ne portent AUCUNE
    //   nage seuil (elle n'existe qu'en semaine de récup). Exiger « le maximum est au pic » d'un
    //   plan sans nage seuil au pic, c'est la famille des trois invariants que R20.6 a retirés :
    //   un énoncé sans objet, pas un défaut. Le fait est RÉEL et suivi à part (O-74).
    //   ⚠ Et la tolérance est en ABSOLU, pas en pourcentage : le bloc est quantifié par pas de
    //   25 m, donc 50 m = 1 min au CSS = le bruit de l'instrument. Mesuré sur les profils
    //   concernés : médiane +50 m, c'est-à-dire exactement ce quantum (corollaire règle 14).
    // (2) « le plafond n'est atteint qu'au pic » N'EST PAS GARDÉ ICI, et c'est mesuré plutôt
    // qu'omis. Sur 7 profils (`Full/injury-*`, `master`, `vol-min`), la dose du pic est SOUS
    // celle de la spécifique — 1750 m en S24 contre 1625 m au pic — alors que le volume de la
    // semaine, lui, MONTE (487 → 534 min). Ma première hypothèse (« les règles de sécurité
    // allègent le pic ») est donc RÉFUTÉE par la mesure. La cause réelle est le plafond de temps
    // DUR hebdomadaire (C26c) : au pic, le VO2 et le brick à allure course saturent le budget, et
    // la dose de seuil nage est la variable d'ajustement. C'est une règle de SÉCURITÉ (priorité 2
    // du manifeste), pas un défaut de trajectoire — et la question qu'elle pose (qui, du VO2 ou
    // de la nage, doit céder au pic ?) est une question d'ALLOCATION, déjà ouverte en O-72.
    // Écrire ici un critère qui la déclarerait fautive reviendrait à demander au moteur de
    // dépasser un plafond physiologique pour satisfaire une garde d'affichage.
  }
  if (profils < 40) pb.push(`POPULATION : ${profils} profil(s) tri examinés — la sonde ne voit plus les nages seuil`);
  return {
    ok: pb.length === 0,
    detail: pb.length ? `${pb.length} : ` + pb.slice(0, 3).join(" · ") : `${profils} profils tri · ${doses} doses de seuil, plafond réservé au pic`,
  };
});

/**
 * T-46 — AUCUN SITE N'ÉLIT UNE VICTIME SANS PASSER PAR LE POINT UNIQUE.
 *
 * Balayage du §3 de « L'INVENTAIRE DES PLANCHERS » (fondateur, 18/08/2026) : *« qu'est-ce qui
 * protège la semaine de course, l'affûtage et la veille — et est-ce une borne, ou un ordre de
 * passage ? »* Réponse mesurée : un ORDRE DE PASSAGE. **Dix sites élisent une victime par
 * minimum de minutes**, et chacun portait sa propre liste d'exclusions ; deux pouvaient encore
 * supprimer le déverrouillage de la veille — dont un que j'avais annoncé fermé la veille (mon
 * `replace(…, 1)` n'avait patché que la première de deux chaînes identiques).
 *
 * Ce critère est STATIQUE et c'est voulu : il ne porte pas sur le COMPORTEMENT du moteur (que
 * la règle 15 veut observé sur le livré) mais sur la DUPLICATION d'une règle — la même famille
 * que T-28 (« une borne, une source »). Mesuré : les deux trous sont LATENTS sur les deux
 * corpus (golden 989 : 0 écart · banc r15 648 configs : vert avec ou sans) — donc aucune
 * mesure de sortie ne peut les garder. Ce qui les garde, c'est l'absence de duplication.
 */
T("T-46", "vert", "toute élection de victime passe par le point unique (`estIntouchable`/`jourIntouchable`, §3 planchers)", () => {
  // ⚠ les commentaires sont NEUTRALISÉS EN PLACE, retour à la ligne conservé : ma première
  // écriture les supprimait, ce qui DÉCALE la numérotation et faisait pointer le critère sur
  // une ligne innocente (il annonçait « planGenerator:2377 », qui n'élit rien). Un instrument
  // qui nomme la mauvaise ligne envoie corriger le mauvais endroit.
  const sansCommentaires = (x) => x
    .replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, " "))
    .replace(/^(\s*)\/\/.*$/gm, "$1");
  const pb = [];
  let sites = 0;
  for (const f of ["src/generator/planGenerator.ts", "src/generator/repairLoop.ts"]) {
    const lignes = sansCommentaires(readFileSync(resolve(ROOT, f), "utf8")).split("\n");
    lignes.forEach((l, i) => {
      // une ÉLECTION : on retient le minimum de minutes parmi des candidats.
      if (!/dayMin\(y\) < dayMin\(x\)|m < victim\.min/.test(l)) return;
      sites++;
      // les exclusions du site vivent dans les ~20 lignes qui précèdent l'élection.
      const fenetre = lignes.slice(Math.max(0, i - 22), i + 1).join("\n");
      if (!/estIntouchable|jourIntouchable/.test(fenetre)) pb.push(`${f}:${i + 1} — élit sans passer par estIntouchable`);
    });
  }
  if (sites < 8) pb.push(`POPULATION : ${sites} site(s) trouvé(s), la sonde ne voit plus les élections`);
  return { ok: pb.length === 0, detail: pb.length ? pb.join(" · ") : `${sites} sites d'élection, tous passent par le point unique` };
});

T("T-45", "vert", "PROPRIÉTÉ — l'orientation « qui paie » épargne les créneaux protégés quand une autre victime existe (QUI_PAIE §2)", () => {
  const bad = [];
  // (1) témoin : duathlon/S/ancien/avance/finir — golden : weeks[4].days[2] « off » → « facile »
  const a = { sport: "duathlon", intent: "finir", format: "S", history: "ancien", level: "avance",
    vol_max: "10", vol_recent: "5", sessions_max: "7", dispo: "quotidienne", shift_ok: "oui",
    off_days: "non", doubles: "oui", injury: "aucune", age: "32", sex: "H", weight: "75", height: "178",
    terrain: "plat", ftp_known: "non", pace_known: "non", css_known: "non",
    med_pain: "non", med_dizzy: "non", med_treat: "non" };
  const p = EBV2.buildPlan("duathlon", a);
  const j = p.weeks[4] && p.weeks[4].days[2];
  if (!j) bad.push("témoin introuvable (weeks[4].days[2])");
  else if (!j.sessions.some((s) => s.d !== "rs")) bad.push(`témoin : le jour protégé est redevenu OFF (charge=${j.charge})`);
  // (2) cliquet de présence — même balayage que la mesure du 18/08, compte épinglé
  let sans = 0, tot = 0;
  for (const format of ["S", "M", "70.3", "Full"]) for (const sm of ["3", "5", "7"]) for (const dbl of ["non", "oui"]) {
    const b = { sport: "tri", intent: "competition", format, history: "confirme", level: "inter",
      vol_max: "10", vol_recent: "5", sessions_max: sm, dispo: "partielle", off_days: "non", doubles: dbl,
      injury: "aucune", age: "35", sex: "H", weight: "75", med_pain: "non", med_dizzy: "non", med_treat: "non",
      terrain: "vallonne", milieu: "bassin", longest_swim_m: "1000", longest_swim_known: "oui",
      css_known: "non", ftp_known: "non", pace_known: "non" };
    let q; try { q = EBV2.buildPlan("tri", b); } catch { continue; }
    for (const w of q.weeks) {
      if (w.isRecup || w.phase.id === "taper") continue;
      if (w.days.length < 7 || w.days.some((d) => d.sessions.some((s) => s.race))) continue;
      tot++;
      if (!w.days.some((d) => d.sessions.some((s) => s.d === "sw" && !s.recovery && s.d !== "rs"))) sans++;
    }
  }
  if (tot !== 324) bad.push(`population du cliquet : ${tot} semaines balayées, 324 attendues — le compte ne prouve rien sans elle`);
  if (sans > 48) bad.push(`cliquet : ${sans} semaines de charge sans nage non-récup (épinglé 48) — la politique a fait MONTER ce qu'elle devait tenir`);
  return { ok: !bad.length, detail: bad.length ? bad.join(" · ") : `témoin vivant · cliquet ${sans}/48 sur ${tot} semaines` };
});

const ROUGES_ATTENDUS = {
  "T-44": "O-66 — la coupe classe en MINUTES une contrainte qui compte des SÉANCES : arbitrage rendu le 17/08, à faire APRÈS le merge et en premier",
  "T-34": "O-43 — la conversion déplace ce qui est prescrit (pic +9 %, fréquence) : filtre du fondateur, une seule issue le passe",
  "T-01": "A-01 — sessionIntensity() importe zoneClass() au lieu de sa copie (+ V-08 pour sw.aero)",
  "T-02": "A-01 — la zone fantôme vit dans la copie de dailyAdjuster",
  "T-03": "B-01 — plafond de la sortie longue (arbitrage 13/08 : indexé volume, jamais devant C30)",
  "T-04": "B-02 — plafond de temps dur proportionnel (arbitrage 13/08 : 12 %, bornes 25-60, impact)",
  "T-05": "B-03 — interlock modéré/plancher de facile (C26d arbitré avec B-02a)",
  "T-08": "N-02 — refonte nutrition (séances de répétition nutritionnelle en spécifique)",
  "T-09": "A-02 — tables DUA_* mortes de duathlon/tables.ts",
  "T-10": "A-04 — champ sensitivity sur chaque entrée de PROVENANCE",
  "T-11": "A-05/A-06 — bornes inline remplacées par les tables sourcées",
  "T-12": "B-23 étendu — fourchettes d'incertitude hors swimrun",
  "T-13": "N-01 — renforcement musculaire tous sports (Lauersen 2014)",
  "T-14": "N-02 — cible glucidique horaire par séance longue",
  "T-17": "B-23 — fourchettes des sous-segments swimrun",
  "T-18": "B-23 — bandes des estimations de fait swimrun",
  "T-25": "O-35 — unités de la chaîne natation/trail + rendu discret (les « 18 min » du DOC_UNIQUE §0)",
  "T-23": "O-35 — mêmes causes que T-25, vues de l'écran (BUGS_OUVERTS.md)",
  "T-21": "généralisation du patron B-24/V-11 : records de décision partout (ARBITRAGES_STOP_PHASE2 §6)",

  "O-39": "O-39 — `rp` seul reste sans plafond ni exemption (css EST plafonné via la branche thr) : règle structurelle §2 à écrire",
  "T-30": "O-36 item 3 — durée de répétition comme source, distance dérivée (contrat B-25 étendu)",
  "T-22": "B-26 — les bricks reçoivent leurs steps zonés (416 séances duathlon chiffrées ; T-22 en a trouvé AUSSI en tri : « Brick vélo+CAP », périmètre B-26 à élargir)",
};

const res = TESTS.map((t) => {
  let r;
  try { r = t.fn(); } catch (e) { r = { ok: false, detail: "banc cassé : " + String(e?.message ?? e) }; }
  return { ...t, ...r };
});

console.log(`BANC DU LOT fix/moteur-physio — ${plans.length} profils de référence\n`);
let regressions = 0, dette = 0, verts = 0, cliquet = 0;
for (const r of res) {
  const etat = r.ok ? "vert " : "ROUGE";
  const conforme = (r.ok && r.attendu === "vert") || (!r.ok && r.attendu === "rouge");
  if (r.ok) verts++; else if (r.attendu === "rouge") dette++;
  if (!conforme && !r.ok) regressions++;
  const marque = r.ok ? "✓" : r.attendu === "rouge" ? "·" : "✖";
  console.log(`${marque} ${r.id} [${etat}] ${r.quoi}`);
  if (!r.ok) console.log(`      ${r.detail}`);
  if (!r.ok && r.attendu === "rouge") {
    if (ROUGES_ATTENDUS[r.id]) console.log(`      ↳ fermé par : ${ROUGES_ATTENDUS[r.id]}`);
    else { cliquet++; console.log(`      ✖ CLIQUET §6.3 : rouge attendu HORS LISTE — l'inscrire dans ROUGES_ATTENDUS avec son ticket de fermeture`); }
  }
  if (r.ok && r.attendu === "rouge") console.log(`      ⚠ attendu ROUGE et il est VERT — passer son \`attendu\` à "vert" (il devient un garde-fou)`);
  if (r.ok && ROUGES_ATTENDUS[r.id]) { cliquet++; console.log(`      ✖ CLIQUET §6.3 : ce test est VERT — retirer son entrée de ROUGES_ATTENDUS et passer \`attendu\` à "vert" dans ce commit`); }
}
// une entrée de la liste qui ne correspond plus à aucun test déclaré rouge est périmée
for (const id of Object.keys(ROUGES_ATTENDUS)) {
  const t = res.find((x) => x.id === id);
  if (!t || t.attendu !== "rouge") { cliquet++; console.log(`✖ CLIQUET §6.3 : entrée périmée « ${id} » dans ROUGES_ATTENDUS (test absent ou déjà attendu vert)`); }
}
console.log(`\n${verts} vert(s) · ${dette} rouge(s) attendu(s) — chacun listé avec son ticket (§6.3) · ${regressions} régression(s)` + (cliquet ? ` · ${cliquet} accroc(s) au cliquet` : ""));
if (regressions) console.log("✖ RÉGRESSION : un test qui passait échoue.");
if (cliquet) console.log("✖ CLIQUET §6.3 : la liste des rouges attendus ne colle plus à l'état du banc.");
process.exit(regressions || cliquet || (strict && dette) ? 1 : 0);
