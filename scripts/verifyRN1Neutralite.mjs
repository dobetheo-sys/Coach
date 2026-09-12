#!/usr/bin/env node
/**
 * RN1 — LA NEUTRALITÉ EN VOLUME SE MESURE CONTRE LE MOTEUR SANS RN1, PAS CONTRE UN JUMEAU.
 *
 * Le jumeau « même profil, intent: plaisir » n'est PAS un témoin : l'intention change la
 * CONSTRUCTION (`finisher`, `tri/index.ts`), mesuré à 2 848 semaines différentes sur 82 profils.
 * Le seul témoin honnête est le même moteur avec RN1 neutralisé — donc `npm run casser`.
 *
 *   node scripts/verifyRN1Neutralite.mjs --dump A.json          (moteur courant)
 *   npm run casser -- --fichier src/generator/planGenerator.ts \
 *     --avant 'a.sport === "tri" && a.intent === "competition" && String(a.level) !== "debutant"' \
 *     --apres 'false' -- node scripts/verifyRN1Neutralite.mjs --dump B.json
 *   node scripts/verifyRN1Neutralite.mjs --compare A.json B.json
 *
 * `--compare` rend « RN1 NEUTRALITE VERT » si : aucune semaine RN1 ne change de NOMBRE de séances
 * (la monnaie interdite, C29), et ≥ 95 % des semaines RN1 gardent leur volume à ±1 min. Résidu
 * publié (12/09/2026, après exclusion de `reprise` et rejeu de C26c dans la passe) : 2 semaines
 * sur 228 — `PW/tri/M/plat` S69 (−11, rayon de la boucle de réparation) et `G/tri/Full/injury-dos`
 * S26 (+3, arrondi). Population : tri · intent=competition · niveau ≠ débutant · sans blessure
 * d'appui (le dump ne filtre pas `reprise` : ses semaines n'ont plus de dose et sortent du compte
 * par construction).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const argv = process.argv.slice(2);
const mode = argv[0];
const ROOT = resolve(import.meta.dirname, "..");

async function dump(file) {
  await import(resolve(ROOT, "src/app/bridge.ts"));
  const { profiles } = await import(resolve(ROOT, "scripts/goldenMaster.mjs"));
  const out = {};
  for (const { key, sport, a } of profiles()) {
    if (sport !== "tri" || a.intent !== "competition" || String(a.level) === "debutant") continue;
    let plan; try { plan = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
    out[key] = plan.weeks.map((w) => ({
      num: w.num,
      tot: w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0),
      nSess: w.days.reduce((t, d) => t + d.sessions.filter((s) => s.d !== "rs" && !s.race).length, 0),
      rn1: w.days.some((d) => d.sessions.some((s) => (s.steps || []).some((st) => st.role === "body" && st.zone === "rn.thr" && (st.reps || 1) > 1 && /entretien/i.test(String(s.name))))),
    }));
  }
  writeFileSync(file, JSON.stringify(out));
  console.log(`dump : ${Object.keys(out).length} profils → ${file}`);
}

function compare(fa, fb) {
  const A = JSON.parse(readFileSync(fa, "utf8")), B = JSON.parse(readFileSync(fb, "utf8"));
  let rn1 = 0, neutres = 0, nSessDiff = 0; const ex = [];
  for (const k of Object.keys(A)) {
    const a = A[k], b = B[k];
    if (!b || a.length !== b.length) { ex.push(`${k} : absent ou longueur différente`); continue; }
    a.forEach((w, i) => {
      if (!w.rn1) return;
      rn1++;
      const d = w.tot - b[i].tot;
      if (Math.abs(d) <= 1) neutres++; else if (ex.length < 12) ex.push(`${k} S${w.num} ${d > 0 ? "+" : ""}${d.toFixed(1)} min`);
      if (w.nSess !== b[i].nSess) nSessDiff++;
    });
  }
  if (!rn1) { console.log("✖ AUCUNE semaine RN1 dans le dump A — l'instrument ne mesure rien"); process.exit(1); }
  const part = neutres / rn1;
  console.log(`semaines RN1 ${rn1} · neutres à ±1 min ${neutres} (${(part * 100).toFixed(1)} %) · nombre de séances changé ${nSessDiff}`);
  if (ex.length) console.log("  " + ex.join("\n  "));
  const ok = nSessDiff === 0 && part >= 0.95;
  console.log(ok ? "RN1 NEUTRALITE VERT" : "RN1 NEUTRALITE ROUGE");
  process.exit(ok ? 0 : 1);
}

if (mode === "--dump" && argv[1]) await dump(argv[1]);
else if (mode === "--compare" && argv[1] && argv[2]) compare(argv[1], argv[2]);
else { console.error("usage : --dump FILE | --compare A B"); process.exit(2); }
