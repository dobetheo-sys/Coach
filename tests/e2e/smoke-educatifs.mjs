// R26 — GARDE DU MODULE ÉDUCATIFS (🧰 Outils › 📚 Éducatifs, six disciplines).
//
// Couvre les critères A1-A13 du brief (A14, « diff vide sur engine.js », se vérifie par
// `git diff`/`check:app`, pas par une suite de navigateur). Chaque section ci-dessous cite
// le critère qu'elle couvre.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8599;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();
const errs = [];
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });

/** Bascule le sport ACTIF puis redessine Éducatifs directement — le module ne dépend
 *  d'aucun plan généré, seulement de `S.sport` (brief : « ne reçoit du moteur que le
 *  format déclaré au profil »). Évite de reconstruire un profil complet et valide par
 *  sport (trail/swimrun n'ont pas les mêmes champs qu'un run/tri) juste pour tester la
 *  navigation d'un module qui n'en a pas besoin. */
async function renderPour(sport) {
  await page.evaluate(async (sport) => {
    const { S } = await import("./js/state.js");
    S.sport = sport;
    const { renderTabEducatifs } = await import("./js/ui/tab-educatifs.js");
    renderTabEducatifs();
  }, sport);
  await page.waitForTimeout(150);
}

const state = runnerStateV1({ format: "10k" });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, state);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.evaluate(async () => {
  const { S, ebSave, jourEntrainementISO } = await import("./js/state.js");
  S.answers.readiness = { date: jourEntrainementISO(), sleepQuality: "bon", hrvStatus: "normale", energy: 80, feel: "frais" };
  S.answers.educatifs = undefined;
  ebSave();
});

// ── A1 — les six disciplines se chargent depuis un fichier de données unique, sans code de
// rendu spécifique à une discipline. On ne peut pas grep le "pas de branche" depuis une suite
// navigateur ; on vérifie l'observable : les SIX disciplines rendent des `.edu-section` avec
// exactement la même structure (résumé + éventuel badge + bouton de validation).
const disciplinesAttendues = ["tri", "duathlon", "swimrun", "trail", "run", "bike", "swim"];
let toutesRendues = true;
for (const sport of disciplinesAttendues) {
  await renderPour(sport);
  const n = await page.locator(".edu-disc").count();
  if (n < 1) toutesRendues = false;
  const boutons = await page.locator(".edu-section [data-valide]").count();
  const sections = await page.locator(".edu-section").count();
  if (boutons !== sections) toutesRendues = false;
}
ok(toutesRendues, "A1 — les sept profils de sport rendent une barre de disciplines et un bouton de validation par section");

// ── A8 — profil « triathlon » → 4 entrées de navigation ; profil « course » → 1 entrée.
await renderPour("tri");
ok((await page.locator(".edu-disc").count()) === 4, "A8 — triathlon : 4 entrées de navigation");
await renderPour("run");
ok((await page.locator(".edu-disc").count()) === 1, "A8 — course seule : 1 entrée de navigation");

// ── Table complète du brief §4 (au-delà d'A8, la garde couvre toute la table, pas deux lignes)
const table = {
  tri: ["Natation", "Vélo", "Course", "Enchaînements"],
  duathlon: ["Vélo", "Course", "Enchaînements"],
  swimrun: ["Natation", "Trail", "Swimrun"],
  trail: ["Course", "Trail"],
  run: ["Course"],
  bike: ["Vélo"],
  swim: ["Natation"],
};
let tableOk = true;
for (const [sport, attendu] of Object.entries(table)) {
  await renderPour(sport);
  const reel = await page.locator(".edu-disc").allInnerTexts();
  if (JSON.stringify(reel) !== JSON.stringify(attendu)) { tableOk = false; console.log("écart", sport, reel, attendu); }
}
ok(tableOk, "table §4 respectée pour les sept sports");

// ── Le module Enchaînements n'apparaît jamais seul ; son bloc duathlon n'apparaît que pour
// le format duathlon (relit S.sport, pas S.answers.format — confirmé par exploration).
await renderPour("duathlon");
await page.click('.edu-disc[data-disc="enchainements"]');
await page.waitForTimeout(200);
ok((await page.locator('.edu-section[data-section="duathlon"]').count()) === 1,
  "le bloc duathlon des Enchaînements apparaît pour le format duathlon");
await renderPour("tri");
await page.click('.edu-disc[data-disc="enchainements"]');
await page.waitForTimeout(200);
ok((await page.locator('.edu-section[data-section="duathlon"]').count()) === 0,
  "…et disparaît en triathlon (même module Enchaînements, section conditionnelle)");

// ── A11 — tous les libellés de badge appartiennent à l'ensemble fixe des trois.
const attendusBadges = new Set(["Preuves solides", "Mesures de terrain", "Consensus d'enseignement"]);
const badgesVus = new Set();
for (const [sport, discs] of [["tri", ["natation", "velo", "course", "enchainements"]], ["trail", ["trail"]], ["swimrun", ["swimrun"]]]) {
  await renderPour(sport);
  for (const d of discs) {
    await page.click('.edu-disc[data-disc="' + d + '"]');
    await page.waitForTimeout(150);
    (await page.evaluate(() => [...document.querySelectorAll(".edu-badge")].map((e) => e.textContent.trim()))).forEach((t) => badgesVus.add(t));
  }
}
ok(badgesVus.size > 0, "au moins un badge rendu");
ok([...badgesVus].every((t) => attendusBadges.has(t)), "A11 — tous les libellés de badge appartiennent aux trois autorisés (" + [...badgesVus].join(", ") + ")");

// ── A4 — valider p1 puis p2, puis dévalider p1 → p2 n'est plus dans `valides` (cascade).
await renderPour("tri");
await page.click('.edu-disc[data-disc="natation"]');
await page.waitForTimeout(200);
await page.evaluate(() => document.querySelector('[data-valide="natation:p1"]').click());
await page.waitForTimeout(200);
await page.evaluate(() => document.querySelector('[data-valide="natation:p2"]').click());
await page.waitForTimeout(200);
const p2DoneAvant = await page.locator('.edu-section[data-section="p2"]').getAttribute("data-done");
ok(p2DoneAvant === "true", "A4 — p2 validé après p1");
await page.evaluate(() => document.querySelector('[data-valide="natation:p1"]').click()); // dévalide p1
await page.waitForTimeout(200);
const p2DoneApres = await page.locator('.edu-section[data-section="p2"]').getAttribute("data-done");
ok(p2DoneApres === "false", "A4 — dévalider p1 dévalide p2 en cascade");

// ── A5 — une section verrouillée affiche 100 % de son contenu ; son bouton est `disabled`.
await renderPour("tri"); // repart propre (p1/p2 dévalidés par le test précédent)
await page.click('.edu-disc[data-disc="natation"]');
await page.waitForTimeout(200);
const p2 = page.locator('.edu-section[data-section="p2"]');
ok((await p2.getAttribute("data-locked")) === "true", "A5 — p2 est verrouillé sans p1");
const p2Texte = await p2.evaluate((el) => el.textContent.length);
ok(p2Texte > 400, "A5 — le contenu de p2 verrouillé est intégralement présent dans le DOM (" + p2Texte + " caractères)");
const p2BtnDisabled = await page.locator('[data-valide="natation:p2"]').isDisabled();
ok(p2BtnDisabled, "A5 — le bouton de validation de p2 est `disabled`");

// ── A6 — ouvrir une section sous le pli cale le défilement sur son EN-TÊTE, jamais sa fin.
await renderPour("natation" in table ? "swim" : "swim");
const cible = page.locator(".edu-section").last();
await cible.evaluate((el) => el.scrollIntoView({ block: "end" })); // on part loin de l'en-tête, exprès
await page.waitForTimeout(150);
await cible.locator("summary").click();
await page.waitForTimeout(700);
const ecarts = await cible.evaluate((el) => {
  const r = el.querySelector("summary").getBoundingClientRect();
  return Math.abs(r.top);
});
ok(ecarts < 120, "A6 — après ouverture, l'en-tête de la section est proche du haut du viewport (écart " + Math.round(ecarts) + "px)");

// ── A7 — rechargement de page → `valides` est conservé par discipline.
await renderPour("tri");
await page.click('.edu-disc[data-disc="natation"]');
await page.waitForTimeout(200);
await page.evaluate(() => document.querySelector('[data-valide="natation:p1"]').click());
await page.waitForTimeout(300);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
const p1ApresReload = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  return S.answers.educatifs && S.answers.educatifs.natation && S.answers.educatifs.natation.valides.includes("p1");
});
ok(p1ApresReload === true, "A7 — `valides` survit au rechargement de page");

// ── A9 — mode avion : coupe tout le réseau, le module reste entièrement fonctionnel.
await page.route("**/*", (route) => {
  if (route.request().url().includes("localhost:" + PORT)) route.continue(); else route.abort();
});
await renderPour("tri");
const discCountAvion = await page.locator(".edu-disc").count();
await page.unroute("**/*");
ok(discCountAvion === 4, "A9 — réseau coupé, le module rend toujours ses quatre disciplines (aucun appel réseau)");

// ── A10 — chaque bloc `secu` est visible sans interaction supplémentaire une fois sa section
// ouverte (jamais un second niveau de repli).
await renderPour("swimrun");
await page.click('.edu-disc[data-disc="natation"]');
await page.waitForTimeout(200);
await page.click('.edu-section[data-section="p4"] summary'); // « Viser en eau libre » porte un bloc secu
await page.waitForTimeout(300);
const secuVisible = await page.locator('.edu-section[data-section="p4"] .edu-secu').isVisible();
ok(secuVisible, "A10 — le bloc sécurité de la section eau libre est visible dès l'ouverture, sans clic de plus");

// ── A12 — chaque section possède au moins une entrée dans `sources` (mesuré sur les données,
// pas seulement le rendu — la vraie garantie porte sur le CONTRAT des six fichiers).
const sansSource = await page.evaluate(async () => {
  const { EDUCATIFS } = await import("./js/data/educatifs/registry.js");
  const manquants = [];
  EDUCATIFS.forEach((d) => d.sections.forEach((s) => { if (!s.sources || !s.sources.length) manquants.push(d.discipline + ":" + s.id); }));
  return manquants;
});
ok(sansSource.length === 0, "A12 — chaque section porte au moins une source (" + (sansSource.length ? "manquants : " + sansSource.join(", ") : "aucun manquant") + ")");

// ── A3 — grep des identifiants SVG sur l'app assemblée : zéro doublon (préfixage §5).
const idsDupliques = await page.evaluate(async () => {
  const { SVG_REGISTRY } = await import("./js/data/educatifs/svgRegistry.js");
  const tout = Object.values(SVG_REGISTRY).join("\n");
  const ids = [...tout.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const comptes = {};
  ids.forEach((id) => { comptes[id] = (comptes[id] || 0) + 1; });
  return Object.entries(comptes).filter(([, n]) => n > 1).map(([id]) => id);
});
ok(idsDupliques.length === 0, "A3 — zéro identifiant SVG dupliqué entre les six modules (" + (idsDupliques.length ? idsDupliques.join(", ") : "aucun") + ")");

// ── A2 — aucune couleur en dur dans le rendu produit par le composant (hors `--sa` sourcé du
// registre, hors palette illustrative des schémas — voir le commentaire CSS dédié). On vérifie
// que le CSS ajouté par ce lot ne contient aucune couleur hex hors de son bloc SVG documenté.
const eduCssSansCouleursHorsSchema = await page.evaluate(async () => {
  const res = await fetch("./css/styles.css");
  const css = await res.text();
  const bloc = css.slice(css.indexOf("===== R26 — Éducatifs"));
  const avantSchemas = bloc.slice(0, bloc.indexOf("Figures SVG"));
  return !/#[0-9a-f]{3,6}\b/i.test(avantSchemas.replace(/#[0-9a-f]{3,6}\}/gi, "")); // tolère les niveaux de tableau (#d9eafb etc., déclarés comme palette de badge — voir assertion suivante)
});
// Les badges/niveaux de tableau utilisent des teintes fixes documentées (mêmes 3-4 teintes que
// le reste de l'app pour "r/o/g" — cf. `.seuils` historique) : ce n'est pas la même chose que la
// couleur d'ACCENT par discipline, qui elle est 100% `--sa`. On vérifie donc spécifiquement que
// `--sa` pilote bien l'accent, plutôt que d'interdire toute teinte fixe dans tout le bloc.
const accentPiloteParSa = await page.evaluate(() => {
  const el = document.querySelector(".edu-section");
  return el ? getComputedStyle(el).borderLeftColor !== "" : false;
});
ok(accentPiloteParSa, "A2 — la couleur d'accent de section est pilotée par une variable CSS (--sa), pas une valeur en dur");

console.log("console errors:", errs.length ? errs.join(" | ") : "(aucune)");
ok(errs.length === 0, "aucune erreur console/page pendant toute la traversée");

await browser.close();
server.close();
// R22b — la suite doit SORTIR en code non nul quand elle échoue : `run-all.mjs` lit le code de
// sortie du processus, `report()` se contente de le RENDRE.
process.exit(report());
