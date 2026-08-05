// Smoke DUATHLON (spec R10 phase 2) : le sport le plus chargé en impact course du catalogue.
// Ce que cette suite protège en priorité : le plafond de jours d'appui (§R10.2.3, « non
// négociable »), les DEUX sens de brique, et la prédiction en trois legs — jamais un total.
import { startServer, launchBrowser, makeReporter, traverserQuestionnaire } from "./harness.mjs";
const N_SPORTS = 7; // R16.10 — swimrun réintégré : le sélecteur suit le registre du moteur


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
ok(await page.locator(".sport-card").count() === N_SPORTS, N_SPORTS + " sports proposés (duathlon inclus)");
ok(await page.locator('.sport-card[data-sport="duathlon"]').count() === 1, "carte « Duathlon » présente");
await page.click('.sport-card[data-sport="duathlon"]');
await page.click('.opts[data-key="intent"] .opt[data-val="competition"]');
const fmtTxt = await page.locator("#screen").textContent();
ok(/Sprint \(5 \/ 20 \/ 2,5\)/.test(fmtTxt) && /Powerman/.test(fmtTxt), "les 4 formats officiels sont proposés avec leurs distances");
await page.click('.opts[data-key="format"] .opt[data-val="M"]');
await page.click("#nextBtn");
for (const v of ["med_pain", "med_dizzy", "med_treat"]) await page.click('.opts[data-key="' + v + '"] .opt[data-val="non"]');
await page.click("#nextBtn");
// U14 — traversée agnostique à l'ordre (voir la note dans harness.mjs). Les assertions qui
// portent sur un écran PARTICULIER sont accrochées à son contenu, pas à son rang.
let vuLegs = false, vuParcours = false;
await traverserQuestionnaire(page, {
  reponses: { terrain: "vallonne", leg_bike_prof: "montagne", leg_run_prof: "plat",
    sex: "H", level: "inter", pace_known: "oui", ftp_known: "oui",
    history: "confirme", injury: "aucune",
    sessions_max: "7", vol_max: "10", vol_recent: "7", dispo: "semaine", off_days: "non", doubles: "non" },
  // `weight` est DÉCLARÉ : sans lui le harnais remplit le milieu des bornes du champ,
  // soit 138 kg, et le chrono vélo mesuré ci-dessous serait celui d'un autre athlète (PW).
  saisies: { age: "35", pace: "4:30", ftp: "250", weight: "75" },
  async surEcran(pg) {
    // Le libellé de l'étape terrain change avec le sport : en duathlon c'est « Le parcours »,
    // pas « Le terrain » de la course à pied. Accroché au champ, pas au rang de l'écran.
    if (!vuParcours && (await pg.locator('.opts[data-key="terrain"]').count())) {
      vuParcours = true;
      ok(/Le parcours/.test(await pg.locator("#screen").textContent()),
        "étape « Le parcours » (profil), pas « Le terrain » de la course à pied");
    }
    if (vuLegs || !(await pg.locator('.opts[data-key="leg_bike_prof"]').count())) return;
    vuLegs = true;
    const legTxt = await pg.locator("#screen").textContent();
    ok(/profil de ta course/i.test(legTxt), "étape « Le profil de ta course » proposée en duathlon");
    ok(/parcours vélo/i.test(legTxt) && /parcours à pied/i.test(legTxt), "les deux segments sont demandés séparément");
    // On vérifie le CHAMP, pas le mot : le texte d'intro cite la natation pour expliquer la
    // logique commune aux trois legs. Chercher le mot aurait fait échouer un test correct.
    ok(await pg.locator('.opts[data-key="leg_swim_env"]').count() === 0, "aucun champ de nage en duathlon — le leg n'existe pas");
    ok(await pg.locator("#nextBtn").isEnabled(), "l'étape est FACULTATIVE : on peut continuer sans rien renseigner");
  },
});
ok(vuLegs, "l'étape « profil par discipline » a bien été traversée");
ok(vuParcours, "l'étape « Le parcours » a bien été traversée");
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

// ---- 4. Prédiction : les segments, LE TOTAL, et la pré-fatigue du R1 sur le vélo ----
//
// PW (05/08/2026) — CES DEUX CRITÈRES ENCODAIENT UNE DÉCISION QUI A ÉTÉ RENVERSÉE.
// Ils exigeaient « trois legs, et AUCUN total », en citant le motif d'alors (« additionner les
// incertitudes serait mentir »). Le fondateur a demandé l'inverse : un temps total, transitions
// comprises. Le motif reste vrai — un total additionne bien les incertitudes — mais il ne
// justifie plus de se taire : l'athlète fait ce total de tête, sans les transitions, donc plus
// mal. Les critères sont donc RÉÉCRITS et non supprimés, et ils gardent ce qui compte
// désormais : le total EXISTE, et il vaut la somme des segments PLUS les transitions.
const pred = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const p = globalThis.EBV2.predict("duathlon", S.answers, S.currentPlan);
  return { items: p.items.map((i) => i.leg + ": " + i.value), whys: p.items.map((i) => i.why).join(" "), advice: p.advice.join(" ") };
});
ok(pred.items.length === 5, "R1 · R2 · vélo (intensité + temps) · total : " + pred.items.join(" · "));
{
  const sec = (v) => { const m = String(v).split(/[–-]/)[0].trim();
    const a = m.match(/^(\d+)h(\d+)$/), b = m.match(/^(\d+)'(\d+)$/);
    return a ? +a[1] * 3600 + +a[2] * 60 : b ? +b[1] * 60 + +b[2] : NaN; };
  const tot = pred.items.find((i) => /Total/.test(i));
  ok(!!tot, "un temps total est affiché (décision du fondateur, PW)");
  const parts = ["R1 ", "R2 ", "temps"].map((k) => pred.items.find((i) => i.includes(k)));
  const somme = parts.reduce((t, x) => t + (x ? sec(x.split(": ")[1]) : NaN), 0);
  const trans = tot ? sec(tot.split(": ")[1]) - somme : NaN;
  ok(trans > 60 && trans < 600, "le total dépasse la somme des segments de la valeur des transitions (" + Math.round(trans / 60) + " min)");
}
const w = pred.items.find((i) => /Vélo.*intensité/.test(i));
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
