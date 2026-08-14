// LA BOUCLE DU QUESTIONNAIRE (retour du fondateur, 13/08/2026 : « tu me donnes un
// questionnaire buggé en boucle »).
//
// Le boot exigeait `started && sport && onPlan` pour afficher le plan, mais `started` n'était
// posé QUE par le clic sur une carte sport. Un état migré depuis `eb_state_v1` (l'app est
// DÉPLOYÉE : ces états existent dans de vrais navigateurs) arrive avec `started:false` et un
// sport déjà choisi — la carte n'est jamais recliquée, `started` reste faux À VIE. Vécu :
// on complète le questionnaire, on génère, on voit son plan… et CHAQUE réouverture retombe
// sur « Ton plan est prêt 🎯 ». Un questionnaire en boucle.
//
// Trois couches gardées ici, parce que chacune peut casser seule :
//   §1 le chemin migré v1 : compléter → générer → RECHARGER → le plan revient (deux fois) ;
//   §2 la GUÉRISON à la lecture : un état v2 DÉJÀ contradictoire (`onPlan:true` +
//      `started:false` — celui que le bug a écrit dans les navigateurs atteints) affiche le
//      plan dès l'ouverture, sans rien refaire, et l'état est réparé en storage ;
//   §3 le chemin propre ne régresse pas : questionnaire neuf → générer → recharger → plan.
import { startServer, launchBrowser, makeReporter } from "./harness.mjs";

const PORT = 8611;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();

const URL = "http://localhost:" + PORT + "/index.html";
const REPONSES_COMPLETES = {
  intent: "competition", format: "10k", med_pain: "non", med_dizzy: "non", med_treat: "non",
  sex: "H", age: "35", sessions_max: "4", vol_max: "6", vol_recent: "4", dispo: "quotidienne",
  doubles: "non", terrain: "route", level: "inter", pace_known: "non", history: "confirme",
  injury: "aucune", hrv_track: "non",
};

/** Traverse le questionnaire comme un doigt : premier choix partout, âge rempli, rien d'autre. */
async function traverserEtGenerer(page) {
  for (let i = 0; i < 14; i++) {
    await page.evaluate(() => {
      for (const g of document.querySelectorAll(".opts[data-key]"))
        if (!g.querySelector(".opt.sel")) g.querySelector(".opt")?.click();
    });
    await page.waitForTimeout(120);
    await page.evaluate(() => {
      for (const inp of document.querySelectorAll("[data-input]"))
        if (!inp.value && inp.dataset.input === "age") {
          inp.value = "35";
          inp.dispatchEvent(new Event("input", { bubbles: true }));
        }
    });
    await page.waitForTimeout(100);
    if (await page.evaluate(() => document.getElementById("genBtn")?.offsetParent)) {
      await page.click("#genBtn");
      await page.waitForTimeout(1400);
      return true;
    }
    await page.click("#nextBtn").catch(() => {});
    await page.waitForTimeout(160);
  }
  return false;
}
const surLePlan = (page) => page.evaluate(() =>
  !!document.getElementById("ebTabbar") && !document.getElementById("genBtn")
  && !document.getElementById("nextBtn") && document.querySelectorAll(".sport-card").length === 0);

// ---- §1 · le chemin migré v1 ne boucle plus --------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris" });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    if (sessionStorage.getItem("_seme")) return;
    sessionStorage.setItem("_seme", "1");
    localStorage.clear();
    localStorage.setItem("eb_state_v1", JSON.stringify({ sport: "run", answers: { format: "10k" } }));
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  ok(await traverserEtGenerer(page), "§1 migré v1 : le questionnaire repris se termine et génère");
  ok(await surLePlan(page), "§1 migré v1 : le plan est rendu après génération");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  ok(await surLePlan(page), "§1 migré v1 : RECHARGEMENT 1 → le plan revient (c'était la boucle)");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  ok(await surLePlan(page), "§1 migré v1 : RECHARGEMENT 2 → le plan revient encore");
  await ctx.close();
}

// ---- §2 · la guérison d'un état DÉJÀ contradictoire ------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris" });
  const page = await ctx.newPage();
  await page.addInitScript((answers) => {
    if (sessionStorage.getItem("_seme")) return;
    sessionStorage.setItem("_seme", "1");
    localStorage.clear();
    localStorage.setItem("eb_state_v2", JSON.stringify({
      activePlanId: "pX", shared: {},
      plans: [{ id: "pX", label: "", sport: "run", tier: "free", step: 8, started: false, onPlan: true, answers }],
    }));
  }, REPONSES_COMPLETES);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1100);
  ok(await surLePlan(page), "§2 état contradictoire (onPlan sans started) : le plan s'affiche SANS rien refaire");
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem("eb_state_v2")).plans[0].started === true),
    "§2 l'état est RÉPARÉ en storage (started redevient vrai)");
  await ctx.close();
}

// ---- §3 · le chemin propre ne régresse pas ---------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris" });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    if (sessionStorage.getItem("_seme")) return;
    sessionStorage.setItem("_seme", "1");
    localStorage.clear();
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.click('.sport-card[data-sport="run"]');
  await page.waitForTimeout(250);
  ok(await traverserEtGenerer(page), "§3 chemin propre : génération");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  ok(await surLePlan(page), "§3 chemin propre : le plan revient au rechargement");
  await ctx.close();
}

await browser.close();
server.close();
process.exit(report());
