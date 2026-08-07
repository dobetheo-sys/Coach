// R16.8 — GARDE DE L'ÉCHELLE TYPOGRAPHIQUE.
//
// La feuille portait 21 tailles distinctes, dont quatre sous le pixel (7,5 / 8,5 / 11,5 /
// 12,5) : une accumulation, pas une échelle. Sept paliers la remplacent (`--fs-*` dans
// `:root`). Cette suite ne vérifie PAS des valeurs absolues — un palier peut bouger, c'est
// le but d'avoir une échelle. Elle vérifie les deux choses qu'une refonte typographique
// casse en silence :
//
//   1. les RELATIONS d'ordre que l'ancienne feuille exprimait par accident (deux rôles
//      partageaient parfois une taille ; les remapper au « palier le plus proche » aplatit
//      la hiérarchie sans qu'aucun test ne s'en aperçoive) ;
//   2. le PLANCHER de lisibilité — 7,5 px de texte réel, c'est ce qui a motivé le chantier.
//
// Elle asserte aussi qu'aucune taille littérale en pixels ne revient dans l'app : le seul
// endroit qui en garde légitimement est le document EXPORTÉ, qui n'a pas les variables.
import { readFileSync, readdirSync } from "node:fs";
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8591;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();

// ---- 1. La source : l'échelle est DÉCLARÉE, et personne ne la contourne ----------------
// Les COMMENTAIRES ne sont pas des règles : une explication qui cite `font-size:16px` pour
// dire d'où vient une contrainte ne l'applique à rien. On les retire avant de mesurer,
// sinon la garde punit le fait de documenter — et documenter est la règle de ce dépôt.
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const css = sansCommentaires(readFileSync(new URL("../../endurabuild/css/styles.css", import.meta.url), "utf8"));
const paliers = [...css.matchAll(/--fs-[a-z]+:\s*([0-9.]+)px/g)].map((m) => +m[1]);
ok(paliers.length >= 6 && paliers.length <= 9, "l'échelle compte 6 à 9 paliers (" + paliers.length + " : " + paliers.join(" / ") + "px)");
ok(Math.min(...paliers) >= 9, "aucun palier sous 9 px (plus petit : " + Math.min(...paliers) + "px)");
const durs = [...css.matchAll(/font-size:([0-9.]+)px/g)].map((m) => m[1]);
ok(durs.length === 0, "aucune taille littérale dans la feuille" + (durs.length ? " — reste : " + durs.join(", ") : ""));

// R18.1-a — `css/mobile.css` N'ÉTAIT PAS LU par cette garde, et il portait un `font-size:8px`
// (le libellé « détail » des séances repliables) : sous le plancher que R16.8 affirme tenir.
// La mesure de rendu ne le voyait pas non plus — un `::after` n'est pas un nœud de texte.
// La couche mobile garde le droit d'écrire des valeurs concrètes (elle survit délibérément à
// une régénération de `styles.css`) : on n'y exige donc PAS zéro littéral, on y exige le
// PLANCHER — c'est la propriété qui protège quelqu'un, pas la propreté du fichier.
const mob = sansCommentaires(readFileSync(new URL("../../endurabuild/css/mobile.css", import.meta.url), "utf8"));
const sousPlancher = [...mob.matchAll(/font-size:\s*([0-9.]+)px/g)].map((m) => +m[1]).filter((v) => v < 9);
ok(sousPlancher.length === 0, "css/mobile.css — aucune taille sous le plancher de 9 px"
  + (sousPlancher.length ? " — reste : " + sousPlancher.join(", ") + "px" : ""));

// Les modules UI : littéral toléré UNIQUEMENT dans le document exporté (plan-view.js), qui
// est autonome et ne charge pas styles.css.
const jsRoot = new URL("../../endurabuild/js/", import.meta.url);
const fichiers = [];
(function walk(u) {
  for (const e of readdirSync(u, { withFileTypes: true })) {
    const c = new URL(e.name + (e.isDirectory() ? "/" : ""), u);
    if (e.isDirectory()) walk(c); else if (e.name.endsWith(".js")) fichiers.push(c);
  }
})(jsRoot);
const fuites = [];
for (const f of fichiers) {
  const nom = f.pathname.split("/").pop();
  // L'exemption du document exporté (R16.8 : autonome, sans styles.css) était une PLAGE DE
  // NUMÉROS DE LIGNE en dur — toute insertion en amont du fichier la décalait et le critère
  // rougissait sur du code exempté depuis toujours (constaté en R24). Elle s'ancre désormais
  // sur le CONTENU : la travée entre le commentaire qui déclare l'exception et la fin du
  // gabarit HTML qu'elle couvre.
  let dansDocExporte = false;
  readFileSync(f, "utf8").split("\n").forEach((l, i) => {
    if (nom === "plan-view.js") {
      if (l.includes("le DOCUMENT EXPORTÉ est autonome")) dansDocExporte = true;
      if (dansDocExporte && l.includes("</body></html>")) { dansDocExporte = false; return; }
    }
    if (!/font-size:[0-9.]+px/.test(l)) return;
    if (dansDocExporte) return;
    fuites.push(nom + ":" + (i + 1));
  });
}
ok(fuites.length === 0, "aucune taille littérale dans les modules UI" + (fuites.length ? " — reste : " + fuites.join(", ") : ""));

// ---- 2. Le rendu : les relations d'ordre tiennent -------------------------------------
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 }, locale: "fr-FR" })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, runnerStateV1());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
const iso = await page.evaluate(() => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
});
await page.evaluate(async (iso) => {
  const { S, ebSave } = await import("./js/state.js");
  // R23.2 — l'horodatage du check-in suit la JOURNÉE D'ENTRAÎNEMENT, pas la date calendaire.
  // Ce test injectait la date calendaire : vert la plupart du temps, ROUGE dès que l'heure
  // locale simulée tombe entre minuit et 4 h (en UTC+14, c'est chaque jour de 10 h à 14 h UTC).
  // Le portillon compare au repère de l'app — on horodate donc avec LE MÊME repère (R11.1).
  const { jourEntrainementISO } = await import("./js/state.js");
  S.answers.readiness = { date: jourEntrainementISO(), sleepQuality: "bon", hrvStatus: "normale", energy: 80, feel: "frais" };
  ebSave();
  const { setTab } = await import("./js/ui/tabs.js");
  setTab("general");
}, iso);
await page.waitForTimeout(600);

const px = (sel) => page.evaluate((s) => {
  const e = document.querySelector(s);
  return e ? parseFloat(getComputedStyle(e).fontSize) : null;
}, sel);

// [rôle dominant, rôle dominé, ce que la relation VEUT DIRE]
const PAIRES = [
  [".gw-h b", ".gw-h em", "le numéro de semaine domine son volume"],
  [".gd-top b", ".gd-top i", "le jour domine sa date"],
  [".gd-top b", ".gd-n", "l’en-tête de case domine son contenu"],
  [".gd-why", ".gd-det", "le POURQUOI d’une séance passe avant son détail technique"],
  [".load-title", ".load-sub", "le titre de carte domine son sous-texte"],
  [".card .why", ".card .eyebrow", "le manuscrit domine l’étiquette"],
];
for (const [gros, petit, sens] of PAIRES) {
  const a = await px(gros), b = await px(petit);
  if (a === null || b === null) { info("absent de cet écran, non mesuré : " + gros + " / " + petit); continue; }
  ok(a > b, gros + " (" + a + "px) > " + petit + " (" + b + "px) — " + sens);
}

// ---- 3. R16.8-a — aucun libellé de phase tronqué, à AUCUNE largeur ---------------------
// La frise est proportionnelle (`flex:N` = nombre de semaines) : une phase d'une semaine est
// étroite même sur un grand écran. Conditionner l'abréviation au viewport ne suffisait donc
// pas — la capture de contrôle montrait encore « P… » et « A… » à 1100 px. On mesure le
// débordement réel (scrollWidth > clientWidth) sur trois largeurs.
for (const w of [1100, 760, 390]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.evaluate(async () => { const { setTab } = await import("./js/ui/tabs.js"); setTab("general"); });
  await page.waitForTimeout(300);
  const coupes = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll(".ph-seg span").forEach((e) => {
      if (getComputedStyle(e).display === "none") return;
      if (e.scrollWidth > e.clientWidth + 1) out.push(e.textContent + " (" + e.clientWidth + "px pour " + e.scrollWidth + ")");
    });
    return out;
  });
  ok(coupes.length === 0, "largeur " + w + "px — aucun libellé de phase tronqué" + (coupes.length ? " : " + coupes.join(", ") : ""));
}
await page.setViewportSize({ width: 1100, height: 900 });

// ---- 4. Le plancher de lisibilité, sur les CINQ onglets --------------------------------
// R18.3 — « week » est revenu : un onglet non balayé est un onglet non gardé, et c'est
// exactement comme ça que `css/mobile.css` avait gardé un texte de 8 px pendant tout R16.
for (const t of ["profile", "general", "today", "week"]) { // R24.9 — plus d'onglet nutrition
  await page.evaluate(async (t) => { const { setTab } = await import("./js/ui/tabs.js"); setTab(t); }, t);
  await page.waitForTimeout(400);
  const mini = await page.evaluate(() => {
    let m = 99, quoi = "";
    document.querySelectorAll("#screen *").forEach((e) => {
      // seulement les nœuds qui portent du texte PROPRE (sinon on mesure des conteneurs)
      const propre = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!propre) return;
      const f = parseFloat(getComputedStyle(e).fontSize);
      if (f < m) { m = f; quoi = e.className || e.tagName; }
    });
    return { m, quoi };
  });
  ok(mini.m >= 9, "onglet " + t + " — plus petit texte rendu : " + mini.m + "px (" + String(mini.quoi).slice(0, 40) + "), plancher 9px");
}

// ---- 5. R18.1 — aucun champ de saisie sous 16 px au doigt --------------------------------
// La règle est imposée par iOS, pas par le goût : sous 16 px, la mise au point d'un champ
// déclenche un zoom automatique que l'utilisateur n'a pas demandé et que rien ne défait.
// On mesure au POINTEUR TACTILE (`hasTouch`), parce que la règle est conditionnée à lui —
// la mesurer au clavier-souris aurait rendu la garde verte sans rien prouver.
const tactile = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR" })).newPage();
await tactile.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
await tactile.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, runnerStateV1());
await tactile.reload({ waitUntil: "networkidle" });
await tactile.waitForTimeout(700);
await tactile.evaluate(async (iso) => {
  const { S, ebSave } = await import("./js/state.js");
  // R23.2 — l'horodatage du check-in suit la JOURNÉE D'ENTRAÎNEMENT, pas la date calendaire.
  // Ce test injectait la date calendaire : vert la plupart du temps, ROUGE dès que l'heure
  // locale simulée tombe entre minuit et 4 h (en UTC+14, c'est chaque jour de 10 h à 14 h UTC).
  // Le portillon compare au repère de l'app — on horodate donc avec LE MÊME repère (R11.1).
  const { jourEntrainementISO } = await import("./js/state.js");
  S.answers.readiness = { date: jourEntrainementISO(), sleepQuality: "bon", hrvStatus: "normale", energy: 80, feel: "frais" };
  ebSave();
}, iso);
ok(await tactile.evaluate(() => matchMedia("(pointer:coarse)").matches), "le contexte de mesure est bien tactile (sinon la garde ne prouve rien)");
for (const t of ["profile", "general", "today", "week"]) { // R24.9 — plus d'onglet nutrition
  await tactile.evaluate(async (t) => { const { setTab } = await import("./js/ui/tabs.js"); setTab(t); }, t);
  await tactile.waitForTimeout(400);
  const petits = await tactile.evaluate(() => {
    const o = [];
    document.querySelectorAll("input,select,textarea").forEach((e) => {
      // Les cases à cocher et les sélecteurs de fichier ne déclenchent pas le zoom iOS :
      // ils n'ouvrent pas de clavier. Les inclure aurait produit une garde impossible à
      // tenir, donc une garde qu'on aurait fini par désactiver.
      if (e.type === "checkbox" || e.type === "radio" || e.type === "file") return;
      const f = parseFloat(getComputedStyle(e).fontSize);
      if (f < 16) o.push((e.id || e.tagName) + (e.className ? "." + e.className : "") + " = " + f + "px");
    });
    return o;
  });
  ok(petits.length === 0, "onglet " + t + " — aucun champ sous 16px au doigt" + (petits.length ? " : " + petits.join(", ") : ""));
}
// Et le zoom VOLONTAIRE reste possible : c'est l'autre moitié de la décision.
const meta = await tactile.evaluate(() => (document.querySelector('meta[name=viewport]') || {}).content || "");
ok(!/user-scalable\s*=\s*no|maximum-scale/.test(meta),
  "le pinch-to-zoom reste autorisé — on retire le zoom SUBI, jamais le zoom VOULU (" + meta + ")");

ok(errs.length === 0, "aucune erreur JS sur les 5 onglets (" + errs.length + (errs.length ? " — " + errs[0] : "") + ")");

await browser.close();
server.close();
// La suite doit SORTIR en code non nul quand elle échoue : `run-all.mjs` lit le code de
// sortie du processus, et `report()` se contente de le RENDRE. Sept suites sur dix-sept
// finissaient par `report();` — elles sortaient donc en 0 quoi qu'elles trouvent, et la
// CI les comptait vertes. Même mécanisme que le banc d'invariants d'O-9/R20.6 : un
// rapport que rien ne lit vaut zéro.
process.exit(report());
