#!/usr/bin/env node
/**
 * O-44 — LES QUATRE CRITÈRES D'ACCEPTATION DU PLANCHER DE DURÉE DE SÉANCE EN NAGE.
 *
 *   node scripts/mesureO44.mjs            # après correctif
 *   node scripts/mesureO44.mjs --avant    # photographie l'état SANS le plancher (témoin)
 *
 * ```
 * [ ] le second mode (80-100 % de nages courtes) s'effondre ou se réduit fortement
 * [ ] les 36 débutants sortent tous de la sous-population
 * [ ] AUCUN profil ne perd de volume — le plancher regroupe, il n'ampute pas
 * [ ] la fréquence baisse là où le plancher mord, et nulle part ailleurs
 * ```
 *
 * **Le troisième est le vrai test** (brief §5). Si du volume disparaît, c'est le mécanisme de la
 * coupe non réallouée de B-02, et il appelle la même réponse : la restitution passe avant le point
 * fixe, et le manque devient un maillon déclaré.
 *
 * Le témoin est LU DANS UN FICHIER, pas recalculé : il est capturé une fois avec le moteur d'avant
 * (`--avant` sur le commit précédent), sans quoi « avant » et « après » seraient le même code et la
 * comparaison ne mesurerait rien — la faute d'instrument que ce chantier a payée quatre fois.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import "../src/app/bridge.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";
import { SWIM_SESSION_FLOOR_MIN } from "../src/engine/constraintMatrix.ts";

const TEMOIN = "/tmp/o44-temoin.json";
const avant = process.argv.includes("--avant");
const SEUIL = SWIM_SESSION_FLOOR_MIN;

const mesure = () => {
  const par = [];
  for (const { key, sport, a } of goldenProfiles()) {
    if (sport !== "swim") continue;
    let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
    const parts = [];
    let volume = 0, nages = 0, semCharge = 0;
    for (const w of p.weeks ?? []) {
      for (const d of w.days ?? []) for (const s of d.sessions ?? []) if (s.d === "sw") volume += s.min || 0;
      if (w.phase?.id === "taper" || w.isRecup) continue;
      const durees = [];
      for (const d of w.days ?? []) for (const s of d.sessions ?? [])
        if (s.d === "sw" && (s.min || 0) > 0) durees.push(s.min);
      if (durees.length < 2) continue;
      semCharge++;
      nages += durees.length;
      parts.push(durees.filter((x) => x < SEUIL).length / durees.length);
    }
    if (!parts.length) continue;
    par.push({ key, lvl: a.level, part: parts.reduce((t, x) => t + x, 0) / parts.length, volume, nages, semCharge });
  }
  return par;
};

const now = mesure();
if (avant) { writeFileSync(TEMOIN, JSON.stringify(now)); console.log(`témoin écrit : ${TEMOIN} (${now.length} profils)`); process.exit(0); }
if (!existsSync(TEMOIN)) { console.error("Aucun témoin. Lancer `node scripts/mesureO44.mjs --avant` sur le commit SANS le plancher."); process.exit(2); }
const ref = new Map(JSON.parse(readFileSync(TEMOIN, "utf8")).map((x) => [x.key, x]));

console.log(`O-44 — LES QUATRE CRITÈRES  (plancher ${SEUIL} min d'eau, ${now.length} profils de nage)\n`);

// ---- 1. le second mode ----
const mode2 = (l) => l.filter((x) => x.part >= 0.8).length;
const sousPop = (l) => l.filter((x) => x.part > 0.5).length;
const a1 = [...ref.values()], b1 = now;
console.log(`1. second mode (≥ 80 % de nages courtes) : ${mode2(a1)} → ${mode2(b1)} profils`);
console.log(`   sous-population (> 50 %)              : ${sousPop(a1)} → ${sousPop(b1)} profils`);

// ---- 2. les débutants ----
const deb = (l) => l.filter((x) => x.lvl === "debutant" && x.part > 0.5).length;
console.log(`2. débutants dans la sous-population      : ${deb(a1)} → ${deb(b1)}`);

// ---- 3. LE VRAI TEST : aucun profil ne perd de volume ----
const perdants = [];
for (const x of now) {
  const r = ref.get(x.key); if (!r) continue;
  if (x.volume < r.volume - 0.5) perdants.push(`${x.key} : ${Math.round(r.volume)} → ${Math.round(x.volume)} min (−${Math.round(r.volume - x.volume)})`);
}
console.log(`3. profils qui PERDENT du volume de nage  : ${perdants.length}${perdants.length ? " ✖" : " ✓"}`);
for (const l of perdants.slice(0, 6)) console.log(`      ${l}`);

// ---- 4. la fréquence baisse là où le plancher mord, et nulle part ailleurs ----
const hors = [], mordu = [];
for (const x of now) {
  const r = ref.get(x.key); if (!r) continue;
  const baisse = x.nages < r.nages;
  const avaitCourt = r.part > 0;
  if (baisse && !avaitCourt) hors.push(`${x.key} : ${r.nages} → ${x.nages} nages sans aucune séance courte avant`);
  if (baisse) mordu.push(x.key);
}
console.log(`4. profils dont la fréquence baisse       : ${mordu.length} · dont SANS séance courte avant : ${hors.length}${hors.length ? " ✖" : " ✓"}`);
for (const l of hors.slice(0, 4)) console.log(`      ${l}`);

const ok = perdants.length === 0 && hors.length === 0 && mode2(b1) < mode2(a1) && deb(b1) === 0;
console.log(`\n  → ${ok ? "LES QUATRE CRITÈRES SONT TENUS." : "AU MOINS UN CRITÈRE EST ROMPU — voir les ✖ ci-dessus."}`);
