// Smoke R10 phase 0 : le générateur de repli a disparu, et un échec de génération est VISIBLE.
// Le repli produisait un plan dégradé en silence — un plan faux est plus dangereux que pas de
// plan. Cette suite vérifie les deux moitiés de la décision : plus de repli, et un écran
// d'échec qui dit à l'athlète que son profil est intact.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";
const N_SPORTS = 7; // R16.10 — swimrun réintégré : le sélecteur suit le registre du moteur


const PORT = 8520;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
const reqFailed = [];
page.on("requestfailed", (r) => reqFailed.push(r.url().split("/").pop() + " " + (r.failure()?.errorText || "")));
page.on("response", (r) => { if (r.status() >= 400) reqFailed.push(r.url().split("/").pop() + " HTTP " + r.status()); });

// ---- 1. Le module de repli n'est plus servi ni référencé ----
const r = await fetch("http://localhost:" + PORT + "/js/legacy-fallback.js").catch(() => null);
ok(!r || r.status === 404, "js/legacy-fallback.js n'existe plus (" + (r ? r.status : "injoignable") + ")");
const appSrc = await (await fetch("http://localhost:" + PORT + "/js/app.js")).text();
ok(!/legacy-fallback/.test(appSrc), "app.js ne l'importe plus (dépendance circulaire supprimée)");
ok(/EBGenerationError/.test(appSrc), "app.js expose EBGenerationError (échec porteur)");

// ---- 2. Chemin normal : le plan sort du moteur V2 ----
// `load` et non `domcontentloaded` : on RECHARGE juste après, et un `reload` déclenché avant la
// fin du chargement annule les requêtes encore en vol. Depuis que la favicone est un fichier
// (`assets/icon-192.png`, 1,2 Ko) au lieu d'un data-URI de 21,6 Ko, il y a une requête à annuler
// — et le critère « aucune requête en échec » la comptait comme un échec de l'app
// (`icon-192.png net::ERR_ABORTED`). Ce n'en est pas un : c'est CETTE suite qui l'interrompt.
// Vérifié en isolant les deux cas — sans rechargement immédiat, zéro requête en échec.
// On laisse donc le premier chargement finir, plutôt que d'exempter un motif d'erreur : la
// garde reste stricte et continue de voir un vrai échec s'il s'en produit un.
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "load" });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, runnerStateV1({}));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
ok(await page.locator("#ebTabbar .tabbtn").count() === 5, "plan généré normalement (5 onglets)");
ok(await page.locator("[role=alert]").count() === 0, "aucun écran d'échec quand tout va bien");

// ---- 3. Moteur neutralisé → écran d'échec, PAS de plan dégradé ----
const failTxt = await page.evaluate(async () => {
  const { invalidatePlan, setTab } = await import("./js/ui/tabs.js");
  const saved = globalThis.EBV2;
  globalThis.EBV2 = undefined;            // simule un bundle absent
  invalidatePlan();
  try { setTab("general"); } catch (e) { /* ne doit PAS remonter jusqu'ici */ }
  const txt = document.querySelector("#screen").textContent;
  const alerts = document.querySelectorAll("[role=alert]").length;
  const bar = document.getElementById("ebTabbar");
  globalThis.EBV2 = saved;                 // on rend le moteur pour la suite
  return { txt, alerts, bar: !!bar };
});
ok(failTxt.alerts === 1, "un message d'échec est affiché À L'ÉCRAN (role=alert), pas en console");
ok(/La génération du plan a échoué/.test(failTxt.txt), "le message nomme l'échec sans jargon");
ok(/ton profil est conservé/i.test(failTxt.txt), "le message rassure sur les données (rien n'est perdu)");
ok(/MOTEUR_ABSENT/.test(failTxt.txt), "le code technique reste consultable (support)");
ok(!/Semaine 1/.test(failTxt.txt), "AUCUN plan dégradé n'est affiché à la place");
ok(!failTxt.bar, "la barre d'onglets disparaît : pas de vue de plan sans plan");

// ---- 4. Réessayer répare (le moteur est revenu) ----
const back = await page.evaluate(async () => {
  const { invalidatePlan, setTab } = await import("./js/ui/tabs.js");
  invalidatePlan(); setTab("general");
  return { plan: !!(await import("./js/state.js")).S.currentPlan, alerts: document.querySelectorAll("[role=alert]").length };
});
ok(back.plan && back.alerts === 0, "le moteur revenu, la génération repart (aucun état bloqué)");

// ---- 5. R10 phase 1 : registre de sports — un sport inconnu LÈVE, sans plan fantôme ----
const reg = await page.evaluate(() => {
  const sports = globalThis.EBV2.sports || {};
  let thrown = null, plan = null;
  try { plan = globalThis.EBV2.buildPlan("parapente", { vol_max: "8", sessions_max: "5", history: "confirme" }); }
  catch (e) { thrown = { name: e.name, code: e.code, msg: String(e.message) }; }
  return { ids: Object.keys(sports).sort(), tri: sports.tri, trail: sports.trail, thrown, plan: !!plan };
});
ok(reg.ids.join(",") === "bike,duathlon,run,swim,swimrun,trail,tri", "les " + N_SPORTS + " sports du périmètre sont déclarés dans le registre (" + reg.ids.join(" ") + ")");
ok(reg.trail && reg.trail.guards.runImpactCap === true, "le trail DÉCLARE le plafond de jours d'appui (D10-3 ne peut plus revenir par oubli)");
ok(reg.tri && reg.tri.retestTypes.length === 3, "le tri déclare ses 3 tests de référence (l'UI ne les recopie plus)");
ok(reg.thrown !== null && !reg.plan, "un sport inconnu lève au lieu de produire un plan silencieux");
ok(reg.thrown && /SPORT_INCONNU|ENTREE_INVALIDE/.test(reg.thrown.code || reg.thrown.msg), "l'erreur est PORTEUSE (" + (reg.thrown ? reg.thrown.code : "—") + ")");

// ---- 6. R11 : le CONTRAT D'ENTRÉE — une réponse fausse est refusée, et le refus est réparable
const inv = await page.evaluate(async () => {
  const { S, ebSave } = await import("./js/state.js");
  const { invalidatePlan, setTab } = await import("./js/ui/tabs.js");
  const before = JSON.stringify(S.answers);
  S.answers.vol_max = "abc"; ebSave();
  invalidatePlan(); setTab("general");
  const txt = document.querySelector("#screen").textContent;
  const out = {
    refus: /Le plan n’a pas été généré/.test(txt),
    humain: /n’est pas un nombre|n'est pas un nombre/.test(txt),
    cle: /vol_max/.test(txt),
    bouton: !!document.getElementById("ebFixInput"),
    profilIntact: JSON.parse(before).level === S.answers.level,
  };
  S.answers = JSON.parse(before); ebSave(); invalidatePlan(); setTab("general");
  return out;
});
ok(inv.refus, "une valeur illisible fait REFUSER le plan (jamais un plan fantôme à 30 min de pic)");
ok(inv.humain && inv.cle, "le refus dit QUOI corriger, en français, avec la réponse concernée");
ok(inv.bouton, "un bouton ramène l'athlète à ses réponses — le refus est réparable");
ok(inv.profilIntact, "le profil est conservé : un refus n'efface rien");
const tooShort = await page.evaluate(() => {
  const a = { intent: "competition", format: "marathon", level: "inter", history: "confirme", injury: "aucune",
    sessions_max: "7", vol_max: "10", dispo: "quotidienne", age: "32", sex: "H", med_pain: "non", med_dizzy: "non",
    med_treat: "non", off_days: "non", doubles: "oui", terrain: "route",
    race_date: new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10) };
  try { globalThis.EBV2.buildPlan("run", a); return { refus: false }; }
  catch (e) { return { refus: e.code === "ENTREE_INVALIDE", human: String(e.human || "") }; }
});
ok(tooShort.refus, "marathon dans 3 semaines : REFUS (minWeeks enfin appliqué — R11.4)");
ok(/format plus court/.test(tooShort.human || "") && /à partir du/.test(tooShort.human || ""),
  "… et le refus propose les DEUX issues concrètes (format plus court, ou date compatible)");

// ---- 7. R11 §8 : la PWA SERVIE reste installable, et rien n'échoue en silence ----
// L'audit affirmait « PWA non installable, échecs silencieux ». Mesuré : c'est FAUX pour la PWA
// servie — service worker activé, manifeste lié, aucune requête en échec. Rien ne le vérifiait
// pourtant : ce garde-fou existe pour que ça reste vrai.
const pwa = await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  const link = document.querySelector('link[rel="manifest"]');
  let man = null;
  try { man = await (await fetch(link.getAttribute("href"))).json(); } catch (e) { man = null; }
  const icons = man && Array.isArray(man.icons) ? man.icons : [];
  const probes = await Promise.all(icons.map(async (ic) => {
    try { const r = await fetch(ic.src); return r.ok; } catch (e) { return false; }
  }));
  return {
    sw: regs.length > 0 && !!(regs[0].active || regs[0].installing),
    manifest: !!man, name: man && (man.name || man.short_name),
    display: man && man.display, start: man && man.start_url,
    nIcons: icons.length, iconsOK: probes.every(Boolean),
  };
});
ok(pwa.sw, "service worker enregistré et actif sur la PWA servie");
ok(pwa.manifest && !!pwa.name, "manifeste présent et nommé (" + pwa.name + ")");
ok(pwa.display === "standalone" || pwa.display === "fullscreen", "mode d'affichage installable (" + pwa.display + ")");
ok(pwa.nIcons >= 2 && pwa.iconsOK, "les " + pwa.nIcons + " icônes du manifeste existent réellement");
ok(reqFailed.length === 0, "aucune requête en échec au chargement (" + reqFailed.slice(0, 2).join(" | ") + ")");

ok(errs.length === 0, "aucune exception non attrapée (" + errs.length + ")");
if (errs.length) info(errs.slice(0, 3).join(" | "));

server.close();
await browser.close();
process.exit(report());
