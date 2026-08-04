// R22b — LE REFUS EMMÈNE L'ATHLÈTE SUR LA RÉPONSE EN CAUSE, ET OUVRE LE CHAMP.
//
// Retour du fondateur sur capture : « le bouton "corriger ma réponse" devrait directement
// donner un calendrier ». Mesuré : il envoyait à `curSteps().length - 1`, la DERNIÈRE étape
// du questionnaire, quelle que soit la clé refusée — sur un refus `race_date`, l'athlète
// atterrissait sur une étape qui ne contient aucune date et devait la chercher.
//
// Le refus nomme pourtant la clé, et il l'AFFICHE à l'écran juste en dessous du bouton.
// L'information était là ; le bouton ne la lisait pas.
//
// Trois moitiés, et la troisième est celle qui empêche la garde d'être satisfaite par
// hasard : on vérifie aussi que l'étape atteinte n'est PAS la dernière, sinon un
// questionnaire dont la date serait par chance en dernière position validerait le
// comportement d'avant.
import { startServer, launchBrowser, makeReporter, traverserQuestionnaire } from "./harness.mjs";

const PORT = 8604;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();

/** Une course trop proche : 14 semaines pour un marathon qui en demande 16. */
function courseDans(semaines) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // lundi courant
  d.setUTCDate(d.getUTCDate() + semaines * 7 - 1);
  return d.toISOString().slice(0, 10);
}

const REP = { intent: "competition", format: "marathon", med_pain: "non", med_dizzy: "non",
  med_treat: "non", terrain: "plat", sex: "H", level: "inter", pace_known: "oui",
  history: "confirme", injury: "aucune", dispo: "partielle", off_days: "non", doubles: "non",
  sessions_max: "5", vol_max: "10", vol_recent: "5" };
const SAI = { age: "38", pace: "4:40", weight: "72", race_date: courseDans(14) };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR",
  isMobile: true, hasTouch: true, timezoneId: "Europe/Paris" });
const page = await ctx.newPage();
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.click('.sport-card[data-sport="run"]');
await page.waitForTimeout(250);
await traverserQuestionnaire(page, { reponses: REP, saisies: SAI });
await page.waitForTimeout(700);

// ── Le refus s'affiche, et il nomme la clé
const txt = await page.evaluate(() => (document.getElementById("screen") || {}).innerText || "");
ok(/n.a pas été généré/i.test(txt), "le refus « course trop proche » s'affiche");
ok(/race_date/.test(txt), "…et il nomme la réponse en cause (`race_date`)");
ok(await page.locator("#ebFixInput").count() === 1, "le bouton « Corriger ma réponse » est présent");

// ── Le clic emmène sur l'étape qui PORTE la date
await page.click("#ebFixInput");
await page.waitForTimeout(700);

const etat = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const st = await import("./js/ui/steps.js");
  const champ = document.querySelector('[data-input="race_date"]');
  return {
    step: S.step,
    dernier: st.curSteps().length - 1,
    champPresent: !!champ,
    type: champ ? champ.getAttribute("type") : null,
    focalise: !!champ && document.activeElement === champ,
  };
});

ok(etat.champPresent, "l'écran atteint contient bien le champ `race_date`");
ok(etat.type === "date", "…et c'est un champ de type `date` — donc le calendrier natif du téléphone");
ok(etat.focalise, "le champ est FOCALISÉ à l'arrivée (le calendrier s'ouvre au clic, sans le chercher)");
// La troisième moitié : sans elle, un questionnaire dont la date serait par chance en
// dernière position validerait exactement le comportement qu'on vient de corriger.
ok(etat.step !== etat.dernier,
  "et l'étape atteinte n'est PAS la dernière du questionnaire (" + etat.step + " sur " + etat.dernier + ") — c'est bien un ciblage, pas l'ancien repli");

// ── L'instrument SAIT-IL voir ? On corrige la date : le refus doit disparaître.
//
// La saisie est DÉFENSIVE, et ce n'est pas de la précaution gratuite : quand j'ai cassé
// le ciblage pour vérifier que cette suite rougissait, le champ n'existait plus sur
// l'écran atteint, `el.value = …` levait, et la suite MOURAIT au lieu de rapporter ses
// échecs. Un banc qui explose ne dit pas « rouge », il ne dit rien — et mon comptage de
// lignes `FAIL` en concluait « vert ». C'est la faute d'instrument de R21, refaite le
// même jour.
await page.evaluate((d) => {
  const el = document.querySelector('[data-input="race_date"]');
  if (!el) return;
  el.value = d;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}, courseDans(24));
await page.waitForTimeout(300);
await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const st = await import("./js/ui/steps.js");
  S.step = st.curSteps().length; // → génération
  st.renderStep();
});
await page.waitForTimeout(1200);
const apres = await page.evaluate(() => (document.getElementById("screen") || {}).innerText || "");
ok(!/n.a pas été généré/i.test(apres),
  "avec une date à 24 semaines, le refus disparaît — la mesure sait distinguer les deux états");

await ctx.close();
await browser.close();
server.close();
// La suite doit SORTIR en code non nul quand elle échoue : `run-all.mjs` lit le code de
// sortie du processus, et `report()` se contente de le RENDRE. Sept suites sur dix-sept
// finissaient par `report();` — elles sortaient donc en 0 quoi qu'elles trouvent, et la
// CI les comptait vertes. Même mécanisme que le banc d'invariants d'O-9/R20.6 : un
// rapport que rien ne lit vaut zéro.
process.exit(report());
