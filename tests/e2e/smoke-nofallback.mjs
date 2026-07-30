// Smoke R10 phase 0 : le générateur de repli a disparu, et un échec de génération est VISIBLE.
// Le repli produisait un plan dégradé en silence — un plan faux est plus dangereux que pas de
// plan. Cette suite vérifie les deux moitiés de la décision : plus de repli, et un écran
// d'échec qui dit à l'athlète que son profil est intact.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8520;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));

// ---- 1. Le module de repli n'est plus servi ni référencé ----
const r = await fetch("http://localhost:" + PORT + "/js/legacy-fallback.js").catch(() => null);
ok(!r || r.status === 404, "js/legacy-fallback.js n'existe plus (" + (r ? r.status : "injoignable") + ")");
const appSrc = await (await fetch("http://localhost:" + PORT + "/js/app.js")).text();
ok(!/legacy-fallback/.test(appSrc), "app.js ne l'importe plus (dépendance circulaire supprimée)");
ok(/EBGenerationError/.test(appSrc), "app.js expose EBGenerationError (échec porteur)");

// ---- 2. Chemin normal : le plan sort du moteur V2 ----
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, runnerStateV1({}));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
ok(await page.locator("#ebTabbar .tabbtn").count() === 5, "plan généré normalement (5 onglets)");
ok(await page.locator("[role=alert]").count() === 0, "aucun écran d'échec quand tout va bien");

// ---- 3. Moteur neutralisé → écran d'échec, PAS de plan dégradé ----
const failTxt = await page.evaluate(async () => {
  const { invalidatePlan, setTab } = await import("./js/ui/tabs.js");
  const saved = globalThis.EBV2;
  globalThis.EBV2 = undefined;            // simule un bundle absent
  invalidatePlan();
  try { setTab("week"); } catch (e) { /* ne doit PAS remonter jusqu'ici */ }
  const txt = document.querySelector("#screen").textContent;
  const alerts = document.querySelectorAll("[role=alert]").length;
  const bar = document.getElementById("ebTabbar");
  globalThis.EBV2 = saved;                 // on rend le moteur pour la suite
  return { txt, alerts, bar: !!bar };
});
ok(failTxt.alerts === 1, "un message d'échec est affiché À L'ÉCRAN (role=alert), pas en console");
ok(/La génération du plan a échoué/.test(failTxt.txt), "le message nomme l'échec sans jargon");
ok(/ton profil est conservé/i.test(failTxt.txt), "le message rassure sur les données (rien n'est perdu)");
ok(/MOTEUR_ABSENT/.test(failTxt.txt), "le code technique reste consultable (support)");
ok(!/Semaine 1/.test(failTxt.txt), "AUCUN plan dégradé n'est affiché à la place");
ok(!failTxt.bar, "la barre d'onglets disparaît : pas de vue de plan sans plan");

// ---- 4. Réessayer répare (le moteur est revenu) ----
const back = await page.evaluate(async () => {
  const { invalidatePlan, setTab } = await import("./js/ui/tabs.js");
  invalidatePlan(); setTab("week");
  return { plan: !!(await import("./js/state.js")).S.currentPlan, alerts: document.querySelectorAll("[role=alert]").length };
});
ok(back.plan && back.alerts === 0, "le moteur revenu, la génération repart (aucun état bloqué)");

// ---- 5. R10 phase 1 : registre de sports — un sport inconnu LÈVE, sans plan fantôme ----
const reg = await page.evaluate(() => {
  const sports = globalThis.EBV2.sports || {};
  let thrown = null, plan = null;
  try { plan = globalThis.EBV2.buildPlan("parapente", { vol_max: "8", sessions_max: "5", history: "confirme" }); }
  catch (e) { thrown = { name: e.name, code: e.code, msg: String(e.message) }; }
  return { ids: Object.keys(sports).sort(), tri: sports.tri, trail: sports.trail, thrown, plan: !!plan };
});
ok(reg.ids.join(",") === "bike,run,swim,trail,tri", "les 5 sports sont déclarés dans le registre (" + reg.ids.join(" ") + ")");
ok(reg.trail && reg.trail.guards.runImpactCap === true, "le trail DÉCLARE le plafond de jours d'appui (D10-3 ne peut plus revenir par oubli)");
ok(reg.tri && reg.tri.retestTypes.length === 3, "le tri déclare ses 3 tests de référence (l'UI ne les recopie plus)");
ok(reg.thrown !== null && !reg.plan, "un sport inconnu lève au lieu de produire un plan silencieux");
ok(reg.thrown && /SPORT_INCONNU/.test(reg.thrown.code || reg.thrown.msg), "l'erreur est PORTEUSE (" + (reg.thrown ? reg.thrown.code : "—") + ")");

ok(errs.length === 0, "aucune exception non attrapée (" + errs.length + ")");
if (errs.length) info(errs.slice(0, 3).join(" | "));

server.close();
await browser.close();
process.exit(report());
