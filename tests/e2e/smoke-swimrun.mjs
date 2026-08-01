// Smoke SWIMRUN (spec R10 phase 3). Ce que cette suite protège : les références EN TENUE
// (jamais présentées comme mesurées quand elles sont estimées), les transitions comme poste de
// temps à part entière, le prérequis d'entrée qui REFUSE un format long, et la substitution
// quand l'eau libre n'est pas accessible.
import { startServer, launchBrowser, makeReporter } from "./harness.mjs";

const PORT = 8540;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
ok(await page.locator(".sport-card").count() === 7, "7 sports proposés (swimrun ajouté)");
ok(await page.locator('.sport-card[data-sport="swimrun"]').count() === 1, "carte « Swimrun » présente");
await page.click('.sport-card[data-sport="swimrun"]');
await page.click('.opts[data-key="intent"] .opt[data-val="competition"]');

// ---- 1. Les DONNÉES de la course, pas un format seul ----
const objTxt = await page.locator("#screen").textContent();
ok(/Segments nagés/.test(objTxt), "le nombre de segments nagés est demandé (⇒ transitions)");
ok(/La plus longue nage/.test(objTxt), "la plus longue nage est demandée — la contrainte dimensionnante");
ok(/Solo ou binôme/.test(objTxt), "solo/binôme demandé (le profil cesse d'être individuel)");
ok(/Accès à l’eau libre|Accès à l'eau libre/.test(objTxt), "l'accès réel à l'eau libre est demandé");

// ---- 2. PRÉREQUIS D'ENTRÉE : un format long est REFUSÉ sans les bases (S10) ----
await page.click('.opts[data-key="format"] .opt[data-val="championship"]');
await page.click('.opts[data-key="team_mode"] .opt[data-val="binome"]');
await page.click('.opts[data-key="openwater_access"] .opt[data-val="saisonnier"]');
await page.click('.opts[data-key="swim_continuous"] .opt[data-val="non"]');
await page.click('.opts[data-key="run_continuous"] .opt[data-val="oui"]');
await page.waitForTimeout(200);
const blockTxt = await page.locator("#screen").textContent();
ok(/Prérequis non atteints/.test(blockTxt), "prérequis non atteints : l'app le DIT");
ok(/nager 30 min/.test(blockTxt) && /Experience ou Sprint/.test(blockTxt), "le message explique le seuil ET propose la marche à suivre");
ok(await page.locator("#nextBtn:disabled").count() === 1 || !(await page.locator("#nextBtn").isEnabled()), "impossible de continuer sur un format long sans les bases");
await page.click('.opts[data-key="swim_continuous"] .opt[data-val="oui"]');
await page.waitForTimeout(150);
ok(!/Prérequis non atteints/.test(await page.locator("#screen").textContent()), "prérequis remplis : le blocage se lève");
await page.click('.opts[data-key="format"] .opt[data-val="series"]');
await page.fill('[data-input="swim_total_m"]', "7850");
await page.fill('[data-input="run_total_km"]', "33");
await page.fill('[data-input="race_dplus_m"]', "900");
await page.fill('[data-input="segments_n"]', "20");
await page.fill('[data-input="longest_swim_m"]', "1400");
await page.fill('[data-input="water_temp_c"]', "16");
await page.click("#nextBtn");
for (const v of ["med_pain", "med_dizzy", "med_treat"]) await page.click('.opts[data-key="' + v + '"] .opt[data-val="non"]');
await page.click("#nextBtn");
await page.fill('[data-input="age"]', "35");
await page.click('.opts[data-key="sex"] .opt[data-val="H"]');
await page.click("#nextBtn");

// ---- 3. Références EN TENUE : le test d'abord, le repli ensuite (et annoncé) ----
const lvlTxt = await page.locator("#screen").textContent();
ok(/EN TENUE/.test(lvlTxt), "l'étape niveau demande le test EN TENUE avant tout");
ok(/pull buoy/.test(lvlTxt) && /longe/.test(lvlTxt), "le protocole du test est décrit (matériel complet, partenaire, longe)");
await page.click('.opts[data-key="level"] .opt[data-val="inter"]');
await page.click('.opts[data-key="gear_test"] .opt[data-val="non"]');
await page.click('.opts[data-key="css_known"] .opt[data-val="oui"]');
await page.fill('[data-input="css"]', "1:45");
await page.click('.opts[data-key="pace_known"] .opt[data-val="oui"]');
await page.fill('[data-input="pace"]', "4:50");
await page.click("#nextBtn");
const injTxt = await page.locator("#screen").textContent();
ok(/Épaule \(plaquettes\)/.test(injTxt), "blessure « épaule (plaquettes) » proposée — la zone n°1 du swimrun");
await page.click('.opts[data-key="history"] .opt[data-val="confirme"]');
await page.click('.opts[data-key="injury"] .opt[data-val="aucune"]');
await page.click("#nextBtn");
await page.click('.opts[data-key="sessions_max"] .opt[data-val="7"]');
await page.click('.opts[data-key="vol_max"] .opt[data-val="10"]');
await page.click('.opts[data-key="vol_recent"] .opt[data-val="7"]');
await page.click('.opts[data-key="dispo"] .opt[data-val="semaine"]');
await page.click('.opts[data-key="off_days"] .opt[data-val="non"]');
await page.click('.opts[data-key="doubles"] .opt[data-val="non"]');
await page.click("#nextBtn");
await page.click("#genBtn");
await page.waitForTimeout(1000);
ok(await page.locator("#ebTabbar .tabbtn").count() === 5, "plan swimrun généré (vue 5 onglets)");

// ---- 4. Le plan : la séance pivot reproduit les transitions et la part de nage ----
const plan = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const p = S.currentPlan;
  const sess = p.weeks.flatMap((w) => w.days.flatMap((d) => d.sessions.map((s) => ({ n: s.name, det: s.det || "", d: s.d, long: !!s.long, min: s.min || 0, steps: s.steps || [] }))));
  const pivots = sess.filter((s) => /Swimrun/.test(s.n));
  const km = sess.filter((s) => /\d+\s*km\b/.test(s.det)).length;
  return {
    weeks: p.weeks.length, viol: p._v2.hardViolations, score: p._v2.score,
    pivots: pivots.length, pivotNames: [...new Set(pivots.map((s) => s.n))].slice(0, 3),
    // la pivot porte DEUX legs (nage + course) : sans ça ses minutes seraient sous-comptées
    pivotLegs: pivots.length ? [...new Set(pivots[0].steps.filter((x) => x.leg).map((x) => x.leg))] : [],
    pivotMin: pivots.length ? pivots[0].min : 0,
    kmSessions: km, empty: p.weeks.flatMap((w) => w.days).filter((d) => !d.sessions.length).length,
  };
});
ok(plan.weeks === 20, "durée = 20 semaines pour un World Series (" + plan.weeks + ")");
ok(plan.viol.length === 0, "0 violation dure (" + plan.viol.join(" ; ") + ")");
ok(plan.pivots > 0, plan.pivots + " séances pivot « swimrun spécifique » au programme");
ok(/\d+ transitions/.test(plan.pivotNames.join(" ")), "le nom de la pivot annonce le nombre de transitions : " + plan.pivotNames[0]);
ok(plan.pivotLegs.includes("swim") && plan.pivotLegs.includes("run"), "la pivot porte les DEUX legs comme steps réels (ses minutes sont comptées)");
ok(plan.pivotMin > 30, "la pivot a un volume réel (" + plan.pivotMin + " min)");
ok(plan.empty === 0, "aucun jour vide");

// ---- 5. Prédiction : trois postes, transitions incluses, estimation ANNONCÉE ----
const pred = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const p = globalThis.EBV2.predict("swimrun", S.answers, S.currentPlan);
  return { items: p.items.map((i) => i.leg + ": " + i.value), whys: p.items.map((i) => i.why).join(" "), advice: p.advice.join(" ") };
});
ok(pred.items.some((i) => /^Temps estimé/.test(i)), "temps estimé fourni : " + (pred.items.find((i) => /Temps/.test(i)) || "—"));
ok(pred.items.some((i) => /Dont transitions/.test(i)), "les transitions sont un POSTE affiché : " + (pred.items.find((i) => /transitions/.test(i)) || "—"));
ok(pred.items.some((i) => /Dont nage/.test(i)) && pred.items.some((i) => /Dont course/.test(i)), "nage et course affichées séparément");
ok(pred.items.some((i) => /Effet de binôme/.test(i)), "l'effet de longe est chiffré, pas mentionné");
ok(/ESTIMÉ/.test(pred.whys), "les allures estimées sont annoncées comme telles (test en tenue pas fait)");
ok(/test en tenue COMPLÈTE/.test(pred.advice), "l'app pousse à faire le test en tenue");
ok(/combinaison une pièce|sifflet/.test(pred.advice), "le socle de matériel obligatoire est rappelé");

// ---- 6. Aucun accès à l'eau libre → substitution NOMMÉE, jamais l'impossible ----
const flat = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const p = globalThis.EBV2.buildPlan("swimrun", { ...S.answers, openwater_access: "aucun" });
  const names = new Set(p.weeks.flatMap((w) => w.days.flatMap((d) => d.sessions.map((s) => s.name))));
  const notes = p.weeks.flatMap((w) => w.days.flatMap((d) => d.sessions.map((s) => s.note || ""))).join(" ");
  return { subs: [...names].filter((n) => /substitution/i.test(n)).length, saysWhat: /ne se substitue pas/i.test(notes), ow: [...names].filter((n) => /eau libre/i.test(n)).length };
});
ok(flat.subs > 0, "séances de substitution générées (bassin ↔ course)");
ok(flat.saysWhat, "le plan NOMME ce qui ne se substitue pas (navigation, houle, froid)");

ok(errs.length === 0, "aucune erreur JS (" + errs.length + ")");
if (errs.length) info(errs.slice(0, 3).join(" | "));

server.close();
await browser.close();
process.exit(report());
