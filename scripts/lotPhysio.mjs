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
import { C26c_HARD_TIME_TOLERANCE, PROVENANCE, easyShareFloor } from "../src/engine/constraintMatrix.ts";
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
T("T-01", "rouge", "zoneClass() et sessionIntensity() classent identiquement toute zone de ZDEF", () => {
  const MAP = { hard: "difficile", mod: "moderee", easy: "facile" };
  const ecarts = [];
  for (const zone of Object.keys(ZDEF)) {
    const attendu = MAP[zoneClass(zone)];
    const obtenu = sessionIntensity({ d: "rn", min: 60, steps: [{ role: "body", zone, durationMin: 60 }] });
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
// V-08 a réfuté la prémisse du ticket : la ligne SEUIL est homogène (sw.css, bk.thr et rn.thr
// sont tous trois `hard`). La divergence est sur la ligne TEMPO — `sw.aero` est `easy` quand
// ses homologues sont `mod`, alors qu'à 1/1,06 il vaut 94,3 % de la vitesse seuil, soit au
// moins aussi exigeant que `bk.ss` (88-94 % FTP) et `rn.mara` (88-93 % de la vitesse seuil).
const DOMAINES = [
  ["facile / Z2", ["rn.easy", "bk.z2", "sw.easy"]],
  ["tempo / sweetspot", ["rn.mara", "bk.ss", "sw.aero"]],
  ["seuil", ["rn.thr", "bk.thr", "sw.css"]],
  ["VO2max", ["rn.vo2", "bk.vo2", "sw.vo2"]],
];
T("T-15", "rouge", "un domaine physiologique reçoit la même classe dans les trois disciplines", () => {
  const ecarts = [];
  for (const [nom, zones] of DOMAINES) {
    const cls = zones.map((z) => `${z}=${zoneClass(z)}`);
    if (new Set(zones.map((z) => zoneClass(z))).size > 1) ecarts.push(`${nom} : ${cls.join(" ")}`);
  }
  return { ok: !ecarts.length, detail: `${ecarts.length}/${DOMAINES.length} domaine(s) non homogène(s) — ` + ecarts.join(" · ") };
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
const CAPS_R202 = (L) => [["ton volume demandé", L.declared], ["ton historique", L.caps], ["le volume utile du format", L.util]];
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
    if (trois.some(([q]) => q === quoi)) {
      nomme++;
      if (trois.reduce((x, y) => (y[1] < x[1] ? y : x))[0] !== quoi) desaccord++;
    }
    // (b) — le chiffre écrit dans la phrase contre la valeur modulée du plafond nommé.
    const table = quoi === "ton historique" ? L.caps : quoi === "le volume utile du format" ? L.util : null;
    const dit = _hSem(dec.why);
    if (table == null || dit == null) continue;
    cite++;
    const queue = L.marg * L.recup * L.swimTime * L.med * (r.loadFactor < 1 ? r.loadFactor : 1);
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

// ---- verdict --------------------------------------------------------------
const res = TESTS.map((t) => {
  let r;
  try { r = t.fn(); } catch (e) { r = { ok: false, detail: "banc cassé : " + String(e?.message ?? e) }; }
  return { ...t, ...r };
});

console.log(`BANC DU LOT fix/moteur-physio — ${plans.length} profils de référence\n`);
let regressions = 0, dette = 0, verts = 0;
for (const r of res) {
  const etat = r.ok ? "vert " : "ROUGE";
  const conforme = (r.ok && r.attendu === "vert") || (!r.ok && r.attendu === "rouge");
  if (r.ok) verts++; else if (r.attendu === "rouge") dette++;
  if (!conforme && !r.ok) regressions++;
  const marque = r.ok ? "✓" : r.attendu === "rouge" ? "·" : "✖";
  console.log(`${marque} ${r.id} [${etat}] ${r.quoi}`);
  if (!r.ok) console.log(`      ${r.detail}`);
  if (r.ok && r.attendu === "rouge") console.log(`      ⚠ attendu ROUGE et il est VERT — passer son \`attendu\` à "vert" (il devient un garde-fou)`);
}
console.log(`\n${verts} vert(s) · ${dette} rouge(s) attendu(s) — la dette que le lot corrige · ${regressions} régression(s)`);
if (regressions) console.log("✖ RÉGRESSION : un test qui passait échoue.");
process.exit(regressions || (strict && dette) ? 1 : 0);
