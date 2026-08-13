#!/usr/bin/env node
/**
 * BANC DU LOT `fix/moteur-physio` — les 14 assertions T-01 à T-14 du handoff.
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
