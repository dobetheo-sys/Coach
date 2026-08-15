/**
 * O-41 §1bis — L'IMPORT DU QUESTIONNAIRE ATTEINT-IL LE PLAN, OU S'ARRÊTE-T-IL AU JOURNAL ?
 *
 * Le balayage statique a montré que `steps.js` pousse `ftp` et `thrPace` dans le journal et
 * n'appelle JAMAIS `syncRefsFromTests()`. Un balayage de fichier n'est pas un constat sur le
 * produit (T-33) : il faut traverser.
 *
 * ⚠ LE PIÈGE, ET IL EST LA RAISON D'ÊTRE DES DEUX VARIANTES : ouvrir l'onglet Profil déclenche
 * `syncRefsFromTests`, donc un test qui y passe FABRIQUE le résultat qu'il mesure — exactement
 * la faute de la sonde CSS qui construisait un état que le questionnaire ne produit pas.
 *
 *   (a) import → génération DIRECTE, sans jamais ouvrir Profil
 *   (b) import → ouvrir Profil → génération
 *
 *   (a) ✗ et (b) ✓ → le trou est RÉEL mais MASQUÉ par une navigation courante : le pire cas,
 *                    il marche par accident pour qui passe au Profil et casse pour qui génère
 *                    tout de suite ;
 *   (a) ✗ et (b) ✗ → trou franc ;
 *   (a) ✓          → le flux repasse ailleurs par la promotion.
 */
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

/** Un profil tri complet — la FTP y est DÉCLARÉE inconnue, seul l'import la porte. */
const REPONSES = { ...runnerStateV1().answers, sport: "tri", format: "70.3",
  ftp_known: "non", pace_known: "non", css_known: "non" };

const port = 8109;
const srv = await startServer(port);
const browser = await launchBrowser();
const page = await browser.newPage();
const { ok, info, report } = makeReporter();

/** Pose un journal contenant une FTP et une allure MESURÉES, comme le ferait `stravaImport`. */
const poserJournal = async (p, answers) => p.evaluate((a) => {
  const today = new Date().toISOString().slice(0, 10);
  // Les DEUX écritures exactes de steps.js:640 et 695, avec leurs sources d'import — et RIEN
  // d'autre : ni `ftp`, ni `ftp_known`. C'est très précisément ce que le chemin d'import fait.
  const tests = [
    { type: "ftp", value: 250, date: today, source: "Strava (meilleure moyenne 20 min)" },
    { type: "thrPace", value: 260, date: today, source: "Strava (ton meilleur 10 min continu)" },
  ];
  localStorage.clear();
  localStorage.setItem("eb_state_v2", JSON.stringify({
    activePlanId: "pX", shared: {},
    plans: [{ id: "pX", label: "", sport: "tri", tier: "free", step: 8, started: true, onPlan: true,
      answers: { ...a, tests } }],
  }));
  return "ok";
}, answers);

const lireEtat = async (p) => p.evaluate(() => {
  const st = JSON.parse(localStorage.getItem("eb_state_v2") || "null");
  const a = (st && st.plans && st.plans[0] && st.plans[0].answers) || {};
  return {
    ftp: a.ftp ?? null, ftp_known: a.ftp_known ?? null,
    pace: a.pace ?? null, pace_known: a.pace_known ?? null,
    nTests: Array.isArray(a.tests) ? a.tests.length : 0,
  };
});

for (const variante of ["a", "b"]) {
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: "domcontentloaded" });
  const pose = await poserJournal(page, REPONSES);
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  if (pose !== "ok") { ok(false, `variante ${variante} : impossible de poser le journal (${pose})`); continue; }

  if (variante === "b") {
    // La variante MASQUÉE : on passe par le Profil, qui appelle `syncRefsFromTests`.
    await page.evaluate(() => globalThis.setTab && globalThis.setTab("profile"));
    await page.waitForTimeout(500);
  }

  const etat = await lireEtat(page);
  const promu = etat.ftp_known === "oui" && String(etat.ftp) === "250";
  const label = variante === "a" ? "(a) SANS passer par le Profil" : "(b) APRÈS être passé par le Profil";
  info(`${label} — journal ${etat.nTests} test(s) · answers.ftp=${etat.ftp} ftp_known=${etat.ftp_known} · pace=${etat.pace} pace_known=${etat.pace_known}`);
  if (variante === "a") {
    ok(promu, "(a) la FTP importée atteint `answers.ftp` SANS passer par le Profil" + " — " + (promu ? "promue" : "⚠ NON PROMUE — le journal la porte, le moteur ne la verra jamais sur ce chemin"));
  } else {
    ok(promu, "(b) le passage par le Profil promeut bien la FTP importée" + " — " + (promu ? "promue" : "non promue même après le Profil — trou franc"));
  }
}

await browser.close();
srv.close();
process.exit(report());
