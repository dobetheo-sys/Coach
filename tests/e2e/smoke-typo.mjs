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
const css = readFileSync(new URL("../../endurabuild/css/styles.css", import.meta.url), "utf8");
const paliers = [...css.matchAll(/--fs-[a-z]+:\s*([0-9.]+)px/g)].map((m) => +m[1]);
ok(paliers.length >= 6 && paliers.length <= 8, "l'échelle compte 6 à 8 paliers (" + paliers.length + " : " + paliers.join(" / ") + "px)");
ok(Math.min(...paliers) >= 9, "aucun palier sous 9 px (plus petit : " + Math.min(...paliers) + "px)");
const durs = [...css.matchAll(/font-size:([0-9.]+)px/g)].map((m) => m[1]);
ok(durs.length === 0, "aucune taille littérale dans la feuille" + (durs.length ? " — reste : " + durs.join(", ") : ""));

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
  readFileSync(f, "utf8").split("\n").forEach((l, i) => {
    if (!/font-size:[0-9.]+px/.test(l)) return;
    if (nom === "plan-view.js" && i + 1 >= 96 && i + 1 <= 115) return; // le document exporté
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
  S.answers.readiness = { date: iso, sleepQuality: "bon", hrvStatus: "normale", energy: 80, feel: "frais" };
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

// ---- 4. Le plancher de lisibilité, sur les quatre onglets -----------------------------
for (const t of ["profile", "general", "today", "nutrition"]) {
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

ok(errs.length === 0, "aucune erreur JS sur les 4 onglets (" + errs.length + (errs.length ? " — " + errs[0] : "") + ")");

await browser.close();
server.close();
report();
