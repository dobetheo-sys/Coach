// R7 — jours du plan = jours calendaires RÉELS, en heure LOCALE de l'appareil.
// Fuseau de test : UTC+14 (Pacific/Kiritimati) — la date locale y diffère de la date UTC
// la majorité de la journée : toute régression vers toISOString (UTC) casse cette suite
// (c'était le bug : « on est mardi, j'ai la séance de lundi » à 23h heure française).
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8570;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Pacific/Kiritimati" })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, runnerStateV1());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);

// La date LOCALE vue par la page (UTC+14) — différente de la date UTC du harnais la
// plupart du temps ; toutes les assertions se font contre CETTE référence.
const local = await page.evaluate(() => {
  const d = new Date();
  const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  return { iso, dm: iso.slice(8, 10) + "/" + iso.slice(5, 7), utc: new Date().toISOString().slice(0, 10) };
});
info("date locale (UTC+14) : " + local.iso + " · date UTC : " + local.utc + (local.iso !== local.utc ? " (différentes — le test mord)" : " (identiques à cette heure-ci)"));

// Le check-in gate compare readiness.date à la date LOCALE → poser la readiness du jour local
await page.evaluate(async (iso) => {
  const { S, ebSave } = await import("./js/state.js");
  // R23.2 — l'horodatage du check-in suit la JOURNÉE D'ENTRAÎNEMENT, pas la date calendaire.
  // Ce test injectait la date calendaire : vert la plupart du temps, ROUGE dès que l'heure
  // locale simulée tombe entre minuit et 4 h (en UTC+14, c'est chaque jour de 10 h à 14 h UTC).
  // Le portillon compare au repère de l'app — on horodate donc avec LE MÊME repère (R11.1).
  const { jourEntrainementISO } = await import("./js/state.js");
  S.answers.readiness = { date: jourEntrainementISO(), sleepQuality: "bon", hrvStatus: "normale", energy: 80, feel: "frais" };
  ebSave();
  const { setTab } = await import("./js/ui/tabs.js");
  setTab("today");
}, local.iso);
await page.waitForTimeout(400);

// 1. Aujourd'hui : l'en-tête de la séance du jour porte la date locale réelle
const heroTxt = await page.locator("#screen .card").first().textContent();
ok(heroTxt.includes(local.dm), "héros « Aujourd'hui » annoté de la date locale réelle (" + local.dm + ")");
ok(await page.evaluate(async () => { const { todayISO } = await import("./js/state.js"); return todayISO(); }) === local.iso, "todayISO() de l'app = date locale (jamais UTC)");

// 2. La carte de validation vise bien le jour calendaire local
const vTxt = await page.locator(".card:has-text('Valider ma journée')").textContent().catch(() => "");
ok(!vTxt || vTxt.includes(local.dm), "carte « Valider ma journée » datée du jour local");

// 3. 📅 Semaine → carte « Ta semaine » : chaque jour annoté de sa date ; « auj. » = date locale
// R18.3 — la carte est repartie dans l'onglet 📅 Semaine, restauré. On y va par NOM et plus
// par index : c'est un changement d'ordre d'onglets qui a cassé cette suite, et un test qui
// dépend d'une position se recasse au prochain.
await page.evaluate(async () => { const { setTab } = await import("./js/ui/tabs.js"); setTab("week"); });
await page.waitForTimeout(400);
const semaine = page.locator("#screen .card").filter({ hasText: "Ta semaine" }).first();
const cells = await semaine.locator(".gd .gd-top i").allTextContents();
ok(cells.length === 7 && cells.every((c) => /\d{2}\/\d{2}/.test(c)), "les 7 jours de la semaine sont annotés de leur date (dd/mm)");
const todayCell = await page.locator("#screen .gd.today").first().textContent().catch(() => null);
ok(!!todayCell && todayCell.includes("auj.") && todayCell.includes(local.dm), "la case « aujourd'hui » de la grille porte la date locale (" + local.dm + ")");
// cohérence plan ↔ calendrier : la date affichée correspond au jour étiqueté
const dayCheck = await page.evaluate(async (iso) => {
  const { S } = await import("./js/state.js");
  const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  let okAll = true, found = false;
  S.currentPlan.weeks.forEach((w) => w.days.forEach((d) => {
    if (!d.date) return;
    const wd = JOURS[new Date(d.date + "T12:00:00Z").getUTCDay()];
    if (!S.currentPlan.use10 && d.jour !== wd) okAll = false;
    if (d.date === iso) found = true;
  }));
  return { okAll, found };
}, local.iso);
ok(dayCheck.okAll, "chaque étiquette de jour (Lun/Mar/…) correspond au vrai jour calendaire de sa date");
ok(dayCheck.found, "le jour calendaire local existe bien dans le plan (pas de décalage de semaine)");

// 4. En-têtes de semaine : bornes « du dd/mm au dd/mm » présentes (Semaine + Plan)
ok(/du \d{2}\/\d{2} au \d{2}\/\d{2}/.test(await semaine.textContent()), "l'en-tête de semaine affiche ses bornes calendaires");
await page.evaluate(async () => { const { setTab } = await import("./js/ui/tabs.js"); setTab("general"); });
await page.waitForTimeout(400);
// AUDIT UX 11/08/2026 — ce critère lisait les en-têtes de semaine du PROGRAMME DE PHASE, qui
// était construit d'avance pour les 40 semaines et replié : un contenu que personne ne voit
// sans ouvrir une phase (c'est ce qui faisait 201 coches dans le DOM, désormais construites à
// l'ouverture). Il porte sur « les semaines de la SAISON » : on le mesure donc sur la vue qui
// les montre, « Voir tout le plan », plutôt que sur du DOM invisible.
await page.click("#allW");
await page.waitForTimeout(600);
ok(/du \d{2}\/\d{2} au \d{2}\/\d{2}/.test(await page.locator("#screen").textContent()), "les semaines de la saison portent aussi leurs bornes calendaires (onglet 🗓 Plan)");

// 5. Second fuseau (UTC−11) : à TOUTE heure réelle, au moins un des deux fuseaux a une
// date locale ≠ UTC — la régression toISOString ne peut pas passer entre les mailles.
const page2 = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Pacific/Midway" })).newPage();
page2.on("pageerror", (e) => errs.push(String(e)));
await page2.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
await page2.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, runnerStateV1());
await page2.reload({ waitUntil: "networkidle" });
await page2.waitForTimeout(600);
const local2 = await page2.evaluate(async () => {
  const d = new Date();
  const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const { todayISO } = await import("./js/state.js");
  return { iso, app: todayISO(), utc: new Date().toISOString().slice(0, 10) };
});
info("UTC−11 : locale " + local2.iso + " · UTC " + local2.utc + (local2.iso !== local2.utc ? " (différentes — le test mord)" : ""));
ok(local2.app === local2.iso, "todayISO() = date locale aussi en UTC−11 (app: " + local2.app + ")");
const inPlan2 = await page2.evaluate(async (iso) => {
  const { S, ebSave } = await import("./js/state.js");
  // R23.2 — l'horodatage du check-in suit la JOURNÉE D'ENTRAÎNEMENT, pas la date calendaire.
  // Ce test injectait la date calendaire : vert la plupart du temps, ROUGE dès que l'heure
  // locale simulée tombe entre minuit et 4 h (en UTC+14, c'est chaque jour de 10 h à 14 h UTC).
  // Le portillon compare au repère de l'app — on horodate donc avec LE MÊME repère (R11.1).
  const { jourEntrainementISO } = await import("./js/state.js");
  S.answers.readiness = { date: jourEntrainementISO(), sleepQuality: "bon", hrvStatus: "normale", energy: 80, feel: "frais" };
  ebSave();
  const { setTab } = await import("./js/ui/tabs.js");
  // R-ZENNA v6 — la grille a quitté la vue par défaut de 🗓 Plan pour 📅 Semaine (décision du
  // fondateur, 11/08/2026). Ce critère porte sur la case « aujourd'hui » DE LA GRILLE, pas sur
  // un onglet : on va la chercher là où elle vit. Le premier passage (UTC+14, plus haut)
  // regardait déjà l'onglet Semaine — c'est le second qui était resté sur Plan.
  setTab("week");
  return !!document.querySelector("#screen .gd.today");
}, local2.iso);
ok(inPlan2, "UTC−11 : la case « aujourd'hui » tombe sur le bon jour calendaire local");
await page2.close();

ok(errs.length === 0, "aucune erreur JS (" + errs.length + ")");
if (errs.length) info(errs.slice(0, 4).join(" | "));

server.close();
await browser.close();
process.exit(report());
