#!/usr/bin/env node
/**
 * RÉFÉRENCE DES 30 PROFILS — l'état « avant » de tous les diffs du lot `fix/moteur-physio`.
 *
 *   node scripts/baseline.mjs --capture        # fige tests/fixtures/baseline/
 *   node scripts/baseline.mjs --diff           # compare l'état courant à la référence
 *   node scripts/baseline.mjs --diff --md B-02 # écrit diffs/B-02.md (livrable de ticket)
 *
 * POURQUOI CE FICHIER EXISTE À CÔTÉ DU GOLDEN MASTER, ET NE LE REMPLACE PAS.
 * Le golden (949 profils) répond « quelque chose a changé, au bit près » — c'est un détecteur,
 * volontairement aveugle au SENS. Il reste FIGÉ pendant tout le lot (décision du fondateur,
 * 13/08) : le lot B va légitimement le faire bouger, et recapturer à chaque ticket rendrait son
 * historique illisible. Ce harnais-ci répond à l'autre question, celle que le handoff exige de
 * chaque ticket du lot B : « qu'est-ce qui a bougé, de combien, et sur quels profils ». Trente
 * profils lisibles, des grandeurs nommées, un rapport en français.
 *
 * Les deux sont nécessaires : un diff métier qui ne bouge pas ne prouve pas qu'un plan n'a pas
 * changé (deux séances peuvent s'échanger sans toucher une seule métrique). Le golden le voit.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import "../src/app/bridge.ts"; // définit globalThis.EBV2 — le MÊME chemin que l'app
import { metrics, delta } from "./lib/planMetrics.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const FIXTURES = join(ROOT, "tests", "fixtures", "profils30.json");
const BASE_DIR = join(ROOT, "tests", "fixtures", "baseline");
// Même partage que le golden master, et pour la même raison : la photo complète (4,5 Mo)
// n'a rien à faire dans le dépôt. On versionne les MÉTRIQUES (lisibles, ~40 Ko) et une
// EMPREINTE par plan — elle suffit à répondre « la structure a-t-elle bougé ». Localiser
// l'écart est le travail du golden, qui a déjà cet outil.
const METRICS = join(BASE_DIR, "metrics.json");        // versionné
const FULL = join(BASE_DIR, "plans.full.json");        // local, ignoré par git
const DIFF_DIR = join(ROOT, "diffs");

const args = process.argv.slice(2);
const mode = args.includes("--capture") ? "capture" : args.includes("--diff") ? "diff" : null;
const mdIdx = args.indexOf("--md");
const mdTicket = mdIdx >= 0 ? args[mdIdx + 1] : null;
if (!mode) {
  console.error("usage : node scripts/baseline.mjs --capture | --diff [--md B-XX]");
  process.exit(2);
}

const { profils } = JSON.parse(readFileSync(FIXTURES, "utf8"));

/** Normalisation : mêmes règles que le golden — les dates ne doivent pas faire périmer la photo. */
const ISO = /^\d{4}-\d{2}-\d{2}/;
const DROP = new Set(["date", "dateISO", "plan_start", "generatedAt", "createdAt", "id"]);
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) {
      if (DROP.has(k)) continue;
      const val = canon(v[k]);
      if (typeof val === "string" && ISO.test(val)) continue;
      out[k] = val;
    }
    return out;
  }
  if (typeof v === "number") return Math.round(v * 1000) / 1000;
  return v;
}

/** Construit les 30 plans. Un refus typé est un RÉSULTAT, pas une panne (leçon R16.10-a). */
function construire() {
  const out = [];
  for (const p of profils) {
    try {
      const plan = globalThis.EBV2.buildPlan(p.sport, { ...p.a });
      const c = canon(plan);
      out.push({ id: p.id, why: p.why, sport: p.sport, ok: true, m: metrics(plan, p.sport, p.a),
        hash: createHash("sha256").update(JSON.stringify(c)).digest("hex").slice(0, 16), _plan: c });
    } catch (e) {
      const typed = e && e.code === "ENTREE_INVALIDE";
      out.push({ id: p.id, why: p.why, sport: p.sport, ok: false, refus: typed, message: String(e?.message ?? e) });
    }
  }
  return out;
}

const courant = construire();

if (mode === "capture") {
  mkdirSync(BASE_DIR, { recursive: true });
  writeFileSync(METRICS, JSON.stringify(courant.map(({ _plan, ...r }) => r), null, 1));
  writeFileSync(FULL, JSON.stringify(Object.fromEntries(courant.map((r) => [r.id, r._plan])), null, 1));
  const ok = courant.filter((r) => r.ok).length;
  const refus = courant.filter((r) => !r.ok && r.refus).length;
  const casses = courant.filter((r) => !r.ok && !r.refus);
  console.log(`✓ référence figée — ${courant.length} profils : ${ok} plans, ${refus} refus typés, ${casses.length} erreurs`);
  for (const c of casses) console.log(`  ✖ ${c.id} : ${c.message}`);
  process.exit(casses.length ? 1 : 0);
}

// ---- mode diff ------------------------------------------------------------
if (!existsSync(METRICS)) {
  console.error("✖ aucune référence : lance d'abord `node scripts/baseline.mjs --capture`");
  process.exit(2);
}

const lignes = [];
let nDeplaces = 0, nIdentiques = 0, nStructure = 0, nCasses = 0;

const refs = new Map(JSON.parse(readFileSync(METRICS, "utf8")).map((r) => [r.id, r]));
for (const r of courant) {
  const ref = refs.get(r.id);
  if (!ref) { lignes.push({ id: r.id, why: r.why, nouveau: true }); continue; }

  if (!r.ok || !ref.ok) {
    if (r.ok !== ref.ok) {
      nStructure++;
      lignes.push({ id: r.id, why: r.why, bascule: `${ref.ok ? "plan" : ref.refus ? "refus" : "erreur"} → ${r.ok ? "plan" : r.refus ? "refus" : "erreur"}`, message: r.message });
    } else nIdentiques++;
    if (!r.ok && !r.refus) nCasses++;
    continue;
  }

  const d = delta(ref.m, r.m);
  const memeStructure = ref.hash === r.hash;
  if (!Object.keys(d).length && memeStructure) { nIdentiques++; continue; }
  if (!Object.keys(d).length && !memeStructure) {
    // Le cas que les métriques seules ne verraient pas : deux séances échangées, même volume.
    nStructure++;
    lignes.push({ id: r.id, why: r.why, structureSeule: true });
    continue;
  }
  nDeplaces++;
  lignes.push({ id: r.id, why: r.why, sport: r.sport, d, structureAussi: !memeStructure });
}

const titre = mdTicket ? `Rapport de diff — ${mdTicket}` : "Rapport de diff — état courant vs référence";
const md = [];
md.push(`# ${titre}`, "");
md.push(`**${courant.length} profils de référence** · ${nDeplaces} déplacés · ${nStructure} structure seule · ${nIdentiques} identiques` + (nCasses ? ` · **${nCasses} EN ERREUR**` : ""), "");
if (!nDeplaces && !nStructure) md.push("Aucun profil déplacé. Si le ticket devait changer le plan livré, **c'est un échec** : le correctif est inerte.", "");

for (const l of lignes) {
  if (l.nouveau) { md.push(`### ${l.id} — profil absent de la référence`, ""); continue; }
  md.push(`### ${l.id}`, `> ${l.why}`, "");
  if (l.bascule) { md.push(`**Bascule : ${l.bascule}**` + (l.message ? ` — ${l.message}` : ""), ""); continue; }
  if (l.structureSeule) { md.push("Aucune métrique déplacée, mais **le plan diffère** (séances échangées, textes, décisions). À regarder avant de conclure que le ticket est inerte.", ""); continue; }
  md.push("| grandeur | avant | après | écart |", "|---|---|---|---|");
  for (const [k, v] of Object.entries(l.d)) {
    const ec = v.ecart != null ? `${v.ecart > 0 ? "+" : ""}${v.ecart}` + (v.pct != null ? ` (${v.pct > 0 ? "+" : ""}${v.pct} %)` : "") : "—";
    md.push(`| ${k} | ${v.avant} | ${v.apres} | ${ec} |`);
  }
  if (l.structureAussi) md.push("", "_La structure du plan diffère aussi, au-delà de ces grandeurs._");
  md.push("");
}

const texte = md.join("\n");
if (mdTicket) {
  mkdirSync(DIFF_DIR, { recursive: true });
  writeFileSync(join(DIFF_DIR, mdTicket + ".md"), texte);
  console.log(`✓ diffs/${mdTicket}.md écrit — ${nDeplaces} profils déplacés, ${nStructure} structure seule, ${nIdentiques} identiques`);
} else {
  console.log(texte);
}
process.exit(nCasses ? 1 : 0);
