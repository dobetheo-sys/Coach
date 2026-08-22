/**
 * T-61 (MESURE PRÉALABLE) — LA CHARGE DÉCLARÉE PAR LE SCHÉMA CORRESPOND-ELLE À L'INTENSITÉ
 * LIVRÉE PAR LE MODULE DE SPORT ?
 *
 * Question du fondateur (DUR_OU_CLE.md, 22/08/2026) : *« que signifie `dur` dans le schéma de
 * semaine — intensité au-dessus du seuil, ou séance CLÉ ? »* Deux comptes justes donnaient
 * deux verdicts opposés sur O-100b. **La garde tranche la question de vocabulaire en la
 * mesurant** : si elle rougit sur `dur2` et `durLong`, `dur` veut dire « clé » et le mot
 * collisionne avec celui du classificateur ; si elle ne rougit que sur `facileR/dur`, `dur`
 * veut bien dire dur et deux créneaux sont mal remplis.
 *
 * Règle 15 : on OBSERVE l'intensité LIVRÉE (le classificateur du moteur, `intensitySplit`),
 * on ne relit aucune table. Règle 7 : on mesure AVANT d'écrire la règle.
 *
 *   npm run mesure:t61
 */
import "../src/app/bridge.ts";
import { profiles } from "./goldenMaster.mjs";
import { estCharge } from "./lib/planMetrics.mjs";
import { intensitySplit } from "../src/engine/loadModel.ts";

const seances = (d) => (d.sessions ?? []).filter((s) => s && s.d !== "rs" && !s.race);

/** L'intensité LIVRÉE d'un jour, dite par le classificateur du moteur. */
function intensiteLivree(d) {
  let h = 0, m = 0, tot = 0;
  for (const s of seances(d)) {
    let sp; try { sp = intensitySplit(s); } catch { sp = { hardMin: 0, modMin: 0 }; }
    h += sp.hardMin || 0; m += sp.modMin || 0; tot += s.min || 0;
  }
  if (tot <= 0) return "vide";
  if (h > 0) return "dur";
  if (m > 0) return "modere";
  return "facile";
}

const table = new Map(); // `${sport}|${slot}/${charge}` → { n, dur, modere, facile, vide, noms:Map }
let population = 0, jours = 0;
for (const { sport, a } of profiles()) {
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  population++;
  for (const w of p.weeks ?? []) {
    if (!estCharge(w)) continue;
    for (const d of w.days ?? []) {
      if (d.charge === "off" || d.charge === "recup") continue; // ni l'un ni l'autre ne promet du dur
      jours++;
      const k = `${sport}|${d.slot}/${d.charge}`;
      const e = table.get(k) ?? { n: 0, dur: 0, modere: 0, facile: 0, vide: 0, noms: new Map() };
      e.n++; e[intensiteLivree(d)]++;
      for (const s of seances(d)) e.noms.set(s.name, (e.noms.get(s.name) ?? 0) + 1);
      table.set(k, e);
    }
  }
}
if (!population) { console.error("✖ sonde vide"); process.exit(1); }
console.log(`population : ${population} plans · ${jours} jours de charge (hors off et recup)`);

// ─── §1 — les couples `charge = dur` qui ne livrent PAS de dur ────────────────────────────
console.log("\n§1 — LES CRÉNEAUX ÉTIQUETÉS `dur` : QUE LIVRENT-ILS ?");
const lignes = [...table].filter(([k]) => k.endsWith("/dur")).sort();
for (const [k, e] of lignes) {
  const pct = (v) => `${((100 * v) / e.n).toFixed(0)}%`;
  console.log(`   ${k.padEnd(26)} ${String(e.n).padStart(5)} j · dur ${pct(e.dur).padStart(4)} · modéré ${pct(e.modere).padStart(4)} · facile ${pct(e.facile).padStart(4)}`);
}

// ─── §2 — le verdict de vocabulaire ───────────────────────────────────────────────────────
console.log("\n§2 — LE VERDICT DE VOCABULAIRE");
const parSlot = new Map();
for (const [k, e] of lignes) {
  const slot = k.split("|")[1].split("/")[0];
  const s = parSlot.get(slot) ?? { n: 0, dur: 0 };
  s.n += e.n; s.dur += e.dur; parSlot.set(slot, s);
}
for (const [slot, s] of [...parSlot].sort((a, b) => b[1].n - a[1].n))
  console.log(`   ${slot.padEnd(10)} ${String(s.n).padStart(6)} jours étiquetés « dur » · ${((100 * s.dur) / s.n).toFixed(1)} % livrent réellement du dur`);

// ─── §3 — le contenu de dur2 et durLong (la mesure demandée au §2 du document) ────────────
console.log("\n§3 — CE QUE CONTIENNENT `dur2` ET `durLong` (les 6 noms les plus fréquents)");
for (const slot of ["dur1", "dur2", "durLong", "facileR"]) {
  const noms = new Map();
  for (const [k, e] of lignes) { if (k.split("|")[1].split("/")[0] !== slot) continue;
    for (const [n, c] of e.noms) noms.set(n, (noms.get(n) ?? 0) + c); }
  if (!noms.size) continue;
  console.log(`   ${slot} : ${[...noms].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, c]) => `${n} ×${c}`).join(" · ")}`);
}

// ─── §4 — les couples `charge = facile` qui livrent du DUR (l'inverse, jamais mesuré) ─────
console.log("\n§4 — L'INVERSE : DES CRÉNEAUX `facile` QUI LIVRENT DU DUR");
const inv = [...table].filter(([k, e]) => k.endsWith("/facile") && e.dur > 0).sort((a, b) => b[1].dur - a[1].dur);
if (!inv.length) console.log("   aucun — la promesse « facile » est tenue partout");
else for (const [k, e] of inv.slice(0, 10)) console.log(`   ${k.padEnd(26)} ${e.dur} jours durs sur ${e.n} (${((100 * e.dur) / e.n).toFixed(1)} %)`);

// ─── §5 — LE COMPTE DES SÉANCES CLÉS, puisque `dur` en désigne (voir §2) ──────────────────
// L'arithmétique du fondateur, refaite sur le livré : une journée est CLÉ si son créneau est
// `dur1`, `dur2` ou `durLong` — la définition que le §2 valide —, et non si sa charge est
// étiquetée `dur` (`facileR/dur` livre « Footing facile », il ne compte pas).
const CLES = new Set(["dur1", "dur2", "durLong"]);
let b703 = null;
for (const { key, sport, a } of profiles()) if (/^REEL\/tri\/70\.3/.test(key)) { b703 = { sport, a }; break; }
if (b703) {
  console.log("\n§5 — SÉANCES CLÉS PAR CYCLE (tri/70.3, doubles = oui)");
  for (const dispo of ["semaine", "quotidienne"]) {
    const p = globalThis.EBV2.buildPlan(b703.sport, { ...b703.a, doubles: "oui", sessions_max: "14", vol_max: "20", dispo });
    let nJ = 0, nCles = 0;
    for (const w of p.weeks ?? []) { if (!estCharge(w)) continue;
      for (const d of w.days ?? []) { nJ++; if (CLES.has(d.slot) && seances(d).length) nCles++; } }
    console.log(`   ${dispo.padEnd(12)} ${nCles} jours clés sur ${nJ} · ${((10 * nCles) / nJ).toFixed(2)} par 10 j · ${((7 * nCles) / nJ).toFixed(2)} par 7 j`);
  }
  console.log("   (intention déclarée du cycle : 3 à 4 séances clés par cycle de 10 jours)");
}
