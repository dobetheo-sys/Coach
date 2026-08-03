// R18.3 — GARDE DE LA NAVIGATION À CINQ ONGLETS.
//
// Le fondateur a demandé le retour de 📅 Semaine après test (« je préférais 5 onglets que 4 »).
// Restaurer un onglet est facile ; le restaurer sans ramener le défaut que sa suppression
// avait révélé l'est moins, et c'est ce que cette suite vérifie.
//
// Ce que R16.9 avait trouvé en fondant Semaine dans Plan : la coche existait en DEUX
// versions. Celle de Semaine ouvrait le feedback RPE, la célébration et les badges ; celle de
// Plan basculait un booléen en silence. Le même geste, deux comportements selon l'écran — et
// la conséquence n'était pas cosmétique : cocher depuis Plan ne produisait aucun
// `completion`, donc aucun RPE, donc l'ajusteur du lendemain sous-estimait la fatigue et le
// drapeau douleur ne pouvait jamais se poser. Aucun test ne l'a vu pendant des mois, parce
// que chaque suite cochait depuis l'onglet où vivait la version complète.
//
// D'où les critères ci-dessous : ils ne comptent pas des onglets, ils vérifient qu'un GESTE
// donne le MÊME résultat quel que soit l'endroit d'où on le fait.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8593;
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
await page.waitForTimeout(700);
const iso = await page.evaluate(() => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
});
await page.evaluate(async (iso) => {
  const { S, ebSave } = await import("./js/state.js");
  S.answers.readiness = { date: iso, sleepQuality: "bon", hrvStatus: "normale", energy: 80, feel: "frais" };
  S.answers.done = {};
  ebSave();
}, iso);
const setTab = (t) => page.evaluate(async (t) => { const { setTab } = await import("./js/ui/tabs.js"); setTab(t); }, t);

// ---- 1. La barre : cinq onglets, et le central est réellement au milieu ------------------
await setTab("today");
await page.waitForTimeout(400);
const barre = await page.evaluate(() => [...document.querySelectorAll("#ebTabbar .tabbtn")].map((b) => b.dataset.tab));
ok(barre.length === 5, "cinq onglets (" + barre.join(" · ") + ")");
ok(barre.indexOf("today") === 2,
  "🎯 Aujourd’hui est le TROISIÈME sur cinq — « central » n'est pas qu'un style, c'est une position, et un nombre pair la rendait impossible");
ok(barre.includes("week"), "📅 Semaine est bien de retour dans la barre");

// ---- 2. Le contenu : Semaine apporte ce que Plan ne portait pas -------------------------
await setTab("week");
await page.waitForTimeout(500);
ok(await page.locator("#screen .gd").count() >= 5, "la grille de la semaine est rendue");
const nav1 = await page.locator("#screen .gw-h b").first().textContent();
await page.click("#wkNext");
await page.waitForTimeout(350);
const nav2 = await page.locator("#screen .gw-h b").first().textContent();
ok(nav1 !== nav2, "navigation de semaine en semaine (" + nav1 + " → " + nav2 + ") — c'est ce que ni Plan ni Aujourd’hui ne donnent");
ok(await page.locator("#wkNow").count() === 1, "hors semaine courante, un retour explicite est proposé");
await page.click("#wkNow");
await page.waitForTimeout(350);
ok((await page.locator("#screen .gw-h b").first().textContent()) === nav1, "le retour ramène bien à la semaine courante");

// Et il ne DUPLIQUE pas le quotidien : celui-ci reste dans 🎯 Aujourd'hui.
const dansSemaine = await page.evaluate(() => document.getElementById("screen").innerHTML);
ok(!/ckSlide|Modifier ma forme du jour/.test(dansSemaine),
  "📅 Semaine ne redessine pas le check-in ni la forme du jour : le quotidien reste dans 🎯 Aujourd’hui");

// ---- 3. LE critère : un geste, une implémentation ---------------------------------------
// On coche depuis 📅 Semaine, puis on coche depuis 🗓 Plan, et on exige que les DEUX
// produisent la même chose : la modale de feedback (donc un RPE, donc de la matière pour
// l'ajusteur du lendemain). C'est l'assertion qui aurait attrapé le défaut de R16.9.
async function cocher() {
  const avant = await page.evaluate(() => Object.keys((JSON.parse(localStorage.getItem("eb_state_v2") || localStorage.getItem("eb_state_v1") || "{}").answers || {}).done || {}).length);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("#screen .doneBtn")].find((x) => x.textContent.trim() === "○" && x.dataset.rest !== "1");
    if (b) b.click();
  });
  await page.waitForTimeout(600);
  const modale = await page.evaluate(() => !!document.querySelector(".modal, [role=dialog], #ebModal"));
  // Fermer la modale sans répondre ne doit rien casser.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  return { modale, avant };
}
const depuisSemaine = await cocher();
ok(depuisSemaine.modale, "cocher depuis 📅 Semaine ouvre le feedback (la boucle complète)");

await setTab("general");
await page.waitForTimeout(600);
const depuisPlan = await cocher();
ok(depuisPlan.modale, "cocher depuis 🗓 Plan ouvre le MÊME feedback — un geste, une implémentation");

// ---- 4. Le ⇄ ne fait pas disparaître l'onglet d'où on l'a touché ------------------------
// `handleSwapClick` re-rendait `renderTabPlanGeneral` en dur : touché depuis Semaine, il
// renvoyait l'utilisateur sur Plan. Même classe de défaut, par l'autre bout.
await setTab("week");
await page.waitForTimeout(500);
await page.evaluate(() => { const b = document.querySelector("#screen [data-swap]"); if (b) b.click(); });
await page.waitForTimeout(400);
const actif = await page.evaluate(() => (document.querySelector("#ebTabbar .tabbtn.active") || {}).dataset?.tab);
ok(actif === "week", "après un ⇄ touché depuis 📅 Semaine, on est TOUJOURS sur 📅 Semaine (actif : " + actif + ")");

ok(errs.length === 0, "aucune erreur JS (" + errs.length + (errs.length ? " — " + errs[0] : "") + ")");
await browser.close();
server.close();
report();
