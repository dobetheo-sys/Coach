// R17.1 — GARDE DES DEUX CANAUX DE L'AVATAR.
//
// Le brief avatar pose trois critères exécutables ; ils sont ici, avec leurs identifiants
// d'origine pour qu'on puisse les relire côte à côte avec le document :
//
//   AV1-A  même palier, forme du jour différente → l'équipement et la couleur ne bougent
//          PAS, seules la posture et l'expression changent
//   AV1-B  même forme du jour, palier différent → la posture et l'expression ne bougent
//          PAS, seuls l'équipement et la couleur changent
//   AV6-A  la tête se pose sur un point d'ancrage FIXE, identique quel que soit le reste
//   AV3-C  (R17.2, en remplacement d'AV3/AV4) le canal FORME PHYSIQUE est un repère qui se
//          DÉPLACE : il monte et descend sans jamais retirer une pièce d'équipement
//
// Ce sont les deux premiers qui portent la valeur : sans eux, « deux canaux séparés » est
// une intention, pas une propriété. Avant R17.1 la posture venait des séances des 7 derniers
// jours — un signal corrélé au palier — donc AV1-B était structurellement faux.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8592;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });

const rendu = (etat) => page.evaluate(async (v) => {
  const m = await import("./js/ui/avatar.js");
  return m.avatarSVG(v, 120);
}, etat);

// ---- Contrat du module -----------------------------------------------------------------
const meta = await page.evaluate(async () => {
  const m = await import("./js/ui/avatar.js");
  return { moods: m.MOODS.map((x) => x.id), ancrage: m.HEAD_ANCHOR };
});
ok(meta.moods.length === 5, "cinq états de forme du jour (" + meta.moods.join(" · ") + ")");
ok(!!meta.ancrage && Number.isFinite(meta.ancrage.cx) && Number.isFinite(meta.ancrage.cy),
  "le point d'ancrage de la tête est DÉCLARÉ et exporté (" + JSON.stringify(meta.ancrage) + ")");

// ---- La forme du jour se lit depuis le check-in, pas depuis les séances ------------------
const moods = await page.evaluate(async () => {
  const m = await import("./js/ui/avatar.js");
  const jour = "2026-08-01";
  return {
    sansCheckin: m.moodOf(undefined, null, jour),
    feu: m.moodOf({ date: jour, energy: 85 }, null, jour),
    vide: m.moodOf({ date: jour, energy: 15 }, null, jour),
    douleur: m.moodOf({ date: jour, energy: 85 }, { active: true }, jour),
    perime: m.moodOf({ date: "2026-07-01", energy: 85 }, null, jour),
  };
});
ok(moods.sansCheckin === "normal", "sans check-in → état NEUTRE, jamais un visage content par défaut (" + moods.sansCheckin + ")");
ok(moods.feu === "feu" && moods.vide === "vide", "les bornes hautes et basses du check-in donnent bien les états extrêmes");
ok(moods.douleur !== "feu" && moods.douleur !== "frais",
  "drapeau douleur → l'avatar ne peut pas sourire pendant que le bandeau annonce une douleur (" + moods.douleur + ")");
ok(moods.perime === "normal", "un check-in d'un AUTRE jour ne pilote pas l'avatar d'aujourd'hui (" + moods.perime + ")");

// ---- AV1-A — même palier, forme différente ---------------------------------------------
// PRÉCISION APPORTÉE PAR L'IMPLÉMENTATION, et elle compte : « équipement identique » ne peut
// pas vouloir dire « aux mêmes coordonnées ». Les chaussures se posent au bout des jambes ;
// si les jambes bougent, elles bougent. Le critère porte donc sur les PIÈCES PRÉSENTES et
// leur couleur — ce qu'on possède —, pas sur leur position — où le corps les porte. Un test
// écrit sur les coordonnées aurait forcé des chaussures flottantes pour rester vert.
const pieces = (svg) => (svg.match(/data-piece="([^"]+)"/g) || []).sort().join(",");
const couleurs = (svg) => [...new Set(svg.match(/#[0-9a-f]{6}/gi) || [])].sort().join(",");
const calque = (svg, nom) => {
  const re = new RegExp('<g data-layer="' + nom + '">([\\s\\S]*?)</g></g>|<g data-layer="' + nom + '">([\\s\\S]*?)</g>');
  const m = re.exec(svg);
  return m ? (m[1] || m[2] || "") : "ABSENT";
};

const bas = await rendu({ level: 9, accent: "#ff7a1a", streak: 4, mood: "vide" });
const haut = await rendu({ level: 9, accent: "#ff7a1a", streak: 4, mood: "feu" });
ok(bas !== haut, "AV1-A — deux formes du jour différentes produisent bien deux rendus différents");
ok(/data-mood="vide"/.test(bas) && /data-mood="feu"/.test(haut), "AV1-A — le calque visage porte l'état rendu");
ok(pieces(bas) === pieces(haut) && pieces(bas).length > 0,
  "AV1-A — à palier égal, les MÊMES pièces d'équipement sont portées (" + pieces(bas).replace(/data-piece=|"/g, "") + ")");
ok(couleurs(bas) === couleurs(haut),
  "AV1-A — à palier égal, la palette est identique : la forme du jour ne change aucune couleur");
ok(calque(bas, "decor") === calque(haut, "decor"), "AV1-A — le décor ne dépend pas de la forme du jour");

// ---- AV1-B — même forme, palier différent ----------------------------------------------
// Symétrique, et c'est LE critère que l'implémentation précédente ne pouvait pas satisfaire :
// la posture venait des séances des 7 derniers jours, donc elle était corrélée au palier.
const n2 = await rendu({ level: 2, accent: "#ff7a1a", streak: 0, mood: "frais" });
const n15 = await rendu({ level: 15, accent: "#ff7a1a", streak: 7, mood: "frais" });
ok(n2 !== n15, "AV1-B — deux paliers différents produisent bien deux rendus différents");
ok(calque(n2, "posture") === calque(n15, "posture") && calque(n2, "posture") !== "ABSENT",
  "AV1-B — à forme du jour égale, la POSTURE est identique quel que soit le palier");
const visageDe = (svg) => (/<g data-mood="[^"]*">([\s\S]*?)<\/g>/.exec(svg) || [, "ABSENT"])[1];
ok(visageDe(n2) === visageDe(n15) && visageDe(n2) !== "ABSENT",
  "AV1-B — à forme du jour égale, l'EXPRESSION est identique quel que soit le palier");
ok(pieces(n2) !== pieces(n15), "AV1-B — et l'équipement, lui, a bien changé avec le palier");

// ---- AV3-C — le canal forme physique ne retire RIEN ------------------------------------
// C'est l'assertion qui remplace AV3/AV4, et c'est celle qui protège l'athlète : un palier
// de performance qui BAISSE (blessure, maladie, âge) ne doit rien lui enlever. On compare
// donc deux rendus au même niveau et à la même forme du jour, mais à des paliers de forme
// physique opposés — et on exige que l'équipement soit strictement identique.
const perfBas = await rendu({ level: 12, accent: "#ff7a1a", streak: 5, mood: "normal", perf: { tier: 2, disciplines: {} } });
const perfHaut = await rendu({ level: 12, accent: "#ff7a1a", streak: 5, mood: "normal", perf: { tier: 9, disciplines: {} } });
ok(pieces(perfBas) === pieces(perfHaut) && pieces(perfBas).length > 0,
  "AV3-C — un palier de forme physique BAS ne retire aucune pièce d'équipement (" + pieces(perfBas).replace(/data-piece=|"/g, "") + ")");
ok(calque(perfBas, "posture") === calque(perfHaut, "posture"),
  "AV3-C — et il ne change pas la posture non plus : les trois canaux sont indépendants");
ok(visageDe(perfBas) === visageDe(perfHaut), "AV3-C — ni l'expression");
ok(/data-tier="2"/.test(perfBas) && /data-tier="9"/.test(perfHaut),
  "AV3-C — le repère se DÉPLACE bien avec le palier (c'est une position, pas une possession)");
ok(!/#e63946|#ff3b30/.test((/<g data-layer="perf"[\s\S]*?<\/g>/.exec(perfBas) || [""])[0]),
  "AV3-C — le repère n'est jamais rouge : c'est un constat, pas une note");

const sansRef = await rendu({ level: 12, accent: "#ff7a1a", streak: 5, mood: "normal", perf: null });
ok(!/data-layer="perf"/.test(sansRef),
  "AV3-C — sans référence mesurée, AUCUN repère : pas de palier 1 par défaut");

// ---- AV6-A — l'ancrage de la tête ne bouge jamais ---------------------------------------
const ancrages = [];
for (const mood of meta.moods)
  for (const level of [1, 9, 16]) {
    const svg = await rendu({ level, accent: "#ff7a1a", streak: 3, mood });
    const m = /<circle cx="(\d+)" cy="(\d+)" r="(\d+)" fill="#f6efe0"\/>/.exec(svg);
    ancrages.push(m ? m[1] + "," + m[2] + "," + m[3] : "ABSENT");
  }
ok(new Set(ancrages).size === 1,
  "AV6-A — le crâne se pose au MÊME point sur les 15 combinaisons état × palier (" + [...new Set(ancrages)].join(" / ") + ")");
ok(ancrages[0] === meta.ancrage.cx + "," + meta.ancrage.cy + "," + meta.ancrage.r,
  "AV6-A — et ce point est bien celui que le module DÉCLARE, pas une valeur recopiée");

// ---- Accessibilité : l'état est dit, pas seulement dessiné -------------------------------
const aria = /aria-label="([^"]*)"/.exec(await rendu({ level: 9, accent: "#ff7a1a", streak: 4, mood: "vide" }));
ok(!!aria && /vid/i.test(aria[1]), "l'état de forme est annoncé aux lecteurs d'écran (" + (aria ? aria[1] : "—") + ")");

// ---- R-ZENNA v6 — LE REPEINT SOMBRE, ET SON REPLI ---------------------------------------
// Décision du fondateur (11/08/2026) : repeindre l'avatar plutôt que le poser sur une plaque
// claire. `avatar-tri.js` exprime son encre et ses aplats papier en `var(--av-*, <origine>)`.
// Les DEUX moitiés comptent, et la seconde est celle qu'on casserait sans s'en apercevoir :
//   · dans l'app, l'encre doit être CLAIRE — sinon le dessin disparaît sur le noir ;
//   · sans feuille de thème, elle doit reprendre sa valeur D'ORIGINE — c'est ce qui garde
//     `demo:avatartri` (node, sans CSS) et surtout la CARTE DE PARTAGE d'`export.js`, qui
//     charge le SVG comme `Image` dans un document indépendant où les variables de la page ne
//     descendent pas. Un repeint qui déborderait là-bas noircirait une carte au fond clair.
{
  const lum = (c) => { const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(c); if (!m) return null;
    return (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255; };
  // Cette suite teste le MODULE en isolation ; ce critère-ci porte sur le rendu DANS l'app,
  // il faut donc y entrer — c'est là que `body.theme-zenna` existe.
  const etat = runnerStateV1({ format: "70.3" });
  etat.sport = "tri";
  await page.evaluate((v) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(v)); }, etat);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.click('#ebTabbar .tabbtn[data-tab="profile"]');
  await page.waitForTimeout(900);
  const mesure = await page.evaluate(async () => {
    // R27 — LE PERSONNAGE N'EST PLUS SUR LE PROFIL (le badge-anneau l'y remplace), mais la
    // propriété gardée ici, elle, est INTACTE : la carte de partage d'`export.js` sérialise
    // toujours `avatarTriStorySVG` dans un document indépendant. Ce critère cherchait le dessin
    // par sa PLACE (`#screen svg[aria-label^="Avatar"]`) ; il le fabrique désormais et l'injecte
    // dans le document thémé — on mesure la palette, pas un emplacement que le produit a le
    // droit de changer. Sans ça, un lot de mise en page faisait rougir une garde de COULEUR.
    const mod = await import("./js/ui/avatar-tri.js");
    const hote = document.createElement("div");
    hote.innerHTML = mod.avatarTriSVG({ natation: 12, velo: 18, course: 9 }, 96);
    document.getElementById("screen").appendChild(hote); // DANS body.theme-zenna
    const svg = hote.querySelector("svg");
    if (!svg) return { absent: true };
    const trait = svg.querySelector("[stroke]");
    const cs = getComputedStyle(svg);
    // le MÊME dessin, sorti du document thémé : c'est le contexte d'export.js
    const hors = document.createElement("div");
    hors.style.cssText = "position:fixed;left:-9999px";
    hors.innerHTML = svg.outerHTML;
    document.documentElement.appendChild(hors); // hors de body.theme-zenna
    const traitHors = hors.querySelector("[stroke]");
    const inkHors = traitHors ? getComputedStyle(traitHors).stroke : null;
    const r = { ink: trait ? getComputedStyle(trait).stroke : null, inkHors,
      plaque: cs.backgroundColor, aVar: /var\(--av-/.test(svg.outerHTML) };
    hors.remove();
    hote.remove(); // on ne laisse pas le témoin dans l'écran
    return r;
  });
  ok(!mesure.absent, "R-ZENNA v6 — le rendu personnage se construit (il vit désormais dans la carte de partage, plus au Profil)");
  ok(mesure.aVar, "R-ZENNA v6 — sa palette passe par des variables CSS (pas des hex figés)");
  const lIn = lum(mesure.ink || ""), lOut = lum(mesure.inkHors || "");
  ok(lIn !== null && lIn > 0.5, "R-ZENNA v6 — dans l'app, l'encre est CLAIRE (" + mesure.ink + ") : le trait existe sur le noir");
  ok(lOut !== null && lOut < 0.25, "R-ZENNA v6 — hors du thème, elle reprend sa valeur d'ORIGINE (" + mesure.inkHors
    + ") : la carte de partage et `demo:avatartri` ne bougent pas");
  ok(/rgba\(0, 0, 0, 0\)|transparent/.test(mesure.plaque || ""),
    "R-ZENNA v6 — et la plaque claire a disparu (" + mesure.plaque + ") : il porte son propre contraste");
}

ok(errs.length === 0, "aucune erreur JS (" + errs.length + (errs.length ? " — " + errs[0] : "") + ")");
await browser.close();
server.close();
// La suite doit SORTIR en code non nul quand elle échoue : `run-all.mjs` lit le code de
// sortie du processus, et `report()` se contente de le RENDRE. Sept suites sur dix-sept
// finissaient par `report();` — elles sortaient donc en 0 quoi qu'elles trouvent, et la
// CI les comptait vertes. Même mécanisme que le banc d'invariants d'O-9/R20.6 : un
// rapport que rien ne lit vaut zéro.
process.exit(report());
