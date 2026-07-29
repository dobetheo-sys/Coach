// Lance toutes les suites E2E séquentiellement (chacune a son port) et échoue si
// l'une échoue. `npm run test:e2e` — exécuté aussi par la CI (job e2e).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SUITES = ["smoke-checkin.mjs", "smoke-r4.mjs", "smoke-retention.mjs", "smoke-improvements.mjs", "smoke-dates.mjs"];
let failed = 0;
for (const s of SUITES) {
  console.log("\n━━━ " + s + " ━━━");
  const r = spawnSync(process.execPath, [fileURLToPath(new URL(s, import.meta.url))], { stdio: "inherit" });
  if (r.status !== 0) failed++;
}
console.log("\n═══ E2E : " + (SUITES.length - failed) + "/" + SUITES.length + " suites vertes ═══");
process.exit(failed ? 1 : 0);
