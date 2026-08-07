// Smoke R4 (adapté R5) : migration v1→v2, multi-plans, records, avatar au PROFIL,
// journal nutrition dans l'onglet NUTRITION, décisions moteur dans PLAN (sans bandeau
// rouge), feedback→félicitations→partage dans SEMAINE.
// Ordre des onglets R5 : 0=Profil · 1=Plan · 2=Aujourd'hui · 3=Semaine · 4=Nutrition.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";
const N_SPORTS = 7; // R16.10 — swimrun réintégré : le sélecteur suit le registre du moteur


const PORT = 8480;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
const page = await ctx.newPage();
const consoleErrs = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text()); });
page.on("pageerror", (e) => consoleErrs.push(String(e)));

// ---- 1. MIGRATION v1 → v2 : injecter l'ANCIEN format, l'app doit le reprendre ----
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
const st = runnerStateV1({ tests: [{ type: "thrPace", value: 270, date: "2026-07-01", source: "test" }, { type: "thrPace", value: 262, date: "2026-07-20", source: "test" }] });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, st);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
const v2state = await page.evaluate(() => JSON.parse(localStorage.getItem("eb_state_v2") || "null"));
ok(!!(v2state && Array.isArray(v2state.plans) && v2state.plans.length === 1 && v2state.plans[0].sport === "run"), "migration v1→v2 : plan repris sans perte (plans=" + (v2state ? v2state.plans.length : "null") + ")");
ok(await page.locator("#ebTabbar .tabbtn").count() === 4, "l'app restaure directement la vue plan (4 onglets — R24.9 : nutrition fondue dans Aujourd'hui)");

// ---- 2. Profil : avatar/niveau/XP + records + plans + sauvegarde + retest suggéré ----
const tabs = await page.locator("#ebTabbar .tabbtn").all();
await tabs[0].click(); await page.waitForTimeout(250);
const profTxt = await page.locator("#screen").textContent();
ok(await page.locator("#avSvg svg").count() === 1, "avatar SVG affiché en tête de Profil (R5)");
// R25 — l'avatar composite : trois jauges 0-30, une par discipline (remplace « Niveau X/16 »).
ok(/niv \d+\/30/.test(profTxt), "les jauges par discipline affichent « niv X/30 » (R25)");
ok(/prochain : .+ \(encore \d+ XP\)/.test(profTxt), "teaser du prochain déblocage par discipline (R9→R25)");
ok(/Les 30 niveaux/.test(profTxt), "les 30 niveaux de chaque discipline sont consultables (dérivés du roulement)");
ok(/Records personnels/.test(profTxt), "carte « Records personnels » présente dans Profil");
ok(/4'22/.test(profTxt), "meilleure allure seuil retenue (262s = 4'22), pas la plus récente");
ok(/Mes plans \(1\)/.test(profTxt), "sélecteur « Mes plans » présent (1 plan après migration)");
ok(/Plan généré le .+ · échéance/.test(profTxt), "date de génération + échéance du plan affichées");
ok(/retest suggéré autour du \d{4}-\d{2}-\d{2}/.test(profTxt), "date de retest suggérée (dernière référence + 6 semaines)");
ok(await page.locator("#pfVolRecent").count() === 1, "champ « Volume récent (point de départ) » éditable au Profil (R10)");
ok(await page.locator("#pfRaceSave").count() === 1 && /Courses intermédiaires/.test(profTxt), "carte « 🏁 Courses intermédiaires » au Profil pour tous les profils (R10)");
ok(await page.locator("#pfBackup").count() === 1, "bouton de sauvegarde (export JSON) présent dans Profil");
ok(await page.locator("#pfRestore").count() === 1, "restauration depuis un fichier présente dans Profil");
const dlBackup = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
// R16.7 — la carte « 💾 Sauvegarde » est désormais repliée par défaut (bloc secondaire du
// Profil). Le bouton existe, il n'est simplement plus visible tant que le `<details>` est
// fermé : on l'ouvre, comme le ferait l'utilisateur. Les assertions ne bougent pas.
await page.evaluate(() => { const b = document.getElementById("pfBackup"); const d = b && b.closest("details"); if (d) d.open = true; });
await page.click("#pfBackup");
const bk = await dlBackup;
ok(bk !== null && /endurabuild/.test(bk ? bk.suggestedFilename() : ""), "la sauvegarde télécharge un fichier (" + (bk ? bk.suggestedFilename() : "aucun") + ")");

// ---- 3. Avatar : thèmes cliquables, persistés ----
ok(await page.locator("[data-av-theme]").count() === 4, "4 thèmes de couleur (accents sport) proposés");
await page.locator('[data-av-theme="swim"]').click(); await page.waitForTimeout(250);
const themeSaved = await page.evaluate(async () => { const { S } = await import("./js/state.js"); return S.answers.avatarTheme; });
ok(themeSaved === "swim", "choix de thème persisté (avatarTheme=" + themeSaved + ")");
// R25 — le composite colore chaque zone par SA discipline : le thème ne pilote plus le SVG
// de la carte, il reste l'accent du PARTAGE (décision n°3). On vérifie donc la persistance,
// déjà couverte ci-dessus, et que le composite porte bien les couleurs des disciplines.
ok(/#00b8d9|#2e6bff|#ff7a1a/.test(await page.locator("#avSvg svg").innerHTML()), "le composite porte les couleurs des disciplines");

// ---- 4. Multi-plans : nouveau plan → questionnaire vierge, retour au 1er sans perte ----
await page.click("#pfNewPlan"); await page.waitForTimeout(300);
ok(await page.locator(".sport-card").count() === N_SPORTS, "nouveau plan → choix du sport (questionnaire vierge) — " + N_SPORTS + " sports au périmètre courant");
await page.click('.sport-card[data-sport="bike"]');
await page.click('.opts[data-key="intent"] .opt[data-val="plaisir"]');
await page.click('.opts[data-key="format"] .opt[data-val="cyclo"]');
await page.waitForTimeout(100);
const plansNow = await page.evaluate(() => JSON.parse(localStorage.getItem("eb_state_v2")).plans.length);
ok(plansNow === 2, "2 plans persistés (nouveau + migré)");
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("eb_state_v2"));
  s.activePlanId = s.plans[0].id;
  localStorage.setItem("eb_state_v2", JSON.stringify(s));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
ok(await page.locator("#ebTabbar .tabbtn").count() === 4, "retour au plan 1 : la vue plan est restaurée");
const t2 = await page.locator("#ebTabbar .tabbtn").all();
await t2[0].click(); await page.waitForTimeout(250);
ok(/Mes plans \(2\)/.test(await page.locator("#screen").textContent()), "les 2 plans sont listés dans le sélecteur");

// ---- 5. Onglet Plan : PAS de bandeau rouge (R5), décisions moteur en langage neutre ----
await t2[1].click(); await page.waitForTimeout(250);
const planTxt = await page.locator("#screen").textContent();
ok(!/Ce plan a des réserves/.test(planTxt), "aucun bandeau rouge « réserves » (retiré — langage développeur)");
ok(await page.locator("#motorDecisions").count() === 1, "« Les décisions du moteur » présent dans l'onglet Plan");
ok(/Ce qui pilote ton plan/.test(planTxt), "« Ce qui pilote ton plan » conservé");
const neutralWarn = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const { setTab } = await import("./js/ui/tabs.js");
  S.currentPlan._v2.warnings = ["la semaine pic ne contient pas le brick (test synthétique)"];
  setTab("general");
  const md = document.getElementById("motorDecisions");
  if (md) md.open = true;
  return { noBanner: !/Ce plan a des réserves/.test(document.querySelector("#screen").textContent), inDetails: /Limites connues de ce plan/.test(document.querySelector("#screen").textContent) };
});
ok(neutralWarn.noBanner, "même avec des warnings moteur : pas de bandeau rouge");
ok(neutralWarn.inDetails, "les limites du plan restent lisibles dans les décisions (langage neutre)");

// ---- 5b. §5 (R6) : l'explicabilité EN SURFACE — « pourquoi ce plan », « pourquoi cette séance »
await t2[1].click(); await page.waitForTimeout(250);
const whyTxt = await page.locator("#screen").textContent();
ok(/Pourquoi ce plan/.test(whyTxt), "carte « Pourquoi ce plan » en tête de l'onglet Plan (§5)");
ok(/Ta préparation fait \d+ semaines/.test(whyTxt), "la durée est expliquée en langage d'athlète, pas en identifiant de décision");
const whyBeforeWhat = await page.evaluate(() => {
  // Les jours de REPOS n'ont pas de justification (« marche, étirements ») : on regarde une
  // séance d'entraînement, celles que l'auditeur refuse muettes.
  const ds = [...document.querySelectorAll("#screen details.gd-sess")];
  const d = ds.find((x) => x.querySelector(".gd-why"));
  if (!d) return { hasWhy: false, nSess: ds.length };
  d.open = true;
  // U16 — le « quoi » d'une séance se rend en LISTE (`.gd-steps`, une ligne par bloc) dès
  // qu'elle en compte plus d'un, et en `.gd-det` sinon. La propriété vérifiée ne change pas
  // d'un iota — le POURQUOI passe devant le QUOI —, seul le conteneur à interroger change.
  // Sans ce `,`, la garde levait un TypeError au lieu de mesurer : elle a fait son travail.
  const why = d.querySelector(".gd-why"), det = d.querySelector(".gd-det, .gd-steps");
  if (!det) return { hasWhy: true, nWhy: document.querySelectorAll("#screen .gd-why").length,
    order: "det-absent", noDup: true };
  return { hasWhy: true, nWhy: document.querySelectorAll("#screen .gd-why").length,
    order: why.compareDocumentPosition(det) & Node.DOCUMENT_POSITION_FOLLOWING ? "why-first" : "det-first",
    noDup: !/\u{1F4A1}/u.test(det.textContent) };
});
// U15 — l'onglet Plan ouvre sur UNE semaine (la courante) et non plus quatre : le seuil
// portait sur le nombre de séances affichées, pas sur la propriété mesurée. Une semaine
// d'entraînement en porte 3 à 7 ; le critère devient « toutes celles qui sont là ont leur
// justification », ce qui est la propriété qu'on voulait garder depuis le début.
ok(whyBeforeWhat && whyBeforeWhat.hasWhy && whyBeforeWhat.nWhy >= 3,
  "les séances de la grille portent leur justification (" + (whyBeforeWhat && whyBeforeWhat.nWhy) + ")");
ok(whyBeforeWhat && whyBeforeWhat.order === "why-first", "le POURQUOI passe devant le QUOI dans le détail d'une séance");
ok(whyBeforeWhat && whyBeforeWhat.noDup, "la justification n'est plus dupliquée en queue de description technique");
const t2b = await page.locator("#ebTabbar .tabbtn").all();
await t2b[2].click(); await page.waitForTimeout(400);
// U11 — la génération arrive désormais sur 🗓 Plan, donc le check-in n'a pas encore été
// répondu quand on ouvre 🎯 Aujourd'hui. Le portillon n'a pas changé : on le passe, comme un
// utilisateur le ferait. Ce que ce critère mesure (le POURQUOI visible sans rien ouvrir) est
// inchangé — c'est le chemin pour y arriver qui a bougé.
for (let i = 0; i < 6 && (await page.locator(".ck-opt").count()); i++) {
  const n = await page.locator(".ck-opt").count();
  await page.locator(".ck-opt").nth(Math.min(1, n - 1)).click();
  await page.waitForTimeout(320);
}
await page.waitForTimeout(600);
// Ce critère suppose que « aujourd'hui » porte une SÉANCE. Un tiers des jours de plan sont
// des jours de repos (mesuré en U8 : 153 sur 441 en semaine 1), et le jour de la semaine
// n'est pas contrôlé par le test : il tombait donc rouge un jour sur trois, au hasard du
// calendrier. Troisième instrument de ce dépôt à dépendre de la date, après le banc R14
// (R20.7) et le balayage de fréquence de C29. On distingue les deux cas au lieu de subir
// l'un des deux : séance → le POURQUOI est visible sans rien ouvrir ; repos → le message de
// repos est là (U8), et le critère de la séance ne s'applique pas.
const heroWhy = await page.evaluate(() => {
  const c = document.querySelector("#screen");
  return { visibleWhy: !!c.querySelector(".gd-why"), hidden: !!c.querySelector("details.gd-sess"),
    repos: /Repos aujourd/i.test(c.innerText || "") };
});
ok(heroWhy.visibleWhy || heroWhy.repos, "dans Aujourd'hui, le « pourquoi » de la séance est visible SANS rien ouvrir (§5)"
  + (heroWhy.repos ? " — jour de REPOS aujourd'hui, critère non applicable, message de repos présent" : ""));

// ---- 6. Nutrition : journal alimentaire RETIRÉ (R6) — et l'onglet lui-même a disparu (R24.9),
// la version réduite vit dans 🎯 Aujourd'hui. Le critère suit le contenu, pas l'onglet.
await page.evaluate(async () => { const { setTab } = await import("./js/ui/tabs.js"); setTab("today"); });
await page.waitForTimeout(400);
const nutTxt = await page.locator("#screen").textContent();
ok(await page.locator("#njCard").count() === 0 && !/Journal alimentaire/.test(nutTxt), "journal alimentaire retiré (aucune trace dans la nutrition du jour)");
ok(/Dépense estimée du jour/.test(nutTxt) && /Ravitaillement/i.test(nutTxt), "la nutrition réduite d'Aujourd'hui garde dépense estimée + ravitaillement (R24.9)");

// ---- 7. R16.9 : la coche ✓ → feedback RPE → félicitations vit désormais dans Plan ----
// (c'était la coche de Semaine ; celle de Plan basculait un booléen en silence.)
const t5 = await page.locator("#ebTabbar .tabbtn").all();
await t5[1].click(); await page.waitForTimeout(300);
const dbtn = page.locator('.doneBtn[data-rest="0"]:not(.done)').first();
ok((await dbtn.count()) === 1, "coche de séance (non-repos) disponible dans Plan");
await dbtn.click(); await page.waitForTimeout(300);
ok(await page.locator(".eb-modal:has-text('Comment c’était')").count() === 1, "feedback RPE affiché avant la célébration");
await page.locator("[data-rpe='6']").click();
await page.locator("[data-feel='normal']").click();
await page.click("#fbSave"); await page.waitForTimeout(400);
ok(await page.locator(".eb-overlay").count() === 1, "modal de félicitations affichée après le feedback");
const celebH2 = (await page.locator(".eb-modal h2").textContent()).trim();
ok(celebH2.length >= 10, "message de célébration présent (« " + celebH2.slice(0, 40) + "… »)");
ok(await page.locator(".eb-modal svg").count() === 1, "avatar présent dans la modal");
const dl = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
await page.click("#ebShareStory"); // headless : navigator.share indisponible → repli téléchargement
const download = await dl;
ok(download !== null, "partage story : repli téléchargement PNG déclenché");
if (download) ok(/endurabuild-seance\.png/.test(download.suggestedFilename()), "nom de fichier story correct (" + download.suggestedFilename() + ")");
await page.click("#ebCloseCongrats");
ok(await page.locator(".eb-overlay").count() === 0, "la modal se ferme");

ok(consoleErrs.length === 0, "aucune erreur console (" + consoleErrs.length + ")");
if (consoleErrs.length) info("erreurs: " + consoleErrs.slice(0, 5).join(" | "));

server.close();
await browser.close();
process.exit(report());
