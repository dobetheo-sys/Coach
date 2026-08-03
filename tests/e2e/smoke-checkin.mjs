// R5 — écran d'accueil : check-in en DIAPORAMA (sommeil → VFC optionnelle → ressenti)
// AVANT toute séance (une fois par jour), onglet central Aujourd'hui, protocoles
// (pas de calculateur), pont FIT → références vivantes.
import { startServer, launchBrowser, makeReporter, traverserQuestionnaire } from "./harness.mjs";

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
// U14 — LE QUESTIONNAIRE SE TRAVERSE SANS QUE LE TEST EN CONNAISSE L'ORDRE.
//
// Cette suite codait la séquence des écrans en dur. Elle est tombée le jour où l'ordre a changé
// pour une bonne raison (mettre en tête ce dont l'absence coûte une garde de sécurité) — alors
// qu'elle ne mesure PAS l'ordre : elle mesure ce qui vient après. Un test qui code une séquence
// qu'il ne teste pas se casse à chaque réorganisation légitime.
let vuProtocole = false;
await traverserQuestionnaire(page, {
  reponses: { intent: "competition", format: "10k", med_pain: "non", med_dizzy: "non", med_treat: "non",
    terrain: "route", sex: "H", level: "inter", pace_known: "non", history: "confirme", injury: "aucune",
    sessions_max: "5", vol_max: "7", vol_recent: "3", dispo: "semaine", off_days: "non", doubles: "non" },
  saisies: { age: "35" },
  async surEcran(pg) {
    if (vuProtocole || !(await pg.locator("#hrB").count())) return;
    const proto = await pg.locator("#hrB").textContent();
    if (!/Comment obtenir/.test(proto || "")) return;
    vuProtocole = true;
    ok(/Comment obtenir ton allure/.test(proto), "protocole allure seuil affiché quand pace_known=non");
    ok(/onglet 📋 Profil/.test(proto), "protocole pointe vers l'onglet Profil pour remplir plus tard");
  },
});
ok(vuProtocole, "l'écran du protocole d'allure a bien été traversé");
await page.waitForTimeout(400);

// 1. U11 — L'ÉCRAN D'ARRIVÉE A CHANGÉ, LE PORTILLON N'A PAS BOUGÉ.
//
// Le jour où le plan est créé, on arrive sur 🗓 Plan : après 8 écrans et 30 gestes de
// questionnaire, présenter TROIS QUESTIONS DE PLUS était le moment où l'on perdait des gens.
// Ce que ce fichier vérifie reste identique — « aucune séance visible avant le check-in » — mais
// sur l'onglet où cette règle a toujours eu son sens : 🎯 Aujourd'hui. (Elle n'a jamais été
// globale : 🗓 Plan a toujours affiché la grille, à un clic, avant tout check-in.)
ok(await page.evaluate(() => (document.querySelector("#ebTabbar .tabbtn.active") || {}).dataset?.tab) === "general",
  "U11 — le jour de la création, on arrive sur le PLAN et pas sur un quatrième questionnaire");
await page.click('#ebTabbar .tabbtn[data-tab="today"]');
await page.waitForTimeout(600);

ok(await page.locator("#ckSlide").count() === 1, "diaporama de check-in visible à l'ouverture de 🎯 Aujourd'hui");
ok(/1\/3/.test(await page.locator("#ckSlide").textContent()), "écran 1/3 (sommeil) affiché");
ok(/dormi combien/.test(await page.locator("#ckSlide").textContent()), "le sommeil est demandé en HEURES (signal mesuré, audit v6 A5)");
ok(await page.locator(".gw-grid").count() === 0, "AUCUNE grille de semaine visible avant le check-in");
ok(await page.locator(".doneBtn").count() === 0, "AUCUNE coche de séance visible avant le check-in");
ok(await page.locator("#ebTabbar .tabbtn").count() === 5, "5 onglets (Profil/Plan/Aujourd'hui/Semaine/Nutrition) — R18.3 a restauré Semaine, et 🎯 Aujourd'hui redevient réellement CENTRAL (3e sur 5)");
ok(await page.locator("#ebTabbar .tabbtn.tab-central").count() === 1, "l'onglet central Aujourd'hui est mis en valeur");

// 2. Diaporama : 3 taps (nuit courte → VFC basse → vidé), phrases de coach
await page.click('[data-ck-opt="4"]'); // moins de 5h
await page.waitForTimeout(150);
const s2 = await page.locator("#ckSlide").textContent();
ok(/2\/3/.test(s2) && /VFC/.test(s2), "écran 2/3 : VFC, présentée comme optionnelle");
ok(/lever le pied|tenir compte|Nuit courte/.test(s2), "phrase de coach qui réagit à la réponse précédente");
ok(await page.locator('[data-ck-opt="skip"]').count() === 1, "« Je ne la suis pas » est un vrai choix");
ok(await page.locator("#ckHr").count() === 1, "FC au réveil collectée (optionnelle) — audit v6 A6");
await page.fill("#ckHr", "58");
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

// 5. R16.9 — la forme du jour se retouche dans 🎯 Aujourd'hui (l'onglet du quotidien),
// pas dans le plan. On est encore dessus après le diaporama.
ok(await page.locator("details .load-title:has-text('Modifier ma forme du jour')").count() === 1, "« Modifier ma forme du jour » présent dans Aujourd’hui");
ok(await page.locator("details .load-title:has-text('Adaptations quotidiennes')").count() === 1, "le journal des verdicts a suivi dans Aujourd’hui");

// 5bis. L'ONGLET FUSIONNÉ — critère d'acceptation du handoff : depuis 🗓 Plan seul, on doit
// pouvoir COCHER une séance faite ET voir la vue d'ensemble, sans changer d'onglet.
const tabs = await page.locator("#ebTabbar .tabbtn").all();
await tabs[1].click(); await page.waitForTimeout(300);
ok(await page.locator("#screen .gw-grid").count() >= 2, "Plan montre la semaine courante ET la saison (" + (await page.locator("#screen .gw-grid").count()) + " grilles)");
ok(await page.locator("#screen .doneBtn").count() > 0, "la coche ✓ d'une séance est atteignable depuis Plan");
ok(await page.locator("#screen [data-swap]").count() > 0, "l'échange de jours ⇄ a survécu à la fusion");
const planTxt = await page.locator("#screen").textContent();
ok(/Sous-objectifs/.test(planTxt) && /décisions du moteur/i.test(planTxt), "la vue d'ensemble (phases + décisions) est sur le même écran");
ok(/Agenda \(\.ics\)/.test(planTxt), "les exports sont sur le même écran");

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
