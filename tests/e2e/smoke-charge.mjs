// L'AXE DE CHARGE — une seule source, deux surfaces, et personne ne peut les faire diverger.
//
// Avant ce lot, la charge (dur / facile / récup) était écrite en dur à chaque endroit qui
// l'affiche, sur deux surfaces aux couleurs différentes : des pastels sur le papier du document
// exporté, des accents saturés sur le sombre de l'app. Rien ne tenait les deux ensemble — c'est
// R11.1 appliqué à une couleur sémantique.
//
// La table `CHARGE` (js/ui/icons.js) est désormais la source. Cette suite tient les trois
// maillons qui pourraient se détacher :
//   §1 les tokens CSS SONT la table — au bit près, sur le rendu réel, pas sur le texte source ;
//   §2 les bordures de la grille descendent bien des tokens (témoin : bouger le token les bouge) ;
//   §3 le document EXPORTÉ porte les valeurs papier de la table ;
//   §4 plus aucune valeur de charge n'est écrite en dur ailleurs.
//
// Le §2 est celui qui compte : sans lui, §1 vérifierait que deux constantes sont égales pendant
// que la grille peindrait tout autre chose. Une garde qui compare deux déclarations sans jamais
// regarder ce qui est PEINT ne garde rien.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";
import { readFileSync } from "node:fs";

const PORT = 8615;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

const st = runnerStateV1({ format: "70.3", weight: "72" });
st.sport = "tri";
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "load" });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, st);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.evaluate(async () => { const { setTab } = await import("./js/ui/tabs.js"); setTab("week"); });
await page.waitForTimeout(700);

// ─────────── §1 · Les tokens CSS SONT la table ───────────
{
  const m = await page.evaluate(async () => {
    const { CHARGE } = await import("./js/ui/icons.js");
    const cs = getComputedStyle(document.body);
    const lu = {};
    for (const k of Object.keys(CHARGE)) {
      lu[k] = {
        rgbTable: CHARGE[k].rgb.replace(/\s+/g, " ").trim(),
        rgbToken: cs.getPropertyValue("--zn-charge-" + k + "-rgb").replace(/\s+/g, " ").trim(),
        papTable: CHARGE[k].papier.toLowerCase(),
        papToken: cs.getPropertyValue("--zn-charge-" + k + "-papier").trim().toLowerCase(),
      };
    }
    return lu;
  });
  const cles = Object.keys(m);
  ok(cles.length === 3, "la table décrit bien trois charges (" + cles.join("/") + ")");
  const rgbKo = cles.filter((k) => !m[k].rgbToken || m[k].rgbToken !== m[k].rgbTable);
  const papKo = cles.filter((k) => !m[k].papToken || m[k].papToken !== m[k].papTable);
  ok(rgbKo.length === 0, "…chaque triplet sombre du token égale la table"
    + (rgbKo.length ? " — écart : " + rgbKo.map((k) => k + " " + m[k].rgbToken + " ≠ " + m[k].rgbTable).join(", ")
                    : " (" + cles.map((k) => m[k].rgbToken).join(" · ") + ")"));
  ok(papKo.length === 0, "…et chaque teinte papier aussi"
    + (papKo.length ? " — écart : " + papKo.map((k) => k + " " + m[k].papToken + " ≠ " + m[k].papTable).join(", ")
                    : " (" + cles.map((k) => m[k].papToken).join(" · ") + ")"));
}

// ─────────── §2 · Les bordures descendent des tokens ───────────
// Le témoin : on change le token à chaud, la bordure doit suivre. Sans lui, on ne mesurerait que
// l'égalité de deux déclarations — la grille pourrait peindre n'importe quoi.
{
  const m = await page.evaluate(() => {
    const lire = () => ["dur", "facile", "recup"].map((c) => {
      const el = document.querySelector("#screen .gd." + c);
      return el ? getComputedStyle(el).borderTopColor : null;
    });
    const avant = lire();
    document.body.style.setProperty("--zn-charge-dur-rgb", "0 255 0");
    const apres = lire();
    document.body.style.removeProperty("--zn-charge-dur-rgb");
    const remis = lire();
    return { avant, apres, remis };
  });
  ok(m.avant.every(Boolean), "les trois charges sont présentes dans la semaine (" + m.avant.join(" · ") + ")");
  ok(m.apres[0] !== m.avant[0] && /0, 255, 0/.test(m.apres[0]),
    "…la bordure « dur » SUIT son token (" + m.avant[0] + " → " + m.apres[0] + ")");
  ok(m.apres[1] === m.avant[1] && m.apres[2] === m.avant[2],
    "…et seule celle-là bouge : les tokens ne sont pas partagés par erreur");
  ok(m.remis[0] === m.avant[0], "…l'état est rendu tel quel après le témoin");
}

// ─────────── §3 · Le document exporté porte les valeurs papier ───────────
// L'export est AUTONOME : il ne charge aucune variable CSS (R16.8), ses couleurs sont donc
// interpolées depuis la table au moment où le document est construit. On capture le Blob plutôt
// que de relire le source — c'est le document LIVRÉ qui doit porter les bonnes valeurs.
{
  const m = await page.evaluate(async () => {
    const { downloadPlan } = await import("./js/ui/plan-view.js");
    let html = null;
    const vrai = URL.createObjectURL;
    const vraiClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {}; // on n'ouvre aucun téléchargement
    URL.createObjectURL = (blob) => { html = blob; return "blob:capture"; };
    try { downloadPlan(); } catch (e) { return { err: String(e) }; }
    URL.createObjectURL = vrai;
    HTMLAnchorElement.prototype.click = vraiClick;
    if (!html) return { err: "aucun blob capturé" };
    const txt = await html.text();
    const { CHARGE } = await import("./js/ui/icons.js");
    return {
      taille: txt.length,
      trouve: Object.keys(CHARGE).filter((k) => txt.includes(".d." + k + "{background:" + CHARGE[k].papier + "}")),
      attendu: Object.keys(CHARGE),
    };
  });
  ok(!m.err, "le document exporté se construit (" + (m.err || (m.taille + " car.")) + ")");
  if (!m.err) {
    ok(m.trouve.length === m.attendu.length,
      "…et il porte les trois teintes papier de la table (" + m.trouve.join("/") + ")");
  }
}

// ─────────── §4 · Plus aucune valeur de charge en dur ailleurs ───────────
// Critère DÉRIVÉ de la table, pas d'une liste tenue à la main : on relit la source des fichiers
// qui affichent la charge et on exige que les valeurs n'y apparaissent plus. Les exemptions sont
// nommées une par une, avec leur raison — c'est le motif d'`audit:sensibilite`.
{
  const { CHARGE } = await import("../../endurabuild/js/ui/icons.js");
  const RACINE = new URL("../../endurabuild/", import.meta.url).pathname;
  // Fichiers qui PEIGNENT la charge. `icons.js` est la source ; `zenna-today.css` en est le
  // jumeau déclaré, vérifié identique par le §1 — les citer serait se mordre la queue.
  const CIBLES = ["css/styles.css", "css/zenna-tabs.css", "js/ui/plan-view.js"];
  // ON VISE LES SÉLECTEURS DE CHARGE, PAS LES VALEURS. Ma première écriture cherchait les
  // couleurs de la table n'importe où dans ces fichiers : elle a rougi sur `.warn`,
  // `.bp-hero` et `.w-chip`, qui emploient le MÊME pastel pour tout autre chose (un
  // avertissement, un bloc de héros, une puce). Le critère nommait « une valeur de charge en
  // dur » et mesurait « cette couleur apparaît quelque part » — la famille d'erreur que ce
  // dépôt paie régulièrement. La propriété gardée est : une règle qui peint LA CHARGE ne porte
  // pas de littéral.
  const SELECTEURS = /\.(gd|d)\.(dur|facile|recup)\b/;
  // Un CHIFFRE doit suivre la parenthèse : `rgb(var(--zn-charge-dur-rgb) / .34)` consomme le
  // token, ce n'est pas un littéral. Sans cette précision la garde rougissait sur les trois
  // lignes qu'elle vient elle-même de rendre correctes.
  const LITTERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*[\d.]/;
  const restes = [];
  for (const f of CIBLES) {
    const src = readFileSync(RACINE + f, "utf8");
    src.split("\n").forEach((ligne, i) => {
      const nu = ligne.replace(/\/\*.*?\*\//g, "").replace(/^\s*(\/\/|\*).*/, ""); // hors commentaires
      if (!SELECTEURS.test(nu) || !LITTERAL.test(nu)) return;
      // EXEMPTION NOMMÉE, et la seule : le repli `var(--token, #hex)` DOIT porter le hex —
      // c'est lui qui rend le repli possible quand le thème n'est pas posé. Le §1 garantit
      // par ailleurs que ce hex égale la table.
      if (/var\(--zn-charge-[a-z]+-papier\s*,/.test(nu)) return;
      // …et l'interpolation depuis la table dans le document exporté.
      if (/CHARGE\.[a-z]+\.papier/.test(nu)) return;
      restes.push(f + ":" + (i + 1) + " → " + nu.trim().slice(0, 60));
    });
  }
  ok(restes.length === 0, "aucune valeur de charge écrite en dur hors de la source ("
    + (restes.length ? restes.slice(0, 4).join(" | ") : "0") + ")");
}

ok(errs.length === 0, "aucune erreur JS (" + errs.length + (errs.length ? " — " + errs[0] : "") + ")");
await browser.close();
server.close();
process.exit(report());
