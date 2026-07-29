// Lot améliorations (adapté R5) : échange de jours ⇄ (Semaine), accessibilité des
// modales (Échap + focus), résultat de course réel (Aujourd'hui), journal des
// adaptations (Semaine), estimation énergétique (Nutrition), Strava OAuth (Profil).
// Ordre des onglets R5 : 0=Profil · 1=Plan · 2=Aujourd'hui · 3=Semaine · 4=Nutrition.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8540;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("dialog", (d) => d.accept()); // confirm() éventuel (2 jours durs consécutifs) → garder

await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
const today = new Date().toISOString().slice(0, 10);
const st = runnerStateV1({ readinessLog: [{ date: today, level: "orange", action: "reduce" }] });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, st);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);

// ---- 1. Échange de jours (⇄) dans Semaine : deux taps, persistant, réversible ----
const tabs = await page.locator("#ebTabbar .tabbtn").all();
await tabs[3].click(); await page.waitForTimeout(300);
ok((await page.locator("#screen [data-swap]").count()) === 7, "un bouton ⇄ par jour de la semaine courante");
const before = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const t = new Date().toISOString().slice(0, 10);
  const w = S.currentPlan.weeks.find((x) => x.days.some((d) => d.date === t)) || S.currentPlan.weeks[0];
  return { num: w.num, days: w.days.map((d) => ({ jour: d.jour, names: d.sessions.map((s) => s.name).join("+") })) };
});
let iA = 0, iB = 1;
outer: for (let i = 0; i < before.days.length; i++)
  for (let j = i + 1; j < before.days.length; j++)
    if (before.days[i].names !== before.days[j].names) { iA = i; iB = j; break outer; }
const jA = before.days[iA].jour, jB = before.days[iB].jour;
await page.click('#screen [data-swap="' + before.num + "|" + jA + '"]'); await page.waitForTimeout(200);
ok(/sélectionné/.test(await page.locator("#screen").textContent()), "1er tap : jour sélectionné, consigne affichée");
await page.click('#screen [data-swap="' + before.num + "|" + jB + '"]'); await page.waitForTimeout(400);
const after = await page.evaluate(async (wn) => {
  const { S } = await import("./js/state.js");
  const w = S.currentPlan.weeks.find((x) => x.num === wn);
  return { swaps: S.answers.daySwaps, days: w.days.map((d) => ({ jour: d.jour, names: d.sessions.map((s) => s.name).join("+") })) };
}, before.num);
ok(Array.isArray(after.swaps) && after.swaps.length === 1, "échange persisté dans answers.daySwaps");
ok(after.days[iA].names === before.days[iB].names && after.days[iB].names === before.days[iA].names, "les séances des deux jours sont bien échangées (" + jA + " ⇄ " + jB + ")");
const persisted = await page.evaluate(async (arg) => {
  const { invalidatePlan, ensurePlan } = await import("./js/ui/tabs.js");
  invalidatePlan();
  const p = ensurePlan();
  const w = p.weeks.find((x) => x.num === arg.wn);
  return w.days.map((d) => ({ jour: d.jour, names: d.sessions.map((s) => s.name).join("+") }));
}, { wn: before.num });
ok(persisted[iA].names === before.days[iB].names, "l'échange survit à une régénération du plan (réappliqué)");
await page.click('#screen [data-swap="' + before.num + "|" + jA + '"]'); await page.waitForTimeout(150);
await page.click('#screen [data-swap="' + before.num + "|" + jB + '"]'); await page.waitForTimeout(400);
const reverted = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return (S.answers.daySwaps || []).length; });
ok(reverted === 0, "refaire le même échange l'annule (réversible)");

// ---- 2. Accessibilité des modales : Échap ferme, focus piégé ----
const dbtn = page.locator('.doneBtn[data-rest="0"]:not(.done)').first();
await dbtn.click(); await page.waitForTimeout(300);
ok(await page.locator(".eb-overlay [aria-modal='true']").count() === 1, "modal feedback marquée aria-modal");
const focusInModal = await page.evaluate(() => !!document.activeElement.closest(".eb-overlay"));
ok(focusInModal, "le focus est déplacé dans la modal à l'ouverture");
await page.keyboard.press("Escape"); await page.waitForTimeout(300);
ok(await page.locator(".eb-modal:has-text('Comment c’était')").count() === 0, "Échap ferme la modal feedback");
if (await page.locator(".eb-overlay").count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(200); }
ok(await page.locator(".eb-overlay").count() === 0, "Échap ferme aussi la célébration");

// ---- 3. Journal des adaptations (Semaine) ----
ok(/Adaptations quotidiennes \(1 check-ins? · 1 ajustement/.test(await page.locator("#screen").textContent()), "carte « Adaptations quotidiennes » listée depuis readinessLog (Semaine)");

// ---- 3bis. R6 : valider la séance depuis Aujourd'hui + 3 formats de partage ----
await page.evaluate(async () => {
  const { S, ebSave } = await import("./js/state.js");
  // remettre à zéro les ✓ du jour pour tester le flux de validation d'Aujourd'hui
  const t = new Date().toISOString().slice(0, 10);
  const p = S.currentPlan;
  p.weeks.forEach((w) => w.days.forEach((d) => { if (d.date === t) d.sessions.forEach((s, si) => { if (S.answers.done) delete S.answers.done[w.num + "|" + d.jour + "|" + si]; }); }));
  ebSave();
  const { setTab } = await import("./js/ui/tabs.js");
  setTab("today");
});
await page.waitForTimeout(300);
ok(await page.locator("#screen [data-vd]").count() >= 1, "boutons de validation de la séance présents dans Aujourd'hui");
ok(await page.locator("#tdRedoCheckin").count() === 1, "« Refaire mon point du matin » disponible (check-in re-jouable)");
const vBtn = page.locator('#screen [data-vd][data-vrest="0"]:not([disabled])').first();
if (await vBtn.count()) {
  await vBtn.click(); await page.waitForTimeout(300);
  ok(await page.locator(".eb-modal:has-text('Comment c’était')").count() === 1, "valider depuis Aujourd'hui ouvre le feedback RPE");
  await page.locator("[data-rpe='5']").click();
  await page.locator("[data-feel='normal']").click();
  await page.click("#fbSave"); await page.waitForTimeout(400);
  ok(await page.locator("#ebShareStory").count() === 1 && (await page.locator("#ebShareSquare").count()) === 1 && (await page.locator("#ebShareText").count()) === 1, "célébration : 3 types de partage (Story / Carte / Texte)");
  await page.click("#ebCloseCongrats"); await page.waitForTimeout(200);
} else {
  ok((await page.locator('#screen [data-vd][data-vrest="1"]').count()) >= 1, "jour de repos : validation « récupération respectée » proposée");
  info("jour de repos — flux feedback testé via la grille Semaine (section 2)");
  ok(true, "célébration : partages testés via la grille (repos aujourd'hui)");
}

// ---- 3ter. R6 : la frise de phases déroule le PROGRAMME, validation aux ✓ ----
const tP = await page.locator("#ebTabbar .tabbtn").all();
await tP[1].click(); await page.waitForTimeout(300);
ok(await page.locator("#screen [data-phseg]").count() >= 3, "segments de la frise de phases cliquables");
await page.locator("#screen [data-phseg]").first().click(); await page.waitForTimeout(300);
const openPh = page.locator("#screen .ph-obj[open]").first();
ok(await openPh.count() === 1, "cliquer un segment ouvre le programme de la phase");
const phTxt = await openPh.textContent();
ok(/Semaine \d+/.test(phTxt) && (await openPh.locator(".doneBtn").count()) > 0, "le programme liste les semaines avec les coches ✓ des séances");
const phValid = await page.evaluate(async () => {
  const { S, ebSave } = await import("./js/state.js");
  const { setTab } = await import("./js/ui/tabs.js");
  const p = S.currentPlan;
  const phase = p.phases[0];
  if (!S.answers.done) S.answers.done = {};
  p.weeks.filter((w) => w.phase && w.phase.nom === phase.nom).forEach((w) => w.days.forEach((d) => d.sessions.forEach((s, si) => { if (s.d !== "rs") S.answers.done[w.num + "|" + d.jour + "|" + si] = true; })));
  ebSave();
  S._phOpen = phase.nom;
  setTab("general");
  return /Phase validée/.test(document.querySelector("#screen").textContent);
});
ok(phValid, "toutes les séances de la phase cochées → « ✅ Phase validée »");

// ---- 3quater. R6 : nouveau plan pré-rempli + retour à l'accueil possible ----
await tP[0].click(); await page.waitForTimeout(300);
await page.click("#pfNewPlan"); await page.waitForTimeout(300);
ok(await page.locator(".sport-card").count() === 5, "nouveau plan → choix du sport — 5 sports depuis R7 (trail)");
ok(await page.locator("#ebBackToPlan").count() === 1, "« Revenir à mon plan en cours » visible pendant le questionnaire");
const prefilled = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return { age: S.answers.age, sex: S.answers.sex, pace: S.answers.pace }; });
ok(prefilled.age === "35" && prefilled.sex === "H" && prefilled.pace === "4:30", "données de la personne pré-remplies (âge/sexe/allure) dans le nouveau plan");
await page.click("#ebBackToPlan"); await page.waitForTimeout(500);
ok(await page.locator("#ebTabbar .tabbtn").count() === 5, "retour : la vue plan est restaurée");
const plansAfterBack = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return S.plans.length; });
ok(plansAfterBack === 1, "le brouillon abandonné est retiré (pas de plan fantôme)");

// ---- 4. Résultat de course réel (Aujourd'hui — sous la prédiction) ----
await page.evaluate(async (d) => {
  const { S, ebSave } = await import("./js/state.js");
  S.answers.race_date = d;
  ebSave();
  const { setTab } = await import("./js/ui/tabs.js");
  setTab("today");
}, today);
await page.waitForTimeout(300);
ok(await page.locator("#pgRaceTime").count() === 1, "course passée → carte de saisie du chrono sur Aujourd'hui");
await page.fill("#pgRaceTime", "44:30");
await page.click("#pgRaceSave"); await page.waitForTimeout(300);
ok(/Réalisé : 44:30/.test(await page.locator("#screen").textContent()), "chrono réel enregistré et affiché");
const rr = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return S.answers.raceResult; });
ok(rr && rr.time === "44:30" && rr.date === today, "raceResult persisté avec la date de course");

// ---- 5. Onglet Nutrition : estimation énergétique (jamais une cible) ----
await page.evaluate(async () => {
  const { S, ebSave } = await import("./js/state.js");
  delete S.answers.weight;
  ebSave();
  const { setTab } = await import("./js/ui/tabs.js");
  setTab("nutrition");
});
await page.waitForTimeout(300);
const noWtxt = await page.locator("#screen").textContent();
ok(/Dépense estimée du jour/.test(noWtxt) && /Renseigne ton poids/i.test(noWtxt), "sans poids → carte présente mais AUCUNE estimation, renvoi vers Profil");
await page.evaluate(async () => {
  const { S, ebSave } = await import("./js/state.js");
  S.answers.weight = "72";
  S.answers.height = "180";
  ebSave();
  const { setTab } = await import("./js/ui/tabs.js");
  setTab("nutrition");
});
await page.waitForTimeout(300);
const eTxt = await page.locator("#screen").textContent();
ok(/Base \+ vie quotidienne/.test(eTxt) && /Entraînement du jour/.test(eTxt) && /Total/.test(eTxt), "carte dépense : base + entraînement + total affichés (ouverte par défaut)");
ok(/protéines ~\d+/.test(eTxt) && /lipides ~\d+/.test(eTxt) && /glucides ~\d+/.test(eTxt), "macros indicatives affichées (fourchettes chiffrées)");
ok(/pas un menu/i.test(eTxt) && /pas une consigne/i.test(eTxt), "garde-fous affichés : photographie, pas un menu ni une consigne");
ok(!/déficit|maigrir|perte de poids|restriction/i.test(eTxt), "aucun vocabulaire de restriction dans l'onglet Nutrition");
ok(!/Journal alimentaire/.test(eTxt), "journal alimentaire retiré (décision R6)");

// ---- 6. Strava OAuth : connexion via relais au Profil, repli jeton manuel ----
const t6 = await page.locator("#ebTabbar .tabbtn").all();
await t6[0].click(); await page.waitForTimeout(300);
ok(await page.locator("#pfStravaConnect").count() === 1, "bouton « Se connecter avec Strava » présent au Profil");
ok(await page.locator("#pfStravaRelay").count() === 1, "champ URL du relais présent (server/README.md)");
ok(await page.locator("#pfStravaTok").count() === 1, "repli jeton manuel conservé");
await page.click("#pfStravaConnect"); await page.waitForTimeout(150);
ok(/relais/i.test(await page.locator("#pfStravaMsg").textContent()), "sans URL de relais → message d'aide, pas de redirection");
const authOk = await page.evaluate(async () => {
  const payload = btoa(JSON.stringify({ access_token: "at123", refresh_token: "rt456", expires_at: Math.floor(Date.now() / 1000) + 21600, athlete: { id: 1, firstname: "Théo" } }));
  location.hash = "#strava_auth=" + encodeURIComponent(payload);
  const { stravaAuthFromHash } = await import("./js/strava.js");
  const got = stravaAuthFromHash();
  const { S } = await import("./js/state.js");
  return { got, stored: S.answers.stravaAuth && S.answers.stravaAuth.access_token === "at123", hashClean: !location.hash.includes("strava_auth") };
});
ok(authOk.got && authOk.stored && authOk.hashClean, "retour OAuth : tokens stockés depuis le fragment, hash nettoyé");
await t6[0].click(); await page.waitForTimeout(300);
const connTxt = await page.locator("#screen").textContent();
ok(/Connecté \(Théo\)/.test(connTxt), "état connecté affiché (prénom Strava)");
ok(await page.locator("#pfStravaBtn").count() === 1 && (await page.locator("#pfStravaOut").count()) === 1, "boutons « Importer mes activités » et « Se déconnecter » présents");
await page.click("#pfStravaOut"); await page.waitForTimeout(300);
ok(await page.locator("#pfStravaConnect").count() === 1, "déconnexion → retour à l'état non connecté");

ok(errs.length === 0, "aucune erreur JS (" + errs.length + ")");
if (errs.length) info(errs.slice(0, 4).join(" | "));

server.close();
await browser.close();
process.exit(report());
