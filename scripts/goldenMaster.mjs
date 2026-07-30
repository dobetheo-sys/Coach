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
const FORMATS = {
  run: ["5k", "10k", "semi", "marathon"], // `run/trail` : encore audité par runV2Audit (D10-1)
  bike: ["crit", "route", "cyclo", "clm", "gravel"],
  swim: ["sprint", "demifond", "fond", "ow"],
  tri: ["S", "M", "70.3", "Full"],
  trail: [""], // pas de format : la catégorie d'effort est déduite (R7)
  duathlon: ["S", "M", "L", "PM"], // R10 phase 2
  swimrun: ["experience", "sprint", "series", "championship"], // R10 phase 3
};
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
  ];
  for (const [sport, fmts] of Object.entries(FORMATS)) {
    const format = fmts[fmts.length - 1];
    for (const [label, over] of guards) {
      const a = { ...base(), format, history: "confirme", level: "inter", intent: "competition",
        ...(sport === "trail" ? trailExtras() : sport === "swimrun" ? swimrunExtras() : {}), ...over };
      yield { key: ["G", sport, format || "-", label].join("/"), sport, a };
    }
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
