#!/usr/bin/env node
/**
 * O-43 — LE PLAFOND STRUCTUREL SE NOURRIT DE LA CONVERSION.
 *
 *   node scripts/mesureO43.mjs
 *
 * Recompter le même travail en plus de minutes (O-42) fait monter le maillon `structurel` de la
 * chaîne R20.2 — ce que la structure de la semaine « peut contenir », calculé sur des plafonds de
 * séance en MINUTES. La sonde lit cette hausse comme une capacité plus grande, la courbe monte, et
 * le point fixe AJOUTE des séances. Un débutant en reprise passe de 3 séances de nage à 6.
 *
 * La boucle est circulaire et son sens est le mauvais : le plafond est une propriété de l'ATHLÈTE,
 * jamais de la façon dont le moteur compte.
 *
 * Ce script compare le moteur du disque au moteur d'AVANT O-42 (93cc6ab) sur le profil le plus
 * touché, en faisant varier `vol_recent` — pour montrer que la rampe R10, la garde écrite
 * précisément contre ce défaut, ne le tient pas.
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os"; import { join } from "node:path";
import { createRequire } from "node:module";
import { profiles as P } from "./goldenMaster.mjs";
// ⚠ CHEMIN DÉRIVÉ, JAMAIS ABSOLU. Ce fichier portait « /home/user/Coach/… » codé en dur : il
// tournait dans le bac à sable où il a été écrit et NULLE PART AILLEURS — ni en CI, ni chez le
// fondateur. Mesuré le 17/08/2026, sur le premier passage en CI après le merge : ENOENT sur
// `/home/user/Coach/endurabuild/js/state.js`, sur un runner où ce chemin n'existe évidemment
// pas. Une garde qui ne peut s'exécuter qu'à un seul endroit ne garde rien.
const RACINE = join(import.meta.dirname, "..");
const req = createRequire(import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "r-"));
const p0 = join(dir, "a.cjs");
writeFileSync(p0, execSync("git show 93cc6ab:endurabuild/js/engine.js", { cwd: RACINE, maxBuffer: 1 << 30 }));
const load = (p) => { const s = globalThis.EBV2; delete globalThis.EBV2; req(p); const m = globalThis.EBV2; globalThis.EBV2 = s; return m; };
const A = load(p0), B = load(req.resolve(join(RACINE, "endurabuild/js/engine.js")));
const wm = (w) => (w.days||[]).reduce((t,d)=>t+(d.sessions||[]).reduce((u,s)=>u+(s.race?0:s.min||0),0),0);
const pic = (p) => Math.max(...p.weeks.map(wm));
const ns = (p) => Math.max(...p.weeks.map(w=>(w.days||[]).reduce((t,d)=>t+(d.sessions||[]).filter(s=>s.min>0).length,0)));
const CIBLE = "swim/fond/reprise/debutant/finir";
for (const { key, sport, a } of P()) {
  if (key !== CIBLE) continue;
  console.log(`${key} — vol_recent déclaré dans le golden : ${a.vol_recent === undefined ? "ABSENT" : a.vol_recent}\n`);
  console.log("  vol_recent │ pic AVANT → APRÈS │ séances max │ S1");
  for (const vr of [undefined, "0", "1", "2", "3", "5"]) {
    const x = { ...a }; if (vr === undefined) delete x.vol_recent; else x.vol_recent = vr;
    const pa = A.buildPlan(sport, x), pb = B.buildPlan(sport, x);
    console.log(`  ${String(vr ?? "absent").padStart(9)}  │  ${String(pic(pa)).padStart(3)} → ${String(pic(pb)).padStart(3)} min (${((pic(pb)/pic(pa)-1)*100).toFixed(0).padStart(4)} %) │  ${ns(pa)} → ${ns(pb)}  │  ${wm(pa.weeks[0])} → ${wm(pb.weeks[0])} min`);
    if (vr === "0" && pic(pb) > pic(pa) * 1.25) console.log("\n  O43-REPRODUIT");
  }
}
