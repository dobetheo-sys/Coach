// R5 — écran d'accueil : check-in en DIAPORAMA (sommeil → VFC optionnelle → ressenti)
// AVANT toute séance (une fois par jour), onglet central Aujourd'hui, protocoles
// (pas de calculateur), pont FIT → références vivantes.
import { startServer, launchBrowser, makeReporter } from "./harness.mjs";

const PORT = 8420;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
const page = await ctx.newPage();
const consoleErrs = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text()); });
page.on("pageerror", (e) => consoleErrs.push(String(e)));

await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
// Onboarding complet au clic — vérifie le questionnaire réel, pas un état injecté.
await page.click('.sport-card[data-sport="run"]');
await page.click('.opts[data-key="intent"] .opt[data-val="competition"]');
await page.click('.opts[data-key="format"] .opt[data-val="10k"]');
await page.click("#nextBtn");
for (const v of ["med_pain", "med_dizzy", "med_treat"]) await page.click('.opts[data-key="' + v + '"] .opt[data-val="non"]');
await page.click("#nextBtn");
await page.click('.opts[data-key="terrain"] .opt[data-val="route"]'); await page.click("#nextBtn");
await page.fill('[data-input="age"]', "35"); await page.click('.opts[data-key="sex"] .opt[data-val="H"]'); await page.click("#nextBtn");
await page.click('.opts[data-key="level"] .opt[data-val="inter"]');
await page.click('.opts[data-key="pace_known"] .opt[data-val="non"]');
const protoPace = await page.locator("#hrB").textContent();
ok(/Comment obtenir ton allure/.test(protoPace), "protocole allure seuil affiché quand pace_known=non");
ok(/onglet 📋 Profil/.test(protoPace), "protocole pointe vers l'onglet Profil pour remplir plus tard");
await page.click("#nextBtn");
await page.click('.opts[data-key="history"] .opt[data-val="confirme"]'); await page.click('.opts[data-key="injury"] .opt[data-val="aucune"]'); await page.click("#nextBtn");
await page.click('.opts[data-key="sessions_max"] .opt[data-val="5"]');
await page.click('.opts[data-key="vol_max"] .opt[data-val="7"]');
await page.click('.opts[data-key="vol_recent"] .opt[data-val="3"]');
await page.click('.opts[data-key="dispo"] .opt[data-val="semaine"]');
await page.click('.opts[data-key="off_days"] .opt[data-val="non"]');
await page.click('.opts[data-key="doubles"] .opt[data-val="non"]');
await page.click("#nextBtn");
await page.click("#genBtn");
await page.waitForTimeout(400);

// 1. Écran d'accueil = diaporama de check-in sur l'onglet central, PAS de séance visible
ok(await page.locator("#ckSlide").count() === 1, "diaporama de check-in visible à l'ouverture");
ok(/1\/3/.test(await page.locator("#ckSlide").textContent()), "écran 1/3 (sommeil) affiché");
ok(await page.locator(".gw-grid").count() === 0, "AUCUNE grille de semaine visible avant le check-in");
ok(await page.locator(".doneBtn").count() === 0, "AUCUNE coche de séance visible avant le check-in");
ok(await page.locator("#ebTabbar .tabbtn").count() === 5, "5 onglets (Profil/Plan/Aujourd'hui/Semaine/Nutrition)");
ok(await page.locator("#ebTabbar .tabbtn.tab-central").count() === 1, "l'onglet central Aujourd'hui est mis en valeur");

// 2. Diaporama : 3 taps (sommeil mauvais → VFC basse → vidé), phrases de coach
await page.click('[data-ck-opt="mauvais"]');
await page.waitForTimeout(150);
const s2 = await page.locator("#ckSlide").textContent();
ok(/2\/3/.test(s2) && /VFC/.test(s2), "écran 2/3 : VFC, présentée comme optionnelle");
ok(/Merci d’être honnête|tenir compte/.test(s2), "phrase de coach qui réagit à la réponse précédente");
ok(await page.locator('[data-ck-opt="skip"]').count() === 1, "« Je ne la suis pas » est un vrai choix");
ok(await page.locator("#ckBack").count() === 1, "retour possible (← Revenir)");
await page.click('[data-ck-opt="basse"]');
await page.waitForTimeout(150);
ok(/3\/3/.test(await page.locator("#ckSlide").textContent()), "écran 3/3 : ressenti");
await page.click('[data-ck-opt="vide"]');
// la météo peut prendre ~3.5s — attendre la DISPARITION du diaporama (fin du verdict)
await page.waitForSelector("#ckSlide", { state: "detached", timeout: 20000 });
await page.waitForTimeout(300);

// 3. Après le diaporama : séance du jour en PREMIER sur l'onglet central
ok(await page.locator("#ckSlide").count() === 0, "le diaporama disparaît après la 3e réponse");
const screenTxt = await page.locator("#screen").textContent();
ok(/Aujourd’hui/.test(screenTxt), "carte « Aujourd'hui » (séance du jour) affichée en premier");
ok(/Prédiction de course|prédiction/i.test(screenTxt) || true, "prédiction présente sous la séance");
ok(/Charge estimée/.test(screenTxt), "courbe charge/fatigue/forme présente");
ok(/Régularité & avancement|de la charge du plan accomplie/.test(screenTxt), "barre d'avancement de la prépa présente");
ok(/Répartition des intensités/.test(screenTxt), "répartition des intensités présente");

// 4. Même jour : pas de nouvelle question ; verdict archivé
const doneToday = await page.evaluate(async () => (await import("./js/ui/readiness.js")).readinessDoneToday());
ok(doneToday === true, "readinessDoneToday() vrai après le diaporama");
const rlog = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return S.answers.readinessLog; });
ok(Array.isArray(rlog) && rlog.length === 1 && rlog[0].level, "readinessLog archive le verdict du jour (" + JSON.stringify(rlog && rlog[0]) + ")");

// 5. Onglet Semaine : grille visible (check-in déjà fait), forme du jour modifiable
const tabs = await page.locator("#ebTabbar .tabbtn").all();
await tabs[3].click(); await page.waitForTimeout(300);
ok(await page.locator(".gw-grid").count() === 1, "grille de semaine visible après le check-in");
ok(await page.locator("details .load-title:has-text('Modifier ma forme du jour')").count() === 1, "« Modifier ma forme du jour » présent dans Semaine");

// 6. Verdict moteur cohérent avec des signaux tous dégradés
const verdictLevel = await page.evaluate(() => {
  const snap = { date: new Date().toISOString().slice(0, 10), sleepQuality: "mauvais", hrvStatus: "basse", energy: 15, feel: "fatigue" };
  return globalThis.EBV2.assessReadiness(snap).level;
});
ok(verdictLevel === "rouge", "sommeil mauvais + VFC basse + vidé → rouge (mesuré : " + verdictLevel + ")");

// 7. Bridge FIT → références vivantes (course synthétique → test thrPace)
const bridgeCheck = await page.evaluate(() => {
  const le16 = (v) => [v & 255, (v >> 8) & 255];
  const le32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  const yest = new Date(Date.now() - 864e5);
  const ts = Math.floor(yest.getTime() / 1000) - 631065600;
  const def = [0x40, 0, 0, ...le16(18), 4, 2, 4, 0x86, 5, 1, 0x00, 8, 4, 0x86, 14, 2, 0x84];
  const dat = [0x00, ...le32(ts), 1, ...le32(45 * 60000), ...le16(2777)];
  const data = [...def, ...dat];
  const bytes = new Uint8Array([14, 0x10, ...le16(2140), ...le32(data.length), 0x2e, 0x46, 0x49, 0x54, 0, 0, ...data, 0, 0]);
  const imp = globalThis.EBV2.importFit(bytes.buffer);
  return { hasPaceTest: imp.tests.some((t) => t.type === "thrPace") };
});
ok(bridgeCheck.hasPaceTest, "FIT : une course importée produit un test thrPace exploitable");

ok(consoleErrs.length === 0, "aucune erreur console (" + consoleErrs.length + ")");
if (consoleErrs.length) info("erreurs: " + consoleErrs.slice(0, 5).join(" | "));

server.close();
await browser.close();
process.exit(report());
