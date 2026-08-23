/**
 * LE SCHÉMA DE 10 POSITIONS — CE QU'IL DÉCLARE ET CE QU'IL LIVRE, POSITION PAR POSITION
 *
 * Ordre du fondateur (CYCLE10_INTENSIFICATION.md §4, 22/08/2026) :
 *   1. la séquence RÉELLE du schéma de 10 positions, charge et créneau
 *   2. combien de positions `dur1` / `dur2` / `durLong`, contre 3 pour le schéma de 7
 *   3. la séquence intentionnelle est-elle écrite quelque part dans le dépôt ?
 *
 * Règle 21 : une propriété qui varie avec la POSITION se lit PAR POSITION, jamais agrégée
 * d'abord. `weekBuilder` pose `jc` (jour du cycle, 1..cycleLen) sur chaque jour livré : c'est
 * cette clé qu'on lit, pas une reconstruction.
 *
 *   npm run mesure:cycle10
 */
import "../src/app/bridge.ts";
import { profiles } from "./goldenMaster.mjs";
import { estCharge } from "./lib/planMetrics.mjs";
import { intensitySplit } from "../src/engine/loadModel.ts";

const seances = (d) => (d.sessions ?? []).filter((s) => s && s.d !== "rs" && !s.race);
function intensite(d) {
  let h = 0, m = 0, tot = 0;
  for (const s of seances(d)) {
    let sp; try { sp = intensitySplit(s); } catch { sp = { hardMin: 0, modMin: 0 }; }
    h += sp.hardMin || 0; m += sp.modMin || 0; tot += s.min || 0;
  }
  if (tot <= 0) return "vide";
  return h > 0 ? "DUR" : m > 0 ? "modéré" : "facile";
}

/** Les bases réelles du corpus, comme pour `mesure:doublage` : on ne fabrique pas d'athlète. */
const BASES = new Map();
for (const { key, sport, a } of profiles())
  for (const [nom, motif] of [["tri/70.3", /^REEL\/tri\/70\.3/], ["tri/Full", /^G\/tri\/Full\/vol-max$/],
                              ["run/marathon", /^G\/run\/marathon\/vol-max$/], ["bike/gravel", /^G\/bike\/gravel\/vol-max$/]])
    if (motif.test(key) && !BASES.has(nom)) BASES.set(nom, { sport, a });
if (!BASES.size) { console.error("✖ bases introuvables"); process.exit(1); }

// ─── §1 et §2 — la séquence livrée, position par position ─────────────────────────────────
for (const [nom, base] of BASES) {
  for (const [libelle, dispo] of [["cycle de 10", "quotidienne"], ["semaine de 7", "semaine"]]) {
    const a = { ...base.a, doubles: "oui", sessions_max: "14", vol_max: "20", dispo, shift_ok: "oui" };
    let p; try { p = globalThis.EBV2.buildPlan(base.sport, a); } catch { continue; }
    const pos = new Map(); // jc → { charge:Map, slot:Map, intens:Map, n }
    for (const w of p.weeks ?? []) {
      if (!estCharge(w)) continue;
      for (const d of w.days ?? []) {
        const k = d.jc;
        if (k == null) continue;
        const e = pos.get(k) ?? { n: 0, charge: new Map(), slot: new Map(), intens: new Map() };
        e.n++;
        e.charge.set(d.charge, (e.charge.get(d.charge) ?? 0) + 1);
        e.slot.set(d.slot, (e.slot.get(d.slot) ?? 0) + 1);
        const i = intensite(d);
        e.intens.set(i, (e.intens.get(i) ?? 0) + 1);
        pos.set(k, e);
      }
    }
    if (!pos.size) continue;
    const majo = (m) => [...m].sort((x, y) => y[1] - x[1])[0];
    console.log(`\n${nom} · ${libelle} (use10 = ${p.use10})`);
    let nDur = 0, nDurLivre = 0;
    const suite = [];
    for (const k of [...pos.keys()].sort((x, y) => x - y)) {
      const e = pos.get(k);
      const [ch, nch] = majo(e.charge), [sl] = majo(e.slot), [it, nit] = majo(e.intens);
      if (ch === "dur") nDur++;
      if (it === "DUR") nDurLivre++;
      suite.push(ch === "dur" ? (it === "DUR" ? "■" : "□") : it === "DUR" ? "▲" : "·");
      console.log(`   j${String(k).padStart(2)} · charge ${String(ch).padEnd(7)}(${Math.round((100 * nch) / e.n)}%) · créneau ${String(sl).padEnd(9)} · livré ${String(it).padEnd(7)}(${Math.round((100 * nit) / e.n)}%)`);
    }
    console.log(`   séquence : ${suite.join(" ")}    ■ dur promis ET livré · □ dur promis NON livré · ▲ dur livré non promis · · facile`);
    console.log(`   positions de charge « dur » : ${nDur} · positions qui livrent RÉELLEMENT du dur : ${nDurLivre}`);
    // Jamais deux durs consécutifs ? (sur les positions LIVRÉES dures)
    let consec = 0;
    for (let i = 1; i < suite.length; i++) if ((suite[i] === "■" || suite[i] === "▲") && (suite[i - 1] === "■" || suite[i - 1] === "▲")) consec++;
    console.log(`   enchaînements de deux positions DURES livrées : ${consec}`);
  }
}

// ─── §4 — O-103 : LE CYCLE EST-IL LIVRÉ TEL QU'IL EST DÉCLARÉ ? ───────────────────────────
// L'écart « 4,00 créneaux de qualité déclarés → 3,50 livrés » a été attribué à « la rotation ».
// Ce n'en est pas : on compare, POSITION PAR POSITION, le créneau déclaré par le schéma et
// celui que le jour porte réellement (règle 15 — on observe la sortie livrée).
{
  const ATTENDU = {
    10: new Map([[1, "dur1"], [3, "dur2"], [5, "facileR"], [7, "dur2"], [9, "durLong"]]),
    7: new Map([[2, "dur1"], [4, "dur2"], [6, "durLong"]]),
  };
  const CLES = new Set(["dur1", "dur2", "durLong"]);
  console.log("\n§4 — O-103 : LE CYCLE EST-IL LIVRÉ TEL QU'IL EST DÉCLARÉ ?");
  for (const [nom, base] of BASES) {
    for (const [libelle, dispo, len] of [["cycle de 10", "quotidienne", 10], ["semaine de 7", "semaine", 7]]) {
      const a = { ...base.a, doubles: "oui", sessions_max: "14", vol_max: "20", dispo, shift_ok: "oui" };
      let p; try { p = globalThis.EBV2.buildPlan(base.sport, a); } catch { continue; }
      const A = ATTENDU[len];
      let att = 0, ok = 0, versFacile = 0;
      const ec = new Map();
      for (const w of p.weeks ?? []) { if (!estCharge(w)) continue;
        for (const d of w.days ?? []) {
          const cible = A.get(d.jc);
          if (!cible || !CLES.has(cible)) continue; // seules les positions CLÉS
          att++;
          if (d.slot === cible) { ok++; continue; }
          if (!CLES.has(d.slot)) versFacile++;
          const k = `j${d.jc} ${cible}→${d.slot}/${d.charge}`;
          ec.set(k, (ec.get(k) ?? 0) + 1);
        } }
      if (!att) continue;
      console.log(`   ${nom.padEnd(13)} ${libelle} : ${ok}/${att} positions clés portent leur créneau (${((100 * ok) / att).toFixed(0)} %) · ${versFacile} basculent vers un créneau NON clé`);
      for (const [k, v] of [...ec].sort((x, y) => y[1] - x[1]).slice(0, 4)) console.log(`      ${k} ×${v}`);
    }
  }
}
