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
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import "../src/app/bridge.ts";
import { ZDEF } from "../src/generator/renderer.ts";
import { zoneClass, intensitySplit } from "../src/engine/loadModel.ts";
import { sessionIntensity } from "../src/readiness/dailyAdjuster.ts";
import { C26c_HARD_TIME_TOLERANCE, PROVENANCE, easyShareFloor, swimTimeFactorOf,
  BRICK_BIKE_BOUNDS, BRICK_TAPER_BIKE_BOUNDS, CAP_BRICK_BIKE, C21_REPRISE_BRICK_FACTOR } from "../src/engine/constraintMatrix.ts";
import { RN_THR_FRONTIERE_LENTE } from "../src/engine/loadModel.ts";
import { TrainingReasoningEngine } from "../src/engine/reasoningEngine.ts";
import { toProfile } from "../src/app/bridge.ts";
import { riegelExponent, riegelSecWith, RUN_KM, marathonPaceBand, RN_MARA_RATIO_PLANCHER } from "../src/engine/predictor.ts";
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

// ---- T-06 · prérequis de nage continue en triathlon ------------------------
// MA PREMIÈRE ÉCRITURE CHERCHAIT `swim_continuous` DANS tri/index.ts **+ answerSchema.ts** et
// rendait VERT : ce champ existe bien dans le schéma… parce que c'est celui du SWIMRUN, qui le
// partage. Le test matchait le gate d'un autre sport et concluait que celui du tri existait.
// Il est donc scopé au module tri seul — le seul endroit où un gate tri peut vivre.
T("T-06", "rouge", "un format tri ≥ M exige une nage continue déclarée (gate type S10)", () => {
  const s = src("sports/tri/index.ts");
  const existe = /swim_continuous|nage_continue|Prereq|prereq/.test(s);
  return { ok: existe, detail: "aucun prérequis de nage continue dans sports/tri/index.ts — le gate S10 existe pour le swimrun, pas pour le tri" };
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
const SCEAU_ATTENDU = { S1: 4, S4: 441, S5: 509 }; // mesuré sur le golden — `npm run mesure:sceau`
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
 * Rouge aujourd'hui, et le balayage dit que c'est une CLASSE et non un accident : `blockBounds`
 * n'a **aucune conscience de la phase** pour un brick — il plafonne par `CAP_BRICK_BIKE` en
 * affûtage comme en charge, quand l'auditeur y applique `BRICK_TAPER_BIKE_BOUNDS` (C21c), dont
 * le plafond est le PLANCHER de la bande de charge. Les 12 couples permissifs sont exactement
 * les 12 lignes d'affûtage (6 formats × 2 historiques) : sur un Full, le générateur se déclare
 * autorisé jusqu'à 300 min là où l'auditeur refuse au-delà de 150.
 *
 * Qu'aucun plan ne les viole aujourd'hui tient au CHEMIN (R18.4 construit le brick d'affûtage
 * ailleurs), pas à la borne — c'est-à-dire à la chance du pipeline. Voir `npm run audit:t28`.
 */
const T28_PERMISSIFS_ATTENDUS = 12;
T("T-28", "rouge", "toute borne auditée est lue par le générateur à la MÊME source que par l'auditeur", () => {
  const gen = (fmt, rf) => [BRICK_BIKE_BOUNDS[fmt][0], Math.round((CAP_BRICK_BIKE[fmt] || 300) * rf)];
  const perm = [];
  for (const fmt of ["S", "M", "70.3", "Full", "L", "PM"])
    for (const [phase, aud] of [["charge", BRICK_BIKE_BOUNDS[fmt]], ["affûtage", BRICK_TAPER_BIKE_BOUNDS[fmt]]])
      for (const [hist, rf] of [["ancien", 1], ["reprise", C21_REPRISE_BRICK_FACTOR]]) {
        const g = gen(fmt, rf);
        if (!(g[0] >= aud[0] && g[1] <= aud[1])) perm.push(`${fmt}/${phase}/${hist} : gén [${g}] ⊄ audit [${aud}]`);
      }
  // Le cliquet joue dans les DEUX sens : une hausse est une régression, une baisse veut dire
  // qu'un couple a été aligné et que le chiffre descend DANS LE MÊME COMMIT.
  const ok = perm.length === 0;
  const derive = perm.length !== T28_PERMISSIFS_ATTENDUS
    ? ` ✖ CLIQUET : ${perm.length} au lieu des ${T28_PERMISSIFS_ATTENDUS} épinglés` : "";
  return { ok, detail: `${perm.length} couple(s) où le générateur est PLUS PERMISSIF que l'auditeur${derive} — ` + perm.slice(0, 3).join(" · ") };
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
const ROUGES_ATTENDUS = {
  "T-01": "A-01 — sessionIntensity() importe zoneClass() au lieu de sa copie (+ V-08 pour sw.aero)",
  "T-02": "A-01 — la zone fantôme vit dans la copie de dailyAdjuster",
  "T-03": "B-01 — plafond de la sortie longue (arbitrage 13/08 : indexé volume, jamais devant C30)",
  "T-04": "B-02 — plafond de temps dur proportionnel (arbitrage 13/08 : 12 %, bornes 25-60, impact)",
  "T-05": "B-03 — interlock modéré/plancher de facile (C26d arbitré avec B-02a)",
  "T-06": "B-17 — prérequis de nage continue en triathlon",
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
  "T-28": "O-38 — blockBounds prend la PHASE pour un brick (12 couples permissifs, tous en affûtage)",

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
