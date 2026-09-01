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
  // R23.2 — l'horodatage du check-in suit la JOURNÉE D'ENTRAÎNEMENT, pas la date calendaire.
  // Ce test injectait la date calendaire : vert la plupart du temps, ROUGE dès que l'heure
  // locale simulée tombe entre minuit et 4 h (en UTC+14, c'est chaque jour de 10 h à 14 h UTC).
  // Le portillon compare au repère de l'app — on horodate donc avec LE MÊME repère (R11.1).
  const { jourEntrainementISO } = await import("./js/state.js");
  S.answers.readiness = { date: jourEntrainementISO(), sleepQuality: "bon", hrvStatus: "normale", energy: 80, feel: "frais" };
  S.answers.done = {};
  ebSave();
}, iso);
const setTab = (t) => page.evaluate(async (t) => { const { setTab } = await import("./js/ui/tabs.js"); setTab(t); }, t);

// ---- 1. La barre : cinq onglets, et le central est réellement au milieu ------------------
await setTab("today");
await page.waitForTimeout(400);
const barre = await page.evaluate(() => [...document.querySelectorAll("#ebTabbar .tabbtn")].map((b) => b.dataset.tab));
// 07/08/2026 — R24.9 avait retiré Nutrition (4 onglets, nutrition réduite dans Aujourd'hui) ;
// 🧰 Outils lui redonne un cinquième onglet (version COMPLÈTE, tunnel de commande compris).
ok(barre.length === 5, "cinq onglets (" + barre.join(" · ") + ")");
ok(barre.indexOf("today") === 2,
  "🎯 Aujourd’hui est le TROISIÈME sur cinq — « central » n'est pas qu'un style, c'est une position, et un nombre pair la rendait impossible");
ok(barre.includes("week"), "📅 Semaine est bien de retour dans la barre");
ok(barre.includes("outils"), "🧰 Outils occupe le cinquième onglet");

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

// ---- 5. 🧰 Outils > 📚 Éducatifs — module riche à six disciplines (R16). Ce que cette suite
// vérifie, c'est la NAVIGATION (sous-onglet atteint depuis la barre) — le contenu à six
// disciplines (schéma unifié, badges, verrouillage, sources) a sa propre suite dédiée,
// `smoke-educatifs.mjs`, qui le couvre en profondeur (A1-A13 du brief). Le profil de ce test
// est un coureur seul (`runnerStateV1`) : une seule discipline s'affiche (§4 du brief), donc
// on vérifie CETTE forme-là plutôt que d'importer l'hypothèse à quatre disciplines de l'ancien
// glossaire qu'il remplace.
await setTab("outils");
await page.waitForTimeout(400);
await page.evaluate(() => { const b = document.querySelector('[data-subtool="educatifs"]'); if (b) b.click(); });
await page.waitForTimeout(300);
const edu = await page.evaluate(() => ({
  discs: [...document.querySelectorAll(".edu-disc")].map((b) => b.textContent.trim()),
  sections: document.querySelectorAll(".edu-section").length,
  sources: document.querySelectorAll(".edu-sources-box").length,
  refs: document.querySelectorAll(".edu-sources-box li").length,
}));
ok(JSON.stringify(edu.discs) === JSON.stringify(["Course"]), "profil course seule → une discipline (" + edu.discs.join(" · ") + ")");
ok(edu.sections >= 4, "la discipline Course rend ses sections (" + edu.sections + ")");
// Le critère portait « exactement UNE boîte » : c'était le compte du jour où il a été écrit,
// quand toutes les sources vivaient dans une boîte de bas de page. Depuis la refonte des
// Éducatifs, les sources d'une section vivent DANS la section — 5 boîtes pour 5 sections, et
// aucune de bas de page. Rien n'est perdu (13 références rendues), c'est la PLACE qui change.
// Le critère porte donc sur la PROPRIÉTÉ — les sources sont rendues et référencées — et
// PUBLIE ce qu'il trouve, plutôt que d'épingler un compte qu'une section ajoutée fait bouger.
ok(edu.sources >= 1 && edu.refs >= 1,
  "les sources sont rendues (" + edu.sources + " bloc(s), " + edu.refs + " référence(s))");
// Single-source (R11.1) : `EBV2.eduLibrary` est la MÊME structure que celle dont
// `swimDrillGlossaryText()` dérive le texte injecté dans les notes « Nage éducatifs »
// (sessionLibrary.ts) — vérifié au caractère près côté moteur par `npm run golden:verify`
// (0 écart sur 949 profils après ce refactor). Ici on vérifie juste qu'elle a du contenu.
const swimCheck = await page.evaluate(() => {
  const lib = (globalThis.EBV2 && globalThis.EBV2.eduLibrary) || [];
  const sw = (lib.find((x) => x.key === "sw") || {}).drills || [];
  return { n: sw.length, first: sw[0] && sw[0].name };
});
ok(swimCheck.n >= 3, "le glossaire nage exposé à l'UI porte ses éducatifs (" + swimCheck.n + ", ex. « " + swimCheck.first + " »)");

ok(errs.length === 0, "aucune erreur JS (" + errs.length + (errs.length ? " — " + errs[0] : "") + ")");
await browser.close();
server.close();
// La suite doit SORTIR en code non nul quand elle échoue : `run-all.mjs` lit le code de
// sortie du processus, et `report()` se contente de le RENDRE. Sept suites sur dix-sept
// finissaient par `report();` — elles sortaient donc en 0 quoi qu'elles trouvent, et la
// CI les comptait vertes. Même mécanisme que le banc d'invariants d'O-9/R20.6 : un
// rapport que rien ne lit vaut zéro.
process.exit(report());
