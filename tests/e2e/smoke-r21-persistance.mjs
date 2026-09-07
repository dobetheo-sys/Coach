// R21 — VAGUE 2 : persistance + rejeu, câblage FIT, notification (chantier du 06/09/2026 —
// voir BUGS_OUVERTS.md « R21 », syntheses/55-chiffrage-option-a-r21.md).
//
// Les 39 critères de `demo:proactif` couvrent déjà le MOTEUR : détection (D1/D2/D3), recalcul
// borné (14 jours, jamais le passé, jamais une hausse). Ce qu'aucun gate ne couvrait avant cette
// suite est le CÂBLAGE : un import FIT réel (`#pfFit`, `tab-profile.js`) déclenche-t-il vraiment
// `EBV2.coachOnIngest`, la réduction survit-elle à une RÉGÉNÉRATION du plan (rejeu de
// `answers.r21Recalcs` par `applyR21Recalcs` — `bridge.ts`/`tabs.js`), et se voit-elle sur
// 📅 Semaine ET 🎯 Aujourd'hui, y compris après un RECHARGEMENT complet (donc un `S.currentPlan`
// entièrement neuf, reconstruit depuis `localStorage`) ?
//
// Seul `EBV2.importFit` (le parseur binaire bas niveau) est remplacé par une fabrication — le
// reste (lecture du fichier par l'`<input>`, construction du batch ingéré, appel à
// `EBV2.coachOnIngest`, persistance, message, re-rendu) est le code RÉEL de `tab-profile.js`.
//
// Rien n'est hardcodé sur le CONTENU du plan (nom de séance, minutes) : la suite découvre à
// l'exécution un jour PASSÉ portant une séance de course (pour fabriquer l'écart) et compare
// chaque jour touché à son propre AVANT — la propriété gardée est « ça a réduit », jamais une
// valeur épinglée qui casserait au moindre ajustement de calibration du moteur.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8640;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

// Mercredi : la même semaine porte alors un jour PASSÉ (lundi/mardi) et des jours FUTURS dans
// les 14 jours (jeudi→dimanche) — les deux classes dont le mécanisme a besoin, sans attendre
// un jour de semaine particulier au moment où la suite tourne (famille R20.7 : ne jamais
// laisser un verdict dépendre du jour d'exécution).
const ANCRE = "2026-09-16T09:00:00";
await page.clock.setFixedTime(new Date(ANCRE));
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "load" });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, runnerStateV1());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);

const setTab = async (t) => { await page.evaluate(async (t) => { const { setTab } = await import("./js/ui/tabs.js"); setTab(t); }, t); await page.waitForTimeout(600); };
// Même patron que smoke-improvements.mjs : le champ FIT vit dans Profil › Mes Données, sous un
// `<details>` replié par défaut.
const ouvrirSousOngletDe = (id) => page.evaluate((id) => {
  const b = document.getElementById(id); const sec = b && b.closest("[data-pfpanel]");
  if (sec) { const t = document.querySelector('[data-pfsub="' + sec.dataset.pfpanel + '"]'); if (t) t.click(); }
  for (let p = b; p; p = p.parentElement) if (p.tagName === "DETAILS") p.open = true;
  return sec ? sec.dataset.pfpanel : null;
}, id);

// ---- État AVANT ingestion : jour passé candidat + minutes de chaque jour futur (14j) --------
const avant = await page.evaluate(async () => {
  const { S, todayISO } = await import("./js/state.js");
  const { ensurePlan } = await import("./js/ui/tabs.js");
  const plan = ensurePlan();
  const today = todayISO();
  const in14 = new Date(new Date(today + "T00:00:00Z").getTime() + 14 * 864e5).toISOString().slice(0, 10);
  const minutesParJour = {};
  for (const w of plan.weeks) for (const d of w.days) {
    if (!d.date || d.date <= today || d.date > in14) continue;
    minutesParJour[w.num + "|" + d.jour] = d.sessions.reduce((t, s) => t + (s.min || 0), 0);
  }
  let pastDate = null;
  for (const w of plan.weeks) for (const d of w.days) {
    if (pastDate || !d.date || d.date >= today) continue;
    if (d.sessions.some((s) => s.d === "rn")) pastDate = d.date;
  }
  return { today, pastDate, minutesParJour, recalcsAvant: Array.isArray(S.answers.r21Recalcs) ? S.answers.r21Recalcs.length : 0 };
});
ok(!!avant.pastDate, "fixture : le plan porte au moins un jour PASSÉ avec une séance de course (pour fabriquer l'écart)");
ok(Object.keys(avant.minutesParJour).length > 0, "fixture : le plan porte au moins un jour dans les 14 prochains jours");
ok(avant.recalcsAvant === 0, "avant tout import, aucun recalcul R21 n'est encore persisté");

// ---- L'ingestion : import FIT réel (mock du seul parseur binaire), écart fabriqué -----------
await setTab("profile");
ok((await ouvrirSousOngletDe("pfFit")) === "donnees", "l'import FIT vit dans Profil › Mes Données et s'y atteint");
await page.evaluate((pastDate) => {
  // Le seul mock : `EBV2.importFit` (décodage binaire bas niveau). Tout le reste — la lecture
  // par l'`<input>`, `tab-profile.js`, `EBV2.coachOnIngest` — est le code réel du produit.
  // avgSpeedMs = 10 m/s (3'20/km) est absurdement rapide pour un profil déclaré à 4'30/km :
  // garanti au-dessus de la borne haute de N'IMPORTE QUELLE zone d'allure course de ce moteur.
  globalThis.EBV2.importFit = () => ({
    sessions: [{ date: pastDate, sport: "rn", minutes: 30, avgSpeedMs: 10 }],
    completed: [{ date: pastDate, d: "rn", minutes: 30 }],
    tests: [], notes: [],
  });
}, avant.pastDate);
await page.locator("#pfFit").setInputFiles({ name: "seance.fit", mimeType: "application/octet-stream", buffer: Buffer.from([0, 1, 2, 3]) });
await page.waitForTimeout(900);

const msgTxt = await page.locator("#pfFitMsg").innerHTML().catch(() => "");
ok(/Écart détecté/.test(msgTxt), "la notification R21 (« Écart détecté : … ») apparaît dans le message d'import");
ok(/J'ai ajusté/.test(msgTxt) || /Raison/.test(msgTxt), "et elle nomme l'ajustement ou sa raison (format à 2 lignes du coach)");

// ---- Après ingestion : les recalculs sont PERSISTÉS et le(s) jour(s) touché(s) ont réduit ---
const apres = await page.evaluate(async () => {
  const { S, todayISO } = await import("./js/state.js");
  const { ensurePlan } = await import("./js/ui/tabs.js");
  const plan = ensurePlan();
  const recalcs = Array.isArray(S.answers.r21Recalcs) ? S.answers.r21Recalcs : [];
  const minutesTouches = recalcs.map((r) => {
    const [wn, jour] = r.session_id.split("|");
    const w = plan.weeks.find((x) => String(x.num) === wn);
    const d = w && w.days.find((x) => x.jour === jour);
    // `key` (wn|jour) sert à recouper avec `avant.minutesParJour` ; `session_id` (wn|jour|idx,
    // trois segments) est celui que persiste `recalculerFenetre` et qu'il faut retrouver tel quel.
    return { key: wn + "|" + jour, session_id: r.session_id, date: r.date, facteur: r.facteur, min: d ? d.sessions.reduce((t, s) => t + (s.min || 0), 0) : null };
  });
  return { recalcs, minutesTouches, today: todayISO() };
});
ok(apres.recalcs.length > 0, "un recalcul R21 a été persisté dans answers.r21Recalcs (" + apres.recalcs.length + ")");
ok(apres.recalcs.every((r) => typeof r.session_id === "string" && typeof r.facteur === "number" && r.facteur < 1 && typeof r.raison === "string"),
  "chaque entrée persistée porte la RECETTE (session_id, facteur < 1, raison) — pas un état gelé");
ok(apres.recalcs.every((r) => r.date > apres.today), "chaque jour touché est dans le FUTUR (jamais le passé — R21 §2)");
const toutesReduites = apres.minutesTouches.every((m) => m.min != null && m.min < (avant.minutesParJour[m.key] ?? Infinity));
ok(toutesReduites, "chaque jour persisté a RÉELLEMENT moins de minutes qu'avant l'ingestion (" +
  apres.minutesTouches.map((m) => m.key + " " + (avant.minutesParJour[m.key] ?? "?") + "→" + m.min).join(", ") + ")");

// ---- Visible sur 📅 Semaine : le jour touché de la semaine COURANTE affiche moins qu'avant ---
const toucheCetteSemaine = apres.minutesTouches.find((m) => avant.minutesParJour[m.key] != null);
if (toucheCetteSemaine) {
  await setTab("week");
  const semaine = await page.evaluate((jour) => {
    const blocs = [...document.querySelectorAll("#screen .gd")];
    const b = blocs.find((el) => el.querySelector(".gd-top b")?.textContent === jour);
    return b ? b.textContent : null;
  }, toucheCetteSemaine.key.split("|")[1]);
  ok(!!semaine, "📅 Semaine : le jour touché est bien affiché dans la grille de la semaine en cours");
  // `.gd-dur` porte "Xmin" (<60) ou "XhYY" — on cherche le NOMBRE réduit, jamais l'ancien.
  const attendu = toucheCetteSemaine.min >= 60
    ? Math.floor(toucheCetteSemaine.min / 60) + "h" + String(Math.round(toucheCetteSemaine.min % 60)).padStart(2, "0")
    : Math.round(toucheCetteSemaine.min) + "min";
  ok(!!semaine && semaine.includes(attendu), "📅 Semaine : la durée affichée (" + attendu + ") est bien la valeur RÉDUITE");
} else {
  ok(false, "aucun jour touché ne tombe dans la semaine courante — fixture à revoir (voir minutesTouches)");
}

// ---- Survit à un RECHARGEMENT complet, puis visible sur 🎯 Aujourd'hui ----------------------
// On saute au jour touché le plus proche : un S.currentPlan entièrement neuf (nouveau contexte
// JS, relu depuis localStorage) doit rejouer `answers.r21Recalcs` (`rejouerR21Recalcs`,
// `tabs.js`) pour que la réduction soit encore là — c'est la propriété que la Vague 1 (cache
// `reasoned`) a préparée et que cette Vague ferme.
const premierTouche = [...apres.recalcs].sort((a, b) => a.date.localeCompare(b.date))[0];
await page.clock.setFixedTime(new Date(premierTouche.date + "T09:00:00"));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);

const rechargement = await page.evaluate(async (sessionId) => {
  const { S } = await import("./js/state.js");
  const { ensurePlan } = await import("./js/ui/tabs.js");
  const plan = ensurePlan();
  const [wn, jour] = sessionId.split("|");
  const w = plan.weeks.find((x) => String(x.num) === wn);
  const d = w && w.days.find((x) => x.jour === jour);
  return {
    recalcsCount: Array.isArray(S.answers.r21Recalcs) ? S.answers.r21Recalcs.length : 0,
    minutesApresRechargement: d ? d.sessions.reduce((t, s) => t + (s.min || 0), 0) : null,
    nomSeance: d ? d.sessions.filter((s) => s.d !== "rs").map((s) => s.name).join(" + ") : null,
  };
}, premierTouche.session_id);
ok(rechargement.recalcsCount === apres.recalcs.length, "après un RECHARGEMENT complet, tous les recalculs persistés sont toujours là (" + rechargement.recalcsCount + "/" + apres.recalcs.length + ")");
const minAttenduRecharge = apres.minutesTouches.find((m) => m.session_id === premierTouche.session_id).min;
ok(rechargement.minutesApresRechargement === minAttenduRecharge,
  "et le jour touché est REJOUÉ à l'identique après régénération (" + rechargement.minutesApresRechargement + " min, attendu " + minAttenduRecharge + ")");

// 🎯 Aujourd'hui reste gatée par le point du matin (`readiness.date === todayISO()`) : sans
// mise à jour, le jour sauté au calendrier retomberait sur le diaporama de check-in plutôt que
// sur la séance — ce qu'un check-in réellement complété ce jour-là aurait résolu.
await page.evaluate(async (today) => {
  const { S, ebSave } = await import("./js/state.js");
  S.answers.readiness = Object.assign({}, S.answers.readiness, { date: today });
  ebSave();
}, premierTouche.date);
await setTab("today");
const auj = await page.evaluate((nom) => (document.getElementById("screen") || {}).textContent || "", rechargement.nomSeance);
ok(!!rechargement.nomSeance && auj.includes(rechargement.nomSeance), "🎯 Aujourd'hui : le jour sauté au calendrier montre bien la séance réduite (« " + rechargement.nomSeance + " »)");

ok(errs.length === 0, "aucune erreur JS pendant toute la traversée" + (errs.length ? " (" + errs.slice(0, 2).join(" · ") + ")" : ""));

await browser.close();
server.close();
process.exit(report());
