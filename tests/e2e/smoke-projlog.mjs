// A-5 — LE JOURNAL DE PROJECTION, GARDÉ SUR SES DEUX MOITIÉS.
//
// Le registre appelle A-5 « l'angle mort le plus profond du prédicteur » : les bandes `h`,
// `G_plafond`, `k_structure` de P2bis et le régime P11 sont des heuristiques que RIEN ne valide,
// et on ne saura jamais qu'elles sont fausses tant que les projections ne seront pas confrontées
// aux résultats réels. C'est le seul chantier du dépôt dont le coût AUGMENTE avec l'attente.
//
// Deux moitiés, et jamais une seule :
//   A5-A — le journal ÉCRIT, une entrée par semaine, avec de quoi refaire le calcul plus tard
//          (sinon la garde serait satisfaite en supprimant la fonctionnalité — la leçon d'U1b) ;
//   A5-B — le journal ne REBOUCLE JAMAIS : le plan et la prédiction affichés sont identiques
//          au caractère près avec un journal vide et avec un journal rempli.
//
// A5-B est la moitié qui compte. Un journal qui influencerait la projection deviendrait une
// seconde source de vérité (ce que R11.1 / R20.5 / U9 interdisent partout ailleurs) et, pire,
// une boucle qui se confirme elle-même : le moteur calibré sur ses propres annonces mesurerait
// sa cohérence au lieu de sa justesse. C'est la même forme de garde que `RV-UI-B`.
import { startServer, launchBrowser, makeReporter, traverserQuestionnaire } from "./harness.mjs";

const PORT = 8603;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();

const REP = { intent: "competition", format: "marathon", med_pain: "non", med_dizzy: "non",
  med_treat: "non", terrain: "plat", sex: "H", level: "inter", pace_known: "oui",
  history: "confirme", injury: "aucune", dispo: "partielle", off_days: "non", doubles: "non",
  // `vol_max`, `vol_recent` et `sessions_max` sont des groupes d'OPTIONS, et leurs domaines sont
  // discrets : `vol_max: "8"` n'existe pas (4/7/10/13/16/20) — le traverseur retombait alors sur
  // la première option et le journal enregistrait fidèlement 4. Deux erreurs à moi, dans cet
  // ordre : les avoir mises en saisies libres, puis y avoir mis une valeur hors domaine.
  sessions_max: "5", vol_max: "10", vol_recent: "5" };
const SAI = { age: "38", pace: "4:40", weight: "72" };

/**
 * La carte « Prédiction de course » vit dans 🎯 Aujourd'hui, DERRIÈRE le portillon du check-in
 * — et c'est voulu : le journal enregistre ce que l'athlète a effectivement VU, pas un second
 * calcul qui pourrait diverger de l'écran (la forme du défaut R19.5). On pose donc la readiness
 * du jour, comme `smoke-dates`, au lieu de déplacer le point d'accroche.
 */
async function ouvrirAujourdhui(page) {
  await page.evaluate(async () => {
    const { S, ebSave, todayISO } = await import("./js/state.js");
    S.answers.readiness = { date: todayISO(), sleepQuality: "bon", hrvStatus: "normale", energy: 80, feel: "frais" };
    ebSave();
    const { setTab } = await import("./js/ui/tabs.js");
    setTab("today");
  });
  await page.waitForTimeout(900);
}

async function session() {
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
  await ouvrirAujourdhui(page);
  return { ctx, page };
}

/** L'état du journal, lu là où il vit vraiment : `localStorage`. */
const journal = (page) => page.evaluate(() => {
  // `activePlanId` est un IDENTIFIANT, pas un index : `plans[activePlanId]` rend `undefined`.
  // Ma première écriture faisait cette confusion, et elle ne se voyait pas dans les suites
  // existantes parce qu'un plan unique vit à l'index 0.
  const st = JSON.parse(localStorage.getItem("eb_state_v2") || "null");
  const e = st && st.plans && (st.plans.find((p) => p.id === st.activePlanId) || st.plans[0]);
  return (e && e.answers && e.answers.projLog) || [];
});

/** L'empreinte de ce qui est AFFICHÉ — c'est par l'écran qu'un reflux arriverait à l'athlète. */
const empreinte = (page) => page.evaluate(() => {
  const sc = document.getElementById("screen");
  return sc ? (sc.innerText || "").replace(/\s+/g, " ").trim() : "";
});

const { ctx, page } = await session();

// ── A5-A : le journal écrit
let log = await journal(page);
ok(log.length >= 1, "A5-A — une projection est journalisée dès la première ouverture (" + log.length + ")");

const e = log[0] || {};
ok(!!e.sem && !!e.date, "A5-A — l'entrée porte sa semaine ISO et sa date");
ok(e.sport === "run" && e.format === "marathon", "A5-A — elle porte le sport et le format");
ok(e.refs && e.refs.pace === "4:40" && e.refs.volMax === 10 && e.refs.poids === 72 && e.refs.age === 38,
  "A5-A — elle porte les RÉFÉRENCES MESURÉES qui ont servi d'ancre (sans elles, un gain de +4 % ne veut rien dire)");
ok(Array.isArray(e.actuel) && e.actuel.length > 0,
  "A5-A — elle porte les temps annoncés pour la forme du jour");
ok("gainPct" in e && "gainBand" in e && "adherence" in e && "confiance" in e,
  "A5-A — et de quoi REFAIRE le calcul : gain, fourchette, adhérence, confiance");
ok(e.reel === null, "A5-A — la vérité terrain est déclarée VIDE tant que la course n'a pas eu lieu");

// ── Une par SEMAINE : re-rendre l'onglet n'empile pas les entrées
for (let i = 0; i < 3; i++) {
  await page.click('#ebTabbar .tabbtn[data-tab="general"]');
  await page.waitForTimeout(250);
  await page.click('#ebTabbar .tabbtn[data-tab="today"]');
  await page.waitForTimeout(400);
}
const log2 = await journal(page);
ok(log2.length === log.length,
  "A5-A — quatre rendus dans la même semaine ⇒ toujours " + log2.length + " entrée(s) : le grain est la SEMAINE");

// ── A5-B : LE JOURNAL NE REBOUCLE PAS. C'est la moitié qui compte.
const avecJournal = await empreinte(page);
await page.evaluate(() => {
  const st = JSON.parse(localStorage.getItem("eb_state_v2"));
  const p = st.plans.find((x) => x.id === st.activePlanId) || st.plans[0];
  p.answers.projLog = [];
  localStorage.setItem("eb_state_v2", JSON.stringify(st));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);
await ouvrirAujourdhui(page);
const sansJournal = await empreinte(page);
ok(avecJournal === sansJournal,
  "A5-B — le plan et la prédiction sont IDENTIQUES avec un journal rempli et avec un journal vide");

// ── L'INSTRUMENT SAIT-IL VOIR ? Sans ce critère, A5-B serait satisfaite par une empreinte
// aveugle — la question qui manquait aux mesures démasquées en R20.
await page.evaluate(() => {
  const st = JSON.parse(localStorage.getItem("eb_state_v2"));
  const p = st.plans.find((x) => x.id === st.activePlanId) || st.plans[0];
  p.answers.pace = "5:30";
  localStorage.setItem("eb_state_v2", JSON.stringify(st));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);
await ouvrirAujourdhui(page);
const autre = await empreinte(page);
ok(autre !== avecJournal && autre.length > 200,
  "A5-B — l'empreinte SAIT voir un changement de prédiction (allure 4:40 → 5:30)");

// ── Le journal ne fait pas exploser le stockage
const poids = await page.evaluate(() => (localStorage.getItem("eb_state_v2") || "").length);
ok(poids < 2_000_000, "A5 — l'état complet reste sous 2 Mo (" + Math.round(poids / 1024) + " Ko)");

await ctx.close();
await browser.close();
server.close();
// La suite doit SORTIR en code non nul quand elle échoue : `run-all.mjs` lit le code de
// sortie du processus, et `report()` se contente de le RENDRE. Sept suites sur dix-sept
// finissaient par `report();` — elles sortaient donc en 0 quoi qu'elles trouvent, et la
// CI les comptait vertes. Même mécanisme que le banc d'invariants d'O-9/R20.6 : un
// rapport que rien ne lit vaut zéro.
process.exit(report());
