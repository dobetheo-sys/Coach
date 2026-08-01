#!/usr/bin/env node
/**
 * Golden master (spec R10, § R10.1.4) — le filet de sécurité des extractions mécaniques.
 *
 * Principe : avant de déplacer du code, on photographie CE QUE LE MOTEUR PRODUIT sur un large
 * balayage de profils. Après, on re-photographie. Un seul plan différent = l'extraction est
 * fausse. On ne justifie pas un écart, on le corrige — ou on déclare le changement VOULU en
 * recapturant explicitement (`--capture`), ce qui laisse une trace dans le diff git.
 *
 *   node scripts/goldenMaster.mjs --capture   # écrit golden/hashes.json (+ la photo locale)
 *   node scripts/goldenMaster.mjs --verify    # exit 1 au premier écart
 *
 * Deux fichiers, pour une raison : la photo complète pèse ~46 Mo (578 plans détaillés), ce qui
 * n'a rien à faire dans un dépôt. C'est donc l'**empreinte par profil** qui est versionnée
 * (`golden/hashes.json`, ~60 Ko) — elle détecte l'écart au bit près. La photo complète
 * (`golden/plans.full.json`, ignorée par git) sert à LOCALISER l'écart : capturée avant la
 * modification, elle donne le chemin exact du champ qui a changé.
 *
 * Espace balayé : 6 sports (les 5 de l'UI + le format `run/trail` encore audité par
 * runV2Audit) × formats × historiques × niveaux × intentions, plus une passe « garde-fous »
 * (blessures, âges limites, terrain, volumes extrêmes) où les régressions de sécurité se
 * cachent. Le trail est inclus AVEC ses données de course : sans elles, on n'auditerait pas
 * le module trail mais ses valeurs par défaut.
 *
 * Normalisation : les dates calendaires sont retirées (un plan démarre le lundi courant —
 * sinon la photo périmerait chaque jour), les flottants sont arrondis, les clés triées.
 * Ce qui reste est exactement ce qu'un athlète lit : structure, séances, textes, décisions.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import "../src/app/bridge.ts"; // définit globalThis.EBV2 — le MÊME chemin que l'app

const ROOT = resolve(import.meta.dirname, "..");
const HASHES = join(ROOT, "golden", "hashes.json"); // versionné
const FULL = join(ROOT, "golden", "plans.full.json"); // local, ignoré par git
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const mode = process.argv.includes("--capture") ? "capture" : process.argv.includes("--verify") ? "verify" : null;
if (!mode) {
  console.error("usage : node scripts/goldenMaster.mjs --capture | --verify");
  process.exit(2);
}

// ---- Espace de profils ----------------------------------------------------
// R12 §0 — swimrun hors V1 (voir scripts/buildApp.mjs) : ses profils sortent du golden avec
// le module. `EB_SWIMRUN=1` les réintègre.
const V1_SWIMRUN = process.env.EB_SWIMRUN === "1";
const FORMATS_ALL = {
  run: ["5k", "10k", "semi", "marathon"], // `run/trail` : encore audité par runV2Audit (D10-1)
  bike: ["crit", "route", "cyclo", "clm", "gravel"],
  swim: ["sprint", "demifond", "fond", "ow"],
  tri: ["S", "M", "70.3", "Full"],
  trail: [""], // pas de format : la catégorie d'effort est déduite (R7)
  duathlon: ["S", "M", "L", "PM"], // R10 phase 2
  swimrun: ["experience", "sprint", "series", "championship"], // R10 phase 3 (hors V1 par défaut)
};
const FORMATS = Object.fromEntries(Object.entries(FORMATS_ALL).filter(([k]) => V1_SWIMRUN || k !== "swimrun"));
const HISTORIES = ["reprise", "confirme", "ancien"];
const LEVELS = ["debutant", "inter", "avance"];
const INTENTS = ["competition", "finir", "plaisir"];

const base = () => ({
  vol_max: "10", sessions_max: "6", dispo: "semaine", off_which: "", injury: "", age: "35",
  ftp_known: "oui", ftp: "250", pace_known: "oui", pace: "4:30", css_known: "oui", css: "1:55", races: "non",
});
const swimrunExtras = () => ({
  swim_total_m: "7850", run_total_km: "33", race_dplus_m: "900", segments_n: "20",
  longest_swim_m: "1400", water_temp_c: "16", team_mode: "binome", openwater_access: "saisonnier",
});
const trailExtras = () => ({
  race_distance_km: "62", race_dplus_m: "3200", race_technicity: "technique", race_night: "partielle",
  train_dplus_access: "collines", treadmill: "non", poles: "a_decider", vam_known: "oui", vam: "850",
});

// Passe « course datée » : l'ancre et l'échéance sont FIXES, sinon la photo périmerait chaque
// semaine (la durée du plan se déduit du nombre de semaines entre l'ancre et la course).
// `plan_start` est dans le passé — c'est la condition pour que l'ancre ne suive pas le
// calendrier ; la course reste dans l'horizon planifiable (< 80 semaines).
const RACE_PASS_START = "2026-01-05"; // un lundi, dans le passé
const RACE_PASS_DATES = ["2027-06-07", "2027-06-08", "2027-06-09", "2027-06-10", "2027-06-11", "2027-06-12", "2027-06-13"];
const JOURS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
// Une date figée finit toujours par entrer dans le passé, et le moteur REFUSE une course
// passée (contrat d'entrée B3). Plutôt qu'une panne obscure dans un an, on prévient huit
// semaines avant, en disant quoi faire.
{
  const alerte = new Date(RACE_PASS_DATES[0] + "T00:00:00Z").getTime() - 56 * 864e5;
  if (Date.now() > alerte) {
    console.error("✖ La passe « course datée » du golden arrive à échéance (" + RACE_PASS_DATES[0] + ").");
    console.error("  À faire : décaler RACE_PASS_DATES d'un an dans scripts/goldenMaster.mjs, puis `npm run golden:capture`.");
    process.exit(2);
  }
}

function* profiles() {
  for (const sport of Object.keys(FORMATS)) {
    for (const format of FORMATS[sport]) {
      for (const history of HISTORIES) {
        for (const level of LEVELS) {
          for (const intent of INTENTS) {
            const a = { ...base(), format, history, level, intent, ...(sport === "trail" ? trailExtras() : sport === "swimrun" ? swimrunExtras() : {}) };
            yield { key: [sport, format || "-", history, level, intent].join("/"), sport, a };
          }
        }
      }
    }
  }
  // Passe « garde-fous » : là où les régressions de SÉCURITÉ se cachent (blessures, âges
  // limites, terrain impraticable, volumes extrêmes, jours bloqués, doubles).
  const guards = [
    ["injury-tibia", { injury: "tibia" }], ["injury-genou", { injury: "genou" }],
    ["injury-epaule", { injury: "epaule" }], ["injury-dos", { injury: "dos" }],
    ["injury-multi", { injury: "tibia,genou" }],
    ["mineur", { age: "16" }], ["master", { age: "62" }],
    ["vol-min", { vol_max: "3", sessions_max: "3" }], ["vol-max", { vol_max: "20", sessions_max: "12" }],
    ["off-2j", { off_days: "oui", off_which: "lun,ven" }], ["doubles", { doubles: "oui", dispo: "quotidienne" }],
    ["vol-recent-bas", { vol_recent: "2", vol_max: "12" }],
    ["terrain-plat", { train_dplus_access: "plat", treadmill: "oui" }],
    // R6 §3.1 — `measured` est une DIMENSION du harnais, pas un cas particulier : absent,
    // fiable, partiel, et incohérent avec la déclaration. Le cas « absent » est déjà couvert
    // par les 820 autres profils — c'est lui le filet (`measured: null` ⇒ plan d'avant).
    ["measured-bas", { vol_recent: "9", measured: { updated_at: "2026-07-30", source: "fit_import", window_days: 28, vol_min: 720, sessions: 12, confidence: "high" } }],
    ["measured-haut", { vol_recent: "2", measured: { updated_at: "2026-07-30", source: "fit_import", window_days: 28, vol_min: 2400, sessions: 24, confidence: "high" } }],
    ["measured-partiel", { vol_recent: "9", measured: { updated_at: "2026-07-30", source: "manual", window_days: 28, vol_min: 300, sessions: 5, confidence: "partial" } }],
    // R11.7 — les trois réponses qui étaient INERTES et qui agissent désormais. Sans ces
    // profils, rien n'empêcherait leur effet de disparaître à nouveau en silence.
    ["dispo-weekend", { dispo: "weekend" }],
    ["dispo-partielle", { dispo: "partielle" }],
    ["cycle", { sex: "F", cycle_sync: "oui", cycle_start: "2026-07-27", cycle_len: "28" }],
    ["poids-levier", { weight_lever: "oui", weight: "82" }],
  ];
  for (const [sport, fmts] of Object.entries(FORMATS)) {
    const format = fmts[fmts.length - 1];
    for (const [label, over] of guards) {
      const a = { ...base(), format, history: "confirme", level: "inter", intent: "competition",
        ...(sport === "trail" ? trailExtras() : sport === "swimrun" ? swimrunExtras() : {}), ...over };
      yield { key: ["G", sport, format || "-", label].join("/"), sport, a };
    }
  }
  // ---- Passe « course datée » (N2) ----------------------------------------
  // ANGLE MORT MESURÉ : aucun des 714 profils précédents ne portait de `race_date`. Toute la
  // branche ancrée sur une course — durée déduite de l'échéance, grille alignée sur le jour J,
  // insertion de la course, fenêtre d'allègement de la veille, affûtage — était donc HORS de
  // la couverture du golden. C'est ce qui a permis à N2 (jusqu'à SIX jours de repos après
  // l'objectif) de vivre sans qu'aucune photo ne bouge. Un filet troué là où le plan est le
  // plus engageant pour l'athlète ne protège rien.
  // Les 7 dates sont les 7 JOURS de la semaine : le jour J n'est pas toujours un dimanche, et
  // c'est justement le jour de la course qui pilote la longueur de la dernière semaine.
  for (const [sport, fmts] of Object.entries(FORMATS)) {
    const format = fmts[fmts.length - 1];
    for (let k = 0; k < RACE_PASS_DATES.length; k++) {
      const a = { ...base(), format, history: "confirme", level: "inter", intent: "competition",
        ...(sport === "trail" ? trailExtras() : sport === "swimrun" ? swimrunExtras() : {}),
        plan_start: RACE_PASS_START, race_date: RACE_PASS_DATES[k] };
      yield { key: ["J", sport, format || "-", JOURS[k]].join("/"), sport, a };
    }
  }
  // ---- Passe « volume et extrapolation » (R14 P5) --------------------------
  // MÊME ANGLE MORT, UN CRAN PLUS BAS. La passe ci-dessus fige `vol_max` au profil de base
  // (10 h/sem) — qui est très exactement l'ancrage où l'exposant de Riegel vaut 1,06, sa
  // valeur historique. Autrement dit : P5 (l'exposant piloté par le volume) ne changeait
  // AUCUNE empreinte, non parce qu'il est sans effet, mais parce que la photo le regardait
  // au seul point où il ne bouge pas. Mesuré sur le texte du jour J d'un marathon daté :
  // 3 h 31 à 3 h/sem contre 3 h 12 à 20 h/sem, là où les deux annonçaient 3 h 17 avant.
  // Les deux bornes du domaine entrent donc sous garde permanente.
  for (const v of ["3", "20"]) {
    const a = { ...base(), vol_max: v, vol_recent: String(Math.max(1, +v - 2)), sessions_max: v === "3" ? "3" : "12",
      format: "marathon", history: "confirme", level: "inter", intent: "competition",
      plan_start: RACE_PASS_START, race_date: RACE_PASS_DATES[6] };
    yield { key: ["P5", "run", "marathon", v + "h"].join("/"), sport: "run", a };
  }
}

// ---- Normalisation canonique --------------------------------------------
const ISO = /^\d{4}-\d{2}-\d{2}/;
const DROP = new Set(["date", "dateISO", "plan_start", "generatedAt", "createdAt", "id"]);

function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) {
      if (DROP.has(k)) continue;                     // dates : la photo ne doit pas périmer
      const val = canon(v[k]);
      if (typeof val === "string" && ISO.test(val)) continue;
      out[k] = val;
    }
    return out;
  }
  if (typeof v === "number") return Math.round(v * 1000) / 1000; // bruit flottant
  return v;
}

function snapshot() {
  const snap = {};
  let n = 0, errors = [];
  for (const { key, sport, a } of profiles()) {
    try {
      snap[key] = canon(globalThis.EBV2.buildPlan(sport, a));
    } catch (e) {
      errors.push(key + " : " + (e && e.message ? e.message : String(e)));
      snap[key] = { ERREUR: String(e && e.message ? e.message : e) };
    }
    n++;
  }
  return { snap, n, errors };
}

const { snap, n, errors } = snapshot();
if (errors.length) {
  console.error("✖ " + errors.length + " profil(s) en erreur :");
  for (const e of errors.slice(0, 5)) console.error("   " + e);
}

const hashes = {};
for (const k of Object.keys(snap).sort()) hashes[k] = sha(JSON.stringify(snap[k]));

if (mode === "capture") {
  mkdirSync(join(ROOT, "golden"), { recursive: true });
  writeFileSync(HASHES, JSON.stringify(hashes, null, 1) + "\n");
  writeFileSync(FULL, JSON.stringify(snap));
  console.log("✓ golden master capturé : " + n + " profils → golden/hashes.json (versionné)"
    + " + golden/plans.full.json (" + Math.round(JSON.stringify(snap).length / 1024 / 1024) + " Mo, local)");
  process.exit(errors.length ? 1 : 0);
}

// ---- Vérification -------------------------------------------------------
if (!existsSync(HASHES)) {
  console.error("✖ aucun golden master : lancer `node scripts/goldenMaster.mjs --capture` d'abord");
  process.exit(2);
}
const ref = JSON.parse(readFileSync(HASHES, "utf8"));
// La photo complète n'est utilisée que si elle correspond à la référence versionnée : une
// photo périmée localiserait un écart imaginaire, ce qui est pire que pas de localisation.
let full = null;
if (existsSync(FULL)) {
  try {
    const cand = JSON.parse(readFileSync(FULL, "utf8"));
    const same = Object.keys(ref).every((k) => cand[k] !== undefined && sha(JSON.stringify(cand[k])) === ref[k]);
    if (same) full = cand;
  } catch { /* photo illisible : on s'en passe */ }
}
const keys = [...new Set([...Object.keys(ref), ...Object.keys(hashes)])];
const diffs = [];
for (const k of keys) {
  if (ref[k] === hashes[k]) continue;
  if (ref[k] === undefined) { diffs.push({ k, why: "profil NOUVEAU (absent de la photo)" }); continue; }
  if (hashes[k] === undefined) { diffs.push({ k, why: "profil DISPARU (présent dans la photo)" }); continue; }
  diffs.push({
    k,
    why: full ? firstDiff(full[k], snap[k], "") ?? "empreinte différente, contenu identique (?)"
      : "empreinte " + ref[k] + " → " + hashes[k] + " (photo locale absente : impossible de localiser)",
  });
}

/** Chemin du premier écart : « où » compte plus que « combien » pour corriger. */
function firstDiff(a, b, path) {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return path + " : " + JSON.stringify(a) + " → " + JSON.stringify(b);
  }
  if (Array.isArray(a) !== Array.isArray(b)) return path + " : type de conteneur changé";
  if (Array.isArray(a) && a.length !== b.length) return path + " : " + a.length + " → " + b.length + " élément(s)";
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = firstDiff(a[k], b[k], path + (Array.isArray(a) ? "[" + k + "]" : "." + k));
    if (d) return d;
  }
  return path + " : écart non localisé";
}

if (!diffs.length) {
  console.log("✓ golden master : " + n + " profils, 0 écart" + (errors.length ? " (mais " + errors.length + " erreur(s) de génération)" : ""));
  process.exit(errors.length ? 1 : 0);
}
console.error("✖ golden master : " + diffs.length + " écart(s) sur " + n + " profils");
for (const d of diffs.slice(0, Number(process.env.GOLDEN_SHOW||12))) console.error("   " + d.k + "\n      " + d.why);
if (diffs.length > 12) console.error("   … et " + (diffs.length - 12) + " autre(s)");
console.error("\nUn écart = l'extraction est fausse. Si le changement est VOULU, recapturer");
console.error("explicitement (`--capture`) pour qu'il apparaisse dans le diff git.");
process.exit(1);
