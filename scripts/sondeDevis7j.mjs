#!/usr/bin/env node
/**
 * FAMILLE R20.7 — LE DEVIS DE RAVITAILLEMENT DÉPEND-IL DU JOUR DE LA SEMAINE ?
 *
 *   node scripts/sondeDevis7j.mjs
 *
 * `smoke-shop` est passée 42/42 le **2026-08-16** et a échoué le **2026-08-17** sur « le devis a
 * des lignes à nommer (0) », à CODE IDENTIQUE — vérifié en rejouant la suite sur `cf392af`,
 * `858c0c5` et `ff86ecb` : elle échoue sur les trois, donc le chantier B-17/D3 n'y est pour rien.
 * Le 16 était un DIMANCHE, le 17 un LUNDI.
 *
 * La suite porte pourtant déjà un correctif de cette famille (« la fenêtre de 7 jours peut
 * légitimement ne contenir aucune séance… on retire la dépendance au calendrier plutôt que de
 * vivre avec ») : passer en cadence MENSUELLE. Ce correctif était INSUFFISANT, et la mesure le
 * dit — on balaie les sept jours plutôt que de conclure sur deux tirages.
 */
import { startServer, launchBrowser, runnerStateV1 } from "../tests/e2e/harness.mjs";

const PORT = 8611;
const server = await startServer(PORT);
const browser = await launchBrowser();
const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
// 2026-08-17 est un lundi : la semaine complète part de là.
const DATES = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 7, 17 + i));
  return d.toISOString().slice(0, 10);
});

console.log("DEVIS DE RAVITAILLEMENT — LIGNES RENDUES SELON LE JOUR (tri/70.3, cadence mensuelle)\n");
const res = [];
for (let i = 0; i < DATES.length; i++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  // `setFixedTime` (et non `install`) : on fige la date en laissant tourner les minuteries.
  await page.clock.setFixedTime(new Date(DATES[i] + "T09:00:00"));
  const st = runnerStateV1({ format: "70.3", weight: "72" });
  st.sport = "tri";
  st.answers.readiness.date = DATES[i];
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, st);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.click('[data-tab="outils"]');
  await page.waitForTimeout(400);
  if (await page.locator("#shopExpand").count()) { await page.click("#shopExpand"); await page.waitForTimeout(400); }
  for (const cad of ["mensuel", "hebdo"]) {
    if (await page.locator('#shopCard [data-cadence="' + cad + '"]').count()) {
      await page.click('#shopCard [data-cadence="' + cad + '"]');
      await page.waitForTimeout(400);
      const n = await page.evaluate(() => document.querySelectorAll("#shopCard .period-line .pl-q").length);
      res.push({ jour: JOURS[i], date: DATES[i], cad, n });
    }
  }
  await ctx.close();
}
await browser.close();
server.close();

for (const cad of ["mensuel", "hebdo"]) {
  const l = res.filter((r) => r.cad === cad);
  console.log("  cadence " + cad.padEnd(9) + " : " + l.map((r) => r.jour.slice(0, 3) + " " + String(r.n).padStart(2)).join(" · "));
}
const men = res.filter((r) => r.cad === "mensuel");
const vides = men.filter((r) => r.n === 0);
console.log(`\n  jours où le devis MENSUEL est vide : ${vides.length} / 7${vides.length ? " — " + vides.map((r) => r.jour).join(", ") : ""}`);
console.log(`  → ${vides.length === 0
  ? "le devis ne dépend plus du jour : le critère de `smoke-shop` est sûr."
  : vides.length === 7
  ? "le devis est TOUJOURS vide : ce n'est pas une dépendance au calendrier, c'est un défaut de fond."
  : "DÉPENDANCE AU JOUR CONFIRMÉE (famille R20.7) : le même code rend un verdict différent selon\n    le jour d'exécution. La suite doit ANCRER sa date, comme `smoke-zenna` le fait depuis v8."}`);
