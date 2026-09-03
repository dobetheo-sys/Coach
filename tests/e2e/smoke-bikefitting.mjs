// Bikefitting (voir bikefitting/docs/INTEGRATION_HANDOFF.md) est une sous-app SÉPARÉE, pas un
// composant monté dans Zenna — cette suite garde donc uniquement le CÔTÉ ZENNA de l'intégration :
// l'entrée existe dans Outils, elle a le bon libellé, et son lien pointe au bon endroit. Elle ne
// peut pas et ne doit pas naviguer réellement dans bikefitting/ (sous-app avec ses propres
// dépendances npm, construite par `npm run build:bikefitting`, absente d'un checkout qui ne l'a
// pas lancé — CI comprise). Le lien lui-même se vérifie par son `href`, pas par une navigation.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8599;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, runnerStateV1());
await page.reload({ waitUntil: "networkidle" });
await page.evaluate(async (t) => { const { setTab } = await import("./js/ui/tabs.js"); setTab(t); }, "outils");

// ---- 1. Le sous-onglet existe, avec son libellé ------------------------------------------
const boutonPresent = await page.locator('[data-subtool="bikefitting"]').count();
ok(boutonPresent === 1, "un sous-onglet « bikefitting » existe dans Outils");
const libelle = await page.locator('[data-subtool="bikefitting"]').textContent();
ok((libelle || "").includes("Position"), "son libellé contient « Position » (obtenu : " + JSON.stringify(libelle) + ")");

// ---- 2. Cliquer dessus rend la carte, avec un lien vers la sous-app --------------------
await page.locator('[data-subtool="bikefitting"]').click();
const lien = page.locator('#screen a[href*="bikefitting"]');
ok(await lien.count() === 1, "la carte porte un lien unique vers bikefitting/");
const href = await lien.getAttribute("href");
ok(href === "bikefitting/index.html", "le lien est RELATIF (obtenu : " + JSON.stringify(href) + ") — un chemin absolu casserait selon où le site est servi (voir vite.config.js)");
const titre = await page.locator("#screen .zn-tab-title").textContent();
ok((titre || "").length > 0, "un titre d'écran est présent");

// ---- 3. Aucune erreur JS n'a été produite par ce rendu -----------------------------------
ok(errs.length === 0, "aucune erreur console (" + errs.length + ")" + (errs.length ? " : " + errs[0] : ""));

await browser.close();
server.close();
process.exit(report());
