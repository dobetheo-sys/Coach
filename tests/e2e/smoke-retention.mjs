// Smoke rétention : trail (registre disciplines), repos validable, feedback RPE →
// célébration → teaser, drapeau douleur (pose/verrou/levée), série jour, ton neutre.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8510;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
const st = runnerStateV1({ format: "trail", terrain: "trail", vol_max: "10", injury: "tibia" });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, st);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);

// 1. Trail : la sortie longue affiche temps + D+ cible (registre disciplines)
const planTabs = await page.locator("#ebTabbar .tabbtn").all();
await planTabs[1].click(); await page.waitForTimeout(250);
await page.click("#allW"); await page.waitForTimeout(300);
const fullPlanTxt = await page.locator("#screen").textContent();
ok(/D\+ cible \d+-\d+m/.test(fullPlanTxt), "trail : « D+ cible X-Ym » visible sur les longues du plan");
ok(/Sortie longue trail/.test(fullPlanTxt), "trail : la longue est nommée « Sortie longue trail »");

// 2. Repos validable : les jours rs ont une coche « récupération respectée »
await planTabs[4].click(); await page.waitForTimeout(250);
const restBtns = await page.locator('.doneBtn[data-rest="1"]').count();
ok(restBtns > 0, "le repos se valide (coches présentes : " + restBtns + ")");

// 3. Feedback RPE : cocher une séance → modal feedback AVANT la célébration
const sessBtn = page.locator('.doneBtn[data-rest="0"]:not(.done)').first();
await sessBtn.click(); await page.waitForTimeout(300);
ok(await page.locator(".eb-modal:has-text('Comment c’était')").count() === 1, "feedback ≤10s affiché avant la célébration");
await page.locator("[data-rpe='9']").click();
await page.locator("[data-feel='hard']").click();
await page.locator("#fbPain").check();
await page.fill("#fbPainLoc", "tibia droit");
await page.click("#fbSave"); await page.waitForTimeout(400);
ok(await page.locator(".eb-overlay").count() === 1, "célébration après le feedback");
const modalTxt = await page.locator(".eb-modal").textContent();
ok(/Demain|Lun|Mar|Mer|Jeu|Ven|Sam|Dim/.test(modalTxt), "teaser de la prochaine séance en clôture de boucle");
await page.click("#ebCloseCongrats"); await page.waitForTimeout(200);

// 4. Douleur cochée → drapeau actif : bandeau permanent + qualité verrouillée
const painState = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return S.answers.painFlag; });
ok(painState && painState.active === true && /tibia/.test(painState.location || ""), "pain_flag posé depuis le feedback (localisation stockée)");
const bannerTxt = await page.locator("#screen").textContent();
ok(/Douleur signalée/.test(bannerTxt), "bandeau douleur permanent affiché");
ok(/série est gelée|série gelée/i.test(bannerTxt), "le bandeau explique le gel de série (pas de perte)");
const verdict = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const r = globalThis.EBV2.adjustToday(S.sport, S.answers, { date: new Date().toISOString().slice(0, 10), sleepQuality: "bon", energy: 90, feel: "frais" });
  return { level: r.adjustment.verdict.level, drivers: r.adjustment.verdict.drivers.join(" ") };
});
ok(verdict.level === "rouge" && /douleur/.test(verdict.drivers), "douleur active → verdict rouge forcé malgré des signaux verts");

// 5. Levée du drapeau : action explicite + confirmation
page.once("dialog", (d) => d.accept());
await page.click("#ebLiftPain"); await page.waitForTimeout(300);
const lifted = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return S.answers.painFlag; });
ok(lifted && lifted.active === false && lifted.liftedAt, "levée du drapeau après confirmation (historique conservé)");

// 6. Série jour dans Suivi, ton neutre
const t2 = await page.locator("#ebTabbar .tabbtn").all();
await t2[3].click(); await page.waitForTimeout(300);
ok(/Série|Nouvelle série|gelée/.test(await page.locator("#screen").textContent()), "état de série affiché dans Suivi (ton neutre)");

ok(errs.length === 0, "aucune erreur JS (" + errs.length + ")");
if (errs.length) info(errs.slice(0, 4).join(" | "));

server.close();
await browser.close();
process.exit(report());
