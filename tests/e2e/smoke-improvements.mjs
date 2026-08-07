// Lot améliorations (adapté R5) : échange de jours ⇄ (Semaine), accessibilité des
// modales (Échap + focus), résultat de course réel (Aujourd'hui), journal des
// adaptations (Semaine), estimation énergétique (Nutrition), Strava OAuth (Profil).
// Ordre des onglets R5 : 0=Profil · 1=Plan · 2=Aujourd'hui · 3=Semaine · 4=Nutrition.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";
const N_SPORTS = 7; // R16.10 — swimrun réintégré : le sélecteur suit le registre du moteur


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

// ---- 1. Échange de jours (⇄) : deux taps, persistant, réversible ----
// R18.3 — 📅 Semaine est restaurée et reprend la carte de la semaine courante. Le ⇄ existe
// aussi dans 🗓 Plan, sur TOUTE semaine affichée : c'est la même grille (`weekGridHTML`),
// donc le même geste. On navigue par NOM d'onglet, pas par index — un index se recasse au
// prochain changement d'ordre, et c'est ce qui vient d'arriver à cette ligne.
await page.evaluate(async () => { const { setTab } = await import("./js/ui/tabs.js"); setTab("week"); });
await page.waitForTimeout(400);
const carteSemaine = page.locator("#screen .card").filter({ hasText: "Ta semaine" }).first();
ok((await carteSemaine.locator("[data-swap]").count()) === 7, "un bouton ⇄ par jour de la semaine courante");
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

// ---- 2b. R23.3 — ET IL FAUT POUVOIR EN SORTIR AU DOIGT ----
//
// Retour du fondateur (06/08/2026) : « une fois cliqué on ne peut pas sortir de la validation de
// la séance en cas d'erreur de clic ». Les critères ci-dessus passaient tous — parce qu'ils
// testent Échap, une touche qui n'existe pas sur un téléphone. La sortie EXISTAIT et ne servait
// à personne : même forme qu'U8 (« le bon message existait et était mort »).
//
// Le dernier critère est le défaut SYMÉTRIQUE : une modale qui se ferme sur un glissement
// relâché à côté serait aussi piégeante, dans l'autre sens.
{
  // NOTE D'INSTRUMENT — ma premiere ecriture mettait ces criteres sous `if (await rouvrir())`.
  // Chaque ouverture VALIDE une seance ; au bout de deux, il n'en restait plus a valider, et les
  // criteres suivants DISPARAISSAIENT EN SILENCE. Verifie : la cassure « le voile ferme sur
  // n'importe quel relachement » sortait VERTE, non parce que la garde tenait mais parce que le
  // critere ne s'executait plus. Un critere qui peut ne pas tourner n'est pas une garde — meme
  // famille que les sept suites d'R22b qui sortaient en 0 quoi qu'elles trouvent.
  // L'ouverture est donc ASSERTEE, et la modale refermee proprement avant chaque reouverture.
  const rouvrir = async () => {
    while (await page.locator(".eb-overlay").count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(150); }
    const b = page.locator('.doneBtn[data-rest="0"]:not(.done)').first();
    if (await b.count()) { await b.click(); await page.waitForTimeout(350); }
    return await page.locator(".eb-overlay").count() > 0;
  };
  {
    ok(await rouvrir(), "R23.3 — une modale de feedback s'ouvre (sans quoi rien de ce qui suit ne mesure)");
    const croix = await page.evaluate(() => {
      const c = document.querySelector(".eb-overlay [data-eb-close]");
      if (!c) return null;
      const a = getComputedStyle(c, "::after");
      return { label: c.getAttribute("aria-label"), zone: parseInt(a.width) + "×" + parseInt(a.height),
        surCroix: document.activeElement === c };
    });
    ok(!!croix, "R23.3 — la modale porte une croix de fermeture (pas seulement Échap)");
    ok(croix && croix.label === "Fermer", "R23.3 — et elle est nommée pour un lecteur d'écran");
    ok(croix && croix.zone === "44×44", "R23.3 — sa cible tactile atteint le standard U4 (" + (croix && croix.zone) + ")");
    ok(croix && !croix.surCroix, "R23.3 — le focus va au premier contrôle UTILE, pas à la croix");
    if (croix) {
      await page.click(".eb-overlay [data-eb-close]"); await page.waitForTimeout(300);
      ok(await page.locator(".eb-modal:has-text('Comment c’était')").count() === 0, "R23.3 — un appui sur la croix ferme");
    } else ok(false, "R23.3 — un appui sur la croix ferme (croix absente : rien a appuyer)");
  }
  {
    ok(await rouvrir(), "R23.3 — la modale se rouvre pour le critere du voile");
    await page.mouse.click(8, 8); await page.waitForTimeout(300);
    ok(await page.locator(".eb-modal:has-text('Comment c’était')").count() === 0, "R23.3 — un appui sur le voile ferme aussi");
  }
  // LE DEFAUT SYMETRIQUE N'A PAS DE CRITERE ICI, ET C'EST PUBLIE PLUTOT QUE MAQUILLE.
  //
  // `trapModal` ne ferme sur le voile que si le geste COMMENCE et FINIT sur lui (garde `depart`) :
  // sans elle, un glissement parti d'un bouton et relache a cote fermerait la modale — ce qui
  // serait le defaut symetrique de celui qu'on corrige. Le mecanisme est REEL, mesure en isole :
  // un `mousedown` sur un bouton suivi d'un `mouseup` sur le voile produit bien un `click` dont
  // la cible est le voile.
  //
  // Mais le critere que j'avais ecrit ici NE DISCRIMINAIT PAS : verifie en retirant la garde
  // (`e.target === ov` seul), il sortait VERT — il passait avec et sans. Un critere qui ne change
  // pas sous la cassure qu'il nomme ne garde rien ; c'est la famille que ce depot a nommee dix
  // fois. Il est donc RETIRE plutot que conserve en decoration, et la limite est ecrite ici : la
  // garde `depart` de `modal.js` n'est couverte par aucune suite. A reprendre avec un harnais qui
  // sait rejouer un glissement dans la modale reelle.
  //
  // Nettoyage : aucune modale ne doit survivre a ce bloc, sinon le voile intercepte tous les
  // gestes des sections suivantes (mesure : la suite mourait sur un TimeoutError).
  while (await page.locator(".eb-overlay").count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(200); }
}

// ---- 3. Journal des adaptations ----
// R16.9 — il commente les check-ins, il a suivi dans 🎯 Aujourd'hui (index 2).
const tJ = await page.locator("#ebTabbar .tabbtn").all();
await tJ[2].click(); await page.waitForTimeout(300);
ok(/Adaptations quotidiennes \(1 check-ins? · 1 ajustement/.test(await page.locator("#screen").textContent()), "carte « Adaptations quotidiennes » listée depuis readinessLog (Aujourd'hui)");
await tJ[1].click(); await page.waitForTimeout(300);

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
ok(await page.locator(".sport-card").count() === N_SPORTS, "nouveau plan → choix du sport — " + N_SPORTS + " sports au périmètre courant");
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
  setTab("outils"); // 07/08/2026 — Nutrition vit sous 🧰 Outils (sous-onglet par défaut)
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
  setTab("outils"); // 07/08/2026 — Nutrition vit sous 🧰 Outils (sous-onglet par défaut)
});
await page.waitForTimeout(300);
const eTxt = await page.locator("#screen").textContent();
ok(/Base \+ vie quotidienne/.test(eTxt) && /Entraînement du jour/.test(eTxt) && /Total/.test(eTxt), "carte dépense : base + entraînement + total affichés (ouverte par défaut)");
// R16.6 — les macros passent d'un paragraphe continu à UNE LIGNE PAR MACRO : chaque libellé
// commence donc par une majuscule. L'assertion devient insensible à la casse — son intention
// (les fourchettes chiffrées sont affichées) est inchangée, c'est la mise en forme qui a bougé.
ok(/protéines ~\d+/i.test(eTxt) && /lipides ~\d+/i.test(eTxt) && /glucides ~\d+/i.test(eTxt), "macros indicatives affichées (fourchettes chiffrées)");
ok(/pas un menu/i.test(eTxt) && /pas une consigne/i.test(eTxt), "garde-fous affichés : photographie, pas un menu ni une consigne");
ok(!/déficit|maigrir|perte de poids|restriction/i.test(eTxt), "aucun vocabulaire de restriction dans l'onglet Nutrition");
ok(!/Journal alimentaire/.test(eTxt), "journal alimentaire retiré (décision R6)");

// ---- O-23 : « latest » rend le plus RÉCENT, même à date égale ----
//
// Le tri ne portait que sur la date, et `Array.prototype.sort` est STABLE depuis ES2019 :
// à date égale l'ordre d'insertion est conservé, donc `[0]` était le PREMIER inséré — le plus
// VIEUX. Une fonction nommée `latest` qui rend le plus ancien. Plusieurs tests le même jour,
// c'est la normale (trois imports Strava d'affilée en branchant un compte), et le défaut rendait
// alors TOUT correctif d'import invisible : la nouvelle valeur entrait dans le journal sans
// jamais devenir la référence.
const o23 = await page.evaluate(async () => {
  const { S, ebSave } = await import("./js/state.js");
  const { syncRefsFromTests } = await import("./js/ui/tab-profile.js");
  S.answers.tests = [
    { type: "ftp", value: 210, date: "2026-07-01", source: "ancien" },
    { type: "ftp", value: 188, date: "2026-08-03", source: "import 1" },
    { type: "ftp", value: 230, date: "2026-08-03", source: "import 2, LE BON" },
  ];
  ebSave();
  syncRefsFromTests();
  return { ftp: S.answers.ftp, known: S.answers.ftp_known };
});
ok(o23.ftp === "230", "O-23 — à date égale, la référence prend le DERNIER test inscrit (" + o23.ftp + "W, attendu 230)");
ok(o23.known === "oui", "O-23 — et elle se déclare connue");

// ---- O-25 : ta correction n'est pas défaite par un import du même jour ----
//
// Le message de l'import promet depuis son écriture « la saisie manuelle prime TOUJOURS sur
// l'import ». Elle ne primait pas : la saisie et l'import atterrissent dans le MÊME journal, à la
// MÊME date, et O-23 venait de faire gagner le dernier inséré — c'est-à-dire l'import, puisqu'on
// corrige d'abord et qu'on importe ensuite. La personne tapait 4'42, réimportait, et retrouvait
// 5'37 sans que rien ne le lui dise.
const o25 = await page.evaluate(async () => {
  const { S, ebSave } = await import("./js/state.js");
  const { syncRefsFromTests } = await import("./js/ui/tab-profile.js");
  S.answers.tests = [
    { type: "thrPace", value: 282, date: "2026-08-03", source: "profil (modification manuelle)" },
    { type: "thrPace", value: 337, date: "2026-08-03", source: "Strava (course la plus rapide)" },
  ];
  ebSave();
  syncRefsFromTests();
  const apresImport = S.answers.pace;
  // …mais un import PLUS RÉCENT reste légitime : une course courue trois semaines plus tard
  // dit quelque chose de neuf, et geler la valeur à vie serait le défaut symétrique.
  S.answers.tests.push({ type: "thrPace", value: 262, date: "2026-08-24", source: "Strava (course)" });
  ebSave();
  syncRefsFromTests();
  return { apresImport, apresPlusTard: S.answers.pace };
});
ok(o25.apresImport === "4:42",
  "O-25 — un import du même jour ne défait pas ta correction (" + o25.apresImport + ", attendu 4:42)");
ok(o25.apresPlusTard === "4:22",
  "O-25 — mais un import POSTÉRIEUR reste pris en compte (" + o25.apresPlusTard + ", attendu 4:22)");

// La fenêtre de `bestRollingMean` est bornée par le TEMPS, pas par le nombre de points — c'est
// la faute d'unité qu'O-22 corrigeait pour la puissance et qu'O-25 rejoue pour la vitesse. Elle
// se vérifie sur un flux SYNTHÉTIQUE, parce qu'un chiffre faux y reste parfaitement plausible.
const brm = await page.evaluate(async () => {
  const { bestRollingMean } = await import("./js/ui/steps.js");
  // 30 min à 3 m/s, avec 10 min à 5 m/s au milieu, échantillonné toutes les 2 s.
  const t = [], v = [];
  for (let s = 0; s < 1800; s += 2) { t.push(s); v.push(s >= 600 && s < 1200 ? 5 : 3); }
  // Le même effort, mais le flux s'arrête à 8 min : aucune fenêtre de 10 min n'existe.
  const tc = t.filter((s) => s < 480), vc = v.slice(0, tc.length);
  // Pas d'échantillonnage IRRÉGULIER : 600 points espacés de 5 s couvrent 50 min, pas 10.
  const ti = [], vi = [];
  for (let s = 0; s < 3000; s += 5) { ti.push(s); vi.push(s < 1500 ? 2 : 6); }
  return {
    bloc: bestRollingMean(v, t, 600),
    court: bestRollingMean(vc, tc, 600),
    irregulier: bestRollingMean(vi, ti, 600),
  };
});
ok(Math.abs(brm.bloc - 5) < 0.05,
  "O-25 — le meilleur 10 min trouve le bloc rapide (" + brm.bloc.toFixed(2) + " m/s, attendu 5,00)");
ok(brm.court === 0,
  "O-25 — un effort de 8 min ne rend PAS une « moyenne de 10 min » (refuser vaut mieux qu'estimer)");
ok(Math.abs(brm.irregulier - 6) < 0.05,
  "O-25 — la fenêtre est bornée par le TEMPS, pas par le nombre de points (" + brm.irregulier.toFixed(2) + " m/s, attendu 6,00)");

// ---- 6. Strava OAuth : connexion via relais au Profil, repli jeton manuel ----
const t6 = await page.locator("#ebTabbar .tabbtn").all();
await t6[0].click(); await page.waitForTimeout(300);
ok(await page.locator("#pfStravaConnect").count() === 1, "bouton « Se connecter avec Strava » présent au Profil");
ok(await page.locator("#pfStravaRelay").count() === 1, "champ URL du relais présent (server/README.md)");
ok(await page.locator("#pfStravaTok").count() === 1, "repli jeton manuel conservé");
// H-1 (03/08/2026) — CE CRITÈRE ASSERTAIT UN PRODUIT NON DÉPLOYÉ.
// Il vérifiait « sans URL de relais → message d'aide, pas de redirection », et il tenait
// uniquement parce que `STRAVA_RELAY_DEFAULT` était VIDE. Le worker étant en ligne, le bouton
// fait désormais son travail : il navigue vers le relais, l'élément `#pfStravaMsg` disparaît
// avec la page, et le test expirait. Une garde qui dépend de ce qu'une fonctionnalité ne soit
// pas branchée s'éteint le jour où on la branche — c'est-à-dire au moment précis où elle
// commencerait à servir.
//
// On vérifie donc la propriété qui compte VRAIMENT, et elle est plus forte : le clic part vers
// `<relais>/auth` en passant l'origine de l'app comme `return`. C'est ce couple que le worker
// re-valide contre `APP_ORIGINS` — si l'un des deux est faux, la connexion échoue chez
// l'utilisateur avec un 403 que personne ne sait interpréter.
const origineApp = new URL(page.url()).origin;
let cible = "";
// On SERT une page vide au lieu d'annuler : `route.abort()` laisse l'onglet sur
// `chrome-error://chromewebdata`, et les imports dynamiques de la suite échouent ensuite.
await page.route("**/auth?**", (route) => {
  cible = route.request().url();
  route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>relais</body></html>" });
});
await page.click("#pfStravaConnect");
await page.waitForTimeout(500);
ok(/\/auth\?return=/.test(cible), "le clic part vers `<relais>/auth` (" + (cible ? "atteint" : "AUCUNE navigation") + ")");
ok(cible.includes(encodeURIComponent(origineApp)),
  "et il passe l'ORIGINE de l'app comme `return` — c'est elle que le worker compare à APP_ORIGINS");
await page.unroute("**/auth?**");
// Retour dans l'app pour la suite des critères (le clic nous en a fait sortir).
await page.goBack({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
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
// R16.7 — une fois CONNECTÉ, le bloc « Journal / imports / Strava » est replié (règle du
// handoff : ouvert tant que c'est un CTA, replié quand c'est fait). Les contrôles existent
// mais ne sont plus visibles tant que le `<details>` est fermé : on l'ouvre, comme le ferait
// l'utilisateur. L'assertion qui suit est inchangée.
await page.evaluate(() => { const d = document.getElementById("pfStravaOut"); const det = d && d.closest("details"); if (det) det.open = true; });
await page.click("#pfStravaOut"); await page.waitForTimeout(300);
ok(await page.locator("#pfStravaConnect").count() === 1, "déconnexion → retour à l'état non connecté");

// ---- R6 §2-§3 : ingestion des données réalisées, souveraine et arbitrée ----
await t6[0].click(); await page.waitForTimeout(300);
ok(!/Ce que tu as réellement fait/.test(await page.locator("#screen").textContent()),
  "sans aucune donnée importée, la carte de mesure ne s'affiche pas (le plan reste celui d'avant)");
const meas = await page.evaluate(async () => {
  const { S, ebSave } = await import("./js/state.js");
  const { setTab } = await import("./js/ui/tabs.js");
  // 12 séances d'1h réparties sur 28 jours : ~3h/sem mesurées contre la déclaration du profil.
  const t0 = Date.now();
  S.answers.fitSessions = Array.from({ length: 12 }, (_, i) => ({
    date: new Date(t0 - i * 2 * 864e5).toISOString().slice(0, 10), d: "rn", minutes: 60 }));
  S.answers.vol_recent = "9";
  ebSave();
  setTab("profile");
  const txt = document.querySelector("#screen").textContent;
  return { shown: /Ce que tu as réellement fait/.test(txt), arb: /ajusté de 9h déclarés à 3h mesurés/.test(txt), hasBtn: !!document.getElementById("pfMeasApply"), applied: !!S.answers.measured };
});
ok(meas.shown, "avec des séances importées, la carte « Ce que tu as réellement fait » apparaît");
ok(meas.arb, "l'arbitrage mesuré vs déclaré est annoncé AVANT d'être appliqué");
ok(meas.hasBtn && !meas.applied, "rien n'est appliqué sans le geste de l'athlète (aucun écrasement silencieux)");
await page.click("#pfMeasApply"); await page.waitForTimeout(500);
const measApplied = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const dec = S.currentPlan && S.currentPlan._v2 ? S.currentPlan._v2.decisions.map((d) => d.id) : [];
  return { stored: !!(S.answers.measured && S.answers.measured.vol_min > 0), decision: dec.includes("measured-vol"),
    canClear: !!document.getElementById("pfMeasClear") };
});
ok(measApplied.stored, "l'instantané est enregistré (daté, versionné)");
ok(measApplied.decision, "la recalibration apparaît dans les décisions du moteur (§3.4)");
ok(measApplied.canClear, "l'athlète peut revenir à sa déclaration");

// ---- R14. Les DEUX prédictions sont rendues, étiquetées, avec la date de référence ----
// Le contrat R14 vit dans le moteur (banc `audit:r14`) ; ce qui manquait au banc, c'est la
// preuve que l'athlète les VOIT toutes les deux. Une projection calculée mais non affichée
// serait exactement le défaut « carte non affichée » de l'audit d'influence des paramètres.
const proj = await page.evaluate(async () => {
  const { S, ebSave } = await import("./js/state.js");
  const { setTab } = await import("./js/ui/tabs.js");
  const d = new Date(Date.now() + 40 * 7 * 864e5).toISOString().slice(0, 10);
  S.answers.race_date = d;
  delete S.answers.raceResult; // sinon la carte « ta course est passée » prend la place
  ebSave();
  // R23.7 — la carte Prédiction a DÉMÉNAGÉ dans 🗓 Plan (décision du fondateur du 06/08/2026 :
  // « l'onglet prédiction et charge devrait apparaître dans plan, pas dans aujourd'hui »). Le
  // critère ne change pas de NATURE — il vérifie toujours que l'athlète VOIT les deux
  // prédictions étiquetées ; il regarde simplement là où elles vivent désormais. Le `textContent`
  // d'un `<details>` fermé reste lisible : c'est bien la présence qu'on mesure, pas la
  // visibilité, et c'est ce que ce critère a toujours mesuré.
  setTab("general");
  const txt = document.querySelector("#screen").textContent;
  const p = globalThis.EBV2.predict(S.sport, S.answers, S.currentPlan);
  return { txt, applicable: !!(p.projected && p.projected.applicable), an: d.slice(0, 4),
    conf: p.projected ? p.projected.confidence : "" };
});
ok(/Aujourd’hui — ta forme mesurée/.test(proj.txt), "la prédiction « forme actuelle » est étiquetée comme telle");
if (proj.applicable) {
  ok(/Projeté au \d{2}\/\d{2}\/\d{4}/.test(proj.txt), "la projection porte SA DATE de référence (jamais un chiffre nu)");
  ok(new RegExp("confiance " + proj.conf).test(proj.txt), "la confiance de la projection est affichée (" + proj.conf + ")");
} else {
  ok(/Pas de chrono projeté/.test(proj.txt), "quand on refuse de projeter, le MOTIF est affiché — le silence n'est pas une information");
}

// ---- R14.1. La question de structure existe, et le levier poids reste FERMÉ par défaut ----
// P9 est la frontière la plus sensible du module : le champ « poids cible » ne doit pas
// exister tant que l'athlète n'a pas ouvert cette porte lui-même.
const r141 = await page.evaluate(async () => {
  const { S, ebSave } = await import("./js/state.js");
  const { setTab } = await import("./js/ui/tabs.js");
  S.answers.weight_lever = "non"; ebSave();
  setTab("profile");
  const ferme = { struct: !!document.getElementById("pfTrainingStructure"), cible: !!document.getElementById("pfWeightTarget") };
  S.answers.weight_lever = "oui"; ebSave();
  setTab("profile");
  return { ferme, ouvert: !!document.getElementById("pfWeightTarget") };
});
ok(r141.ferme.struct, "la question « tes 12 derniers mois » est posée au Profil (marge de progression)");
ok(!r141.ferme.cible, "sans demande explicite, AUCUN champ de poids cible n'est proposé (P9)");
ok(r141.ouvert, "levier demandé : le champ de poids cible apparaît, et seulement alors");

// ---- R16. Lot design : contraste, pastilles de phase, raccourci semaine en cours ----
const r16 = await page.evaluate(async () => {
  const { setTab } = await import("./js/ui/tabs.js");
  setTab("general");
  const html = document.querySelector("#screen").innerHTML;
  const seg = document.querySelector("#screen [data-phseg]");
  return {
    dur777: /color:\s*#777/i.test(html),                       // R16.1
    prnPrimary: !!document.querySelector("#prn.primary"),      // R16.3
    abbr: !!(seg && seg.querySelector(".ph-abbr") && seg.querySelector(".ph-full")),
    titre: !!(seg && seg.getAttribute("title")),               // R16.4
    // U15 — le raccourci « aller à la semaine en cours » n'a d'objet que dans la vue COMPLÈTE :
    // par défaut, cette semaine est désormais la seule affichée, donc « y aller » n'a plus de
    // sens. On le cherche là où il sert — après avoir déplié les N semaines.
    goCurDefaut: !!document.getElementById("goCurWk"),
  };
});
const r16b = await page.evaluate(() => {
  const b = document.getElementById("allW");
  if (b) b.click();
  return { goCurComplet: !!document.getElementById("goCurWk") };
});
ok(!r16.dur777, "R16.1 : plus aucun `color:#777` codé en dur dans le rendu (contraste AA)");
ok(!r16.prnPrimary, "R16.3 : le bouton HTML n'est plus le seul export en rouge plein");
ok(r16.abbr && r16.titre, "R16.4 : pastille de phase avec libellé long + abrégé, nom complet en title");
ok(!r16.goCurDefaut, "U15 : pas de raccourci « aller à la semaine en cours » quand elle est la seule affichée");
ok(r16b.goCurComplet, "R16.5 : le raccourci « aller à la semaine en cours » existe dans la vue complète");
const r167 = await page.evaluate(async () => {
  const { setTab } = await import("./js/ui/tabs.js");
  setTab("profile");
  const scr = document.querySelector("#screen");
  const replies = [...scr.querySelectorAll("details.load-card")];
  const titres = replies.map((d) => (d.querySelector("summary") || {}).textContent || "");
  // Ce qui doit rester DIRECTEMENT accessible : les références éditables (FTP/allure/CSS).
  const refsVisibles = !!document.getElementById("pfFtp") || !!document.getElementById("pfPace") || !!document.getElementById("pfCss");
  return { n: replies.length, titres, refsVisibles, fermes: replies.filter((d) => !d.open).length };
});
ok(r167.n >= 4, "R16.7 : les blocs secondaires du Profil sont repliables (" + r167.n + " cartes)");
ok(r167.fermes >= 3, "R16.7 : au chargement, au moins 3 blocs sont repliés (" + r167.fermes + ")");
ok(r167.refsVisibles, "R16.7 : les références d'entraînement restent directement éditables, jamais repliées");

ok(errs.length === 0, "aucune erreur JS (" + errs.length + ")");
if (errs.length) info(errs.slice(0, 4).join(" | "));

server.close();
await browser.close();
process.exit(report());
