// Smoke R4 : migration v1→v2, multi-plans, records, journal nutrition (+CSV MFP),
// bandeau réserves, avatar SVG, feedback→félicitations→partage (repli téléchargement).
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8480;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
const page = await ctx.newPage();
const consoleErrs = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text()); });
page.on("pageerror", (e) => consoleErrs.push(String(e)));

// ---- 1. MIGRATION v1 → v2 : injecter l'ANCIEN format, l'app doit le reprendre ----
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
const st = runnerStateV1({ tests: [{ type: "thrPace", value: 270, date: "2026-07-01", source: "test" }, { type: "thrPace", value: 262, date: "2026-07-20", source: "test" }] });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, st);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
const v2state = await page.evaluate(() => JSON.parse(localStorage.getItem("eb_state_v2") || "null"));
ok(!!(v2state && Array.isArray(v2state.plans) && v2state.plans.length === 1 && v2state.plans[0].sport === "run"), "migration v1→v2 : plan repris sans perte (plans=" + (v2state ? v2state.plans.length : "null") + ")");
ok(await page.locator("#ebTabbar .tabbtn").count() === 5, "l'app restaure directement la vue plan (5 onglets)");

// ---- 2. Records dans Profil (meilleure allure = 262s, pas la dernière) ----
const tabs = await page.locator("#ebTabbar .tabbtn").all();
await tabs[0].click(); await page.waitForTimeout(200);
const profTxt = await page.locator("#screen").textContent();
ok(/Records personnels/.test(profTxt), "carte « Records personnels » présente dans Profil");
ok(/4'22/.test(profTxt), "meilleure allure seuil retenue (262s = 4'22), pas la plus récente");
ok(/Mes plans \(1\)/.test(profTxt), "sélecteur « Mes plans » présent (1 plan après migration)");
// Sauvegarde/restauration présentes (lot améliorations)
ok(await page.locator("#pfBackup").count() === 1, "bouton de sauvegarde (export JSON) présent dans Profil");
ok(await page.locator("#pfRestore").count() === 1, "restauration depuis un fichier présente dans Profil");
const dlBackup = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
await page.click("#pfBackup");
const bk = await dlBackup;
ok(bk !== null && /endurabuild/.test(bk ? bk.suggestedFilename() : ""), "la sauvegarde télécharge un fichier (" + (bk ? bk.suggestedFilename() : "aucun") + ")");

// ---- 3. Multi-plans : nouveau plan → questionnaire vierge, retour au 1er sans perte ----
await page.click("#pfNewPlan"); await page.waitForTimeout(300);
ok(await page.locator(".sport-card").count() === 4, "nouveau plan → choix du sport (questionnaire vierge)");
await page.click('.sport-card[data-sport="bike"]');
await page.click('.opts[data-key="intent"] .opt[data-val="plaisir"]');
await page.click('.opts[data-key="format"] .opt[data-val="cyclo"]');
await page.waitForTimeout(100);
const plansNow = await page.evaluate(() => JSON.parse(localStorage.getItem("eb_state_v2")).plans.length);
ok(plansNow === 2, "2 plans persistés (nouveau + migré)");
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("eb_state_v2"));
  s.activePlanId = s.plans[0].id;
  localStorage.setItem("eb_state_v2", JSON.stringify(s));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
ok(await page.locator("#ebTabbar .tabbtn").count() === 5, "retour au plan 1 : la vue plan est restaurée");
const t2 = await page.locator("#ebTabbar .tabbtn").all();
await t2[0].click(); await page.waitForTimeout(200);
const prof2 = await page.locator("#screen").textContent();
ok(/Mes plans \(2\)/.test(prof2), "les 2 plans sont listés dans le sélecteur");

// ---- 4. Onglet Plan : bandeau réserves seulement si warnings, acquitté via Avancement ----
await t2[1].click(); await page.waitForTimeout(200);
ok(!/Ce plan a des réserves/.test(await page.locator("#screen").textContent()), "aucun bandeau réserves sur un plan sain");
const bannerTest = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const { setTab } = await import("./js/ui/tabs.js");
  S.currentPlan._v2.warnings = ["la semaine pic ne contient pas le brick (test synthétique)"];
  delete S.answers.warningsAck;
  setTab("general");
  const shown = /Ce plan a des réserves/.test(document.querySelector("#screen").textContent);
  setTab("progress");
  const md = document.getElementById("motorDecisions");
  if (md) { md.open = true; md.dispatchEvent(new Event("toggle")); }
  setTab("general");
  const after = /Ce plan a des réserves/.test(document.querySelector("#screen").textContent);
  return { shown, after };
});
ok(bannerTest.shown === true, "warnings → bandeau non-repliable affiché dans l'onglet Plan");
ok(bannerTest.after === false, "ouvrir « Décisions du moteur » acquitte le bandeau");

// ---- 5. Journal nutrition (onglet Semaine) ----
const t3 = await page.locator("#ebTabbar .tabbtn").all();
await t3[4].click(); await page.waitForTimeout(300);
ok(await page.locator("#njCard").count() === 1, "carte « Journal alimentaire » présente dans Semaine");
await page.locator("#njCard summary").click(); await page.waitForTimeout(150);
await page.fill("#njName", "Pâtes complètes");
await page.fill("#njCarbs", "72");
await page.fill("#njKcal", "380");
await page.click("#njAdd"); await page.waitForTimeout(250);
const njTxt = await page.locator("#njCard").textContent();
ok(/Pâtes complètes/.test(njTxt), "entrée manuelle ajoutée au journal");
const csvContent = "Date,Meal,Calories,Fat (g),Carbohydrates (g),Protein (g)\n" + new Date().toISOString().slice(0, 10) + ",Breakfast,320,8,45,12\n";
await page.setInputFiles("#njCsv", { name: "mfp.csv", mimeType: "text/csv", buffer: Buffer.from(csvContent) });
await page.waitForTimeout(300);
const csvInLog = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const today = new Date().toISOString().slice(0, 10);
  return (S.answers.foodLog[today] || []).some((e) => e.src === "mfp-csv");
});
ok(csvInLog, "import CSV MyFitnessPal : ligne du jour intégrée au journal");

// ---- 6. Avatar SVG + thèmes (onglet Suivi) ----
const t4 = await page.locator("#ebTabbar .tabbtn").all();
await t4[3].click(); await page.waitForTimeout(250);
ok(await page.locator("#avSvg svg").count() === 1, "avatar SVG rendu dans l'onglet Suivi");
ok(await page.locator("[data-av-theme]").count() === 4, "4 thèmes de couleur (accents sport) proposés");
await page.locator('[data-av-theme="swim"]').click(); await page.waitForTimeout(200);
const themeSaved = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return S.answers.avatarTheme; });
ok(themeSaved === "swim", "choix de thème persisté (avatarTheme=" + themeSaved + ")");
ok(/#00b8d9/.test(await page.locator("#avSvg svg").innerHTML()), "le SVG reprend la couleur du thème choisi");

// ---- 7. Coche ✓ → feedback RPE → félicitations + partage story (repli téléchargement) ----
const t5 = await page.locator("#ebTabbar .tabbtn").all();
await t5[4].click(); await page.waitForTimeout(250);
const dbtn = page.locator('.doneBtn[data-rest="0"]:not(.done)').first();
ok((await dbtn.count()) === 1, "coche de séance (non-repos) disponible");
await dbtn.click(); await page.waitForTimeout(300);
ok(await page.locator(".eb-modal:has-text('Comment c’était')").count() === 1, "feedback RPE affiché avant la célébration");
await page.locator("[data-rpe='6']").click();
await page.locator("[data-feel='normal']").click();
await page.click("#fbSave"); await page.waitForTimeout(400);
ok(await page.locator(".eb-overlay").count() === 1, "modal de félicitations affichée après le feedback");
const celebH2 = (await page.locator(".eb-modal h2").textContent()).trim();
ok(celebH2.length >= 10, "message de célébration présent (« " + celebH2.slice(0, 40) + "… »)");
ok(await page.locator(".eb-modal svg").count() === 1, "avatar présent dans la modal");
const dl = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
await page.click("#ebShareStory"); // headless : navigator.share indisponible → repli téléchargement
const download = await dl;
ok(download !== null, "partage story : repli téléchargement PNG déclenché");
if (download) ok(/endurabuild-seance\.png/.test(download.suggestedFilename()), "nom de fichier story correct (" + download.suggestedFilename() + ")");
await page.click("#ebCloseCongrats");
ok(await page.locator(".eb-overlay").count() === 0, "la modal se ferme");

ok(consoleErrs.length === 0, "aucune erreur console (" + consoleErrs.length + ")");
if (consoleErrs.length) info("erreurs: " + consoleErrs.slice(0, 5).join(" | "));

server.close();
await browser.close();
process.exit(report());
