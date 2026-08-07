// Smoke rétention (adapté R5) : trail (registre disciplines), repos validable, feedback
// RPE → célébration → teaser, drapeau douleur (pose/verrou/levée), série au Profil.
// Ordre des onglets R5 : 0=Profil · 1=Plan · 2=Aujourd'hui · 3=Semaine · 4=Outils.
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

// 1. Trail : la sortie longue affiche temps + D+ ET D− programmés (R7 : le D+ n'est plus
//    une fourchette déduite de la durée comme en R4, c'est une charge décidée par le moteur,
//    et la descente est programmée au même titre que la montée).
const planTabs = await page.locator("#ebTabbar .tabbtn").all();
await planTabs[1].click(); await page.waitForTimeout(250);
await page.click("#allW"); await page.waitForTimeout(300);
const fullPlanTxt = await page.locator("#screen").textContent();
const vertMatch = fullPlanTxt.match(/D\+ (\d+)m \/ D− (\d+)m cible/g) || [];
ok(vertMatch.length > 0, "trail : le D+ ET le D− programmés sont visibles sur les longues du plan (" + vertMatch.length + " séances)");
ok(vertMatch.every((m) => { const [, up, down] = m.match(/D\+ (\d+)m \/ D− (\d+)m/); return +down <= +up; }),
  "trail : aucune boucle ne descend plus qu'elle ne monte (T2c — cohérence physique)");
ok(/Sortie longue trail/.test(fullPlanTxt), "trail : la longue est nommée « Sortie longue trail »");
// R5 — sous-objectifs de phase cliquables dans l'onglet Plan
ok(await page.locator(".ph-obj").count() >= 3, "phases cliquables (sous-objectifs) présentes");
ok(/Sous-objectifs — une phase à la fois/.test(fullPlanTxt), "carte sous-objectifs affichée");
await page.locator(".ph-obj").first().click(); await page.waitForTimeout(150);
ok(/Semaine \d+ · [\d.]+h/.test(await page.locator(".ph-obj").first().textContent()), "ouvrir une phase liste ses semaines et leur état");

// 2. Repos validable : les jours rs ont une coche « récupération respectée »
// R16.9 — la grille est en tête de l'onglet Plan (index 1), Semaine n'existe plus.
await planTabs[1].click(); await page.waitForTimeout(250);
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
ok(/Douleur signalée/.test(bannerTxt), "bandeau douleur permanent affiché (Semaine)");
ok(/série est gelée|série gelée/i.test(bannerTxt), "le bandeau explique le gel de série (pas de perte)");
// le bandeau douleur est aussi sur l'onglet central Aujourd'hui
await planTabs[2].click(); await page.waitForTimeout(300);
ok(/Douleur signalée/.test(await page.locator("#screen").textContent()), "bandeau douleur aussi sur Aujourd'hui");
const verdict = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const r = globalThis.EBV2.adjustToday(S.sport, S.answers, { date: new Date().toISOString().slice(0, 10), sleepQuality: "bon", energy: 90, feel: "frais" });
  return { level: r.adjustment.verdict.level, drivers: r.adjustment.verdict.drivers.join(" ") };
});
ok(verdict.level === "rouge" && /douleur/.test(verdict.drivers), "douleur active → verdict rouge forcé malgré des signaux verts");

// 5. Levée du drapeau : action explicite + confirmation (depuis Aujourd'hui)
page.once("dialog", (d) => d.accept());
await page.click("#ebLiftPain"); await page.waitForTimeout(300);
const lifted = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return S.answers.painFlag; });
ok(lifted && lifted.active === false && lifted.liftedAt, "levée du drapeau après confirmation (historique conservé)");

// 6. Série au Profil (R5), ton neutre
const t2 = await page.locator("#ebTabbar .tabbtn").all();
await t2[0].click(); await page.waitForTimeout(300);
ok(/Série|Nouvelle série|gelée/.test(await page.locator("#screen").textContent()), "état de série affiché au Profil (ton neutre)");

ok(errs.length === 0, "aucune erreur JS (" + errs.length + ")");
if (errs.length) info(errs.slice(0, 4).join(" | "));

server.close();
await browser.close();
process.exit(report());
