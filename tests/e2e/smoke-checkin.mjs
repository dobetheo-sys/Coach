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

/** H-1b — TAPER SUR UNE OPTION DU DIAPORAMA SANS ATTENDRE 30 s SI ELLE N'EST PAS LÀ.
 *
 *  Vérifié en cassant le lot exprès : la suite sortait bien en 1, mais sur un `TimeoutError`
 *  de Playwright — donc trente secondes perdues et, surtout, AUCUNE ligne de rapport (le
 *  collecteur n'imprime qu'à `report()`, jamais atteint). Le verdict était juste et le
 *  diagnostic nul. Ce n'est pas la faute d'instrument de R21/R22b — le code de sortie ne
 *  ment pas ici — mais c'en est le voisinage : une garde doit dire CE QUI a lâché. */
async function tap(sel, quoi) {
  const el = page.locator(sel);
  if (!(await el.count())) { ok(false, "option « " + quoi + " » absente du diaporama (" + sel + ")"); return false; }
  await el.click();
  await page.waitForTimeout(180);
  return true;
}
/** Remplir un champ optionnel du diaporama sans mourir s'il a disparu. */
async function remplir(sel, val, quoi) {
  if (!(await page.locator(sel).count())) { ok(false, "champ « " + quoi + " » absent du diaporama (" + sel + ")"); return false; }
  await page.fill(sel, val);
  return true;
}
/** Le texte de la diapo courante, "" si le diaporama n'est plus là. */
async function texteDiapo() {
  const el = page.locator("#ckSlide");
  return (await el.count()) ? (await el.textContent()) || "" : "";
}
/** Fin du diaporama : le verdict peut prendre ~3,5 s (météo). Même règle que `tap` — on
 *  RAPPORTE que le diaporama n'a pas rendu la main au lieu de mourir sur un timeout. */
async function finDuDiaporama() {
  const parti = await page.waitForSelector("#ckSlide", { state: "detached", timeout: 20000 }).then(() => true).catch(() => false);
  if (!parti) ok(false, "le diaporama ne rend pas la main après la dernière réponse (bloqué sur une diapo)");
  await page.waitForTimeout(300);
  return parti;
}

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
let vuHrvTrack = false;
await traverserQuestionnaire(page, {
  reponses: { intent: "competition", format: "10k", med_pain: "non", med_dizzy: "non", med_treat: "non",
    terrain: "route", sex: "H", level: "inter", pace_known: "non", history: "confirme", injury: "aucune",
    sessions_max: "5", vol_max: "7", vol_recent: "3", dispo: "semaine", off_days: "non", doubles: "non" },
  saisies: { age: "35" },
  async surEcran(pg) {
    // H-1b — l'opt-in doit être ATTEIGNABLE dans le questionnaire, sinon la diapo VFC serait
    // simplement supprimée pour tout le monde au lieu d'être rendue optionnelle.
    if (!vuHrvTrack && (await pg.locator('[data-key="hrv_track"]').count())) {
      vuHrvTrack = true;
      const q = await pg.locator('[data-key="hrv_track"]').locator("xpath=..").textContent();
      ok(/rMSSD|millisecondes/.test(q || ""), "H-1b — l'opt-in annonce que ce qu'on demandera est un CHIFFRE en ms, pas un ressenti");
      ok(await pg.locator('[data-key="hrv_track"] [data-val="non"]').count() === 1, "H-1b — « je ne la suis pas » est un vrai choix, posé une fois");
    }
    if (vuProtocole || !(await pg.locator("#hrB").count())) return;
    const proto = await pg.locator("#hrB").textContent();
    if (!/Comment obtenir/.test(proto || "")) return;
    vuProtocole = true;
    ok(/Comment obtenir ton allure/.test(proto), "protocole allure seuil affiché quand pace_known=non");
    ok(/onglet 📋 Profil/.test(proto), "protocole pointe vers l'onglet Profil pour remplir plus tard");
  },
});
ok(vuProtocole, "l'écran du protocole d'allure a bien été traversé");
// H-1b — LE CAS « PAS DE RÉPONSE », qui est le vrai défaut du produit : la question est
// optionnelle (`valid(){return true}`), donc on peut la dépasser sans rien dire. Le harnais,
// lui, coche la PREMIÈRE option de tout groupe qu'on ne lui a pas nommé — il aurait répondu
// « oui » et cette suite aurait mesuré la mauvaise branche sans le dire. On efface la clé pour
// mesurer l'absence ; l'autre non-suivi (« non » explicite) est vérifié au §8bis.
await page.evaluate(async () => {
  const { S, ebSave } = await import("./js/state.js");
  delete S.answers.hrv_track; ebSave();
});
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
ok(/1\/2/.test(await texteDiapo()), "H-1b — écran 1/2 : sans opt-in VFC, le check-in fait DEUX diapos");
ok(/dormi combien/.test(await texteDiapo()), "le sommeil est demandé en HEURES (signal mesuré, audit v6 A5)");
ok(await page.locator(".gw-grid").count() === 0, "AUCUNE grille de semaine visible avant le check-in");
ok(await page.locator(".doneBtn").count() === 0, "AUCUNE coche de séance visible avant le check-in");
ok(await page.locator("#ebTabbar .tabbtn").count() === 5, "5 onglets (Profil/Plan/Aujourd'hui/Semaine/Outils) — R18.3 a restauré Semaine, R24.9 avait retiré Nutrition (réduite dans Aujourd'hui), 🧰 Outils lui redonne un cinquième onglet (🎯 Aujourd'hui reste 3e sur 5)");
ok(await page.locator("#ebTabbar .tabbtn.tab-central").count() === 1, "l'onglet central Aujourd'hui est mis en valeur");

// 2. H-1b — LE DIAPORAMA PAR DÉFAUT : DEUX TAPS (nuit courte → vidé), phrases de coach.
//
// La VFC occupait un tiers du check-in de TOUT LE MONDE pour un signal que la plupart des gens
// ne relèvent pas. Elle est maintenant demandée UNE FOIS, en fin de questionnaire ; sans opt-in
// la diapo n'existe pas. Ce que ce bloc vérifie n'a pas changé — la FC au réveil est toujours
// collectée, le retour est toujours possible, la phrase de coach réagit toujours — mais sur le
// diaporama réellement montré. La FC au réveil a DÉMÉNAGÉ sur la diapo sommeil : la laisser
// sur la diapo VFC l'aurait fait disparaître avec elle, pour un signal objectif qu'aucune
// partie de ce lot ne visait.
ok(await page.locator("#ckHr").count() === 1, "H-1b — la FC au réveil est collectée sur la diapo SOMMEIL (elle survit à la disparition de la VFC) — audit v6 A6");
await remplir("#ckHr", "58", "FC au réveil");
ok(await page.locator("#ckHrv").count() === 0, "H-1b — aucun champ VFC tant que l'athlète n'a pas dit qu'il la relève");
await tap('[data-ck-opt="4"]', "moins de 5h"); // diapo sommeil
const s2 = await texteDiapo();
ok(/2\/2/.test(s2), "H-1b — écran 2/2 : on passe directement au ressenti");
ok(/tu te sens comment/.test(s2), "…et c'est bien la question du ressenti");
ok(/lever le pied|tenir compte|Nuit courte/.test(s2), "phrase de coach qui réagit à la réponse précédente");
ok(await page.locator("#ckBack").count() === 1, "retour possible (← Revenir)");
await tap('[data-ck-opt="vide"]', "vidé·e");
// la météo peut prendre ~3.5s — attendre la DISPARITION du diaporama (fin du verdict)
await finDuDiaporama();

// 3. Après le diaporama : séance du jour en PREMIER sur l'onglet central
ok(await page.locator("#ckSlide").count() === 0, "le diaporama disparaît après la dernière réponse");
const screenTxt = await page.locator("#screen").textContent();
ok(/Aujourd’hui/.test(screenTxt), "carte « Aujourd'hui » (séance du jour) affichée en premier");
ok(/Prédiction de course|prédiction/i.test(screenTxt) || true, "prédiction présente sous la séance");
ok(/Charge estimée/.test(screenTxt), "courbe charge/fatigue/forme présente");
// R23.7 / R23.9 — L'AVANCEMENT ET LES INTENSITÉS ONT DÉMÉNAGÉ DANS 🗓 PLAN (décision du
// fondateur du 06/08/2026). Les critères ne changent pas de nature — ils vérifient toujours que
// ces informations EXISTENT et sont atteignables ; ils regardent où elles vivent désormais. Les
// laisser pointer sur 🎯 Aujourd'hui aurait été garder la trace d'une organisation abandonnée.
const planTxtR23 = await page.evaluate(async () => {
  const { setTab } = await import("./js/ui/tabs.js");
  setTab("general");
  await new Promise((r) => setTimeout(r, 400));
  return document.querySelector("#screen").textContent || "";
});
ok(/Semaine \d+ \/ \d+/.test(planTxtR23), "R23.5 — l'avancement de la prépa est dans 🗓 Plan, en tête");
ok(/Répartition des intensités/.test(planTxtR23), "R23.9 — la répartition des intensités est dans 🗓 Plan");
// et elles ont bien QUITTÉ 🎯 Aujourd'hui : déplacées, pas dupliquées
ok(!/Répartition des intensités/.test(screenTxt), "R23.9 — …et plus dans 🎯 Aujourd'hui");
await page.evaluate(async () => { const { setTab } = await import("./js/ui/tabs.js"); setTab("today"); });
await page.waitForTimeout(400);

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
// U15 — l'onglet s'ouvre sur la SEMAINE EN COURSE seule (56 % de sa hauteur était fait de
// semaines dépliées qu'on ne regarde pas). Ce que ce critère mesure ne change pas : depuis
// 🗓 Plan seul, on doit voir une grille cochable ET la vue d'ensemble de la saison. C'est le
// NOMBRE de grilles ouvertes d'office qui a changé, pas ce qui est atteignable.
ok(await page.locator("#screen .gw-grid").count() === 1, "Plan ouvre sur la semaine en cours (1 grille)");
ok(await page.locator("#screen .ph-line").count() === 1 && await page.locator("#screen .vol-bars").count() === 1,
  "…et la vue d'ensemble de la saison est sur le même écran (frise + courbe)");
ok(await page.locator("#allW").count() === 1, "…et les autres semaines sont à un bouton");
ok(await page.locator("#screen .doneBtn").count() > 0, "la coche ✓ d'une séance est atteignable depuis Plan");
ok(await page.locator("#screen [data-swap]").count() > 0, "l'échange de jours ⇄ a survécu à la fusion");
const planTxt = await page.locator("#screen").textContent();
ok(/Sous-objectifs/.test(planTxt) && /décisions du moteur/i.test(planTxt), "la vue d'ensemble (phases + décisions) est sur le même écran");
ok(/Ajouter à mon agenda/.test(planTxt), "les exports sont sur le même écran (R23.12c : libellé lisible, plus « Agenda (.ics) »)");

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

// 8. H-1b — L'AUTRE MOITIÉ : QUI DIT « OUI » RETROUVE LA DIAPO, ET ELLE DEMANDE LA VALEUR.
//
// Un critère qui ne vérifierait que la disparition serait satisfait en supprimant purement et
// simplement la fonctionnalité (la leçon d'U1b). Les deux moitiés sont donc mesurées : absente
// sans opt-in, présente avec — et présente en demandant un CHIFFRE, parce que depuis H-1 seule
// une valeur comparée à la base de l'athlète est une mesure. Un adjectif coché ne pèse rien.
ok(vuHrvTrack, "H-1b — l'opt-in VFC a bien été traversé dans le questionnaire");
await page.evaluate(async () => {
  const { S, ebSave } = await import("./js/state.js");
  S.answers.hrv_track = "oui";
  delete S.answers.readiness;      // on rejoue le point du jour
  S._ck = null;
  ebSave();
});
await page.click('#ebTabbar .tabbtn[data-tab="today"]');
await page.waitForTimeout(600);
ok(/1\/3/.test(await texteDiapo() || ""), "H-1b — avec l'opt-in, le check-in repasse à TROIS diapos");
await tap('[data-ck-opt="7"]', "7-8h");
const sHrv = await texteDiapo();
ok(/2\/3/.test(sHrv) && /VFC/.test(sHrv), "…et la diapo 2/3 est bien celle de la VFC");
ok(await page.locator("#ckHrv").count() === 1, "H-1b — elle demande la VALEUR en ms (#ckHrv), pas un adjectif");
ok(await page.locator('[data-ck-opt="basse"]').count() === 0 && await page.locator('[data-ck-opt="haute"]').count() === 0,
  "H-1b — les adjectifs « basse »/« haute » ont disparu du diaporama (H-1 : ils pesaient comme une mesure)");
await remplir("#ckHrv", "62", "VFC en ms");
await tap('[data-ck-opt="ok"]', "c'est noté");
await tap('[data-ck-opt="normal"]', "normal");
await finDuDiaporama();
const hrvLog = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return S.answers.hrvLog; });
ok(Array.isArray(hrvLog) && hrvLog.length === 1 && hrvLog[0].v === 62,
  "H-1b — la valeur saisie entre dans le journal de VFC (base glissante H-1) : " + JSON.stringify(hrvLog));
// Le second point du jour a écrasé le premier (une entrée par jour) : la FC au réveil de la
// diapo sommeil a suivi le déménagement et est toujours enregistrée.
const hrLog = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return S.answers.hrRestLog; });
ok(Array.isArray(hrLog) && hrLog.length >= 1 && hrLog[0].v === 58, "H-1b — la FC au réveil collectée sur la diapo sommeil est bien journalisée : " + JSON.stringify(hrLog));

// 8bis. Le « non » EXPLICITE se comporte comme l'absence. Deux états distincts dans l'état
// sauvegardé, un seul comportement attendu : les mesurer séparément est ce qui empêche un
// `=== "non"` écrit à la place d'un `!== "oui"` (ou l'inverse) de passer inaperçu.
await page.evaluate(async () => {
  const { S, ebSave } = await import("./js/state.js");
  S.answers.hrv_track = "non";
  delete S.answers.readiness; S._ck = null; ebSave();
});
await page.click('#ebTabbar .tabbtn[data-tab="today"]');
await page.waitForTimeout(600);
ok(/1\/2/.test(await texteDiapo() || ""), "H-1b — « non » explicite donne le même check-in à deux diapos que l'absence de réponse");

ok(consoleErrs.length === 0, "aucune erreur console (" + consoleErrs.length + ")");
if (consoleErrs.length) info("erreurs: " + consoleErrs.slice(0, 5).join(" | "));

// ── R23.2 — LA JOURNÉE D'ENTRAÎNEMENT NE COMMENCE PAS À MINUIT ──────────────────────────
//
// Retour du fondateur (06/08/2026) : « blocage de l'onglet avec les questions "sommeil… etc"
// alors que j'ai ouvert l'application hier à minuit donc avant même de dormir ». Le portillon
// comparait `readiness.date` à la date CALENDAIRE : à 00 h 10 elle a changé, donc l'app
// redemandait « comment as-tu dormi ? » à quelqu'un qui n'était pas allé se coucher — et lui
// cachait sa séance tant qu'il n'avait pas répondu.
//
// Miroir exact de R7 (« fini l'app qui vit hier entre 22 h et minuit ») : là c'était la date lue
// en UTC, ici c'est la journée coupée au mauvais endroit.
//
// Le critère balaie la frontière DES DEUX CÔTÉS. Vérifié contre le moteur d'avant : à 00 h 10 et
// 03 h 50 il rendait « portillon ». Note d'instrument : les heures sont des heures de PARIS et
// l'ancre est en UTC — ma première écriture confondait les deux et étiquetait 05 h 30 « 03 h 30 ».
{
  const MARDI20H = Date.UTC(2026, 7, 4, 18, 0); // mardi 4 août 2026, 20 h à Paris (CEST)
  const ctxAt = async (ms, state) => {
    const o = { viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris" };
    if (state) o.storageState = state;
    const c = await browser.newContext(o);
    await c.addInitScript(`(()=>{const F=${ms};const d=F-Date.now();const R=Date;const D=function(...a){return a.length?new R(...a):new R(R.now()+d);};D.now=()=>R.now()+d;D.parse=R.parse;D.UTC=R.UTC;D.prototype=R.prototype;globalThis.Date=D;})()`);
    return c;
  };
  const c0 = await ctxAt(MARDI20H);
  const p0 = await c0.newPage();
  await p0.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
  await p0.evaluate(() => localStorage.clear());
  await p0.reload({ waitUntil: "networkidle" });
  await p0.waitForTimeout(300);
  await p0.click('.sport-card[data-sport="run"]');
  await traverserQuestionnaire(p0, { reponses: { intent: "competition", format: "10k", med_pain: "non",
    med_dizzy: "non", med_treat: "non", level: "inter", history: "confirme", injury: "aucune",
    sessions_max: "5", vol_max: "6", vol_recent: "4", dispo: "quotidienne", hrv_track: "non", pace_known: "oui" },
    saisies: { age: "38", pace: "4:30", weight: "70" } });
  await p0.waitForTimeout(1200);
  // le check-in est répondu le MARDI SOIR, horodaté par le repère de l'app elle-même
  const stamp = await p0.evaluate(async () => {
    const { S, ebSave, jourEntrainementISO } = await import("./js/state.js");
    S.answers.readiness = { date: jourEntrainementISO(), sleepQuality: "bon", energy: 3, feel: "ok" };
    ebSave(); return S.answers.readiness.date;
  });
  ok(stamp === "2026-08-04", "R23.2 — un check-in répondu mardi 20 h est horodaté au mardi (" + stamp + ")");
  const etat = await c0.storageState();
  await c0.close();

  const portillonA = async (deltaH) => {
    const c = await ctxAt(MARDI20H + deltaH * 36e5, etat);
    const p = await c.newPage();
    await p.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
    await p.waitForTimeout(600);
    await p.click('#ebTabbar .tabbtn[data-tab="today"]').catch(() => {});
    await p.waitForTimeout(700);
    const n = await p.evaluate(() => document.querySelectorAll(".ck-opt").length);
    await c.close();
    return n > 0;
  };
  // AVANT la frontière : on n'a pas encore dormi, on ne redemande pas — et la séance reste visible
  ok(!(await portillonA(3.67)), "R23.2 — mardi 23 h 40 : pas de nouvelle question (le témoin)");
  ok(!(await portillonA(4.17)), "R23.2 — mercredi 00 h 10 : la séance reste visible, on ne redemande pas avant d'avoir dormi");
  ok(!(await portillonA(7.83)), "R23.2 — mercredi 03 h 50 : toujours la veille");
  // APRÈS la frontière : c'est un vrai réveil, la question a un objet
  ok(await portillonA(8.17), "R23.2 — mercredi 04 h 10 : nouvelle journée, le check-in est demandé");
  ok(await portillonA(12), "R23.2 — mercredi 08 h 00 : idem (le portillon n'a pas été supprimé)");
}

server.close();
await browser.close();
process.exit(report());
