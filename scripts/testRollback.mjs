#!/usr/bin/env node
/**
 * §3a — LE TEST DE ROLLBACK. « La seule panne dont on ne sort pas en poussant un commit. »
 *
 *   npm run test:rollback
 *
 * Deux builds servis EN SÉQUENCE AU MÊME ENDROIT (même origine, même port — c'est la condition
 * qui rend le test réel : un service worker est attaché à une origine, le servir ailleurs ne
 * teste rien). Quatre questions, dans l'ordre du fondateur :
 *
 *   1. la build actuelle s'installe-t-elle ?
 *   2. la nouvelle se propage-t-elle, et en combien de rechargements ?
 *   3. EN RE-SERVANT L'ANCIENNE : revient-on en arrière, ou reste-t-on bloqué sur la nouvelle ?
 *   4. l'ancien code lit-il l'état écrit par le nouveau sans planter ?
 *
 * « L'étape 3 est la seule qui compte et la seule que personne ne fait. »
 *
 * ── CE QUE LA MESURE OBSERVE, ET POURQUOI CE N'EST PAS `caches.keys()` ────────────────────
 *
 * Le nom du cache dit quel SW a gagné ; il ne dit PAS ce que la page a reçu. Or c'est ce que
 * la page reçoit qui décide si l'athlète voit la correction. On mesure donc les deux :
 *   · le SW actif et son état (`caches.keys()`, `registration.waiting`) — le mécanisme ;
 *   · la TAILLE d'un module servi À TRAVERS le service worker (`fetch` depuis la page) — le
 *     livré. Les deux builds diffèrent sur `js/engine.js`, la sonde le vérifie d'abord et
 *     REFUSE de tourner si les deux builds sont identiques : sans témoin discriminant, tous
 *     les verdicts de propagation seraient vrais par construction.
 *
 * ── LIMITES DÉCLARÉES ──────────────────────────────────────────────────────────────────────
 *
 * Le serveur local ne pose aucun en-tête de cache HTTP, là où GitHub Pages en pose. Cela ne
 * change pas le chemin testé (le script du SW est récupéré hors cache HTTP par défaut,
 * `updateViaCache: "imports"`), mais cela rend le test OPTIMISTE sur les ASSETS : en
 * production, un asset encore dans le cache HTTP peut retarder d'autant ce qui est ré-installé.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { runnerStateV1 } from "../tests/e2e/harness.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const ANCIEN = process.argv[2] || resolve(ROOT, "../build-r26");
const NOUVEAU = resolve(ROOT, "endurabuild");
const PORT = 8123;

if (!existsSync(join(ANCIEN, "sw.js"))) {
  console.error(`✖ build ancienne introuvable : ${ANCIEN}`);
  console.error(`  usage : npm run test:rollback -- /chemin/vers/endurabuild-de-main`);
  console.error(`  (ex. : git worktree add --detach /tmp/build-r26 origin/main puis pointer sur son endurabuild/)`);
  process.exit(2);
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".png": "image/png" };
let RACINE = ANCIEN;                       // ← LE COMMUTATEUR DE DÉPLOIEMENT
const server = createServer(async (req, res) => {
  try {
    let p = req.url.split("?")[0];
    if (p === "/") p = "/index.html";
    const buf = await readFile(join(RACINE, p));
    res.writeHead(200, { "Content-Type": MIME[extname(p)] || "application/octet-stream" });
    res.end(buf);
  } catch { res.writeHead(404); res.end("404"); }
});
await new Promise((r) => server.listen(PORT, r));

const versionDe = async (dir) => (await readFile(join(dir, "sw.js"), "utf8")).match(/const VERSION = "([^"]+)"/)[1];
const vAncien = await versionDe(ANCIEN), vNouveau = await versionDe(NOUVEAU);
const tAncien = (await stat(join(ANCIEN, "js/engine.js"))).size, tNouveau = (await stat(join(NOUVEAU, "js/engine.js"))).size;

console.log("TEST DE ROLLBACK — deux builds, une seule origine\n");
console.log(`  ancienne (main)   ${vAncien}  ·  js/engine.js ${tAncien} o`);
console.log(`  nouvelle (branche) ${vNouveau}  ·  js/engine.js ${tNouveau} o`);
if (vAncien === vNouveau || tAncien === tNouveau) {
  console.error("\n✖ les deux builds ne sont pas discriminables — sans témoin, tout verdict de propagation serait vrai par construction.");
  server.close(); process.exit(2);
}
console.log(`  → témoin discriminant : ${Math.abs(tNouveau - tAncien)} octets d'écart sur js/engine.js\n`);

const exe = process.env.EB_CHROMIUM || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
let page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(String(e).slice(0, 160)));
page.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text().slice(0, 160)); });

/** Recharger, en tolérant l'annulation. Une navigation lancée pendant qu'un service worker
 *  prend le contrôle est ANNULÉE par le navigateur (`net::ERR_ABORTED`) : ce n'est pas une
 *  panne, c'est le cas normal une fois sur trois dans ce test, et faire échouer la mesure
 *  dessus la rendrait intermittente. On réessaie une fois, et on le dit si ça persiste. */
async function recharger() {
  for (let k = 0; k < 3; k++) {
    try { await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 }); return; }
    catch (e) { if (k === 2) throw e; await page.waitForTimeout(800); }
  }
}

/** L'état vu du DEDANS : qui contrôle, qui attend, et surtout ce que la page REÇOIT. */
const etat = () => page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  let servi = null;
  try { servi = (await (await fetch("./js/engine.js", { cache: "no-store" })).text()).length; } catch { /* rien */ }
  return {
    controleur: navigator.serviceWorker.controller ? "oui" : "non",
    caches: (await caches.keys()).sort(),
    attente: reg && reg.waiting ? "oui" : "non",
    actif: reg && reg.active ? "oui" : "non",
    banniere: !!document.querySelector("#ebMaj, .eb-maj, [data-maj]") || /Nouvelle version prête/.test(document.body.textContent || ""),
    servi,
    ecran: (document.body.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
    // SECOND T\u00c9MOIN, IND\u00c9PENDANT DU PREMIER : l'ancienne build affiche « ENDURABUILD »,
    // la nouvelle « ZENNA » (renommage v8). Deux t\u00e9moins qui n'ont aucun m\u00e9canisme commun —
    // l'un mesure un octetage de module servi, l'autre un mot rendu \u00e0 l'\u00e9cran : s'ils
    // divergeaient, c'est la mesure qu'il faudrait croire en dernier, pas le verdict.
    marque: /ZENNA/i.test(document.body.textContent || "") ? "ZENNA (nouvelle)" : /ENDURABUILD/i.test(document.body.textContent || "") ? "ENDURABUILD (ancienne)" : "?",
  };
});
const quiEstServi = (n) => (n === null ? "?" : Math.abs(n - tNouveau) < Math.abs(n - tAncien) ? "NOUVELLE" : "ancienne");
const ligne = (t, e) => console.log(`    ${t.padEnd(26)} servi=${quiEstServi(e.servi)} · contrôleur=${e.controleur} · attente=${e.attente} · bannière=${e.banniere ? "oui" : "non"} · caches=[${e.caches.join(", ")}] · marque=${e.marque}`);

const R = { propagation: null, retour: null, planteApres: null };

/** LES TROIS ROUTES par lesquelles une bascule peut arriver, mesurées séparément — parce que
 *  `sw.js` en promet deux et que les confondre donnerait un chiffre faux :
 *    a. de simples rechargements (l'onglet reste ouvert) ;
 *    b. une FERMETURE/RÉOUVERTURE — « qui ne clique jamais l'obtient au prochain lancement
 *       complet » : c'est ce que fait l'athlète qui tue l'app et la relance ;
 *    c. le clic sur « ✨ Nouvelle version prête », la route explicite de S-CACHE.
 *  Ne mesurer que (c) aurait rendu « il faut cliquer », ce qui est faux ; ne mesurer que (a)
 *  aurait rendu « ça ne se propage pas », ce qui est faux aussi. */
async function basculeVers(attendu) {
  for (let i = 1; i <= 3; i++) {
    await recharger(); await page.waitForTimeout(1500);
    const e = await etat(); ligne(`rechargement ${i}`, e);
    if (quiEstServi(e.servi) === attendu) return `${i} rechargement(s), sans rien faire d'autre`;
  }
  // (b) fermeture / réouverture complète
  await page.close();
  page = await ctx.newPage();
  page.on("pageerror", (x) => erreurs.push(String(x).slice(0, 160)));
  page.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text().slice(0, 160)); });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  let e = await etat(); ligne("fermeture / réouverture", e);
  if (quiEstServi(e.servi) === attendu) return "3 rechargements NON, mais une fermeture/réouverture OUI";
  // (c) le clic sur la bannière
  const clique = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button, a")].find((x) => /Nouvelle version|Recharger|Mettre à jour/i.test(x.textContent || ""));
    if (b) { b.click(); return true; } return false;
  });
  if (!clique) return "PAS PROPAGÉE — et aucune bannière à cliquer";
  await page.waitForTimeout(2500);
  e = await etat(); ligne("  …après le clic sur la bannière", e);
  return quiEstServi(e.servi) === attendu ? "seulement après le clic sur « ✨ Nouvelle version prête »" : "PAS PROPAGÉE, même après le clic";
}

// ── 1 · SERVIR L'ANCIENNE, LAISSER LE SERVICE WORKER S'INSTALLER ──────────────────────────
console.log("① la build actuelle (main) s'installe");
RACINE = ANCIEN;
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => navigator.serviceWorker.ready);
await recharger();   // un 2ᵉ chargement : le 1ᵉʳ n'est jamais contrôlé
await page.waitForTimeout(1200);
ligne("après installation", await etat());

// ── 2 · SERVIR LA NOUVELLE : COMBIEN DE RECHARGEMENTS ? ───────────────────────────────────
console.log("\n② la nouvelle build est déployée au même endroit");
RACINE = NOUVEAU;
R.propagation = await basculeVers("NOUVELLE");

// ── 2bis · FABRIQUER UN VRAI PLAN AVEC LA NOUVELLE BUILD ──────────────────────────────────
// Sans ceci, le point ④ est INDÉCIDABLE et ma première écriture l'a montré : j'avais posé un
// état minimal, la nouvelle build a migré 193 octets (`plans` VIDE), et l'ancienne a affiché le
// questionnaire — que j'allais lire comme « l'ancien code ne sait pas relire l'état du
// nouveau ». Ce n'était pas le rollback, c'était mon fixture. On génère donc un plan RÉEL, et
// on relève un TÉMOIN sur la nouvelle build avant de basculer : sans témoin d'avant, « l'app ne
// rend rien » ne se distingue pas de « elle n'a jamais rien eu à rendre ».
console.log("\n②bis on fabrique un vrai plan avec la nouvelle build (témoin d'avant)");
// On injecte l'\u00e9tat COMPLET (le chemin des suites E2E) plut\u00f4t que de traverser le
// questionnaire : ma premi\u00e8re \u00e9criture le traversait et rendait « plan de 0 semaine, 0 onglet ».
// Le t\u00e9moin valait alors 0 et la comparaison finale « 0 contre 0 » \u00e9tait VACUEUSE — elle aurait
// \u00e9t\u00e9 satisfaite par une app qui ne d\u00e9marre pas du tout.
await page.evaluate((st) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(st)); },
  Object.assign(runnerStateV1({ format: "70.3", weight: "72" }), { sport: "tri" }));
await recharger();
await page.waitForTimeout(2500);
const temoin = await page.evaluate(() => {
  const v2 = localStorage.getItem("eb_state_v2");
  let semaines = 0;
  try { const S = JSON.parse(v2); const p = S.plans[S.activePlanId]; semaines = (p.currentPlan && p.currentPlan.weeks || []).length; } catch { /* rien */ }
  return { taille: v2 ? v2.length : 0, onglets: document.querySelectorAll("#ebTabbar button").length, semaines,
    ecran: (document.body.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70) };
});
// Le t\u00e9moin qui compte est le nombre d'ONGLETS RENDUS : c'est lui qui dit « l'app d\u00e9marre et
// affiche un plan ». Les semaines PERSIST\u00c9ES valent 0 et ce n'est pas un d\u00e9faut \u2014 l'\u00e9tat stocke
// les r\u00e9ponses, le plan est reconstruit au chargement ; l'annoncer comme « plan de 0 semaine »
// aurait fait lire un fonctionnement normal comme une perte de donn\u00e9es.
console.log(`    \u00e9tat \u00e9crit par la NOUVELLE : eb_state_v2 ${temoin.taille} o \u00b7 ${temoin.onglets} onglet(s) rendus \u00b7 ${temoin.semaines} semaine(s) persist\u00e9e(s) dans l'\u00e9tat`);
console.log(`    écran : « ${temoin.ecran} »`);

// ── 3 · RE-SERVIR L'ANCIENNE — LA SEULE ÉTAPE QUI COMPTE ──────────────────────────────────
console.log("\n③ on RE-SERT l'ancienne (le rollback)");
RACINE = ANCIEN;
erreurs.length = 0;
R.retour = await basculeVers("ancienne");

// ── 4 · L'ANCIEN CODE LIT-IL L'ÉTAT ÉCRIT PAR LE NOUVEAU ? ────────────────────────────────
console.log("\n④ l'ancien code relit l'état écrit par le nouveau");
await recharger();
await page.waitForTimeout(2000);
const fin = await page.evaluate(() => ({
  ecran: (document.body.textContent || "").replace(/\s+/g, " ").trim().slice(0, 90),
  v2: !!localStorage.getItem("eb_state_v2"),
  onglets: document.querySelectorAll("#ebTabbar button").length,
}));
R.planteApres = erreurs.length;
console.log(`    écran : « ${fin.ecran} »`);
console.log(`    eb_state_v2 encore présent : ${fin.v2 ? "oui" : "NON — l'état a été perdu"} · barre d'onglets : ${fin.onglets} bouton(s) (témoin nouvelle build : ${temoin.onglets})`);
console.log(`    erreurs JS depuis le rollback : ${erreurs.length}`);
for (const e of erreurs.slice(0, 6)) console.log(`       · ${e}`);

console.log("\n── VERDICT ────────────────────────────────────────────────────────────────────");
console.log(`  ② la mise à jour se propage : ${R.propagation}`);
console.log(`  ③ le retour en arrière     : ${R.retour}`);
const memeRendu = fin.onglets === temoin.onglets;
console.log(`  \u2463 l'ancien code relit l'\u00e9tat : ${R.planteApres === 0 && fin.v2 && memeRendu ? "oui \u2014 0 erreur, \u00e9tat conserv\u00e9, m\u00eame rendu qu'avant le rollback" : `${R.planteApres} erreur(s), onglets ${fin.onglets} contre ${temoin.onglets} avant le rollback`}`);
const bloque = /BLOQUÉ|PAS PROPAGÉE/.test(R.propagation + R.retour);
console.log(bloque
  ? "\n  ✖ BLOQUANT — le correctif se pose avant le merge (versionner le cache, faire que le SW se remplace)."
  : "\n  ✓ les deux sens fonctionnent : on peut déployer, et on peut revenir en arrière.");

await browser.close();
server.close();
process.exit(0);
