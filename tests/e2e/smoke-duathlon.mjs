// Smoke DUATHLON (spec R10 phase 2) : le sport le plus chargé en impact course du catalogue.
// Ce que cette suite protège en priorité : le plafond de jours d'appui (§R10.2.3, « non
// négociable »), les DEUX sens de brique, et la prédiction en trois legs — jamais un total.
import { startServer, launchBrowser, makeReporter } from "./harness.mjs";

const PORT = 8530;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });

// ---- 1. Le duathlon est un sport de premier ordre ----
ok(await page.locator(".sport-card").count() === 7, "7 sports proposés (duathlon ajouté)");
ok(await page.locator('.sport-card[data-sport="duathlon"]').count() === 1, "carte « Duathlon » présente");
await page.click('.sport-card[data-sport="duathlon"]');
await page.click('.opts[data-key="intent"] .opt[data-val="competition"]');
const fmtTxt = await page.locator("#screen").textContent();
ok(/Sprint \(5 \/ 20 \/ 2,5\)/.test(fmtTxt) && /Powerman/.test(fmtTxt), "les 4 formats officiels sont proposés avec leurs distances");
await page.click('.opts[data-key="format"] .opt[data-val="M"]');
await page.click("#nextBtn");
for (const v of ["med_pain", "med_dizzy", "med_treat"]) await page.click('.opts[data-key="' + v + '"] .opt[data-val="non"]');
await page.click("#nextBtn");
ok(/Le parcours/.test(await page.locator("#screen").textContent()), "étape « Le parcours » (profil), pas « Le terrain » de la course à pied");
await page.click('.opts[data-key="terrain"] .opt[data-val="vallonne"]');
await page.click("#nextBtn");
await page.fill('[data-input="age"]', "35");
await page.click('.opts[data-key="sex"] .opt[data-val="H"]');
await page.click("#nextBtn");

// ---- 2. Deux références, pas trois : demander un CSS serait du bruit ----
const lvl = await page.locator("#screen").textContent();
ok(/2 disciplines/.test(lvl), "l'étape niveau annonce 2 disciplines");
ok(!/CSS/.test(lvl), "aucune question de natation (pas de CSS demandé)");
await page.click('.opts[data-key="level"] .opt[data-val="inter"]');
await page.click('.opts[data-key="pace_known"] .opt[data-val="oui"]');
await page.fill('[data-input="pace"]', "4:30");
await page.click('.opts[data-key="ftp_known"] .opt[data-val="oui"]');
await page.fill('[data-input="ftp"]', "250");
await page.click("#nextBtn");
const inj = await page.locator("#screen").textContent();
ok(/Gêne à la course/.test(inj), "« Gêne à la course » proposée — LA déclaration qui compte ici");
ok(!/Épaule/.test(inj), "pas de blessure d'épaule (aucune natation)");
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
await page.waitForTimeout(900);
ok(await page.locator("#ebTabbar .tabbtn").count() === 5, "plan duathlon généré (vue 5 onglets)");

// ---- 3. Le plan : garde-fou d'impact, deux sens de brique, longue à vélo ----
const plan = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const p = S.currentPlan;
  const names = [...new Set(p.weeks.flatMap((w) => w.days.flatMap((d) => d.sessions.map((s) => s.name))))];
  const runDaysPerWeek = p.weeks.map((w) => w.days.filter((d) => d.sessions.some((s) => s.d === "rn")).length);
  const longs = p.weeks.flatMap((w) => w.days.flatMap((d) => d.sessions.filter((s) => s.long).map((s) => s.d + ":" + s.name)));
  const swim = p.weeks.flatMap((w) => w.days.flatMap((d) => d.sessions.filter((s) => s.d === "sw")));
  const cap = (p._v2.decisions || []).find((d) => d.id === "impact");
  return { weeks: p.weeks.length, names, maxRunDays: Math.max(...runDaysPerWeek), cap: cap ? String(cap.val) : null,
    longs: [...new Set(longs)], swim: swim.length, viol: p._v2.hardViolations, empty: p.weeks.flatMap((w) => w.days).filter((d) => !d.sessions.length).length };
});
ok(plan.weeks === 12, "durée = 12 semaines pour un format M (" + plan.weeks + ")");
ok(plan.viol.length === 0, "0 violation dure (" + plan.viol.join(" ; ") + ")");
ok(plan.cap !== null, "le plafond de jours d'appui est DÉCIDÉ et affiché : " + plan.cap);
ok(plan.maxRunDays <= 5, "aucune semaine ne dépasse le plafond d'appui (max mesuré : " + plan.maxRunDays + ")");
ok(plan.swim === 0, "aucune séance de natation dans un plan duathlon");
ok(plan.names.some((n) => /Brick R1 → vélo/.test(n)), "brique R1 → vélo présente (la spécificité que le tri n'a pas)");
ok(plan.names.some((n) => /Brick vélo → R2/.test(n)), "brique vélo → R2 présente");
ok(plan.longs.some((l) => l.startsWith("bk")), "la sortie longue hors phase spécifique est à VÉLO (l'impact à pied est déjà le facteur limitant)");
ok(plan.empty === 0, "aucun jour vide (le défaut D10-7 ne peut pas se reproduire ici)");

// ---- 4. Prédiction : trois legs, jamais un total, et la pré-fatigue du R1 sur le vélo ----
const pred = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const p = globalThis.EBV2.predict("duathlon", S.answers, S.currentPlan);
  return { items: p.items.map((i) => i.leg + ": " + i.value), whys: p.items.map((i) => i.why).join(" "), advice: p.advice.join(" ") };
});
ok(pred.items.length === 3, "trois legs séparés : " + pred.items.join(" · "));
ok(!/total/i.test(pred.items.join(" ")), "aucun temps total affiché (additionner les incertitudes serait mentir)");
const w = pred.items.find((i) => /Vélo/.test(i));
const watts = w ? +w.match(/(\d+)–/)[1] : 0;
ok(watts > 150 && watts < 250, "puissance vélo cible plausible pour 250W de FTP (" + w + ")");
ok(/pré-fatigue|R1 dans les jambes/i.test(pred.whys), "la puissance vélo est explicitement réduite par la pré-fatigue du R1 (§R10.2.4)");
ok(/piège du duathlon est le R1/.test(pred.advice), "le conseil de pacing nomme l'erreur n°1 du format");

// ---- 5. Une gêne à la course ALLÈGE l'appui (priorité n°2 du manifeste) ----
const injCap = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const a = { ...S.answers, injury: "course" };
  const p = globalThis.EBV2.buildPlan("duathlon", a);
  const cap = (p._v2.decisions || []).find((d) => d.id === "impact");
  return cap ? String(cap.val) : null;
});
ok(injCap === "4/semaine", "« gêne à la course » déclarée → un jour d'appui en moins (" + injCap + ")");

ok(errs.length === 0, "aucune erreur JS (" + errs.length + ")");
if (errs.length) info(errs.slice(0, 3).join(" | "));

server.close();
await browser.close();
process.exit(report());
